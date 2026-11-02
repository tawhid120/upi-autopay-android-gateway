import assert from 'assert';
import http from 'http';
import app from './server';
import { db } from './database/db';

async function runE2ETests() {
  console.log('====================================================');
  console.log('🧪 RUNNING CRYPTO & AML AUDIT END-TO-END TESTS');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4001, () => resolve()));
  const baseUrl = 'http://127.0.0.1:4001';

  try {
    // 1. Create Crypto Invoice
    console.log('\n--- 1. POST /api/v1/invoices (Crypto Creation) ---');
    const createRes = await fetch(`${baseUrl}/api/v1/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Binance Compliance Freelance Client',
        clientTelegramUsername: '@crypto_auditor_99',
        clientContact: '@crypto_auditor_99',
        serviceDurationOrType: 'Milestone 2 - Smart Contract Audit',
        cryptoCurrency: 'USDT',
        cryptoNetwork: 'BEP20',
        receivingWalletAddress: '0x71C83d3e8e458739cf9b168128362D851b22e1A4',
        txidHash: '0x999992c1c2438c8efd43bbf61e38ffc1555df329b3a322c3e1e69b3fdbd33b81',
        paymentStatus: 'Pending',
        dueDays: 14,
        items: [
          {
            description: 'DeFi Protocol Security Audit & Remittance Verification',
            quantity: 1,
            unitPrice: 3500,
            amount: 3500,
          },
        ],
      }),
    });

    const createJson = await createRes.json();
    assert.strictEqual(createRes.status, 201, 'Invoice created with 201 Created');
    assert(createJson.success, 'Response reports success: true');
    assert(createJson.data.id, 'Invoice ID returned');
    assert.strictEqual(createJson.data.clientTelegramUsername, '@crypto_auditor_99', 'Telegram handle matches');
    assert.strictEqual(createJson.data.cryptoCurrency, 'USDT', 'Crypto currency is USDT');
    assert.strictEqual(createJson.data.cryptoNetwork, 'BEP20', 'Network is BEP20');
    assert.strictEqual(createJson.data.total, 3500, 'Total is 3500 USDT');

    const invoiceId = createJson.data.id;
    const invoiceNumber = createJson.data.invoiceNumber;
    console.log(`✅ [PASS] Created invoice ${invoiceNumber} (ID: ${invoiceId})`);

    // 2. GET /api/v1/invoices (Listing & Search)
    console.log('\n--- 2. GET /api/v1/invoices (Search by TXID, Handle, Number) ---');
    
    // Search by TXID
    const searchTxidRes = await fetch(`${baseUrl}/api/v1/invoices?search=0x999992c1`);
    const searchTxidJson = await searchTxidRes.json();
    assert(searchTxidJson.data.length >= 1, 'Found invoice by TXID substring');
    assert.strictEqual(searchTxidJson.data[0].id, invoiceId, 'Matched correct invoice by TXID');
    console.log('✅ [PASS] Search by TXID');

    // Search by Telegram Handle
    const searchTgRes = await fetch(`${baseUrl}/api/v1/invoices?search=crypto_auditor_99`);
    const searchTgJson = await searchTgRes.json();
    assert(searchTgJson.data.length >= 1, 'Found invoice by Telegram handle substring');
    assert.strictEqual(searchTgJson.data[0].id, invoiceId, 'Matched correct invoice by Telegram handle');
    console.log('✅ [PASS] Search by Client Telegram Handle');

    // Search by Invoice Number
    const searchNumRes = await fetch(`${baseUrl}/api/v1/invoices?search=${invoiceNumber}`);
    const searchNumJson = await searchNumRes.json();
    assert(searchNumJson.data.length >= 1, 'Found invoice by invoice number');
    console.log('✅ [PASS] Search by Invoice Number');

    // 3. PATCH /api/v1/invoices/:id/status (Status Updater)
    console.log('\n--- 3. PATCH /api/v1/invoices/:id/status (Toggle to Paid & Update TXID) ---');
    const newTxid = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const patchRes = await fetch(`${baseUrl}/api/v1/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentStatus: 'Paid',
        txidHash: newTxid,
      }),
    });
    const patchJson = await patchRes.json();
    assert.strictEqual(patchRes.status, 200, 'Status updated with 200 OK');
    assert(patchJson.success, 'Response reports success: true');
    assert.strictEqual(patchJson.data.paymentStatus, 'Paid', 'Payment status updated to Paid');
    assert.strictEqual(patchJson.data.status, 'PAID', 'Mapped status updated to PAID');
    assert.strictEqual(patchJson.data.txidHash, newTxid, 'TXID hash updated');
    console.log('✅ [PASS] Status toggled to Paid & TXID updated');

    // 4. GET /api/v1/invoices/public/:id (Public & PDF Data Resolver)
    console.log('\n--- 4. GET /api/v1/invoices/public/:id (Compliance Verification Record) ---');
    const pubRes = await fetch(`${baseUrl}/api/v1/invoices/public/${invoiceId}`);
    const pubJson = await pubRes.json();
    assert.strictEqual(pubRes.status, 200, 'Public invoice resolver returns 200 OK');
    assert(pubJson.success, 'Success is true');
    assert.strictEqual(pubJson.data.payment_status, 'Paid', 'Public record shows Paid');
    assert.strictEqual(pubJson.data.txid_hash, newTxid, 'Public record shows verified TXID');
    assert.strictEqual(pubJson.data.client_telegram_username, '@crypto_auditor_99', 'Public record shows Telegram handle');
    assert.strictEqual(pubJson.data.service_duration_or_type, 'Milestone 2 - Smart Contract Audit', 'Public record shows service duration/type');
    assert.strictEqual(pubJson.data.receiving_wallet_address, '0x71C83d3e8e458739cf9b168128362D851b22e1A4', 'Public record shows receiving wallet');
    assert(pubJson.data.items.length >= 1, 'Line items parsed and returned');
    console.log('✅ [PASS] Public invoice carries all compliance audit fields');

    // 5. Verify Audit Logs
    console.log('\n--- 5. Verify Persistent Audit Trail in Database ---');
    const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE action IN (?, ?) ORDER BY created_at DESC').all('INVOICE_CREATED', 'INVOICE_STATUS_UPDATED') as any[];
    assert(auditLogs.length >= 2, 'Audit logs recorded for both creation and status transition');
    console.log(`✅ [PASS] Recorded ${auditLogs.length} persistent audit trail entries in SQLite`);

    console.log('\n====================================================');
    console.log('🎉 ALL CRYPTO AUDIT & TRANSACTION E2E TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
