import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config';

// Ensure data directory exists
const dataDir = path.dirname(config.databasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(config.databasePath);

// Enable high-concurrency WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- Merchants Table
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      business_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'merchant', -- 'merchant' | 'admin'
      status TEXT DEFAULT 'active', -- 'active' | 'suspended'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Subscriptions / Licenses
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      plan TEXT DEFAULT 'trial', -- 'trial' | 'starter' | 'pro' | 'enterprise'
      license_key TEXT UNIQUE NOT NULL,
      max_devices INTEGER DEFAULT 1,
      max_monthly_txns INTEGER DEFAULT 1000,
      features_json TEXT DEFAULT '{}',
      starts_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      status TEXT DEFAULT 'active', -- 'active' | 'expired' | 'revoked'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- Subscription Orders
    CREATE TABLE IF NOT EXISTS subscription_orders (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      amount REAL NOT NULL,
      bkash_number TEXT,
      status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'
      payment_order_id TEXT,
      duration_days INTEGER DEFAULT 30,
      trx_id TEXT,
      rejection_reason TEXT,
      verified_at DATETIME,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- API Keys for Developers
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      label TEXT DEFAULT 'Default Live Key',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- Connected Android Devices (Relay Phones)
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      device_name TEXT NOT NULL,
      device_token TEXT UNIQUE NOT NULL,
      fingerprint TEXT,
      model TEXT,
      android_version TEXT,
      battery_level INTEGER DEFAULT 100,
      is_online INTEGER DEFAULT 0,
      last_heartbeat DATETIME,
      sync_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- Merchant MFS Accounts (bKash, Nagad, Rocket numbers)
    CREATE TABLE IF NOT EXISTS mfs_accounts (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      provider TEXT NOT NULL, -- 'bKash' | 'Nagad' | 'Rocket' | 'Upay'
      account_type TEXT DEFAULT 'personal', -- 'personal' | 'merchant' | 'agent'
      account_number TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      daily_limit REAL DEFAULT 50000.0,
      current_daily_total REAL DEFAULT 0.0,
      instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- Payment Orders (Created by Merchant via API or Hosted Checkout)
    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      redirect_url TEXT,
      cancel_url TEXT,
      status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'FAILED'
      matched_trx_id TEXT,
      matched_provider TEXT,
      matched_sender TEXT,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- Incoming Raw / Processed Transactions (From Android App)
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      device_id TEXT,
      trx_id TEXT UNIQUE NOT NULL,
      service TEXT NOT NULL, -- 'bKash' | 'Nagad' | 'Rocket' | 'Upay'
      sender TEXT NOT NULL,
      receiver TEXT,
      amount REAL NOT NULL,
      reference TEXT,
      raw_sms TEXT,
      detection_source TEXT DEFAULT 'sms', -- 'sms' | 'notification'
      fraud_status TEXT DEFAULT 'CLEAN', -- 'CLEAN' | 'DUPLICATE_REUSE' | 'AMOUNT_MISMATCH' | 'SUSPICIOUS'
      matched_order_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
      FOREIGN KEY (matched_order_id) REFERENCES payment_orders(id) ON DELETE SET NULL
    );

    -- Webhook Endpoints
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      url TEXT NOT NULL,
      secret_key TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      events_json TEXT DEFAULT '["payment.verified", "order.expired"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- Webhook Delivery Attempts
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      order_id TEXT,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status_code INTEGER,
      response_body TEXT,
      attempt INTEGER DEFAULT 1,
      max_attempts INTEGER DEFAULT 5,
      next_retry_at DATETIME,
      status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'SUCCESS' | 'FAILED'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      merchant_id TEXT,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Payment Links Table
    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      link_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL,
      is_variable INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'BDT',
      status TEXT DEFAULT 'active',
      expires_at DATETIME,
      views_count INTEGER DEFAULT 0,
      payments_count INTEGER DEFAULT 0,
      total_collected REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- Invoices Table
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0.0,
      tax REAL DEFAULT 0.0,
      total REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'UNPAID',
      due_date DATETIME NOT NULL,
      paid_order_id TEXT,
      paid_at DATETIME,
      client_telegram_username TEXT,
      client_contact TEXT,
      service_duration_or_type TEXT,
      crypto_currency TEXT DEFAULT 'USDT',
      crypto_network TEXT DEFAULT 'BEP20',
      receiving_wallet_address TEXT,
      txid_hash TEXT,
      payment_status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_order_id) REFERENCES payment_orders(id) ON DELETE SET NULL
    );

    -- Idempotency Keys Table
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      request_path TEXT NOT NULL,
      request_method TEXT NOT NULL,
      request_params_hash TEXT NOT NULL,
      response_code INTEGER NOT NULL,
      response_body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      UNIQUE(merchant_id, idempotency_key)
    );

    -- AI Conversations Table
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      title TEXT DEFAULT 'New Conversation',
      messages_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- 15. Business Profiles (Branding, Logo, Currency, Details)
    CREATE TABLE IF NOT EXISTS business_profiles (
      id TEXT PRIMARY KEY,
      merchant_id TEXT UNIQUE NOT NULL,
      business_name TEXT NOT NULL,
      logo_url TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      business_type TEXT DEFAULT 'general', -- 'freelance' | 'outsourcing' | 'agency' | 'sales' | 'subscription' | 'service' | 'general'
      tax_vat_number TEXT,
      invoice_prefix TEXT DEFAULT 'INV-',
      receipt_prefix TEXT DEFAULT 'RCPT-',
      currency TEXT DEFAULT 'BDT',
      currency_symbol TEXT DEFAULT '৳',
      terms_and_conditions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- 16. Customers (Digital Khata Ledger Profile)
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      company_name TEXT,
      customer_type TEXT DEFAULT 'Client', -- 'Client' | 'Wholesale' | 'Retail' | 'Subscriber' | 'Agency' | 'Other'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- 17. Payment Receipts (Official proof of payment with TrxID, balances)
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      receipt_number TEXT NOT NULL,
      invoice_id TEXT,
      customer_id TEXT NOT NULL,
      amount_received REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'bKash' | 'Nagad' | 'Rocket' | 'Cash' | 'Bank' | 'Card' | 'Other'
      trx_id TEXT,
      previous_due REAL DEFAULT 0.0,
      paid_amount REAL NOT NULL,
      remaining_due REAL DEFAULT 0.0,
      payment_status TEXT DEFAULT 'VERIFIED', -- 'PENDING' | 'VERIFIED' | 'FAILED' | 'REJECTED' | 'MANUAL_REVIEW'
      notes TEXT,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 18. Projects & Outsourcing Work Tracking
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      service_category TEXT DEFAULT 'Development',
      start_date DATETIME,
      expected_end_date DATETIME,
      actual_end_date DATETIME,
      project_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0.0,
      due_amount REAL DEFAULT 0.0,
      status TEXT DEFAULT 'In Progress', -- 'Pending' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled'
      milestones_json TEXT DEFAULT '[]',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 19. Recurring Subscriptions / Retainers
    CREATE TABLE IF NOT EXISTS recurring_bills (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      charge_amount REAL NOT NULL,
      billing_cycle TEXT DEFAULT 'monthly', -- 'weekly' | 'monthly' | 'quarterly' | 'yearly'
      next_billing_date DATETIME NOT NULL,
      auto_generate_invoice INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active', -- 'active' | 'paused' | 'cancelled'
      last_generated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 20. Business Expenses Tracking
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Office Rent' | 'Internet' | 'Salary' | 'Transport' | 'Software' | 'Equipment' | 'Marketing' | 'Other'
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date DATETIME NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      reference TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    -- 21. App Releases & System Updates (Hybrid OTA Update System)
    CREATE TABLE IF NOT EXISTS app_releases (
      id TEXT PRIMARY KEY,
      version_name TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      download_url TEXT NOT NULL,
      changelog TEXT DEFAULT '',
      min_version_code INTEGER DEFAULT 1,
      is_force_update INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      release_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_transactions_trx_id ON transactions(trx_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
    CREATE INDEX IF NOT EXISTS idx_devices_merchant ON devices(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_merchant ON payment_orders(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_payment_links_merchant ON payment_links(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_payment_links_code ON payment_links(link_code);
    CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON invoices(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_txid ON invoices(txid_hash);
    CREATE INDEX IF NOT EXISTS idx_invoices_telegram ON invoices(client_telegram_username);
    CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
    CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(merchant_id, idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at);

    CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_receipts_merchant ON payment_receipts(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON payment_receipts(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_customer ON payment_receipts(customer_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_trx ON payment_receipts(trx_id);
    CREATE INDEX IF NOT EXISTS idx_projects_merchant ON projects(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_merchant ON recurring_bills(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_merchant ON expenses(merchant_id);
  `);

  // Safe migrations for table extensions
  const alterStatements = [
    "ALTER TABLE invoices ADD COLUMN customer_id TEXT;",
    "ALTER TABLE invoices ADD COLUMN paid_amount REAL DEFAULT 0.0;",
    "ALTER TABLE invoices ADD COLUMN due_amount REAL DEFAULT 0.0;",
    "ALTER TABLE invoices ADD COLUMN payment_method TEXT DEFAULT 'bKash';",
    "ALTER TABLE invoices ADD COLUMN project_id TEXT;",
    "ALTER TABLE invoices ADD COLUMN issue_date DATETIME DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE invoices ADD COLUMN business_type TEXT DEFAULT 'general';",
    "ALTER TABLE invoices ADD COLUMN client_telegram_username TEXT;",
    "ALTER TABLE invoices ADD COLUMN client_contact TEXT;",
    "ALTER TABLE invoices ADD COLUMN service_duration_or_type TEXT;",
    "ALTER TABLE invoices ADD COLUMN crypto_currency TEXT DEFAULT 'USDT';",
    "ALTER TABLE invoices ADD COLUMN crypto_network TEXT DEFAULT 'BEP20';",
    "ALTER TABLE invoices ADD COLUMN receiving_wallet_address TEXT;",
    "ALTER TABLE invoices ADD COLUMN txid_hash TEXT;",
    "ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'Pending';",
  ];
  for (const stmt of alterStatements) {
    try {
      db.exec(stmt);
    } catch {
      // Column already exists, safe to ignore
    }
  }

  // Ensure due_amount and paid_amount are initialized for existing invoices
  try {
    db.exec(`
      UPDATE invoices
      SET due_amount = total
      WHERE (due_amount IS NULL OR due_amount = 0) AND status = 'UNPAID';

      UPDATE invoices
      SET paid_amount = total, due_amount = 0
      WHERE status = 'PAID' AND (paid_amount IS NULL OR paid_amount = 0);
    `);
  } catch (e) {
    // safe ignore
  }

  // Ensure each existing merchant has a business profile
  try {
    const merchantsWithoutProfile = db.prepare(`
      SELECT m.id, m.business_name, m.email, m.phone
      FROM merchants m
      LEFT JOIN business_profiles bp ON m.id = bp.merchant_id
      WHERE bp.id IS NULL
    `).all() as any[];

    const crypto = require('crypto');
    for (const m of merchantsWithoutProfile) {
      db.prepare(`
        INSERT INTO business_profiles (id, merchant_id, business_name, phone, email, business_type)
        VALUES (?, ?, ?, ?, ?, 'general')
      `).run(crypto.randomUUID(), m.id, m.business_name, m.phone || '', m.email || '');
    }
  } catch (e) {
    console.error('[DB MIGRATION PROFILE ERROR]', e);
  }

  // Seed default admin account if not exists
  const checkAdmin = db.prepare('SELECT id FROM merchants WHERE email = ?').get('admin@payverify.com');
  if (!checkAdmin) {
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const adminId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync('Admin@123456', 10);

    db.prepare(`
      INSERT INTO merchants (id, email, password_hash, business_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, 'admin@payverify.com', passwordHash, 'PayVerify Global Operations', 'admin', 'active');

    // Create Admin Enterprise Subscription
    const subId = crypto.randomUUID();
    const licenseKey = 'PV-ENTERPRISE-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 10); // 10 years

    db.prepare(`
      INSERT INTO subscriptions (id, merchant_id, plan, license_key, max_devices, max_monthly_txns, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(subId, adminId, 'enterprise', licenseKey, 50, 500000, expires.toISOString());

    // Create Default API Key
    const apiKeyRaw = 'pv_live_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
    db.prepare(`
      INSERT INTO api_keys (id, merchant_id, key_prefix, key_hash, label)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), adminId, apiKeyRaw.substring(0, 12), keyHash, 'Admin Master Key');

    console.log(`[SEED] Super Admin created: email=admin@payverify.com, password=Admin@123456, license=${licenseKey}`);
    console.log(`[SEED] Default Admin API Key: ${apiKeyRaw}`);
  }

  // Seed default app release if not present
  try {
    const existingRelease = db.prepare('SELECT id FROM app_releases WHERE is_active = 1 LIMIT 1').get();
    if (!existingRelease) {
      db.prepare(`
        INSERT INTO app_releases (id, version_name, version_code, download_url, changelog, min_version_code, is_force_update, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'rel_default_v2_3',
        '2.3.0.0.1',
        5,
        'https://github.com/tawhid120/payverify-bd/releases/download/v2.3.0.0.1/app-release.apk',
        'Apple-inspired Liquid & Frosted Glass Material UI, full Light, Dark, and Auto-System theme support, with enterprise-grade background relay reliability.',
        1,
        0,
        1
      );
      console.log('[SEED] Initial App Release v2.3.0.0.1 (Build 5) seeded.');
    }
  } catch (err) {
    console.error('[SEED] Failed to seed default app release:', err);
  }
}
