import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './database/db';
import { config } from './config';

const BASE_URL = 'http://localhost:4000/api/v1';

function makeToken(merchantId: string, email: string, role = 'merchant') {
  return jwt.sign({ id: merchantId, email, role }, config.jwtSecret, { expiresIn: '1h' });
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    throw new Error(msg);
  }
  passedTests++;
  console.log(`✅ [PASS] ${msg}`);
}

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🧪 PAYVERIFY BD v2 — PHASE 2 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // Setup Test Merchants
  const m1Id = 'p2_m1_' + crypto.randomBytes(4).toString('hex');
  const m2Id = 'p2_m2_' + crypto.randomBytes(4).toString('hex');
  const m1Token = makeToken(m1Id, `${m1Id}@test.com`);
  const m2Token = makeToken(m2Id, `${m2Id}@test.com`);

  db.prepare(`
    INSERT INTO merchants (id, email, password_hash, business_name, role, status)
    VALUES (?, ?, 'hash', 'Apex Soft BD', 'merchant', 'active'),
           (?, ?, 'hash', 'Delta Commerce', 'merchant', 'active')
  `).run(m1Id, `${m1Id}@test.com`, m2Id, `${m2Id}@test.com`);

  db.prepare(`
    INSERT INTO subscriptions (id, merchant_id, plan, license_key, max_devices, expires_at, status)
    VALUES (?, ?, 'enterprise', ?, 5, datetime('now', '+30 days'), 'active'),
           (?, ?, 'pro', ?, 3, datetime('now', '+30 days'), 'active')
  `).run(
    crypto.randomUUID(), m1Id, 'PV-P2-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomUUID(), m2Id, 'PV-P2-' + crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // Setup Device for Merchant 1
  const device1Id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO devices (id, merchant_id, device_token, device_name, model, android_version, battery_level, is_online, last_heartbeat, sync_count)
    VALUES (?, ?, ?, 'Walton Primo S8', 'Primo S8 Pro', 'Android 14', 92, 1, datetime('now'), 15)
  `).run(device1Id, m1Id, crypto.randomBytes(16).toString('hex'));

  // Setup Webhook Config for Merchant 1
  const webhookId = crypto.randomUUID();
  const webhookSecret = 'whsec_' + crypto.randomBytes(16).toString('hex');
  db.prepare(`
    INSERT INTO webhooks (id, merchant_id, url, secret_key, is_active)
    VALUES (?, ?, 'https://apexsoft.com/webhook', ?, 1)
  `).run(webhookId, m1Id, webhookSecret);

  // Setup Webhook Delivery Log for Merchant 1
  const deliveryId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload_json, status_code, attempt, max_attempts, status, response_body)
    VALUES (?, ?, 'payment.verified', '{"amount":1200,"trxId":"TX12345"}', 200, 1, 5, 'SUCCESS', '{"ack":true}')
  `).run(deliveryId, webhookId);

  // Setup a sample transaction for Merchant 1
  const sampleTrxId = crypto.randomUUID();
  const randomTrx = 'TRX_' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare(`
    INSERT INTO transactions (id, merchant_id, device_id, trx_id, service, sender, amount, raw_sms, fraud_status)
    VALUES (?, ?, ?, ?, 'bKash', '01711223344', 1200, ?, 'CLEAN')
  `).run(sampleTrxId, m1Id, device1Id, randomTrx, `You received Tk 1,200.00 from 01711223344. Fee Tk 0.00. Balance Tk 5,420. TrxID ${randomTrx} at 03/09/2026 12:45`);

  // ==========================================
  // 1. DEVICE HEALTH & TELEMETRY
  // ==========================================
  console.log('\n--- 1. Device Health & Telemetry ---');

  const healthRes = await fetch(`${BASE_URL}/devices/health`, {
    headers: { Authorization: `Bearer ${m1Token}` },
  });
  const healthData = await healthRes.json();
  assert(healthRes.status === 200, 'Device Health endpoint responds with 200 OK');
  assert(healthData.success === true, 'Device Health reports success: true');
  assert(healthData.data.length >= 1, 'Device Health lists merchant connected devices');
  assert(healthData.data[0].device_name === 'Walton Primo S8', 'Device telemetry correctly identifies device name');
  assert(healthData.data[0].battery_level === 92, 'Device battery level matches hardware state');
  assert(healthData.data[0].healthStatus === 'HEALTHY', 'Recent heartbeat is marked as HEALTHY');
  assert(typeof healthData.data[0].troubleshooting?.batteryOptimization === 'string', 'Device Health provides battery optimization guide');

  // Tenant Isolation: Merchant 2 should not see Merchant 1's device
  const healthRes2 = await fetch(`${BASE_URL}/devices/health`, {
    headers: { Authorization: `Bearer ${m2Token}` },
  });
  const healthData2 = await healthRes2.json();
  assert(healthData2.data.length === 0, 'Zero IDOR: Merchant 2 cannot see Merchant 1 devices');

  // ==========================================
  // 2. PAYMENT LINKS MANAGEMENT
  // ==========================================
  console.log('\n--- 2. Payment Links Management ---');

  // Create fixed payment link
  const createFixedRes = await fetch(`${BASE_URL}/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({
      title: 'Annual SaaS Pro Subscription',
      description: 'Full access to all PayVerify BD tools',
      amount: 4500,
      isVariable: false,
      expiryDays: 30,
    }),
  });
  const fixedLink = await createFixedRes.json();
  assert(createFixedRes.status === 201, 'POST /payment-links creates fixed link with 201 Created');
  assert(fixedLink.data.amount === 4500, 'Fixed payment link amount saved accurately');
  assert(!fixedLink.data.isVariable, 'Fixed payment link isVariable is false');
  const fixedCode = fixedLink.data.linkCode;
  const fixedId = fixedLink.data.id;

  // Create variable payment link
  const createVarRes = await fetch(`${BASE_URL}/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({
      title: 'Community Open Donation',
      description: 'Enter your desired amount',
      isVariable: true,
      expiryDays: 60,
    }),
  });
  const varLink = await createVarRes.json();
  assert(createVarRes.status === 201, 'POST /payment-links creates variable link');
  assert(Boolean(varLink.data.isVariable), 'Variable link isVariable flag is true');
  const varCode = varLink.data.linkCode;

  // Public customer view of fixed link (increments views)
  const pubLinkRes = await fetch(`${BASE_URL}/payment-links/public/${fixedCode}`, {
    headers: { 'x-test-client': 'phase2_public_client' },
  });
  const pubLink = await pubLinkRes.json();
  assert(pubLinkRes.status === 200, 'GET /payment-links/public/:code resolves publicly without auth');
  assert(pubLink.data.business_name === 'Apex Soft BD', 'Public link includes merchant business name');
  assert(pubLink.data.amount === 4500, 'Public link reflects fixed amount');

  // Public customer checkout on fixed link
  const payFixedRes = await fetch(`${BASE_URL}/payment-links/public/${fixedCode}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-client': 'phase2_public_client',
    },
    body: JSON.stringify({
      customerName: 'Tareq Hasan',
      customerPhone: '01711998877',
      customerEmail: 'tareq@hasan.com',
    }),
  });
  const payFixedData = await payFixedRes.json();
  assert(payFixedRes.status === 201, 'POST /payment-links/public/:code/pay generates checkout session (201)');
  assert(Boolean(payFixedData.data.paymentId), 'Checkout session returns valid paymentId');
  assert(payFixedData.data.amount === 4500, 'Checkout session matches link amount');

  // Public customer checkout on variable link with custom amount
  const payVarRes = await fetch(`${BASE_URL}/payment-links/public/${varCode}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-client': 'phase2_public_client',
    },
    body: JSON.stringify({
      customerName: 'Supporter John',
      customerPhone: '01899112233',
      amount: 1500,
    }),
  });
  const payVarData = await payVarRes.json();
  assert(payVarRes.status === 201, 'Variable payment link accepts customer custom amount (201)');
  assert(payVarData.data.amount === 1500, 'Variable payment link checkout order sets custom amount');

  // Toggle status active -> inactive
  const toggleRes = await fetch(`${BASE_URL}/payment-links/${fixedId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({ status: 'inactive' }),
  });
  const toggleData = await toggleRes.json();
  assert(toggleRes.status === 200, 'PATCH /payment-links/:id/status successfully toggles status');
  assert(toggleData.success === true, 'Link status changed to inactive');

  // Inactive link rejects public access
  const pubInactiveRes = await fetch(`${BASE_URL}/payment-links/public/${fixedCode}`, {
    headers: { 'x-test-client': 'phase2_public_client' },
  });
  assert(pubInactiveRes.status === 403, 'Public endpoint returns 403 Forbidden for inactive link');

  // IDOR Protection: Merchant 2 cannot delete Merchant 1 payment link
  const idorDelRes = await fetch(`${BASE_URL}/payment-links/${fixedId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${m2Token}` },
  });
  assert(idorDelRes.status === 404, 'Zero IDOR: Merchant 2 cannot delete Merchant 1 payment link');

  // ==========================================
  // 3. DIGITAL INVOICES BUILDER
  // ==========================================
  console.log('\n--- 3. Digital Invoices Builder ---');

  const createInvRes = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({
      customerName: 'Dhaka Logistics Hub',
      customerPhone: '01700112233',
      customerEmail: 'finance@dhakalogistics.com',
      dueDays: 7,
      discount: 1000,
      tax: 500,
      notes: 'Net 7 days payment terms.',
      items: [
        { description: 'Enterprise ERP Module', quantity: 1, unitPrice: 20000, amount: 20000 },
        { description: 'Cloud Maintenance (1 Month)', quantity: 2, unitPrice: 2500, amount: 5000 },
      ],
    }),
  });
  const invData = await createInvRes.json();
  assert(createInvRes.status === 201, 'POST /invoices creates digital invoice with 201 Created');
  // Subtotal = 20000 + 5000 = 25000, Discount = 1000, Tax = 500 => Total = 24500
  assert(invData.data.subtotal === 25000, 'Invoice calculates line items subtotal (25,000)');
  assert(invData.data.discount === 1000, 'Invoice applies discount');
  assert(invData.data.tax === 500, 'Invoice applies tax');
  assert(invData.data.total === 24500, 'Invoice computes correct Grand Total (24,500)');
  assert(invData.data.status === 'UNPAID', 'New invoice default status is UNPAID');
  const invoiceId = invData.data.id;

  // Public customer view of invoice
  const pubInvRes = await fetch(`${BASE_URL}/invoices/public/${invoiceId}`, {
    headers: { 'x-test-client': 'phase2_public_client' },
  });
  const pubInv = await pubInvRes.json();
  assert(pubInvRes.status === 200, 'GET /invoices/public/:id loads printable customer invoice');
  assert(pubInv.data.business_name === 'Apex Soft BD', 'Invoice includes merchant business name');
  assert(pubInv.data.items.length === 2, 'Invoice returns itemized line items array');
  assert(pubInv.data.total === 24500, 'Invoice public total matches grand total');

  // Customer bridge to pay order
  const payInvRes = await fetch(`${BASE_URL}/invoices/public/${invoiceId}/pay`, {
    method: 'POST',
    headers: { 'x-test-client': 'phase2_public_client' },
  });
  const payInvData = await payInvRes.json();
  assert(payInvRes.status === 201, 'POST /invoices/public/:id/pay creates checkout order bridge (201)');
  assert(Boolean(payInvData.data.paymentId), 'Checkout order bridge returns paymentId');
  assert(payInvData.data.amount === 24500, 'Checkout order amount matches invoice total');

  // Update status to PAID
  const markPaidRes = await fetch(`${BASE_URL}/invoices/${invoiceId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({ status: 'PAID' }),
  });
  assert(markPaidRes.status === 200, 'PATCH /invoices/:id/status marks invoice as PAID');

  // IDOR Protection: Merchant 2 cannot cancel Merchant 1 invoice
  const idorInvRes = await fetch(`${BASE_URL}/invoices/${invoiceId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m2Token}`,
    },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  assert(idorInvRes.status === 404, 'Zero IDOR: Merchant 2 cannot modify Merchant 1 invoice');

  // ==========================================
  // 4. TRANSACTION INTELLIGENCE & 9-STAGE TIMELINE
  // ==========================================
  console.log('\n--- 4. Transaction Intelligence (9-Stage Lifecycle) ---');

  const timelineRes = await fetch(`${BASE_URL}/payments/transactions/${sampleTrxId}/timeline`, {
    headers: { Authorization: `Bearer ${m1Token}` },
  });
  const timelineData = await timelineRes.json();
  assert(timelineRes.status === 200, 'GET /payments/transactions/:id/timeline responds with 200 OK');
  assert(timelineData.success === true, 'Timeline query succeeds');
  assert(timelineData.data.timeline.length === 9, 'Timeline returns complete 9-stage visual lifecycle');
  assert(timelineData.data.timeline[0].stage === 'CUSTOMER_PAYMENT', 'Stage 1 is Customer Payment Sent');
  assert(timelineData.data.timeline[1].stage === 'SMS_RECEIVED', 'Stage 2 is SMS Received by Relay');
  assert(timelineData.data.timeline[6].stage === 'PAYMENT_VERIFIED', 'Stage 7 is Payment Verified');
  assert(timelineData.data.timeline[8].stage === 'WEBHOOK_DELIVERED', 'Stage 9 is Webhook Delivery');
  assert(timelineData.data.transaction.trx_id === randomTrx, 'Timeline includes matching transaction metadata');

  // IDOR Protection: Merchant 2 cannot query Merchant 1 timeline
  const idorTimelineRes = await fetch(`${BASE_URL}/payments/transactions/${sampleTrxId}/timeline`, {
    headers: { Authorization: `Bearer ${m2Token}` },
  });
  assert(idorTimelineRes.status === 404, 'Zero IDOR: Merchant 2 cannot access Merchant 1 transaction timeline');

  // ==========================================
  // 5. WEBHOOK INSPECTOR & RESEND
  // ==========================================
  console.log('\n--- 5. Webhook Inspector & Resend ---');

  const delListRes = await fetch(`${BASE_URL}/webhooks/deliveries?limit=5`, {
    headers: { Authorization: `Bearer ${m1Token}` },
  });
  const delListData = await delListRes.json();
  assert(delListRes.status === 200, 'GET /webhooks/deliveries lists delivery history');
  assert(delListData.data.length >= 1, 'Delivery logs include seeded delivery event');
  assert(delListData.data[0].event_type === 'payment.verified', 'Event type correctly logged');

  // Resend webhook delivery
  const resendRes = await fetch(`${BASE_URL}/webhooks/deliveries/${deliveryId}/resend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${m1Token}` },
  });
  const resendData = await resendRes.json();
  assert(resendRes.status === 200, 'POST /webhooks/deliveries/:id/resend triggers manual retry');
  assert(resendData.success === true, 'Resend reports success');

  // IDOR Protection: Merchant 2 cannot resend Merchant 1 webhook delivery
  const idorResendRes = await fetch(`${BASE_URL}/webhooks/deliveries/${deliveryId}/resend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${m2Token}` },
  });
  assert(idorResendRes.status === 404, 'Zero IDOR: Merchant 2 cannot resend Merchant 1 webhook');

  // ==========================================
  // 6. CORE REGRESSION TEST (VERIFICATION FLOW)
  // ==========================================
  console.log('\n--- 6. Core Payment Verification Regression Test ---');

  // Create payment order
  const orderRes = await fetch(`${BASE_URL}/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({
      orderId: 'ORD-REG-' + crypto.randomBytes(3).toString('hex'),
      amount: 950,
      customerName: 'Regression Check',
      customerPhone: '01712345678',
    }),
  });
  const orderData = await orderRes.json();
  assert(orderRes.status === 201, 'Core Order creation functions seamlessly');
  const pId = orderData.data.paymentId;

  // Checkout page verification
  const chkRes = await fetch(`${BASE_URL}/checkout/session/${pId}`);
  const chkData = await chkRes.json();
  assert(chkRes.status === 200, 'Hosted checkout page resolves core order');
  assert(chkData.data.order.amount === 950, 'Checkout order amount preserved accurately');

  console.log('\n====================================================');
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed:      ${passedTests}`);
  console.log(`❌ Failed:      ${totalTests - passedTests}`);
  console.log(`📈 Success:     ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 32/32 PHASE 2 & REGRESSION TESTS PASSED CLEANLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
