// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../database/db';
import { requireApiKey, requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { idempotencyMiddleware } from '../../middleware/idempotency';
import { standardRateLimiter, publicCheckoutRateLimiter } from '../../middleware/rateLimiter';
import { config } from '../../config';

const router = Router();

function requireAuthOrApiKey(req: AuthenticatedRequest, res: any, next: any) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ey')) {
    return requireAuth(req, res, next);
  }
  return requireApiKey(req, res, next);
}

const createLinkSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  amount: z.number().positive().optional().nullable(),
  isVariable: z.boolean().default(false),
  currency: z.string().default('BDT'),
  expiryDays: z.number().min(1).max(365).default(30),
});

const customerPayLinkSchema = z.object({
  amount: z.number().positive().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().min(11).max(14),
  customerEmail: z.string().email().optional(),
});

// Create Payment Link
router.post(
  '/',
  standardRateLimiter,
  requireAuthOrApiKey,
  idempotencyMiddleware,
  (req: AuthenticatedRequest, res) => {
    try {
      const data = createLinkSchema.parse(req.body);
      const merchantId = req.user!.id;

      if (!data.isVariable && (!data.amount || data.amount <= 0)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_AMOUNT',
          message: 'A fixed amount is required for non-variable payment links.',
        });
      }

      const id = crypto.randomUUID();
      const linkCode = 'pl_' + crypto.randomBytes(4).toString('hex');
      const expiresAt = new Date(Date.now() + data.expiryDays * 24 * 60 * 60 * 1000).toISOString();

      (db.prepare(`
        INSERT INTO payment_links (
          id, merchant_id, link_code, title, description, amount, is_variable,
          currency, status, expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `) as any).run(
        id,
        merchantId,
        linkCode,
        data.title,
        data.description || '',
        data.isVariable ? null : data.amount,
        data.isVariable ? 1 : 0,
        data.currency || 'BDT',
        expiresAt
      );

      // Audit Log
      (db.prepare(`
        INSERT INTO audit_logs (id, merchant_id, action, ip_address, user_agent, metadata_json)
        VALUES (?, ?, 'PAYMENT_LINK_CREATED', ?, ?, ?)
      `) as any).run(
        crypto.randomUUID(),
        merchantId,
        req.ip,
        req.headers['user-agent'] || '',
        JSON.stringify({ linkId: id, linkCode, title: data.title, amount: data.amount })
      );

      const publicUrl = `${config.checkoutBaseUrl}/link/${linkCode}`;

      return res.status(201).json({
        success: true,
        message: 'Payment link created successfully.',
        data: {
          id,
          linkCode,
          title: data.title,
          description: data.description,
          amount: data.isVariable ? null : data.amount,
          isVariable: data.isVariable,
          publicUrl,
          status: 'active',
          expiresAt,
        },
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to create payment link.' });
    }
  }
);

// List merchant's payment links
router.get('/', standardRateLimiter, requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const status = req.query.status as string;

  let query = 'SELECT * FROM payment_links WHERE merchant_id = ?';
  const params: any[] = [merchantId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const links = db.prepare(query).all(...params) as any[];

  // Format public URL
  const formatted = links.map((l) => ({
    ...l,
    is_variable: Boolean(l.is_variable),
    public_url: `${config.checkoutBaseUrl}/link/${l.link_code}`,
  }));

  return res.json({ success: true, count: formatted.length, data: formatted });
});

// Get single link details (Tenant isolated)
router.get('/:id', standardRateLimiter, requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const linkId = String(req.params.id);

  const link = db.prepare(`
    SELECT * FROM payment_links
    WHERE (id = ? OR link_code = ?) AND merchant_id = ?
  `).get(linkId, linkId, merchantId) as any;

  if (!link) {
    return res.status(404).json({ success: false, message: 'Payment link not found.' });
  }

  link.is_variable = Boolean(link.is_variable);
  link.public_url = `${config.checkoutBaseUrl}/link/${link.link_code}`;

  return res.json({ success: true, data: link });
});

