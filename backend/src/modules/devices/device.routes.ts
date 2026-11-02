// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../database/db';
import { requireDeviceAuth, requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { processIncomingTransaction } from '../payments/payment.service';

const router = Router();

const registerDeviceSchema = z.object({
  licenseKey: z.string().min(6),
  deviceName: z.string().optional(),
  fingerprint: z.string().optional(),
  model: z.string().optional(),
  androidVersion: z.string().optional(),
  batteryLevel: z.number().optional(),
});

const heartbeatSchema = z.object({
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional(),
});

const syncBatchSchema = z.object({
  payments: z.array(
    z.object({
      trxId: z.string().min(3),
      service: z.string().default('bKash'),
      sender: z.string().default(''),
      receiver: z.string().optional().nullable(),
      amount: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]),
      reference: z.string().optional().nullable(),
      rawSms: z.string().optional().nullable(),
      detectionSource: z.string().optional().default('sms'),
      timestamp: z.union([z.number(), z.string()]).optional().nullable(),
    })
  ),
});

// Register new Android Device using Merchant License Key
router.post('/register', (req, res) => {
  try {
    const data = registerDeviceSchema.parse(req.body);

    const sub = db.prepare(`
      SELECT s.id, s.merchant_id, s.plan, s.max_devices, s.expires_at, s.status, m.business_name, m.status as merchant_status
      FROM subscriptions s
      JOIN merchants m ON s.merchant_id = m.id
      WHERE s.license_key = ?
    `).get(data.licenseKey.trim().toUpperCase()) as any;

    if (!sub) {
      return res.status(404).json({ success: false, message: 'License key not found.' });
    }

    if (sub.status !== 'active' || new Date(sub.expires_at) < new Date()) {
      return res.status(403).json({ success: false, message: 'License key has expired. Please renew your subscription.' });
    }

    if (sub.merchant_status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Merchant account is suspended.' });
    }

    // Smart resolution of device name and hardware model
    const resolvedModel = (data.model || '').trim();
    const resolvedName = (data.deviceName?.trim()) || (resolvedModel.length > 0 && resolvedModel.toLowerCase() !== 'android phone' ? resolvedModel : 'Android Relay Phone');
    const resolvedFingerprint = (data.fingerprint || '').trim();

    // Smart Multi-tier Deduplication: Check if this exact physical device is ALREADY registered
    let existingDevice = null;

    // Tier 1: Hardware Fingerprint match (Android ID)
    if (resolvedFingerprint.length > 0) {
      existingDevice = db.prepare(`
        SELECT id, device_name, model FROM devices
        WHERE merchant_id = ? AND fingerprint = ?
      `).get(sub.merchant_id, resolvedFingerprint) as any;
    }

    // Tier 2: Real hardware model match (e.g. "Realme RMX3939", "Walton Primo S8")
    if (!existingDevice && resolvedModel.length > 2 && resolvedModel.toLowerCase() !== 'android phone') {
      existingDevice = db.prepare(`
        SELECT id, device_name, model FROM devices
        WHERE merchant_id = ? AND LOWER(model) = LOWER(?)
      `).get(sub.merchant_id, resolvedModel) as any;
    }

    // Tier 3: Device name match
    if (!existingDevice && resolvedName.length > 0) {
      existingDevice = db.prepare(`
        SELECT id, device_name, model FROM devices
        WHERE merchant_id = ? AND LOWER(device_name) = LOWER(?)
      `).get(sub.merchant_id, resolvedName) as any;
    }

    // Tier 4: Single-device plan auto-relink (if merchant has max 1 device, re-pair existing device)
    if (!existingDevice && sub.max_devices === 1) {
      const singleDevice = db.prepare(`
        SELECT id, device_name, model FROM devices
        WHERE merchant_id = ?
        ORDER BY last_heartbeat DESC, created_at DESC
        LIMIT 1
      `).get(sub.merchant_id) as any;
      if (singleDevice) {
        existingDevice = singleDevice;
      }
    }

    if (existingDevice) {
      // Re-pair existing device without consuming an additional slot
      const deviceToken = 'dev_tok_' + crypto.randomBytes(32).toString('hex');
      db.prepare(`
        UPDATE devices
        SET device_token = ?,
            device_name = ?,
            fingerprint = COALESCE(NULLIF(?, ''), fingerprint),
            model = COALESCE(NULLIF(?, ''), model),
            android_version = COALESCE(NULLIF(?, ''), android_version),
            battery_level = ?,
            is_online = 1,
            last_heartbeat = ?
        WHERE id = ?
      `).run(
        deviceToken,
        resolvedName,
        resolvedFingerprint,
        resolvedModel,
        data.batteryLevel || 100,
        new Date().toISOString(),
        existingDevice.id
      );

      // Cleanup any duplicate rows for this merchant with the same fingerprint or model
      if (resolvedFingerprint.length > 0) {
        db.prepare(`DELETE FROM devices WHERE merchant_id = ? AND fingerprint = ? AND id != ?`)
          .run(sub.merchant_id, resolvedFingerprint, existingDevice.id);
      }
      if (resolvedModel.length > 2 && resolvedModel.toLowerCase() !== 'android phone') {
        db.prepare(`DELETE FROM devices WHERE merchant_id = ? AND LOWER(model) = LOWER(?) AND id != ?`)
          .run(sub.merchant_id, resolvedModel, existingDevice.id);
      }

      return res.status(200).json({
        success: true,
        message: 'Device re-paired successfully!',
        data: {
          deviceId: existingDevice.id,
          deviceToken,
          merchantId: sub.merchant_id,
          businessName: sub.business_name,
          plan: sub.plan,
          syncIntervalSeconds: 15,
        },
      });
    }

    // 2. Only for a truly NEW device: enforce max_devices limit
    const currentDeviceCount = db.prepare(`
      SELECT COUNT(*) as count FROM devices WHERE merchant_id = ?
    `).get(sub.merchant_id) as any;

    if (currentDeviceCount.count >= sub.max_devices) {
      return res.status(403).json({
        success: false,
        message: `Your plan allows up to ${sub.max_devices} connected device(s). Upgrade plan or remove unused devices.`,
      });
    }

    const deviceId = crypto.randomUUID();
    const deviceToken = 'dev_tok_' + crypto.randomBytes(32).toString('hex');

    db.prepare(`
      INSERT INTO devices (id, merchant_id, device_name, device_token, fingerprint, model, android_version, battery_level, is_online, last_heartbeat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      deviceId,
      sub.merchant_id,
      resolvedName,
      deviceToken,
      resolvedFingerprint,
      resolvedModel,
      data.androidVersion || '',
      data.batteryLevel || 100,
      new Date().toISOString()
    );

    return res.status(200).json({
      success: true,
      message: 'Device registered successfully!',
      data: {
        deviceId,
        deviceToken,
        merchantId: sub.merchant_id,
        businessName: sub.business_name,
        plan: sub.plan,
        syncIntervalSeconds: 15,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Device registration failed.' });
  }
});

// Device Heartbeat (Telemetry)
router.post('/heartbeat', requireDeviceAuth, (req: AuthenticatedRequest, res) => {
  try {
    const data = heartbeatSchema.parse(req.body);
    const deviceId = req.device!.id;

    db.prepare(`
      UPDATE devices
      SET is_online = 1,
          last_heartbeat = ?,
          battery_level = COALESCE(?, battery_level)
      WHERE id = ?
    `).run(new Date().toISOString(), data.batteryLevel ?? null, deviceId);

    return res.json({
      success: true,
      timestamp: Date.now(),
      commands: [], // Future: remote rescan commands
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Device Explicit Offline Notification (Called immediately when user exits/closes app)
router.post('/offline', requireDeviceAuth, (req: AuthenticatedRequest, res) => {
  try {
    const deviceId = req.device!.id;

    db.prepare(`
      UPDATE devices
      SET is_online = 0
      WHERE id = ?
    `).run(deviceId);

    return res.json({
      success: true,
      message: 'Device set offline immediately.',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Sync parsed payments batch from Android app
router.post('/sync', requireDeviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const data = syncBatchSchema.parse(req.body);
    const merchantId = req.device!.merchantId;
    const deviceId = req.device!.id;

    const syncedTrxIds: string[] = [];
    const duplicates: string[] = [];

    for (const payment of data.payments) {
      let normService: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' = 'bKash';
      const s = (payment.service || '').toLowerCase();
      if (s.includes('nagad')) normService = 'Nagad';
      else if (s.includes('rocket')) normService = 'Rocket';
      else if (s.includes('upay')) normService = 'Upay';
      else normService = 'bKash';

      const result = await processIncomingTransaction({
        merchantId,
        deviceId,
        trxId: payment.trxId.trim().toUpperCase(),
        service: normService,
        sender: payment.sender.trim(),
        receiver: payment.receiver?.trim() || undefined,
        amount: typeof payment.amount === 'number' ? payment.amount : parseFloat(payment.amount as any),
        reference: payment.reference?.trim() || undefined,
        rawSms: payment.rawSms || '',
        detectionSource: payment.detectionSource === 'notification' ? 'notification' : 'sms',
        timestamp: payment.timestamp ? new Date(payment.timestamp) : new Date(),
      });

      if (result.isDuplicate) {
        duplicates.push(payment.trxId);
      } else {
        syncedTrxIds.push(payment.trxId);
      }
    }

    // Update device sync stats
    db.prepare(`
      UPDATE devices
      SET sync_count = sync_count + ?,
          last_heartbeat = ?,
          is_online = 1
      WHERE id = ?
    `).run(syncedTrxIds.length, new Date().toISOString(), deviceId);

    return res.json({
      success: true,
      message: `${syncedTrxIds.length} payment(s) synced and processed.`,
      data: {
        syncedCount: syncedTrxIds.length,
        syncedTrxIds,
        duplicates,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Get health and status for all connected devices of the authenticated merchant
router.get('/health', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const devices = db.prepare(`
    SELECT id, device_name, model, android_version, battery_level, is_online, last_heartbeat, sync_count, created_at
    FROM devices
    WHERE merchant_id = ?
    ORDER BY created_at DESC
  `).all(merchantId) as any[];

  const now = Date.now();

  const healthData = devices.map((d) => {
    let secondsSinceHeartbeat = 999999;
    if (d.last_heartbeat) {
      const iso = d.last_heartbeat.endsWith('Z') || d.last_heartbeat.includes('+')
        ? d.last_heartbeat
        : d.last_heartbeat.replace(' ', 'T') + 'Z';
      secondsSinceHeartbeat = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
    }

    const isOnline = d.is_online === 1 && secondsSinceHeartbeat <= 25;
    const consecutiveMissed = Math.floor(secondsSinceHeartbeat / 15);
    const isWarning = consecutiveMissed >= 2;

    let status = 'HEALTHY';
    let alertMessage = null;

    if (!isOnline) {
      if (isWarning) {
        status = 'CRITICAL_OFFLINE';
        alertMessage = `Warning: ${consecutiveMissed} missed heartbeats. Ensure phone has stable internet connection.`;
      } else {
        status = 'WARNING';
        alertMessage = 'Device heartbeat delayed.';
      }
    }

    return {
      ...d,
      isOnline,
      is_online: isOnline ? 1 : 0,
      secondsSinceHeartbeat,
      consecutiveMissedHeartbeats: consecutiveMissed,
      healthStatus: status,
      alertMessage,
      troubleshooting: {
        batteryOptimization: 'Set Battery Optimization to "Unrestricted" in Android app settings.',
        autostart: 'Enable Autostart & Background Activity in phone settings.',
        network: 'Verify mobile data / Wi-Fi is active and SIM can receive SMS.',
      },
    };
  });

  return res.json({ success: true, count: healthData.length, data: healthData });
});

// Delete/Unpair device (Merchant Auth, Zero-IDOR)
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;
  const deviceId = String(req.params.id);

  const result = (db.prepare('DELETE FROM devices WHERE id = ? AND merchant_id = ?') as any).run(deviceId, merchantId);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: 'Device not found.' });
  }

  return res.json({ success: true, message: 'Device disconnected successfully.' });
});

// Check for App Updates (Public / Mobile Device endpoint)
router.get('/check-update', (req, res) => {
  try {
    const clientVersionCode = parseInt(String(req.query.version_code || req.query.versionCode || '0'), 10);
    const clientVersionName = String(req.query.version_name || req.query.versionName || '');

    const latest = db.prepare(`
      SELECT id, version_name, version_code, download_url, changelog, min_version_code, is_force_update, release_date
      FROM app_releases
      WHERE is_active = 1
      ORDER BY version_code DESC, created_at DESC
      LIMIT 1
    `).get() as any;

    if (!latest) {
      return res.json({
        success: true,
        data: {
          hasUpdate: false,
          currentVersionCode: clientVersionCode,
          currentVersionName: clientVersionName,
          message: 'No active release configured.',
        },
      });
    }

    const hasUpdate = latest.version_code > clientVersionCode;
    const isForceUpdate = latest.is_force_update === 1 || clientVersionCode < latest.min_version_code;

    return res.json({
      success: true,
      data: {
        hasUpdate,
        currentVersionCode: clientVersionCode,
        currentVersionName: clientVersionName,
        latestVersionName: latest.version_name,
        latestVersionCode: latest.version_code,
        downloadUrl: latest.download_url,
        changelog: latest.changelog || '',
        isForceUpdate,
        releaseDate: latest.release_date,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Periodic Device Status Worker (auto-marks stale devices offline every 4s)
export function startDeviceStatusWorker() {
  setInterval(() => {
    try {
      const threshold = new Date(Date.now() - 25 * 1000).toISOString();
      db.prepare(`
        UPDATE devices
        SET is_online = 0
        WHERE is_online = 1 AND (last_heartbeat IS NULL OR last_heartbeat < ?)
      `).run(threshold);
    } catch (e) {
      console.error('Error in device status worker:', e);
    }
  }, 4000);
}

export default router;
