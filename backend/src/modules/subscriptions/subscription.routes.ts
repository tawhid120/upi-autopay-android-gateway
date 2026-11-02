// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from "express";
import { z } from "zod";
import { db } from "../../database/db";
import { requireAuth, AuthenticatedRequest } from "../../middleware/auth";
import {
  SUBSCRIPTION_PLANS,
  PLATFORM_ADMIN_CONFIG,
  getAdminDeviceStatus,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "./subscription.service";

const router = Router();

const createOrderSchema = z.object({
  planId: z.enum(["starter", "pro", "enterprise"]),
});

const verifyPaymentSchema = z.object({
  subscriptionOrderId: z.string().min(1),
  trxId: z.string().min(4),
});

// 1. Get available subscription plans (Public / Merchant)
router.get("/plans", (req, res) => {
  const adminDevice = getAdminDeviceStatus();
  return res.json({
    success: true,
    data: {
      plans: Object.values(SUBSCRIPTION_PLANS),
      paymentMethod: {
        provider: "bKash",
        accountType: PLATFORM_ADMIN_CONFIG.accountType,
        accountNumber: PLATFORM_ADMIN_CONFIG.bkashNumber,
        instructions: "Send Money to Personal bKash " + PLATFORM_ADMIN_CONFIG.bkashNumber + ". Enter your TrxID for instant auto-verification.",
      },
      adminDevice: {
        isOnline: adminDevice.isOnline,
        lastSeen: adminDevice.lastSeen,
        deviceName: adminDevice.deviceName,
        message: adminDevice.message,
      },
    },
  });
});

// 2. Real-time Admin Relay Device Status
router.get("/admin-status", (req, res) => {
  const status = getAdminDeviceStatus();
  return res.json({
    success: true,
    data: status,
  });
});

// 3. Current Merchant Subscription Status & Trial Analytics
router.get("/status", requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;

  const sub = db.prepare(`
    SELECT id, plan, license_key, max_devices, max_monthly_txns, starts_at, expires_at, status, created_at
    FROM subscriptions
    WHERE merchant_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(merchantId) as any;

  if (!sub) {
    return res.status(404).json({ success: false, message: "No subscription record found." });
  }

  const isExpired = sub.status === "expired" || new Date(sub.expires_at) < new Date();
  const isTrial = sub.plan === "trial";
  const now = Date.now();
  const expiresMs = new Date(sub.expires_at).getTime();
  const daysRemaining = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.ceil((expiresMs - now) / (1000 * 60 * 60)));

  // Calculate trial progress percentage (0 - 100%)
  const startsMs = new Date(sub.starts_at || sub.created_at).getTime();
  const totalTrialMs = 14 * 24 * 60 * 60 * 1000;
  const trialProgressPercent = Math.min(100, Math.max(0, Math.round(((now - startsMs) / totalTrialMs) * 100)));

  // Current Month transaction count
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthTxns = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount
    FROM transactions
    WHERE merchant_id = ? AND created_at >= ?
  `).get(merchantId, startOfMonth.toISOString()) as any;

  const activeDevicesCount = db.prepare(`
    SELECT COUNT(*) as count FROM devices WHERE merchant_id = ?
  `).get(merchantId) as any;

  const adminDevice = getAdminDeviceStatus();

  return res.json({
    success: true,
    data: {
      subscription: sub,
      analytics: {
        isTrial,
        isExpired,
        daysRemaining,
        hoursRemaining,
        trialProgressPercent: isTrial ? trialProgressPercent : 0,
        txnsUsedThisMonth: monthTxns?.count || 0,
        txnsLimit: sub.max_monthly_txns,
        txnsPercentUsed: Math.min(100, Math.round(((monthTxns?.count || 0) / (sub.max_monthly_txns || 1)) * 100)),
        devicesUsed: activeDevicesCount?.count || 0,
        devicesLimit: sub.max_devices,
      },
      adminDevice: {
        isOnline: adminDevice.isOnline,
        message: adminDevice.message,
      },
      paymentMethod: {
        provider: "bKash",
        accountType: PLATFORM_ADMIN_CONFIG.accountType,
        accountNumber: PLATFORM_ADMIN_CONFIG.bkashNumber,
      },
    },
  });
});

// 4. Create an upgrade order
router.post("/upgrade-order", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const merchantId = req.user!.id;

    const result = createSubscriptionOrder({
      merchantId,
      planId: data.planId,
    });

    return res.status(201).json({
      success: true,
      message: "Subscription order created. Please send payment via bKash to activate.",
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || "Failed to create upgrade order." });
  }
});

// 5. Submit TrxID to verify subscription payment
router.post("/verify-payment", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const data = verifyPaymentSchema.parse(req.body);
    const merchantId = req.user!.id;

    const result = verifySubscriptionPayment({
      subscriptionOrderId: data.subscriptionOrderId,
      trxId: data.trxId,
      merchantId,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || "Verification failed." });
  }
});

// 6. Get pending or recently rejected upgrade order if any
router.get("/orders/active", requireAuth, (req: AuthenticatedRequest, res) => {
  const merchantId = req.user!.id;

  const latestOrder = db.prepare(`
    SELECT * FROM subscription_orders
    WHERE merchant_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(merchantId) as any;

  if (!latestOrder) {
    return res.json({ success: true, data: null });
  }

  // Return if PENDING or REJECTED within last 24h
  const isPending = latestOrder.status === 'PENDING';
  const isRecentRejected = latestOrder.status === 'REJECTED' && (Date.now() - new Date(latestOrder.created_at).getTime()) < 24 * 60 * 60 * 1000;

  if (!isPending && !isRecentRejected) {
    return res.json({ success: true, data: null });
  }

  const plan = SUBSCRIPTION_PLANS[latestOrder.plan];
  const adminDevice = getAdminDeviceStatus();

  return res.json({
    success: true,
    data: {
      order: latestOrder,
      plan,
      paymentDetails: {
        provider: "bKash",
        accountType: PLATFORM_ADMIN_CONFIG.accountType,
        accountNumber: PLATFORM_ADMIN_CONFIG.bkashNumber,
        amount: latestOrder.amount,
      },
      adminDevice: {
        isOnline: adminDevice.isOnline,
        message: adminDevice.message,
      },
    },
  });
});

export default router;
