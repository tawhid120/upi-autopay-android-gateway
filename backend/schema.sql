-- ====================================================================
-- PayVerify BD v2 — Production Private SQL Database Schema
-- Compatible with SQLite, PostgreSQL, and MySQL
-- ====================================================================

-- 1. Merchants
CREATE TABLE IF NOT EXISTS merchants (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    business_name VARCHAR(191) NOT NULL,
    phone VARCHAR(32),
    role VARCHAR(32) DEFAULT 'merchant', -- 'merchant' | 'admin'
    status VARCHAR(32) DEFAULT 'active', -- 'active' | 'suspended'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subscriptions & License Keys
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) DEFAULT 'starter', -- 'trial' | 'starter' | 'pro' | 'enterprise'
    license_key VARCHAR(64) UNIQUE NOT NULL,
    max_devices INTEGER DEFAULT 1,
    max_monthly_txns INTEGER DEFAULT 1000,
    features_json TEXT DEFAULT '{}',
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(32) DEFAULT 'active', -- 'active' | 'expired' | 'revoked'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Subscription Orders
CREATE TABLE IF NOT EXISTS subscription_orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    amount REAL NOT NULL,
    bkash_number VARCHAR(32),
    status VARCHAR(32) DEFAULT 'PENDING',
    payment_order_id VARCHAR(64),
    duration_days INTEGER DEFAULT 30,
    trx_id VARCHAR(64),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 3. API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    label VARCHAR(100) DEFAULT 'Default Live Key',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 4. Connected Mobile Devices (Android Relay Devices)
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    device_token VARCHAR(128) UNIQUE NOT NULL,
    fingerprint VARCHAR(128),
    model VARCHAR(100),
    android_version VARCHAR(32),
    battery_level INTEGER DEFAULT 100,
    is_online INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMP,
    sync_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Subscription Orders
CREATE TABLE IF NOT EXISTS subscription_orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    amount REAL NOT NULL,
    bkash_number VARCHAR(32),
    status VARCHAR(32) DEFAULT 'PENDING',
    payment_order_id VARCHAR(64),
    duration_days INTEGER DEFAULT 30,
    trx_id VARCHAR(64),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 5. Merchant Accounts (UPI / Bank Accounts)
CREATE TABLE IF NOT EXISTS mfs_accounts (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL, -- 'bKash' | 'Nagad' | 'Rocket' | 'Upay'
    account_type VARCHAR(32) DEFAULT 'personal', -- 'personal' | 'merchant' | 'agent'
    account_number VARCHAR(32) NOT NULL,
    is_active INTEGER DEFAULT 1,
    daily_limit DOUBLE PRECISION DEFAULT 50000.0,
    current_daily_total DOUBLE PRECISION DEFAULT 0.0,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Subscription Orders
CREATE TABLE IF NOT EXISTS subscription_orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    amount REAL NOT NULL,
    bkash_number VARCHAR(32),
    status VARCHAR(32) DEFAULT 'PENDING',
    payment_order_id VARCHAR(64),
    duration_days INTEGER DEFAULT 30,
    trx_id VARCHAR(64),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 6. Customer Payment Orders
CREATE TABLE IF NOT EXISTS payment_orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    order_id VARCHAR(128) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    customer_name VARCHAR(128),
    customer_phone VARCHAR(32),
    customer_email VARCHAR(191),
    redirect_url TEXT,
    cancel_url TEXT,
    status VARCHAR(32) DEFAULT 'PENDING', -- 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'FAILED'
    matched_trx_id VARCHAR(64),
    matched_provider VARCHAR(32),
    matched_sender VARCHAR(32),
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Subscription Orders
CREATE TABLE IF NOT EXISTS subscription_orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    amount REAL NOT NULL,
    bkash_number VARCHAR(32),
    status VARCHAR(32) DEFAULT 'PENDING',
    payment_order_id VARCHAR(64),
    duration_days INTEGER DEFAULT 30,
    trx_id VARCHAR(64),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 7. Synced Transactions from Phones
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64),
    trx_id VARCHAR(64) UNIQUE NOT NULL,
    service VARCHAR(32) NOT NULL, -- 'bKash' | 'Nagad' | 'Rocket' | 'Upay'
    sender VARCHAR(32) NOT NULL,
    receiver VARCHAR(32),
    amount DOUBLE PRECISION NOT NULL,
    reference VARCHAR(128),
    raw_sms TEXT,
    detection_source VARCHAR(32) DEFAULT 'sms', -- 'sms' | 'notification'
    fraud_status VARCHAR(32) DEFAULT 'CLEAN', -- 'CLEAN' | 'DUPLICATE_REUSE' | 'AMOUNT_MISMATCH'
    matched_order_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    FOREIGN KEY (matched_order_id) REFERENCES payment_orders(id) ON DELETE SET NULL
);

-- 8. Webhook Configuration (Merchant Webhook Endpoints)
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,
    secret_key VARCHAR(128) NOT NULL,
    is_active INTEGER DEFAULT 1,
    events_json TEXT DEFAULT '["payment.verified", "order.expired"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Subscription Orders
CREATE TABLE IF NOT EXISTS subscription_orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    amount REAL NOT NULL,
    bkash_number VARCHAR(32),
    status VARCHAR(32) DEFAULT 'PENDING',
    payment_order_id VARCHAR(64),
    duration_days INTEGER DEFAULT 30,
    trx_id VARCHAR(64),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 9. Webhook Delivery History & Retry Queue
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(64) PRIMARY KEY,
    webhook_id VARCHAR(64) NOT NULL,
    order_id VARCHAR(64),
    event_type VARCHAR(64) NOT NULL,
    payload_json TEXT NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    attempt INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP,
    status VARCHAR(32) DEFAULT 'PENDING', -- 'PENDING' | 'SUCCESS' | 'FAILED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- 10. System Security & Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64),
    action VARCHAR(128) NOT NULL,
    ip_address VARCHAR(64),
    user_agent TEXT,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Payment Links (Social & Direct Payment Links)
