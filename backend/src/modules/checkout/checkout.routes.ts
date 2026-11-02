// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../database/db';
import { registerCheckoutStream } from './checkout.service';
import { dispatchWebhookForOrder } from '../webhooks/webhook.service';
import { syncOrderToInvoiceReceipt } from '../payments/payment.service';

const router = Router();

const submitTrxSchema = z.object({
  trxId: z.string().min(4),
  service: z.enum(['bKash', 'Nagad', 'Rocket', 'Upay']),
  senderPhone: z.string().optional(),
});

// Get Hosted Checkout session details (Public endpoint for buyer)
router.get('/session/:id', (req, res) => {
  const orderId = req.params.id;

  const order = db.prepare(`
    SELECT o.id, o.order_id, o.amount, o.customer_name, o.customer_phone,
           o.status, o.redirect_url, o.cancel_url, o.expires_at, o.matched_trx_id,
           m.business_name
    FROM payment_orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE o.id = ?
  `).get(orderId) as any;

  if (!order) {
    return res.status(404).json({ success: false, message: 'Payment session not found.' });
  }

  // Auto-expire check
  if (order.status === 'PENDING' && new Date(order.expires_at) < new Date()) {
    db.prepare("UPDATE payment_orders SET status = 'EXPIRED' WHERE id = ?").run(order.id);
    order.status = 'EXPIRED';
  }

  // Fetch active MFS accounts for this merchant
  const mfsAccounts = db.prepare(`
    SELECT provider, account_type, account_number, instructions
    FROM mfs_accounts
    WHERE merchant_id = (SELECT merchant_id FROM payment_orders WHERE id = ?) AND is_active = 1
  `).all(orderId);

  // Check if merchant relay device is online
  const devices = db.prepare(`
    SELECT is_online, last_heartbeat FROM devices
    WHERE merchant_id = (SELECT merchant_id FROM payment_orders WHERE id = ?)
  `).all(orderId) as any[];
  const isDeviceOnline = devices.some((d) => {
    if (!d.last_heartbeat) return false;
    const iso = d.last_heartbeat.endsWith('Z') || d.last_heartbeat.includes('+') ? d.last_heartbeat : d.last_heartbeat.replace(' ', 'T') + 'Z';
    return d.is_online === 1 && Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000)) <= 25;
  });

  return res.json({
    success: true,
    data: {
      order: {
        id: order.id,
        orderId: order.order_id,
        businessName: order.business_name,
        amount: order.amount,
        status: order.status,
        expiresAt: order.expires_at,
        redirectUrl: order.redirect_url,
        matchedTrxId: order.matched_trx_id,
      },
      mfsAccounts,
      isDeviceOnline,
    },
  });
});

// Buyer submits TrxID directly on hosted checkout page
router.post('/session/:id/submit-trx', (req, res) => {
  try {
    const orderId = req.params.id;
    const data = submitTrxSchema.parse(req.body);
    const trxId = data.trxId.trim().toUpperCase();

    const order = db.prepare(`
      SELECT id, merchant_id, order_id, amount, status, expires_at, redirect_url
      FROM payment_orders
      WHERE id = ?
    `).get(orderId) as any;

    if (!order) {
      return res.status(404).json({ success: false, message: 'Payment session not found.' });
    }

    if (order.status === 'VERIFIED') {
      return res.json({
        success: true,
        verified: true,
        message: 'Payment already verified.',
        redirectUrl: order.redirect_url,
      });
    }

    if (order.status === 'EXPIRED') {
      return res.status(400).json({ success: false, message: 'Payment session has expired.' });
    }

    // Check if the transaction has already arrived in our database
    const matchingTrx = db.prepare(`
      SELECT id, trx_id, amount, service, sender, matched_order_id
      FROM transactions
      WHERE trx_id = ? AND merchant_id = ?
    `).get(trxId, order.merchant_id) as any;

    if (!matchingTrx) {
      // Payment has not arrived from phone yet, check device status
      const devices = db.prepare(`SELECT is_online, last_heartbeat FROM devices WHERE merchant_id = ?`).all(order.merchant_id) as any[];
      const isDeviceOnline = devices.some((d) => {
        if (!d.last_heartbeat) return false;
        const iso = d.last_heartbeat.endsWith('Z') || d.last_heartbeat.includes('+') ? d.last_heartbeat : d.last_heartbeat.replace(' ', 'T') + 'Z';
        return d.is_online === 1 && Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000)) <= 25;
      });

      if (!isDeviceOnline) {
        return res.json({
          success: true,
          verified: false,
          isDeviceOffline: true,
          message: "Admin mobile device is currently offline. Your Transaction ID has been recorded and will verify automatically once the mobile device reconnects.",
        });
      }

      return res.json({
        success: true,
        verified: false,
        isDeviceOffline: false,
        message: 'TrxID received. Waiting for SMS verification from mobile device...',
      });
    }

    // Check if TrxID was already used by another order
    if (matchingTrx.matched_order_id && matchingTrx.matched_order_id !== order.id) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Transaction ID already utilized (Duplicate replay rejected).',
      });
    }

    // Amount match validation
    if (matchingTrx.amount < order.amount) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Insufficient payment amount. Received: ৳${matchingTrx.amount}, Expected: ৳${order.amount}`,
      });
    }

    // Verify order
    db.prepare(`
      UPDATE payment_orders
      SET status = 'VERIFIED',
          matched_trx_id = ?,
          matched_provider = ?,
          matched_sender = ?,
          verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(trxId, matchingTrx.service, matchingTrx.sender, order.id);

    db.prepare('UPDATE transactions SET matched_order_id = ? WHERE id = ?').run(order.id, matchingTrx.id);

    // Dispatch Webhook
    dispatchWebhookForOrder(order.id, 'payment.verified', {
      orderId: order.order_id,
      payVerifyOrderId: order.id,
      trxId: trxId,
      amount: matchingTrx.amount,
      service: matchingTrx.service,
      sender: matchingTrx.sender,
      verifiedAt: new Date().toISOString(),
    });

    // Synchronize linked invoice, customer ledger, and generate receipt
    syncOrderToInvoiceReceipt(order.id, trxId, matchingTrx.amount, matchingTrx.service, order.merchant_id);

    return res.json({
      success: true,
      verified: true,
      message: 'Payment verified successfully!',
      data: {
        trxId,
        amount: matchingTrx.amount,
        service: matchingTrx.service,
        redirectUrl: order.redirect_url,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// SSE Stream for live real-time buyer browser status updates
router.get('/session/:id/stream', (req, res) => {
  const orderId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ event: 'connected', orderId })}\n\n`);

  registerCheckoutStream(orderId, res);
});

export default router;
