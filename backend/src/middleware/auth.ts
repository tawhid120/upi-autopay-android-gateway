// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { db } from '../database/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    businessName: string;
  };
  device?: {
    id: string;
    merchantId: string;
    deviceName: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required.' });
  }
  next();
}

export function requireApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = (req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')) as string;

  if (!apiKey || !apiKey.startsWith('pv_')) {
    return res.status(401).json({ success: false, message: 'Valid API key required.' });
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyRow = db.prepare(`
    SELECT a.id, a.merchant_id, m.email, m.business_name, m.role, m.status
    FROM api_keys a
    JOIN merchants m ON a.merchant_id = m.id
    WHERE a.key_hash = ? AND a.is_active = 1
  `).get(keyHash) as any;

  if (!keyRow) {
    return res.status(401).json({ success: false, message: 'Invalid or deactivated API key.' });
  }

  if (keyRow.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Merchant account is suspended.' });
  }

  // Update last used timestamp asynchronously
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyRow.id);

  req.user = {
    id: keyRow.merchant_id,
    email: keyRow.email,
    role: keyRow.role,
    businessName: keyRow.business_name,
  };

  next();
}

export function requireDeviceAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const deviceToken = req.headers['x-device-token'] as string;

  if (!deviceToken) {
    return res.status(401).json({ success: false, message: 'Device token required.' });
  }

  const device = db.prepare(`
    SELECT d.id, d.merchant_id, d.device_name, m.status as merchant_status, s.status as sub_status, s.expires_at
    FROM devices d
    JOIN merchants m ON d.merchant_id = m.id
    LEFT JOIN subscriptions s ON s.merchant_id = m.id
    WHERE d.device_token = ?
  `).get(deviceToken) as any;

  if (!device) {
    return res.status(401).json({ success: false, message: 'Unregistered relay device.' });
  }

  if (device.merchant_status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Merchant account is suspended.' });
  }

  if (device.sub_status && (device.sub_status !== 'active' || new Date(device.expires_at) < new Date())) {
    return res.status(403).json({ success: false, message: 'Merchant subscription has expired.' });
  }

  req.device = {
    id: device.id,
    merchantId: device.merchant_id,
    deviceName: device.device_name,
  };

  next();
}