CREATE TABLE IF NOT EXISTS payment_links (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    link_code VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT,
    amount REAL,
    is_variable INTEGER DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'BDT',
    status VARCHAR(32) DEFAULT 'active', -- 'active' | 'inactive' | 'expired'
    expires_at TIMESTAMP,
    views_count INTEGER DEFAULT 0,
    payments_count INTEGER DEFAULT 0,
    total_collected REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 12. Itemized Digital Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    invoice_number VARCHAR(64) NOT NULL,
    customer_name VARCHAR(191) NOT NULL,
    customer_email VARCHAR(191),
    customer_phone VARCHAR(32) NOT NULL,
    items_json TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0.0,
    tax REAL DEFAULT 0.0,
    total REAL NOT NULL,
    notes TEXT,
    status VARCHAR(32) DEFAULT 'UNPAID', -- 'UNPAID' | 'PAID' | 'CANCELLED' | 'OVERDUE' | 'DRAFT' | 'UNDER_REVIEW'
    due_date TIMESTAMP NOT NULL,
    paid_order_id VARCHAR(64),
    paid_at TIMESTAMP,
    client_telegram_username VARCHAR(191),
    client_contact VARCHAR(191),
    service_duration_or_type VARCHAR(191),
    crypto_currency VARCHAR(32) DEFAULT 'USDT',
    crypto_network VARCHAR(64) DEFAULT 'BEP20',
    receiving_wallet_address VARCHAR(255),
    txid_hash VARCHAR(255),
    payment_status VARCHAR(32) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_order_id) REFERENCES payment_orders(id) ON DELETE SET NULL
);

-- 13. Idempotency Keys (Duplicate Protection)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id VARCHAR(64) PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL,
    merchant_id VARCHAR(64) NOT NULL,
    request_path VARCHAR(255) NOT NULL,
    request_method VARCHAR(16) NOT NULL,
    request_params_hash VARCHAR(128) NOT NULL,
    response_code INTEGER NOT NULL,
    response_body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    UNIQUE(merchant_id, idempotency_key)
);

-- 14. AI Payment Assistant Threads
CREATE TABLE IF NOT EXISTS ai_conversations (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    title VARCHAR(191) DEFAULT 'New Conversation',
    messages_json TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 15. Business Profiles & Branding
CREATE TABLE IF NOT EXISTS business_profiles (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) UNIQUE NOT NULL,
    business_name VARCHAR(191) NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(32),
    email VARCHAR(191),
    website VARCHAR(191),
    business_type VARCHAR(64) DEFAULT 'general',
    tax_vat_number VARCHAR(64),
    invoice_prefix VARCHAR(32) DEFAULT 'INV-',
    receipt_prefix VARCHAR(32) DEFAULT 'RCPT-',
    currency VARCHAR(10) DEFAULT 'BDT',
    currency_symbol VARCHAR(8) DEFAULT '৳',
    terms_and_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 16. Customer Management Ledger
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    name VARCHAR(191) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(191),
    address TEXT,
    company_name VARCHAR(191),
    customer_type VARCHAR(64) DEFAULT 'Client',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 17. Verified Payment Receipts
CREATE TABLE IF NOT EXISTS payment_receipts (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    receipt_number VARCHAR(64) NOT NULL,
    invoice_id VARCHAR(64),
    customer_id VARCHAR(64) NOT NULL,
    amount_received REAL NOT NULL,
    payment_method VARCHAR(32) NOT NULL,
    trx_id VARCHAR(64),
    previous_due REAL DEFAULT 0.0,
    paid_amount REAL NOT NULL,
    remaining_due REAL DEFAULT 0.0,
    payment_status VARCHAR(32) DEFAULT 'VERIFIED',
    notes TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 18. Projects & Freelance Work Tracking
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT,
    service_category VARCHAR(64) DEFAULT 'Development',
    start_date TIMESTAMP,
    expected_end_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    project_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0.0,
    due_amount REAL DEFAULT 0.0,
    status VARCHAR(32) DEFAULT 'In Progress',
    milestones_json TEXT DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 19. Recurring Invoices & Subscriptions
CREATE TABLE IF NOT EXISTS recurring_bills (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    service_name VARCHAR(191) NOT NULL,
    charge_amount REAL NOT NULL,
    billing_cycle VARCHAR(32) DEFAULT 'monthly',
    next_billing_date TIMESTAMP NOT NULL,
    auto_generate_invoice INTEGER DEFAULT 1,
    status VARCHAR(32) DEFAULT 'active',
    last_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 20. Business Expenses Tracking
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(191) NOT NULL,
    amount REAL NOT NULL,
    expense_date TIMESTAMP NOT NULL,
    payment_method VARCHAR(32) DEFAULT 'Cash',
    reference VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Subscription Orders
CREATE TABLE IF NOT EXISTS subscription_orders (
    id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    amount REAL NOT NULL,
    bkash_number VARCHAR(32),
    status VARCHAR(32) DEFAULT 'PENDING',
    payment_order_id VARCHAR(64),
    duration_days INTEGER DEFAULT 30,
    trx_id VARCHAR(64),
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Indexes (High Performance Fast Search Indexes)
CREATE INDEX IF NOT EXISTS idx_transactions_trx_id ON transactions(trx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_devices_merchant ON devices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_license ON subscriptions(license_key);
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


