// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../database/db';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';
import {
  getPlatformAdminMerchant,
  applySubscriptionUpgrade,
  SUBSCRIPTION_PLANS,
} from '../subscriptions/subscription.service';

const router = Router();

// Apply Admin Auth check to all routes in this file
router.use(requireAuth, requireAdmin);

// Super Admin Overview
router.get('/overview', (req: AuthenticatedRequest, res) => {
  const merchantStats = db.prepare(`
    SELECT
      COUNT(*) as totalMerchants,
      COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as activeMerchants,
      COALESCE(SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END), 0) as suspendedMerchants
    FROM merchants
    WHERE role != 'admin'
  `).get() as any;

  const deviceStats = db.prepare(`
    SELECT
      COUNT(*) as totalDevices,
      COALESCE(SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END), 0) as onlineDevices
    FROM devices
  `).get() as any;

  const transactionStats = db.prepare(`
    SELECT
      COUNT(*) as totalTransactions,
      COALESCE(SUM(amount), 0) as totalVolume
    FROM transactions
  `).get() as any;

  const recentMerchants = db.prepare(`
    SELECT m.id, m.email, m.business_name, m.status, m.created_at, s.plan, s.expires_at
    FROM merchants m
    LEFT JOIN subscriptions s ON m.id = s.merchant_id
    WHERE m.role != 'admin'
    ORDER BY m.created_at DESC LIMIT 5
  `).all();

  return res.json({
    success: true,
    data: {
      merchants: merchantStats,
      devices: deviceStats,
      transactions: transactionStats,
      recentMerchants,
    },
  });
});

// List all merchants
router.get('/merchants', (req: AuthenticatedRequest, res) => {
  const merchants = db.prepare(`
    SELECT m.id, m.email, m.business_name, m.phone, m.role, m.status, m.created_at,
           s.plan, s.license_key, s.max_devices, s.expires_at,
           (SELECT COUNT(*) FROM devices WHERE merchant_id = m.id) as device_count,
           (SELECT COUNT(*) FROM transactions WHERE merchant_id = m.id) as transaction_count,
           (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE merchant_id = m.id) as total_volume
    FROM merchants m
    LEFT JOIN subscriptions s ON m.id = s.merchant_id
    WHERE m.role != 'admin'
    ORDER BY m.created_at DESC
  `).all();

  return res.json({ success: true, count: merchants.length, data: merchants });
});

// Suspend or Activate a merchant
router.patch('/merchants/:id/status', (req: AuthenticatedRequest, res) => {
  const merchantId = String(req.params.id);
  const status = String(req.body.status); // 'active' | 'suspended'

  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  db.prepare('UPDATE merchants SET status = ? WHERE id = ?').run(status, merchantId);

  return res.json({
    success: true,
    message: `Merchant account ${status === 'active' ? 'activated' : 'suspended'} successfully.`,
  });
});

// Modify merchant subscription plan or license
router.post('/merchants/:id/subscription', (req: AuthenticatedRequest, res) => {
  const merchantId = String(req.params.id);
  const { plan, maxDevices, extendDays } = req.body;

  const sub = db.prepare('SELECT id, expires_at FROM subscriptions WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 1').get(merchantId) as any;

  if (!sub) {
    return res.status(404).json({ success: false, message: 'Subscription record not found.' });
  }

  let expiresAt = new Date(sub.expires_at);
  if (extendDays && typeof extendDays === 'number') {
    expiresAt.setDate(expiresAt.getDate() + extendDays);
  }

  db.prepare(`
    UPDATE subscriptions
    SET plan = COALESCE(?, plan),
        max_devices = COALESCE(?, max_devices),
        expires_at = ?,
        status = 'active'
    WHERE id = ?
  `).run(plan || null, maxDevices || null, expiresAt.toISOString(), sub.id);

  return res.json({ success: true, message: 'Subscription updated successfully!' });
});

