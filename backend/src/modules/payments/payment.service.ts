import crypto from 'crypto';
import { db } from '../../database/db';
import { dispatchWebhookForOrder } from '../webhooks/webhook.service';
import { notifyCheckoutStream } from '../checkout/checkout.service';
import { autoVerifySubscriptionForTransaction } from '../subscriptions/subscription.service';

export interface ProcessTransactionParams {
  merchantId: string;
  deviceId?: string;
  trxId: string;
  service: string;
  sender: string;
  receiver?: string;
  amount: number;
  reference?: string;
  rawSms: string;
  detectionSource: 'sms' | 'notification';
  timestamp: Date;
}

export async function processIncomingTransaction(params: ProcessTransactionParams) {
  const trxId = params.trxId.trim().toUpperCase();

  // 1. Check for Duplicate Transaction ID
  const existingTrx = db.prepare(`
    SELECT id, merchant_id, matched_order_id, created_at
    FROM transactions
    WHERE trx_id = ?
  `).get(trxId) as any;

  if (existingTrx) {
    return {
      isDuplicate: true,
      transactionId: existingTrx.id,
      message: 'Transaction ID already exists and was previously processed.',
    };
  }

  // 2. Insert into Transactions Table
  const transactionId = crypto.randomUUID();
  let fraudStatus = 'CLEAN';

  // 3. Match with Pending Payment Orders
  // Match strategies:
  // Strategy A: If reference exists, match order where order_id = reference OR id = reference
  // Strategy B: Match order where status = 'PENDING', amount = amount, expires_at > NOW
  let matchedOrder: any = null;

  if (params.reference && params.reference.trim().length > 0) {
    matchedOrder = db.prepare(`
      SELECT id, merchant_id, order_id, amount, customer_phone, redirect_url, status
      FROM payment_orders
      WHERE merchant_id = ?
        AND status = 'PENDING'
        AND (order_id = ? OR id = ?)
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `).get(params.merchantId, params.reference.trim(), params.reference.trim()) as any;
  }

  if (!matchedOrder) {
    // Match by exact amount and recent pending status within last 30 minutes
    matchedOrder = db.prepare(`
      SELECT id, merchant_id, order_id, amount, customer_phone, redirect_url, status
      FROM payment_orders
      WHERE merchant_id = ?
        AND status = 'PENDING'
        AND amount = ?
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at ASC LIMIT 1
    `).get(params.merchantId, params.amount) as any;
  }

  // Check for amount mismatch if reference matched but amount was lower
  if (matchedOrder && params.amount < matchedOrder.amount) {
    fraudStatus = 'AMOUNT_MISMATCH';
    matchedOrder = null; // Do not verify order if underpaid
  }

  // Record transaction
  db.prepare(`
    INSERT INTO transactions (
      id, merchant_id, device_id, trx_id, service, sender, receiver,
      amount, reference, raw_sms, detection_source, fraud_status, matched_order_id, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    transactionId,
    params.merchantId,
    params.deviceId || null,
    trxId,
    params.service,
    params.sender,
    params.receiver || '',
    params.amount,
    params.reference || '',
    params.rawSms || '',
    params.detectionSource,
    fraudStatus,
    matchedOrder ? matchedOrder.id : null,
    params.timestamp.toISOString()
  );

  // If order was successfully matched, mark VERIFIED and trigger webhooks
  if (matchedOrder) {
    db.prepare(`
      UPDATE payment_orders
      SET status = 'VERIFIED',
          matched_trx_id = ?,
          matched_provider = ?,
          matched_sender = ?,
          verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(trxId, params.service, params.sender, matchedOrder.id);

    // Trigger instant webhook to merchant server
    dispatchWebhookForOrder(matchedOrder.id, 'payment.verified', {
      orderId: matchedOrder.order_id,
      payVerifyOrderId: matchedOrder.id,
      trxId: trxId,
      amount: params.amount,
      service: params.service,
      sender: params.sender,
      reference: params.reference,
      verifiedAt: new Date().toISOString(),
    });

    // Notify Hosted Checkout SSE streams (buyer browser auto-completes)
    notifyCheckoutStream(matchedOrder.id, {
      status: 'VERIFIED',
      trxId: trxId,
      amount: params.amount,
      service: params.service,
      redirectUrl: matchedOrder.redirect_url,
    });

    // Synchronize linked invoice, customer ledger, and generate receipt
    syncOrderToInvoiceReceipt(matchedOrder.id, trxId, params.amount, params.service, params.merchantId);
  }

  // Automatic platform subscription upgrade verification if transaction belongs to admin bKash
  try {
    autoVerifySubscriptionForTransaction({
      trxId,
      amount: params.amount,
      service: params.service,
      sender: params.sender,
      id: transactionId,
      merchantId: params.merchantId,
    });
  } catch (subErr) {
    console.error('[AUTO-VERIFY SUBSCRIPTION ERROR]', subErr);
  }

  return {
    isDuplicate: false,
    transactionId,
    matchedOrder: matchedOrder ? { id: matchedOrder.id, orderId: matchedOrder.order_id } : null,
    fraudStatus,
  };
}

