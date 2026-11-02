// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../database/db';
import { config } from '../../config';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  businessName: z.string().min(2),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register new merchant
router.post('/register', (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = db.prepare('SELECT id FROM merchants WHERE email = ?').get(data.email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const merchantId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(data.password, 10);

    db.prepare(`
      INSERT INTO merchants (id, email, password_hash, business_name, phone, role, status)
      VALUES (?, ?, ?, ?, ?, 'merchant', 'active')
    `).run(merchantId, data.email, passwordHash, data.businessName, data.phone || '');

    // Issue 14-day Free Trial Subscription
    const subId = crypto.randomUUID();
    const licenseKey = 'PV-TRIAL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const expires = new Date();
    expires.setDate(expires.getDate() + 14); // 14-day trial

    db.prepare(`
      INSERT INTO subscriptions (id, merchant_id, plan, license_key, max_devices, max_monthly_txns, expires_at)
      VALUES (?, ?, 'trial', ?, 2, 2000, ?)
    `).run(subId, merchantId, licenseKey, expires.toISOString());

    // Generate Initial Live API Key
    const apiKeyRaw = 'pv_live_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
    db.prepare(`
      INSERT INTO api_keys (id, merchant_id, key_prefix, key_hash, label)
      VALUES (?, ?, ?, ?, 'Default Live Key')
    `).run(crypto.randomUUID(), merchantId, apiKeyRaw.substring(0, 12), keyHash);

    const token = jwt.sign(
      { id: merchantId, email: data.email, role: 'merchant', businessName: data.businessName },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        token,
        merchant: {
          id: merchantId,
          email: data.email,
          businessName: data.businessName,
          role: 'merchant',
        },
        subscription: {
          plan: 'trial',
          licenseKey,
          expiresAt: expires.toISOString(),
        },
        apiKey: apiKeyRaw, // Shown only once upon registration
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Invalid input data.' });
  }
});

// Login merchant
router.post('/login', (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const merchant = db.prepare(`
      SELECT id, email, password_hash, business_name, role, status
      FROM merchants
      WHERE email = ?
    `).get(data.email) as any;

    if (!merchant) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (merchant.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Merchant account is suspended. Please contact support.' });
    }

    const isMatch = bcrypt.compareSync(data.password, merchant.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: merchant.id, email: merchant.email, role: merchant.role, businessName: merchant.business_name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const subscription = db.prepare(`
      SELECT plan, license_key, max_devices, max_monthly_txns, expires_at, status
      FROM subscriptions
      WHERE merchant_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(merchant.id) as any;

    return res.json({
      success: true,
      data: {
        token,
        merchant: {
          id: merchant.id,
          email: merchant.email,
          businessName: merchant.business_name,
          role: merchant.role,
        },
        subscription,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Login failed.' });
  }
});

// Get current merchant profile
router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;

  const merchant = db.prepare(`
    SELECT id, email, business_name, phone, role, status, created_at
    FROM merchants
    WHERE id = ?
  `).get(merchantId) as any;

  const subscription = db.prepare(`
    SELECT plan, license_key, max_devices, max_monthly_txns, starts_at, expires_at, status
    FROM subscriptions
    WHERE merchant_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(merchantId) as any;

  let enrichedSub: any = subscription || null;
  if (subscription) {
    const isExpired = subscription.status === 'expired' || new Date(subscription.expires_at) < new Date();
    const isTrial = subscription.plan === 'trial';
    const now = Date.now();
    const expiresMs = new Date(subscription.expires_at).getTime();
    const daysRemaining = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
    const hoursRemaining = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60)));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthTxns = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount
      FROM transactions
      WHERE merchant_id = ? AND created_at >= ?
    `).get(merchantId, startOfMonth.toISOString()) as any;

    enrichedSub = {
      ...subscription,
      isTrial,
      isExpired,
      daysRemaining,
      hoursRemaining,
      txnsUsedThisMonth: monthTxns?.count || 0,
      txnsLimit: subscription.max_monthly_txns,
      devicesLimit: subscription.max_devices,
    };
  }

  const deviceCount = db.prepare('SELECT COUNT(*) as count FROM devices WHERE merchant_id = ?').get(merchantId) as any;
  const activeKeys = db.prepare('SELECT id, key_prefix, label, created_at, last_used_at FROM api_keys WHERE merchant_id = ? AND is_active = 1').all(merchantId);

  return res.json({
    success: true,
    data: {
      merchant,
      subscription: enrichedSub,
      deviceCount: deviceCount?.count || 0,
      apiKeys: activeKeys,
    },
  });
});

// Generate a new live API key for the merchant
router.post('/api-keys/generate', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const merchantId = req.user!.id;
    const label = (req.body && req.body.label && String(req.body.label).trim()) || 'Live API Key';

    const apiKeyRaw = 'pv_live_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO api_keys (id, merchant_id, key_prefix, key_hash, label, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, merchantId, apiKeyRaw.substring(0, 12), keyHash, label);

    return res.status(201).json({
      success: true,
      message: 'New API Key generated successfully.',
      data: {
        id,
        keyPrefix: apiKeyRaw.substring(0, 12),
        apiKey: apiKeyRaw, // Provided once upon creation
        label,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate API key.' });
  }
});

// Revoke/Deactivate an API key
router.delete('/api-keys/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const keyId = String(req.params.id);

  const result = db.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ? AND merchant_id = ?').run(keyId, merchantId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: 'API key not found.' });
  }

  return res.json({ success: true, message: 'API key deactivated successfully.' });
});

export default router;
