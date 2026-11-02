import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { db } from '../../database/db';

export interface WebhookPayload {
  orderId: string;
  payVerifyOrderId: string;
  trxId: string;
  amount: number;
  service: string;
  sender: string;
  reference?: string;
  verifiedAt: string;
}

// Exponential Backoff Delays: 1m, 5m, 15m, 1h, 6h
const BACKOFF_SECONDS = [60, 300, 900, 3600, 21600];

export function generateWebhookSignature(payload: string, secretKey: string, timestamp: number): string {
  const signedData = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secretKey).update(signedData).digest('hex');
}

export async function dispatchWebhookForOrder(orderId: string, eventType: string, payloadData: WebhookPayload) {
  // Find merchant for this order
  const order = db.prepare(`
    SELECT merchant_id FROM payment_orders WHERE id = ?
  `).get(orderId) as any;

  if (!order) return;

  const webhook = db.prepare(`
    SELECT id, url, secret_key, is_active
    FROM webhooks
    WHERE merchant_id = ? AND is_active = 1
  `).get(order.merchant_id) as any;

  if (!webhook || !webhook.url) return;

  const payloadString = JSON.stringify({
    event: eventType,
    data: payloadData,
  });

  const deliveryId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO webhook_deliveries (id, webhook_id, order_id, event_type, payload_json, attempt, status)
    VALUES (?, ?, ?, ?, ?, 1, 'PENDING')
  `).run(deliveryId, webhook.id, orderId, eventType, payloadString);

  // Execute dispatch asynchronously
  sendWebhookHttp(deliveryId, webhook.url, webhook.secret_key, payloadString, 1);
}

export function sendWebhookHttp(
  deliveryId: string,
  url: string,
  secretKey: string,
  payloadString: string,
  attempt: number = 1
) {
  const startTime = Date.now();

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payloadString, secretKey, timestamp);
    const parsedUrl = new URL(url);

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'User-Agent': 'Payviro-Webhook-Dispatcher/2.0',
        'X-Payviro-Signature': `t=${timestamp},v1=${signature}`,
        'X-Payviro-Timestamp': timestamp.toString(),
        'X-PayVerify-Signature': `t=${timestamp},v1=${signature}`,
        'X-PayVerify-Timestamp': timestamp.toString(),
      },
      timeout: 10000, // 10s timeout
    };

    const req = client.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        const latencyMs = Date.now() - startTime;
        const isSuccess = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;

        if (isSuccess) {
          (db.prepare(`
            UPDATE webhook_deliveries
            SET status_code = ?,
                response_body = ?,
                status = 'SUCCESS',
                next_retry_at = NULL
            WHERE id = ?
          `) as any).run(res.statusCode ?? 200, `[${latencyMs}ms] ${responseBody.substring(0, 900)}`, deliveryId);
        } else {
          // Schedule next exponential retry
          const nextDelay = BACKOFF_SECONDS[Math.min(attempt - 1, BACKOFF_SECONDS.length - 1)];
          const nextRetryAt = new Date(Date.now() + nextDelay * 1000).toISOString();

          (db.prepare(`
            UPDATE webhook_deliveries
            SET status_code = ?,
                response_body = ?,
                status = 'FAILED',
                next_retry_at = ?
            WHERE id = ?
          `) as any).run(res.statusCode ?? 500, `[${latencyMs}ms] HTTP ${res.statusCode}: ${responseBody.substring(0, 800)}`, nextRetryAt, deliveryId);
        }
      });
    });

    req.on('error', (err) => {
      const latencyMs = Date.now() - startTime;
      const nextDelay = BACKOFF_SECONDS[Math.min(attempt - 1, BACKOFF_SECONDS.length - 1)];
      const nextRetryAt = new Date(Date.now() + nextDelay * 1000).toISOString();

      (db.prepare(`
        UPDATE webhook_deliveries
        SET status_code = 0,
            response_body = ?,
            status = 'FAILED',
            next_retry_at = ?
        WHERE id = ?
      `) as any).run(`[${latencyMs}ms] Network Error: ${err.message}`, nextRetryAt, deliveryId);
    });

    req.on('timeout', () => {
      req.destroy();
      const nextDelay = BACKOFF_SECONDS[Math.min(attempt - 1, BACKOFF_SECONDS.length - 1)];
      const nextRetryAt = new Date(Date.now() + nextDelay * 1000).toISOString();

      (db.prepare(`
        UPDATE webhook_deliveries
        SET status_code = 408,
            response_body = '[Timeout] Request exceeded 10s limit',
            status = 'FAILED',
            next_retry_at = ?
        WHERE id = ?
      `) as any).run(nextRetryAt, deliveryId);
    });

    req.write(payloadString);
    req.end();
  } catch (error: any) {
    const nextDelay = BACKOFF_SECONDS[Math.min(attempt - 1, BACKOFF_SECONDS.length - 1)];
    const nextRetryAt = new Date(Date.now() + nextDelay * 1000).toISOString();

    (db.prepare(`
      UPDATE webhook_deliveries
      SET status_code = 0,
          response_body = ?,
          status = 'FAILED',
          next_retry_at = ?
      WHERE id = ?
    `) as any).run(`Dispatch Error: ${error.message}`, nextRetryAt, deliveryId);
  }
}

// Background Webhook Retry Worker (Exponential Backoff Queue)
export function startWebhookRetryWorker() {
  setInterval(() => {
    try {
      const nowIso = new Date().toISOString();
      const pendingDeliveries = db.prepare(`
        SELECT d.id, d.payload_json, d.attempt, d.max_attempts, w.url, w.secret_key
        FROM webhook_deliveries d
        JOIN webhooks w ON d.webhook_id = w.id
        WHERE d.status = 'FAILED'
          AND d.attempt < d.max_attempts
          AND (d.next_retry_at IS NULL OR d.next_retry_at <= ?)
        ORDER BY d.created_at ASC LIMIT 10
      `).all(nowIso) as any[];

      for (const d of pendingDeliveries) {
        const nextAttempt = d.attempt + 1;
        db.prepare("UPDATE webhook_deliveries SET attempt = ?, status = 'PENDING' WHERE id = ?").run(nextAttempt, d.id);
        sendWebhookHttp(d.id, d.url, d.secret_key, d.payload_json, nextAttempt);
      }
    } catch (e) {
      console.error('[WEBHOOK RETRY WORKER ERROR]', e);
    }
  }, 15000); // Check every 15 seconds
}