// List all subscription upgrade payment requests (with fraud detection & SMS cross-check)
router.get('/subscription-requests', (req: AuthenticatedRequest, res) => {
  const statusFilter = req.query.status as string; // 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'

  let query = `
    SELECT
      s.id, s.merchant_id, s.plan, s.amount, s.bkash_number, s.status,
      s.trx_id, s.payment_order_id, s.duration_days, s.expires_at,
      s.verified_at, s.rejection_reason, s.created_at,
      m.email as merchant_email, m.business_name as merchant_name, m.phone as merchant_phone
    FROM subscription_orders s
    JOIN merchants m ON s.merchant_id = m.id
  `;
  const params: any[] = [];

  if (statusFilter && statusFilter !== 'ALL') {
    query += ' WHERE s.status = ?';
    params.push(statusFilter);
  }

  query += ' ORDER BY s.created_at DESC LIMIT 100';

  const requests = db.prepare(query).all(...params) as any[];

  const admin = getPlatformAdminMerchant();
  const adminId = admin ? admin.id : null;

  const data = requests.map((r) => {
    let matchedTxn = null;
    let isFoundInRelaySms = false;

    if (r.trx_id && adminId) {
      matchedTxn = db.prepare(`
        SELECT id, trx_id, service, sender, amount, created_at
        FROM transactions
        WHERE trx_id = ? AND merchant_id = ?
      `).get(r.trx_id.trim().toUpperCase(), adminId) as any;

      if (matchedTxn) {
        isFoundInRelaySms = true;
      }
    }

    return {
      ...r,
      isFoundInRelaySms,
      matchedTxn,
    };
  });

  return res.json({
    success: true,
    count: data.length,
    pendingCount: data.filter((d) => d.status === 'PENDING').length,
    data,
  });
});

// Approve subscription payment request manually
router.post('/subscription-requests/:id/approve', (req: AuthenticatedRequest, res) => {
  const requestId = String(req.params.id);

  const order = db.prepare('SELECT * FROM subscription_orders WHERE id = ?').get(requestId) as any;
  if (!order) {
    return res.status(404).json({ success: false, message: 'Subscription request not found.' });
  }

  if (order.status === 'VERIFIED') {
    return res.status(400).json({ success: false, message: 'Request is already verified and active.' });
  }

  const trxId = order.trx_id || `MANUAL-${Date.now()}`;

  const result = applySubscriptionUpgrade(order, {
    trx_id: trxId,
    amount: order.amount,
    service: 'bKash',
    sender: 'Admin Manual Approval',
  });

  return res.json({
    success: true,
    message: `Subscription approved successfully. Upgraded merchant to ${order.plan.toUpperCase()}.`,
    data: result,
  });
});

// Reject subscription request manually (Flag as fake / invalid)
router.post('/subscription-requests/:id/reject', (req: AuthenticatedRequest, res) => {
  const requestId = String(req.params.id);
  const reason = (req.body && req.body.reason && String(req.body.reason).trim()) || 'Invalid or unverified bKash Transaction ID';

  const order = db.prepare('SELECT * FROM subscription_orders WHERE id = ?').get(requestId) as any;
  if (!order) {
    return res.status(404).json({ success: false, message: 'Subscription request not found.' });
  }

  db.prepare(`
    UPDATE subscription_orders
    SET status = 'REJECTED',
        rejection_reason = ?
    WHERE id = ?
  `).run(reason, requestId);

  if (order.payment_order_id) {
    db.prepare("UPDATE payment_orders SET status = 'FAILED' WHERE id = ?").run(order.payment_order_id);
  }

  return res.json({
    success: true,
    message: 'Subscription payment request rejected.',
  });
});

// App Releases Management (Admin Only)
router.get('/app-releases', (req: AuthenticatedRequest, res) => {
  try {
    const releases = db.prepare(`
      SELECT id, version_name, version_code, download_url, changelog, min_version_code, is_force_update, is_active, release_date, created_at, updated_at
      FROM app_releases
      ORDER BY version_code DESC, created_at DESC
    `).all();

    const activeRelease = releases.find((r: any) => (r as any).is_active === 1) || releases[0] || null;

    return res.json({
      success: true,
      data: {
        activeRelease,
        history: releases,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/app-releases', (req: AuthenticatedRequest, res) => {
  try {
    const { versionName, versionCode, downloadUrl, changelog, isForceUpdate, minVersionCode } = req.body;

    if (!versionName || !versionCode || !downloadUrl) {
      return res.status(400).json({
        success: false,
        message: 'versionName, versionCode, and downloadUrl are required.',
      });
    }

    const vCode = parseInt(String(versionCode), 10);
    const minVCode = minVersionCode ? parseInt(String(minVersionCode), 10) : 1;
    const isForce = isForceUpdate === true || isForceUpdate === 1 ? 1 : 0;
    const releaseId = 'rel_' + Date.now();

    // Set previous releases to inactive
    db.prepare('UPDATE app_releases SET is_active = 0').run();

    // Insert new active release
    db.prepare(`
      INSERT INTO app_releases (id, version_name, version_code, download_url, changelog, min_version_code, is_force_update, is_active, release_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      releaseId,
      String(versionName).trim(),
      vCode,
      String(downloadUrl).trim(),
      String(changelog || '').trim(),
      minVCode,
      isForce
    );

    return res.json({
      success: true,
      message: `App Release v${versionName} (Build ${vCode}) published successfully.`,
      data: {
        id: releaseId,
        versionName,
        versionCode: vCode,
        downloadUrl,
        changelog,
        isForceUpdate: isForce === 1,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
