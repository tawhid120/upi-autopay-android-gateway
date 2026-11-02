import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './database/db';
import { config } from './config';

const BASE_URL = 'http://localhost:4000/api/v1';

// Helper to create JWT
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

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PAYVERIFY BD v2 — PHASE 1 AUTOMATED AUDIT SUITE');
  console.log('====================================================\n');

  // Setup Test Merchants
  const m1Id = 'test_m1_' + crypto.randomBytes(4).toString('hex');
  const m2Id = 'test_m2_' + crypto.randomBytes(4).toString('hex');
  const m1Token = makeToken(m1Id, `${m1Id}@test.com`);
  const m2Token = makeToken(m2Id, `${m2Id}@test.com`);

  db.prepare(`
    INSERT INTO merchants (id, email, password_hash, business_name, role, status)
    VALUES (?, ?, 'hash', 'Merchant Alpha', 'merchant', 'active'),
           (?, ?, 'hash', 'Merchant Beta', 'merchant', 'active')
  `).run(m1Id, `${m1Id}@test.com`, m2Id, `${m2Id}@test.com`);

  db.prepare(`
    INSERT INTO subscriptions (id, merchant_id, plan, license_key, max_devices, expires_at, status)
    VALUES (?, ?, 'pro', ?, 5, datetime('now', '+30 days'), 'active'),
           (?, ?, 'starter', ?, 2, datetime('now', '+30 days'), 'active')
  `).run(
    crypto.randomUUID(), m1Id, 'PV-TEST-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomUUID(), m2Id, 'PV-TEST-' + crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // 1. Database Schema Integrity Check
  console.log('--- TEST 1: Database Schema & Index Verification ---');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  const tableNames = tables.map((t) => t.name);
  assert(tableNames.includes('payment_links'), 'Table payment_links exists');
  assert(tableNames.includes('invoices'), 'Table invoices exists');
  assert(tableNames.includes('idempotency_keys'), 'Table idempotency_keys exists');
  assert(tableNames.includes('ai_conversations'), 'Table ai_conversations exists');
  assert(tableNames.includes('audit_logs'), 'Table audit_logs exists');

  // 2. Payment Link Creation & Idempotency
  console.log('\n--- TEST 2: Payment Link Creation & Idempotency Check ---');
  const idemKey = 'idem_' + crypto.randomBytes(8).toString('hex');

  const createLinkRes1 = await fetch(`${BASE_URL}/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({
      title: 'Consulting Fee',
      description: '1 Hour Strategic Session',
      amount: 1500,
      isVariable: false,
    }),
  }).then((r) => r.json());

  assert(createLinkRes1.success === true, 'Payment link created successfully');
  const linkId = createLinkRes1.data.id;
  const linkCode = createLinkRes1.data.linkCode;

  // Duplicate request with same Idempotency-Key
  const createLinkRes2 = await fetch(`${BASE_URL}/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({
      title: 'Consulting Fee',
      description: '1 Hour Strategic Session',
      amount: 1500,
      isVariable: false,
    }),
  });

  assert(createLinkRes2.headers.get('x-idempotent-replay') === 'true', 'Idempotency header returned on duplicate call');
  const linkJson2 = await createLinkRes2.json();
  assert(linkJson2.data.id === linkId, 'Duplicate call returned identical linkId without creating duplicate');

  // Verify only 1 record exists in DB
  const linkCount = db.prepare('SELECT count(*) as c FROM payment_links WHERE merchant_id = ?').get(m1Id) as any;
  assert(linkCount.c === 1, 'Exactly 1 payment link stored in database (Idempotent)');

  // 3. Tenant Isolation & IDOR Protection Test
  console.log('\n--- TEST 3: Tenant Isolation & IDOR Security Check ---');
  const idorRes = await fetch(`${BASE_URL}/payment-links/${linkId}`, {
    headers: { Authorization: `Bearer ${m2Token}` }, // Merchant 2 attempting to access Merchant 1's link
  });
  assert(idorRes.status === 404, 'Merchant 2 denied access to Merchant 1 payment link (HTTP 404 IDOR protected)');

  // 4. Public Payment Link Resolution & Customer Checkout Bridge
  console.log('\n--- TEST 4: Public Payment Link Checkout Flow ---');
  const publicLink = await fetch(`${BASE_URL}/payment-links/public/${linkCode}`).then((r) => r.json());
  assert(publicLink.success === true, 'Public link resolved by customer without auth');
  assert(publicLink.data.business_name === 'Merchant Alpha', 'Merchant branding resolved correctly');

  // Customer pays via link
  const payLinkOrder = await fetch(`${BASE_URL}/payment-links/public/${linkCode}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Rahim Uddin',
      customerPhone: '01811223344',
      customerEmail: 'rahim@gmail.com',
    }),
  }).then((r) => r.json());

  assert(payLinkOrder.success === true, 'Payment order created from payment link');
  assert(payLinkOrder.data.amount === 1500, 'Correct order amount applied from link');
  assert(payLinkOrder.data.checkoutUrl.includes('/pay/'), 'Valid checkout URL returned');

  // 5. Itemized Invoices & Customer Payment Bridge
  console.log('\n--- TEST 5: Digital Invoicing Lifecycle ---');
  const invoiceRes = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({
      customerName: 'Karim Ahmed',
      customerPhone: '01711998877',
      customerEmail: 'karim@test.com',
      items: [
        { description: 'Web Hosting (1 Year)', quantity: 1, unitPrice: 2000, amount: 2000 },
        { description: '.BD Domain Registration', quantity: 1, unitPrice: 1200, amount: 1200 },
      ],
      discount: 200,
      tax: 0,
      dueDays: 14,
    }),
  }).then((r) => r.json());

  assert(invoiceRes.success === true, 'Itemized invoice created successfully');
  assert(invoiceRes.data.subtotal === 3200, 'Subtotal correctly calculated (3200)');
  assert(invoiceRes.data.total === 3000, 'Total after discount correctly calculated (3000)');
  const invoiceId = invoiceRes.data.id;

  // Tenant isolation test on invoice
  const invIdor = await fetch(`${BASE_URL}/invoices/${invoiceId}`, {
    headers: { Authorization: `Bearer ${m2Token}` },
  });
  assert(invIdor.status === 404, 'Merchant 2 denied access to Merchant 1 invoice (IDOR protected)');

  // Public customer view
  const publicInv = await fetch(`${BASE_URL}/invoices/public/${invoiceId}`).then((r) => r.json());
  assert(publicInv.success === true, 'Customer can view public invoice');
  assert(publicInv.data.items.length === 2, 'Invoice line items intact in public view');

  // Customer pays invoice
  const payInvOrder = await fetch(`${BASE_URL}/invoices/public/${invoiceId}/pay`, {
    method: 'POST',
  }).then((r) => r.json());
  assert(payInvOrder.success === true, 'Payment order created for invoice');
  assert(payInvOrder.data.amount === 3000, 'Correct invoice total mapped to payment order');

  // 6. Webhook Exponential Backoff & Manual Resend
  console.log('\n--- TEST 6: Webhook Delivery & Manual Resend ---');
  const whId = crypto.randomUUID();
  const deliveryId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO webhooks (id, merchant_id, url, secret_key, is_active)
    VALUES (?, ?, 'https://httpbin.org/status/500', 'whsec_test_secret', 1)
  `).run(whId, m1Id);

  db.prepare(`
    INSERT INTO webhook_deliveries (id, webhook_id, order_id, event_type, payload_json, attempt, status)
    VALUES (?, ?, 'ord_test_999', 'payment.verified', '{"test":true}', 1, 'FAILED')
  `).run(deliveryId, whId);

  // Manual Resend Trigger
  const resendRes = await fetch(`${BASE_URL}/webhooks/deliveries/${deliveryId}/resend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${m1Token}` },
  }).then((r) => r.json());

  assert(resendRes.success === true, 'Manual webhook resend accepted');
  assert(resendRes.data.attempt === 2, 'Webhook delivery attempt incremented to 2');

  // Verify Audit Log was recorded
  const auditLog = db.prepare("SELECT * FROM audit_logs WHERE action = 'WEBHOOK_MANUALLY_RESENT' AND merchant_id = ?").get(m1Id) as any;
  assert(auditLog !== undefined, 'Webhook manual resend recorded in immutable audit log');

  // 7. Rate Limiting Protection Test
  console.log('\n--- TEST 7: Rate Limiting Abuse Protection ---');
  let rateLimitHit = false;
  // Fire rapid requests to public endpoint (limit 30)
  for (let i = 0; i < 35; i++) {
    const r = await fetch(`${BASE_URL}/payment-links/public/${linkCode}`);
    if (r.status === 429) {
      rateLimitHit = true;
      const json = await r.json();
      assert(json.errorCode === 'RATE_LIMIT_EXCEEDED', 'Returns standard RATE_LIMIT_EXCEEDED error code');
      break;
    }
  }
  assert(rateLimitHit === true, 'Rate limiter actively throttles rapid bursts (HTTP 429)');

  // 8. Regression Check: Existing Core Payments & Verification
  console.log('\n--- TEST 8: Regression Testing (Core Payments & Verification) ---');
  const testTrxId = 'REGRESS_' + Date.now();
  db.prepare(`
    INSERT INTO transactions (id, merchant_id, trx_id, service, sender, amount, fraud_status)
    VALUES (?, ?, ?, 'bKash', '01700112233', 500, 'CLEAN')
  `).run(crypto.randomUUID(), m1Id, testTrxId);

  // Test Verify API
  const verifyRes = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${m1Token}`,
    },
    body: JSON.stringify({ trxId: testTrxId, amount: 500, service: 'bKash' }),
  }).then((r) => r.json());

  assert(verifyRes.success === true && verifyRes.verified === true, 'Existing /payments/verify endpoint intact');
  assert(verifyRes.data.trxId === testTrxId, 'Verified TrxID matches');

  // Clean up test data
  db.prepare('DELETE FROM merchants WHERE id IN (?, ?)').run(m1Id, m2Id);

  console.log('\n====================================================');
  console.log(`🎉 ALL PHASE 1 AUTOMATED TESTS PASSED! (${passedTests}/${totalTests} Tests)`);
  console.log('====================================================');
}

runPhase1Tests().catch((e) => {
  console.error('\n❌ TEST SUITE FAILED:', e);
  process.exit(1);
});