// Toggle status (Active / Inactive)
router.patch('/:id/status', standardRateLimiter, requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const linkId = String(req.params.id);
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Use active or inactive.' });
  }

  const result = db.prepare(`
    UPDATE payment_links
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND merchant_id = ?
  `).run(status, linkId, merchantId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: 'Payment link not found.' });
  }

  return res.json({ success: true, message: `Payment link ${status === 'active' ? 'activated' : 'deactivated'}.` });
});

// Delete payment link
router.delete('/:id', standardRateLimiter, requireAuthOrApiKey, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const linkId = String(req.params.id);

  const result = db.prepare('DELETE FROM payment_links WHERE id = ? AND merchant_id = ?').run(linkId, merchantId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: 'Payment link not found.' });
  }

  return res.json({ success: true, message: 'Payment link deleted successfully.' });
});

// ==========================================
// PUBLIC CUSTOMER-FACING ENDPOINTS
// ==========================================

// Public Resolver: Customer opens payment link
router.get('/public/:code', publicCheckoutRateLimiter, (req, res) => {
  const code = String(req.params.code);

  const link = db.prepare(`
    SELECT pl.id, pl.link_code, pl.title, pl.description, pl.amount,
           pl.is_variable, pl.currency, pl.status, pl.expires_at,
           m.business_name, m.email as merchant_email
    FROM payment_links pl
    JOIN merchants m ON pl.merchant_id = m.id
    WHERE pl.link_code = ?
  `).get(code) as any;

  if (!link) {
    return res.status(404).json({ success: false, message: 'Payment link not found or expired.' });
  }

  if (link.status !== 'active') {
    return res.status(403).json({ success: false, message: 'This payment link is currently disabled.' });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    db.prepare("UPDATE payment_links SET status = 'expired' WHERE id = ?").run(link.id);
    return res.status(410).json({ success: false, message: 'This payment link has expired.' });
  }

  // Increment view counter
  db.prepare('UPDATE payment_links SET views_count = views_count + 1 WHERE id = ?').run(link.id);

  link.is_variable = Boolean(link.is_variable);

  return res.json({ success: true, data: link });
});

// Public Pay: Customer proceeds to pay via link -> generates order
router.post('/public/:code/pay', publicCheckoutRateLimiter, (req, res) => {
  try {
    const code = String(req.params.code);
    const data = customerPayLinkSchema.parse(req.body);

    const link = db.prepare(`
      SELECT pl.id, pl.merchant_id, pl.amount, pl.is_variable, pl.status, pl.expires_at
      FROM payment_links pl
      WHERE pl.link_code = ?
    `).get(code) as any;

    if (!link) {
      return res.status(404).json({ success: false, message: 'Payment link not found.' });
    }

    if (link.status !== 'active' || (link.expires_at && new Date(link.expires_at) < new Date())) {
      return res.status(400).json({ success: false, message: 'Payment link is not active.' });
    }

    const payableAmount = link.is_variable ? data.amount : link.amount;
    if (!payableAmount || payableAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    const orderId = 'ORD-PL-' + Math.floor(100000 + Math.random() * 900000);
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 minutes expiry

    (db.prepare(`
      INSERT INTO payment_orders (
        id, merchant_id, order_id, amount, customer_name, customer_phone,
        customer_email, status, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `) as any).run(
      id,
      link.merchant_id,
      orderId,
      payableAmount,
      data.customerName || '',
      data.customerPhone,
      data.customerEmail || '',
      expiresAt
    );

    const checkoutUrl = `${config.checkoutBaseUrl}/pay/${id}`;

    return res.status(201).json({
      success: true,
      message: 'Payment order created. Redirecting to checkout...',
      data: {
        paymentId: id,
        orderId,
        amount: payableAmount,
        checkoutUrl,
        expiresAt,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to create payment order.' });
  }
});

export default router;
