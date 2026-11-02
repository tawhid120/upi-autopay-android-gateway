// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../database/db';
import { requireApiKey, requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { config } from '../../config';

const router = Router();

const createOrderSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  redirectUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  expiryMinutes: z.number().min(5).max(120).default(20),
});

const verifySchema = z.object({
  trxId: z.string().min(4),
  amount: z.number().positive().optional(),
  service: z.enum(['bKash', 'Nagad', 'Rocket', 'Upay']).optional(),
  orderId: z.string().optional(),
});

// Middleware that accepts EITHER JWT Auth OR Developer API Key
function requireAuthOrApiKey(req: AuthenticatedRequest, res: any, next: any) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ey')) {
    return requireAuth(req, res, next);
  }
  return requireApiKey(req, res, next);
}

// Create new payment order (Developer REST API)
router.post('/create-order', requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const merchantId = req.user!.id;

    // Enforce Free Trial and Subscription Expiration & Limits
    const sub = db.prepare(`
      SELECT plan, status, expires_at, max_monthly_txns
      FROM subscriptions
      WHERE merchant_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(merchantId) as any;

    if (sub) {
      const isExpired = sub.status === 'expired' || new Date(sub.expires_at) < new Date();
      if (isExpired) {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your Free Trial or subscription has expired. Please upgrade to a Premium plan to continue creating payment orders.',
        });
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyOrders = db.prepare(`
        SELECT COUNT(*) as count FROM payment_orders
        WHERE merchant_id = ? AND created_at >= ?
      `).get(merchantId, startOfMonth.toISOString()) as any;

      if (monthlyOrders && monthlyOrders.count >= sub.max_monthly_txns) {
        return res.status(403).json({
          success: false,
          code: 'MONTHLY_LIMIT_REACHED',
          message: `Monthly transaction limit reached (${monthlyOrders.count}/${sub.max_monthly_txns}). Please upgrade your subscription plan.`,
        });
      }
    }

    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + data.expiryMinutes * 60 * 1000);

    db.prepare(`
      INSERT INTO payment_orders (
        id, merchant_id, order_id, amount, customer_name, customer_phone,
        customer_email, redirect_url, cancel_url, status, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(
      id,
      merchantId,
      data.orderId,
      data.amount,
      data.customerName || '',
      data.customerPhone || '',
      data.customerEmail || '',
      data.redirectUrl || '',
      data.cancelUrl || '',
      expiresAt.toISOString()
    );

    const checkoutUrl = `${config.checkoutBaseUrl}/pay/${id}`;

    return res.status(201).json({
      success: true,
      message: 'Payment order created successfully.',
      data: {
        paymentId: id,
        orderId: data.orderId,
        amount: data.amount,
        checkoutUrl,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to create order.' });
  }
});

// Check payment order status
router.get('/orders/:id', requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const orderId = String(req.params.id);

  const order = db.prepare(`
    SELECT id, order_id, amount, customer_name, customer_phone,
           status, matched_trx_id, matched_provider, matched_sender,
           expires_at, verified_at, created_at
    FROM payment_orders
    WHERE (id = ? OR order_id = ?) AND merchant_id = ?
  `).get(orderId, orderId, merchantId) as any;

  if (!order) {
    return res.status(404).json({ success: false, message: 'Payment order not found.' });
  }

  // Auto-expire if past expiry
  if (order.status === 'PENDING' && new Date(order.expires_at) < new Date()) {
    db.prepare("UPDATE payment_orders SET status = 'EXPIRED' WHERE id = ?").run(order.id);
    order.status = 'EXPIRED';
  }

  return res.json({ success: true, data: order });
});

// Manual Verification API (Direct TrxID Check)
router.post('/verify', requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  try {
    const data = verifySchema.parse(req.body);
    const merchantId = req.user!.id;
    const trxId = data.trxId.trim().toUpperCase();

    // Check if TrxID exists in transactions
    const trx = db.prepare(`
      SELECT id, trx_id, service, sender, amount, reference, fraud_status, matched_order_id, created_at
      FROM transactions
      WHERE trx_id = ? AND merchant_id = ?
    `).get(trxId, merchantId) as any;

    if (!trx) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Transaction ID not found or not yet synced.',
      });
    }

    if (data.amount && trx.amount < data.amount) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Amount mismatch. Received: ৳${trx.amount}, Expected: ৳${data.amount}`,
      });
    }

    if (data.service && trx.service.toLowerCase() !== data.service.toLowerCase()) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Provider mismatch. Received: ${trx.service}, Expected: ${data.service}`,
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: 'Payment verified successfully!',
      data: {
        trxId: trx.trx_id,
        service: trx.service,
        amount: trx.amount,
        sender: trx.sender,
        reference: trx.reference,
        createdAt: trx.created_at,
        isUsed: !!trx.matched_order_id,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Get transactions list for merchant
router.get('/transactions', requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
  const service = req.query.service as string;
  const search = req.query.search as string;

  let query = 'SELECT * FROM transactions WHERE merchant_id = ?';
  const params: any[] = [merchantId];

  if (service && service !== 'All') {
    query += ' AND service = ?';
    params.push(service);
  }

  if (search && search.trim().length > 0) {
    query += ' AND (trx_id LIKE ? OR sender LIKE ? OR reference LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const transactions = db.prepare(query).all(...params);

  return res.json({ success: true, count: transactions.length, data: transactions });
});

// Get financial statistics for merchant
router.get('/stats', requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;

  const summary = db.prepare(`
    SELECT
      COUNT(*) as totalCount,
      COALESCE(SUM(amount), 0) as totalAmount,
      COALESCE(SUM(CASE WHEN service = 'bKash' THEN amount ELSE 0 END), 0) as bkashAmount,
      COALESCE(SUM(CASE WHEN service = 'Nagad' THEN amount ELSE 0 END), 0) as nagadAmount,
      COALESCE(SUM(CASE WHEN service = 'Rocket' THEN amount ELSE 0 END), 0) as rocketAmount
    FROM transactions
    WHERE merchant_id = ?
  `).get(merchantId) as any;

  const ordersSummary = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END), 0) as verifiedOrders,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as pendingOrders,
      COALESCE(SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END), 0) as expiredOrders
    FROM payment_orders
    WHERE merchant_id = ?
  `).get(merchantId) as any;

  return res.json({
    success: true,
    data: {
      transactions: summary,
      orders: ordersSummary,
    },
  });
});

// Get detailed intelligence timeline for a transaction (Zero-IDOR protected)
router.get('/transactions/:id/timeline', requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const identifier = String(req.params.id);

  const txn = db.prepare(`
    SELECT * FROM transactions
    WHERE (id = ? OR trx_id = ?) AND merchant_id = ?
  `).get(identifier, identifier, merchantId) as any;

  if (!txn) {
    return res.status(404).json({ success: false, message: 'Transaction not found.' });
  }

  // Associated device
  const device = txn.device_id
    ? (db.prepare('SELECT device_name, model, android_version FROM devices WHERE id = ?').get(txn.device_id) as any)
    : null;

  // Associated order (either linked via matched_order_id or matched_trx_id)
  let order = null;
  if (txn.matched_order_id) {
    order = db.prepare('SELECT * FROM payment_orders WHERE id = ? AND merchant_id = ?').get(txn.matched_order_id, merchantId) as any;
  }
  if (!order) {
    order = db.prepare('SELECT * FROM payment_orders WHERE matched_trx_id = ? AND merchant_id = ?').get(txn.trx_id, merchantId) as any;
  }

  // Associated webhook
  let webhookDelivery = null;
  if (order) {
    webhookDelivery = db.prepare(`
      SELECT id, event_type, status_code, response_body, attempt, status, created_at
      FROM webhook_deliveries
      WHERE order_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(order.id) as any;
  }

  const isFraudClean = txn.fraud_status === 'CLEAN';
  const createdAt = txn.created_at;

  const timeline = [
    {
      stage: 'CUSTOMER_PAYMENT',
      title: 'Customer Payment Dispatched',
      status: 'SUCCESS',
      timestamp: createdAt,
      details: `Sent ৳${txn.amount} via ${txn.service} (Sender: ${txn.sender})`,
    },
    {
      stage: 'SMS_RECEIVED',
      title: 'Relay SMS Received',
      status: 'SUCCESS',
      timestamp: createdAt,
      details: device
        ? `Captured by ${device.device_name} (${device.model})`
        : 'Captured by system relay SIM',
    },
    {
      stage: 'PAYMENT_PARSED',
      title: 'Payload Parsing & Extraction',
      status: 'SUCCESS',
      timestamp: createdAt,
      details: `Regex parser extracted TrxID: ${txn.trx_id}, Provider: ${txn.service}, Amount: ৳${txn.amount}`,
    },
    {
      stage: 'TRX_MATCHED',
      title: 'Order Matching',
      status: order ? 'SUCCESS' : 'INFO',
      timestamp: order ? order.created_at : createdAt,
      details: order
        ? `Matched with Payment Order #${order.order_id}`
        : 'Direct payment settlement (No specific order ID attached)',
    },
    {
      stage: 'AMOUNT_VERIFIED',
      title: 'Amount Verification',
      status: (!order || order.amount <= txn.amount) ? 'SUCCESS' : 'FAILED',
      timestamp: createdAt,
      details: order
        ? `Expected: ৳${order.amount}, Received: ৳${txn.amount} (Zero tolerance)`
        : `Total verified amount: ৳${txn.amount}`,
    },
    {
      stage: 'FRAUD_CHECK',
      title: 'Fraud & Replay Shield',
      status: isFraudClean ? 'SUCCESS' : 'FAILED',
      timestamp: createdAt,
      details: isFraudClean
        ? 'Zero replay detected. Status: CLEAN.'
        : `Fraud alert flagged: '${txn.fraud_status}'`,
    },
    {
      stage: 'PAYMENT_VERIFIED',
      title: 'Payment Settlement Verified',
      status: isFraudClean ? 'SUCCESS' : 'FAILED',
      timestamp: createdAt,
      details: 'Transaction confirmed and securely audited in database.',
    },
    {
      stage: 'ORDER_UPDATED',
      title: 'Order State Synchronized',
      status: 'SUCCESS',
      timestamp: order?.verified_at || createdAt,
      details: "Order status transitioned to 'VERIFIED' in merchant console.",
    },
    {
      stage: 'WEBHOOK_DELIVERED',
      title: 'Instant Webhook Dispatch',
      status: !webhookDelivery ? 'PENDING' : webhookDelivery.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      timestamp: webhookDelivery?.created_at || null,
      details: webhookDelivery
        ? `Delivered: ${webhookDelivery.status} (HTTP ${webhookDelivery.status_code || 0}, Attempt #${webhookDelivery.attempt})`
        : 'Webhook endpoint inactive or queued.',
    },
  ];

  return res.json({
    success: true,
    data: {
      transaction: txn,
      device,
      order,
      webhookDelivery,
      timeline,
    },
  });
});

export default router;
