import { db, initDatabase } from './database/db';
import crypto from 'crypto';

export async function testLicenseSecurityLifecycle() {
  initDatabase();
  console.log('====================================================');
  console.log('🔐 Testing Full License & Device Security Lifecycle');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:4000/api/v1';

  // 1. Test Expired License
  const expMId = 'exp_m_' + crypto.randomUUID().substring(0, 8);
  const expLic = 'PV-EXPIRED-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare(`
    INSERT INTO merchants (id, email, password_hash, business_name, role, status)
    VALUES (?, ?, 'hash', 'Expired Merchant', 'merchant', 'active')
  `).run(expMId, `${expMId}@test.com`);
  db.prepare(`
    INSERT INTO subscriptions (id, merchant_id, plan, license_key, max_devices, max_monthly_txns, expires_at, status)
    VALUES (?, ?, 'starter', ?, 1, 100, datetime('now', '-5 days'), 'active')
  `).run(crypto.randomUUID(), expMId, expLic);

  const expRes = await fetch(`${BASE_URL}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: expLic, deviceName: 'Phone 1' }),
  }).then(r => r.json());
  console.log(`1. Expired License Rejection: ${!expRes.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   ➜ Message: "${expRes.message}"\n`);

  // 2. Test Suspended Account
  const suspMId = 'susp_m_' + crypto.randomUUID().substring(0, 8);
  const suspLic = 'PV-SUSP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare(`
    INSERT INTO merchants (id, email, password_hash, business_name, role, status)
    VALUES (?, ?, 'hash', 'Suspended Merchant', 'merchant', 'suspended')
  `).run(suspMId, `${suspMId}@test.com`);
  db.prepare(`
    INSERT INTO subscriptions (id, merchant_id, plan, license_key, max_devices, max_monthly_txns, expires_at, status)
    VALUES (?, ?, 'starter', ?, 1, 100, datetime('now', '+30 days'), 'active')
  `).run(crypto.randomUUID(), suspMId, suspLic);

  const suspRes = await fetch(`${BASE_URL}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: suspLic, deviceName: 'Phone 1' }),
  }).then(r => r.json());
  console.log(`2. Suspended Merchant Rejection: ${!suspRes.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   ➜ Message: "${expRes.message}"\n`);

  // 3. Test Device Limit & Unauthorized 2nd Device
  const limitMId = 'limit_m_' + crypto.randomUUID().substring(0, 8);
  const limitLic = 'PV-LIMIT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare(`
    INSERT INTO merchants (id, email, password_hash, business_name, role, status)
    VALUES (?, ?, 'hash', 'Limit Merchant', 'merchant', 'active')
  `).run(limitMId, `${limitMId}@test.com`);
  db.prepare(`
    INSERT INTO subscriptions (id, merchant_id, plan, license_key, max_devices, max_monthly_txns, expires_at, status)
    VALUES (?, ?, 'starter', ?, 1, 100, datetime('now', '+30 days'), 'active')
  `).run(crypto.randomUUID(), limitMId, limitLic);

  // Device 1 (authorized)
  const d1Res = await fetch(`${BASE_URL}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: limitLic, deviceName: 'Authorized Phone 1' }),
  }).then(r => r.json());

  // Device 2 (unauthorized, exceeds limit 1)
  const d2Res = await fetch(`${BASE_URL}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: limitLic, deviceName: 'Unauthorized Phone 2' }),
  }).then(r => r.json());
  console.log(`3. Device Limit & Second Device Block: ${(d1Res.success && !d2Res.success) ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   ➜ Device 1: "${d1Res.message}"`);
  console.log(`   ➜ Device 2: "${d2Res.message}"\n`);

  // 4. Test Missing Device Token
  const noTokenRes = await fetch(`${BASE_URL}/devices/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payments: [] }),
  });
  const noTokenBody = await noTokenRes.json();
  console.log(`4. Missing Device Token Rejection (HTTP 401): ${noTokenRes.status === 401 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   ➜ Message: "${noTokenBody.message}"\n`);

  // 5. Test Tampered / Fake Device Token
  const tamperedRes = await fetch(`${BASE_URL}/devices/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Token': 'dev_tok_tampered_fake_9999' },
    body: JSON.stringify({ payments: [] }),
  });
  const tamperedBody = await tamperedRes.json();
  console.log(`5. Tampered Device Token Rejection (HTTP 401): ${tamperedRes.status === 401 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   ➜ Message: "${tamperedBody.message}"\n`);

  // 6. Test Revoked Device
  const validDevToken = d1Res.data.deviceToken;
  const validDevId = d1Res.data.deviceId;

  // Merchant revokes device from dashboard
  db.prepare('DELETE FROM devices WHERE id = ?').run(validDevId);

  const revokedRes = await fetch(`${BASE_URL}/devices/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Token': validDevToken },
    body: JSON.stringify({ payments: [] }),
  });
  const revokedBody = await revokedRes.json();
  console.log(`6. Revoked Device Sync Access Block (HTTP 401): ${revokedRes.status === 401 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   ➜ Message: "${revokedBody.message}"\n`);

  // Clean up test records
  db.prepare('DELETE FROM merchants WHERE id IN (?, ?, ?)').run(expMId, suspMId, limitMId);

  console.log('====================================================');
  console.log('🛡️ All 6 License & Device Security Lifecycle Tests Completed!');
  console.log('====================================================');
}

testLicenseSecurityLifecycle().catch(console.error);
