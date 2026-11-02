// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../database/db';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

const mfsAccountSchema = z.object({
  provider: z.enum(['bKash', 'Nagad', 'Rocket', 'Upay']),
  accountType: z.enum(['personal', 'merchant', 'agent']).default('personal'),
  accountNumber: z.string().min(11).max(14),
  dailyLimit: z.number().positive().default(50000),
  instructions: z.string().optional(),
});

// List merchant's MFS accounts
router.get('/accounts', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const accounts = db.prepare(`
    SELECT id, provider, account_type, account_number, is_active, daily_limit, current_daily_total, instructions, created_at
    FROM mfs_accounts
    WHERE merchant_id = ?
    ORDER BY created_at DESC
  `).all(merchantId);

  return res.json({ success: true, data: accounts });
});

// Add new MFS account
router.post('/accounts', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const data = mfsAccountSchema.parse(req.body);
    const merchantId = req.user!.id;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO mfs_accounts (id, merchant_id, provider, account_type, account_number, daily_limit, instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, merchantId, data.provider, data.accountType, data.accountNumber, data.dailyLimit, data.instructions || '');

    return res.status(201).json({ success: true, message: 'MFS account added successfully!' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Toggle MFS account active status
router.patch('/accounts/:id/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const id = String(req.params.id);

  const current = db.prepare('SELECT is_active FROM mfs_accounts WHERE id = ? AND merchant_id = ?').get(id, merchantId) as any;
  if (!current) {
    return res.status(404).json({ success: false, message: 'Account not found.' });
  }

  const newStatus = current.is_active ? 0 : 1;
  db.prepare('UPDATE mfs_accounts SET is_active = ? WHERE id = ?').run(newStatus, id);

  return res.json({ success: true, message: `Account ${newStatus ? 'activated' : 'deactivated'}.`, isActive: newStatus === 1 });
});

// Delete MFS account
router.delete('/accounts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const id = String(req.params.id);

  db.prepare('DELETE FROM mfs_accounts WHERE id = ? AND merchant_id = ?').run(id, merchantId);
  return res.json({ success: true, message: 'Account deleted successfully.' });
});

// List merchant's connected Android devices
router.get('/list', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const threshold = new Date(Date.now() - 25 * 1000).toISOString();

  // Mark stale devices as offline in DB
  db.prepare(`
    UPDATE devices
    SET is_online = 0
    WHERE merchant_id = ? AND is_online = 1 AND (last_heartbeat IS NULL OR last_heartbeat < ?)
  `).run(merchantId, threshold);

  const devices = db.prepare(`
    SELECT id, device_name, model, android_version, battery_level, is_online, last_heartbeat, sync_count, created_at
    FROM devices
    WHERE merchant_id = ?
    ORDER BY created_at DESC
  `).all(merchantId) as any[];

  const now = Date.now();
  const refreshed = devices.map((d) => {
    let secondsAgo = 999999;
    if (d.last_heartbeat) {
      const iso = d.last_heartbeat.endsWith('Z') || d.last_heartbeat.includes('+')
        ? d.last_heartbeat
        : d.last_heartbeat.replace(' ', 'T') + 'Z';
      secondsAgo = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
    }
    const isOnline = d.is_online === 1 && secondsAgo <= 25;
    return {
      ...d,
      is_online: isOnline ? 1 : 0,
      secondsAgo,
    };
  });

  return res.json({ success: true, data: refreshed });
});

// Delete/Unbind Android device
router.delete('/devices/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const deviceId = String(req.params.id);

  db.prepare('DELETE FROM devices WHERE id = ? AND merchant_id = ?').run(deviceId, merchantId);
  return res.json({ success: true, message: 'Device disconnected successfully.' });
});

export default router;