export function syncOrderToInvoiceReceipt(orderId: string, trxId: string, amount: number, service: string, merchantId: string) {
  try {
    const linkedInvoice = db.prepare('SELECT * FROM invoices WHERE paid_order_id = ?').get(orderId) as any;
    if (linkedInvoice) {
      const newPaidAmount = (linkedInvoice.paid_amount || 0) + amount;
      const newDueAmount = Math.max(0, linkedInvoice.total - newPaidAmount);
      const newStatus = newDueAmount <= 0 ? 'PAID' : 'PARTIAL';

      db.prepare(`
        UPDATE invoices
        SET paid_amount = ?,
            due_amount = ?,
            status = ?,
            payment_method = ?,
            paid_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPaidAmount, newDueAmount, newStatus, service, linkedInvoice.id);

      // Resolve customer
      let customerId = linkedInvoice.customer_id;
      if (!customerId && linkedInvoice.customer_phone) {
        const cust = db.prepare('SELECT id FROM customers WHERE merchant_id = ? AND phone = ?').get(merchantId, linkedInvoice.customer_phone) as any;
        if (cust) {
          customerId = cust.id;
        } else {
          customerId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO customers (id, merchant_id, name, phone, email, customer_type)
            VALUES (?, ?, ?, ?, ?, 'Client')
          `).run(customerId, merchantId, linkedInvoice.customer_name, linkedInvoice.customer_phone, linkedInvoice.customer_email || '');
        }
        db.prepare('UPDATE invoices SET customer_id = ? WHERE id = ?').run(customerId, linkedInvoice.id);
      }

      // Check if receipt already exists for this TrxID
      const existingReceipt = db.prepare('SELECT id FROM payment_receipts WHERE trx_id = ? AND merchant_id = ?').get(trxId, merchantId) as any;
      if (!existingReceipt && customerId) {
        const receiptPrefix = 'RCPT-';
        const receiptNum = `${receiptPrefix}${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        db.prepare(`
          INSERT INTO payment_receipts (
            id, merchant_id, receipt_number, invoice_id, customer_id,
            amount_received, payment_method, trx_id, previous_due, paid_amount,
            remaining_due, payment_status, notes, payment_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, CURRENT_TIMESTAMP)
        `).run(
          crypto.randomUUID(),
          merchantId,
          receiptNum,
          linkedInvoice.id,
          customerId,
          amount,
          service,
          trxId,
          linkedInvoice.due_amount || linkedInvoice.total,
          amount,
          newDueAmount,
          `Automated checkout verification (${service})`
        );
      }

      // Update project if linked
      if (linkedInvoice.project_id) {
        db.prepare(`
          UPDATE projects
          SET paid_amount = paid_amount + ?,
              due_amount = MAX(0, project_amount - (paid_amount + ?)),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND merchant_id = ?
        `).run(amount, amount, linkedInvoice.project_id, merchantId);
      }

      // Log audit
      try {
        db.prepare(`
          INSERT INTO audit_logs (id, merchant_id, action, metadata_json)
          VALUES (?, ?, 'INVOICE_PAID_CHECKOUT', ?)
        `).run(
          crypto.randomUUID(),
          merchantId,
          JSON.stringify({ invoiceId: linkedInvoice.id, trxId, amount, status: newStatus })
        );
      } catch (logErr) {}
    }
  } catch (e) {
    console.error('[SYNC ORDER INVOICE ERROR]', e);
  }
}

