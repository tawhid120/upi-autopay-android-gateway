import assert from 'assert';
import { db, initDatabase } from './database/db';
import crypto from 'crypto';

initDatabase();

console.log('--- TEST: Crypto Transaction & Audit Log Features ---');

const merchantId = crypto.randomUUID();
db.prepare(`
  INSERT INTO merchants (id, email, password_hash, business_name, role, status)
  VALUES (?, ?, 'hash123', 'Crypto Audit Test Corp', 'merchant', 'active')
`).run(merchantId, `merchant_${Date.now()}@crypto.test`);

// 1. Create Crypto Invoice
const invId = crypto.randomUUID();
const invNumber = 'INV-2026-9999';
const txid = '0x4a9d72c1c2438c8efd43bbf61e38ffc1555df329b3a322c3e1e69b3fdbd33b81';
const wallet = '0x71C83d3e8e458739cf9b168128362D851b22e1A4';
const telegram = '@satoshi_trader';

db.prepare(`
  INSERT INTO invoices (
    id, merchant_id, invoice_number, customer_name, customer_email, customer_phone,
    items_json, subtotal, discount, tax, total, notes, status, due_date,
    client_telegram_username, client_contact, service_duration_or_type,
    crypto_currency, crypto_network, receiving_wallet_address, txid_hash, payment_status,
    paid_at, paid_amount, due_amount
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  invId,
  merchantId,
  invNumber,
  'Satoshi Client',
  'satoshi@blockchain.org',
  telegram,
  JSON.stringify([{ description: 'Smart Contract Audit & Consulting', quantity: 1, unitPrice: 2500, amount: 2500 }]),
  2500,
  0,
  0,
  2500,
  'Verified freelancing milestone payment.',
  'UNPAID',
  new Date(Date.now() + 7 * 86400000).toISOString(),
  telegram,
  telegram,
  'March 2026 Retainer',
  'USDT',
  'BNB Smart Chain (BEP20)',
  wallet,
  txid,
  'Pending',
  null,
  0,
  2500
);

// 2. Query Invoice
const fetched = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId) as any;
assert.strictEqual(fetched.client_telegram_username, telegram, 'Telegram handle matches');
assert.strictEqual(fetched.service_duration_or_type, 'March 2026 Retainer', 'Duration/type matches');
assert.strictEqual(fetched.crypto_currency, 'USDT', 'Currency matches');
assert.strictEqual(fetched.crypto_network, 'BNB Smart Chain (BEP20)', 'Network matches');
assert.strictEqual(fetched.receiving_wallet_address, wallet, 'Wallet matches');
assert.strictEqual(fetched.txid_hash, txid, 'TXID matches');
assert.strictEqual(fetched.payment_status, 'Pending', 'Payment status matches');
console.log('✅ [PASS] Crypto invoice created and persisted with all required fields');

// 3. Search by TXID
const searchTxid = db.prepare('SELECT * FROM invoices WHERE txid_hash = ?').all(txid) as any[];
assert(searchTxid.length >= 1, 'Found invoice by TXID');
console.log('✅ [PASS] Search by TXID');

// 4. Search by Telegram handle
const searchTg = db.prepare('SELECT * FROM invoices WHERE client_telegram_username LIKE ?').all('%satoshi%') as any[];
assert(searchTg.length >= 1, 'Found invoice by Telegram handle');
console.log('✅ [PASS] Search by Client Telegram Handle');

// 5. Update Status to Paid
db.prepare(`
  UPDATE invoices
  SET status = 'PAID',
      payment_status = 'Paid',
      paid_at = CURRENT_TIMESTAMP,
      paid_amount = total,
      due_amount = 0
  WHERE id = ?
`).run(invId);

const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId) as any;
assert.strictEqual(updated.payment_status, 'Paid', 'Status updated to Paid');
assert.strictEqual(updated.status, 'PAID', 'Mapped status updated to PAID');
assert(updated.paid_at, 'paid_at timestamp set');
console.log('✅ [PASS] Status update to Paid toggled successfully');

console.log('\n🎉 ALL CRYPTO AUDIT TESTS PASSED!\n');
