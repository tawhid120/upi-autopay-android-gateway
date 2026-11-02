// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../database/db';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { sendWebhookHttp } from './webhook.service';

const router = Router();

const updateWebhookSchema = z.object({
  url: z.string().url(),
  isActive: z.boolean().default(true),
});

// Get merchant's webhook configuration
router.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;

  let webhook = db.prepare(`
    SELECT id, url, secret_key, is_active, events_json, created_at
    FROM webhooks
    WHERE merchant_id = ?
  `).get(merchantId) as any;

  if (!webhook) {
    // Auto-create initial webhook container with secret key
    const id = crypto.randomUUID();
    const secretKey = 'whsec_' + crypto.randomBytes(24).toString('hex');
    db.prepare(`
      INSERT INTO webhooks (id, merchant_id, url, secret_key, is_active)
      VALUES (?, ?, '', ?, 1)
    `).run(id, merchantId, secretKey);

    webhook = { id, url: '', secret_key: secretKey, is_active: 1 };
  }

  return res.json({ success: true, data: webhook });
});

// Update or set webhook URL
router.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const data = updateWebhookSchema.parse(req.body);
    const merchantId = req.user!.id;

    let webhook = db.prepare('SELECT id FROM webhooks WHERE merchant_id = ?').get(merchantId) as any;

    if (webhook) {
      db.prepare(`
        UPDATE webhooks
        SET url = ?, is_active = ?
        WHERE id = ?
      `).run(data.url, data.isActive ? 1 : 0, webhook.id);
    } else {
      const id = crypto.randomUUID();
      const secretKey = 'whsec_' + crypto.randomBytes(24).toString('hex');
      db.prepare(`
        INSERT INTO webhooks (id, merchant_id, url, secret_key, is_active)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, merchantId, data.url, secretKey, data.isActive ? 1 : 0);
    }

    return res.json({ success: true, message: 'Webhook settings saved successfully!' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Regenerate webhook signing secret
router.post('/regenerate-secret', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const newSecret = 'whsec_' + crypto.randomBytes(24).toString('hex');

  db.prepare(`
    UPDATE webhooks SET secret_key = ? WHERE merchant_id = ?
  `).run(newSecret, merchantId);

  return res.json({
    success: true,
    message: 'Webhook secret key rotated successfully!',
    data: { secretKey: newSecret },
  });
});

// List recent webhook delivery logs
router.get('/deliveries', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

  const deliveries = db.prepare(`
    SELECT d.id, d.order_id, d.event_type, d.payload_json, d.status_code,
           d.response_body, d.attempt, d.status, d.created_at
    FROM webhook_deliveries d
    JOIN webhooks w ON d.webhook_id = w.id
    WHERE w.merchant_id = ?
    ORDER BY d.created_at DESC LIMIT ?
  `).all(merchantId, limit);

  return res.json({ success: true, count: deliveries.length, data: deliveries });
});

function requireAuthOrApiKey(req: AuthenticatedRequest, res: any, next: any) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ey')) {
    return requireAuth(req, res, next);
  }
  return requireAuth(req, res, next);
}

// Manual 1-click retry/resend for a webhook delivery
const handleResend = (req: AuthenticatedRequest, res: any) => {
  const merchantId = req.user!.id;
  const deliveryId = String(req.params.id);

  const delivery = db.prepare(`
    SELECT d.id, d.payload_json, d.attempt, w.url, w.secret_key
    FROM webhook_deliveries d
    JOIN webhooks w ON d.webhook_id = w.id
    WHERE d.id = ? AND w.merchant_id = ?
  `).get(deliveryId, merchantId) as any;

  if (!delivery) {
    return res.status(404).json({ success: false, message: 'Delivery record not found.' });
  }

  const nextAttempt = (delivery.attempt || 1) + 1;

  // Reset status to PENDING and increment attempt counter
  db.prepare(`
    UPDATE webhook_deliveries
    SET attempt = ?, status = 'PENDING', next_retry_at = NULL
    WHERE id = ?
  `).run(nextAttempt, delivery.id);

  // Audit Log
  (db.prepare(`
    INSERT INTO audit_logs (id, merchant_id, action, ip_address, user_agent, metadata_json)
    VALUES (?, ?, 'WEBHOOK_MANUALLY_RESENT', ?, ?, ?)
  `) as any).run(
    crypto.randomUUID(),
    merchantId,
    req.ip,
    req.headers['user-agent'] || '',
    JSON.stringify({ deliveryId: delivery.id, attempt: nextAttempt })
  );

  sendWebhookHttp(delivery.id, delivery.url, delivery.secret_key, delivery.payload_json, nextAttempt);

  return res.json({
    success: true,
    message: `Resending webhook (Attempt #${nextAttempt})...`,
    data: { deliveryId: delivery.id, attempt: nextAttempt }
  });
};

router.post('/deliveries/:id/retry', requireAuth, handleResend);
router.post('/deliveries/:id/resend', requireAuth, handleResend);

export default router;
