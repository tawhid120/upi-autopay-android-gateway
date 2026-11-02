import { db } from '../db';

export function up(): void {
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      title TEXT DEFAULT 'New Conversation',
      messages_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payment_links_merchant ON payment_links(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_payment_links_code ON payment_links(link_code);
    CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON invoices(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(merchant_id, idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at);
  `);
}

export function down(): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_webhook_deliveries_retry;
    DROP INDEX IF EXISTS idx_idempotency_lookup;
    DROP INDEX IF EXISTS idx_invoices_status;
    DROP INDEX IF EXISTS idx_invoices_merchant;
    DROP INDEX IF EXISTS idx_payment_links_code;
    DROP INDEX IF EXISTS idx_payment_links_merchant;

    DROP TABLE IF EXISTS ai_conversations;
    DROP TABLE IF EXISTS idempotency_keys;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS payment_links;
  `);
}
