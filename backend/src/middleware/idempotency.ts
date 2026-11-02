import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { db } from '../database/db';

export function idempotencyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Only apply to state-changing methods: POST, PUT, PATCH
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string;
  if (!idempotencyKey || !idempotencyKey.trim()) {
    return next();
  }

  const merchantId = req.user?.id;
  if (!merchantId) {
    return next();
  }

  const cleanKey = idempotencyKey.trim();
  const requestPath = req.baseUrl + req.path;
  const paramsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}) + JSON.stringify(req.query || {}))
    .digest('hex');

  // Check if cached response exists and is still valid (within 24 hours)
  try {
    const existing = db.prepare(`
      SELECT response_code, response_body, expires_at
      FROM idempotency_keys
      WHERE merchant_id = ? AND idempotency_key = ?
    `).get(merchantId, cleanKey) as any;

    if (existing) {
      if (new Date(existing.expires_at) > new Date()) {
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(existing.response_code);
        try {
          res.json(JSON.parse(existing.response_body));
          return;
        } catch {
          res.send(existing.response_body);
          return;
        }
      } else {
        // Expired key, clean up
        (db.prepare('DELETE FROM idempotency_keys WHERE merchant_id = ? AND idempotency_key = ?') as any).run(merchantId, cleanKey);
      }
    }
  } catch (err) {
    console.error('Idempotency read error:', err);
  }

  // Intercept response to store upon completion
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let responseBody = '';

  res.json = function (body: any) {
    responseBody = JSON.stringify(body);
    saveIdempotentRecord();
    return originalJson(body);
  };

  res.send = function (body: any) {
    if (typeof body === 'string') {
      responseBody = body;
    } else {
      try {
        responseBody = JSON.stringify(body);
      } catch {
        responseBody = String(body);
      }
    }
    saveIdempotentRecord();
    return originalSend(body);
  };

  function saveIdempotentRecord() {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      const id = crypto.randomUUID();
      (db.prepare(`
        INSERT INTO idempotency_keys (
          id, idempotency_key, merchant_id, request_path, request_method,
          request_params_hash, response_code, response_body, expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(merchant_id, idempotency_key) DO UPDATE SET
          response_code = excluded.response_code,
          response_body = excluded.response_body,
          expires_at = excluded.expires_at
      `) as any).run(
        id,
        cleanKey,
        merchantId,
        requestPath,
        req.method,
        paramsHash,
        res.statusCode,
        responseBody,
        expiresAt
      );
    } catch (err) {
      console.error('Idempotency write error:', err);
    }
  }

  next();
}
