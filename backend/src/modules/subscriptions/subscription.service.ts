// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import crypto from "crypto";
import { db } from "../../database/db";
import { notifyCheckoutStream } from "../checkout/checkout.service";

export interface PlanConfig {
  id: "starter" | "pro" | "enterprise";
  name: string;
  price: number;
  billingPeriod: string;
  durationDays: number;
  maxDevices: number;
  maxMonthlyTxns: number;
  badge?: string;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter Plan",
    price: 999,
    billingPeriod: "month",
    durationDays: 30,
    maxDevices: 1,
    maxMonthlyTxns: 1000,
    description: "Essential automated verification for growing businesses.",
    features: [
      "1 Connected Android Device",
      "Up to 1,000 Verified Transactions/mo",
      "Real-time bKash/Nagad/Rocket SMS Sync",
      "Instant Webhook Dispatch",
      "Payment Links & Digital Invoices",
      "Standard Technical Support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro Merchant",
    price: 1999,
    billingPeriod: "month",
    durationDays: 30,
    maxDevices: 3,
    maxMonthlyTxns: 10000,
    badge: "MOST POPULAR",
    description: "High-speed automated settlement for high-traffic commerce.",
    features: [
      "Up to 3 Connected Android Devices",
      "Up to 10,000 Verified Transactions/mo",
      "Multi-SIM Simultaneous SMS Relay",
      "Sub-second Zero-latency Verification",
      "Priority Webhook Queue with Auto-retry",
      "Zero Duplicate Fraud Shield",
      "Priority Support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Scale",
    price: 4999,
    billingPeriod: "month",
    durationDays: 30,
    maxDevices: 10,
    maxMonthlyTxns: 50000,
    badge: "UNLIMITED POWER",
    description: "Full-scale automated payment gateway for enterprises.",
    features: [
      "Up to 10 Connected Android Devices",
      "Up to 50,000 Verified Transactions/mo",
      "Dedicated SIM Pooling & Load Balancing",
      "Custom SLA Guarantee (99.9% Uptime)",
      "Dedicated Support",
      "Zero-rate Platform Fees",
    ],
  },
};

export const PLATFORM_ADMIN_CONFIG = {
  email: "lorddanju@gmail.com",
  bkashNumber: "01915575697",
  accountType: "Personal",
};

/**
 * Look up the platform admin merchant record (lorddanju@gmail.com).
 */
export function getPlatformAdminMerchant() {
  let admin = db.prepare("SELECT * FROM merchants WHERE email = ?").get(PLATFORM_ADMIN_CONFIG.email) as any;
  if (!admin) {
    admin = db.prepare("SELECT * FROM merchants WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1").get() as any;
  }
  return admin;
}

/**
 * Get real-time status of the admin's connected Android relay devices.
 */
export function getAdminDeviceStatus() {
  const admin = getPlatformAdminMerchant();
  if (!admin) {
    return {
      isOnline: false,
      lastSeen: null,
      deviceName: "Admin Relay Device",
      message: "Admin relay device not configured.",
    };
  }

  const devices = db.prepare(`
    SELECT id, device_name, model, is_online, last_heartbeat
    FROM devices
    WHERE merchant_id = ?
    ORDER BY last_heartbeat DESC
  `).all(admin.id) as any[];

  if (devices.length === 0) {
    return {
      isOnline: false,
      lastSeen: null,
      deviceName: "Admin Relay Device",
      message: "No admin relay device connected.",
    };
  }

  const now = Date.now();
  let isAnyOnline = false;
  let mostRecentSeen: string | null = null;
  const primaryDevice = devices[0];
  const deviceName = primaryDevice.device_name || primaryDevice.model || "Realme RMX3939";

  for (const d of devices) {
    if (d.last_heartbeat) {
      const iso = d.last_heartbeat.endsWith("Z") || d.last_heartbeat.includes("+")
        ? d.last_heartbeat
        : d.last_heartbeat.replace(" ", "T") + "Z";
      const secondsAgo = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
      if (d.is_online === 1 && secondsAgo <= 25) {
        isAnyOnline = true;
      }
      if (!mostRecentSeen || new Date(iso) > new Date(mostRecentSeen)) {
        mostRecentSeen = iso;
      }
    }
  }

  return {
    isOnline: isAnyOnline,
    lastSeen: mostRecentSeen,
    deviceName,
    message: isAnyOnline
      ? "Admin relay device is online and ready for instant verification."
      : "Admin mobile device is currently offline. Verification will complete automatically once the device reconnects.",
  };
}

/**
 * Create a new subscription purchase order.
 */
export function createSubscriptionOrder(params: {
  merchantId: string;
  planId: "starter" | "pro" | "enterprise";
}) {
  const plan = SUBSCRIPTION_PLANS[params.planId];
  if (!plan) {
    throw new Error("Invalid subscription plan selected.");
  }

  const admin = getPlatformAdminMerchant();
  if (!admin) {
    throw new Error("Platform administrator account not found.");
  }

  const orderId = crypto.randomUUID();
  const paymentOrderId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes to complete bKash Send Money

  // Create payment order under Admin Merchant to capture the bKash payment
  const publicOrderId = "SUB-" + plan.id.toUpperCase() + "-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  db.prepare(`
    INSERT INTO payment_orders (
      id, merchant_id, order_id, amount, customer_name, customer_email,
      status, expires_at
    )
    VALUES (?, ?, ?, ?, 'Subscription Upgrade', ?, 'PENDING', ?)
  `).run(
    paymentOrderId,
    admin.id,
    publicOrderId,
    plan.price,
    params.merchantId,
    expiresAt.toISOString()
  );

  // Insert subscription order
  db.prepare(`
    INSERT INTO subscription_orders (
      id, merchant_id, plan, amount, bkash_number, status, payment_order_id,
      duration_days, expires_at
    )
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
  `).run(
    orderId,
    params.merchantId,
    plan.id,
    plan.price,
    PLATFORM_ADMIN_CONFIG.bkashNumber,
    paymentOrderId,
    plan.durationDays,
    expiresAt.toISOString()
  );

  const adminDevice = getAdminDeviceStatus();

  return {
    subscriptionOrderId: orderId,
    paymentOrderId,
    publicOrderId,
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
    },
    paymentDetails: {
      provider: "bKash",
      accountType: PLATFORM_ADMIN_CONFIG.accountType,
      accountNumber: PLATFORM_ADMIN_CONFIG.bkashNumber,
      amount: plan.price,
      suggestedReference: plan.id.toUpperCase(),
      instructions: "Send Money ৳" + plan.price + " to bKash Personal " + PLATFORM_ADMIN_CONFIG.bkashNumber + ". Then enter the TrxID below to auto-verify.",
    },
    adminDeviceOnline: adminDevice.isOnline,
    adminDeviceMessage: adminDevice.message,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Apply the subscription upgrade in the database for the merchant.
 */
export function applySubscriptionUpgrade(subOrder: any, transaction: any) {
  const plan = SUBSCRIPTION_PLANS[subOrder.plan] || SUBSCRIPTION_PLANS.pro;
  const merchantId = subOrder.merchant_id;
  const resolvedTrxId = String(transaction.trx_id || transaction.trxId || '').trim().toUpperCase();
  const service = transaction.service || 'bKash';
  const sender = transaction.sender || '';
  const txnId = transaction.id || null;

  // Mark subscription order verified
  db.prepare(`
    UPDATE subscription_orders
    SET status = 'VERIFIED',
        trx_id = ?,
        verified_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(resolvedTrxId, subOrder.id);

  // Link transaction to payment order
  if (subOrder.payment_order_id) {
    db.prepare(`
      UPDATE payment_orders
      SET status = 'VERIFIED',
          matched_trx_id = ?,
          matched_provider = ?,
          matched_sender = ?,
          verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(resolvedTrxId, service, sender, subOrder.payment_order_id);

    if (txnId) {
      db.prepare('UPDATE transactions SET matched_order_id = ? WHERE id = ?').run(subOrder.payment_order_id, txnId);
    }
  }

  // Update merchant's active subscription record
  const currentSub = db.prepare(`
    SELECT id, expires_at, status
    FROM subscriptions
    WHERE merchant_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(merchantId) as any;

  let newExpires = new Date();
  if (currentSub && currentSub.status === "active" && new Date(currentSub.expires_at) > new Date()) {
    // Extend existing active period by plan duration
    newExpires = new Date(new Date(currentSub.expires_at).getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  } else {
    // Start fresh from today
    newExpires = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
  }

  if (currentSub) {
    db.prepare(`
      UPDATE subscriptions
      SET plan = ?,
          max_devices = ?,
          max_monthly_txns = ?,
          expires_at = ?,
          status = 'active'
      WHERE id = ?
    `).run(
      plan.id,
      plan.maxDevices,
      plan.maxMonthlyTxns,
      newExpires.toISOString(),
      currentSub.id
    );
  } else {
    const newSubId = crypto.randomUUID();
    const licenseKey = "PV-" + plan.id.toUpperCase() + "-" + crypto.randomBytes(6).toString("hex").toUpperCase();
    db.prepare(`
      INSERT INTO subscriptions (
        id, merchant_id, plan, license_key, max_devices, max_monthly_txns,
        starts_at, expires_at, status
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'active')
    `).run(
      newSubId,
      merchantId,
      plan.id,
      licenseKey,
      plan.maxDevices,
      plan.maxMonthlyTxns,
      newExpires.toISOString()
    );
  }

  // Notify SSE streams if any
  if (subOrder.payment_order_id) {
    notifyCheckoutStream(subOrder.payment_order_id, {
      status: "VERIFIED",
      trxId: transaction.trx_id,
      amount: transaction.amount,
      plan: plan.name,
    });
  }

  return {
    success: true,
    verified: true,
    message: "Plan upgraded to " + plan.name + " successfully! Valid until " + newExpires.toLocaleDateString() + ".",
    data: {
      plan: plan.id,
      planName: plan.name,
      expiresAt: newExpires.toISOString(),
    },
  };
}

/**
 * Verify a subscription order via user-submitted TrxID.
 */
export function verifySubscriptionPayment(params: {
  subscriptionOrderId: string;
  trxId: string;
  merchantId: string;
}) {
  const normalizedTrx = params.trxId.trim().toUpperCase();

  const order = db.prepare(`
    SELECT * FROM subscription_orders
    WHERE id = ? AND merchant_id = ?
  `).get(params.subscriptionOrderId, params.merchantId) as any;

  if (!order) {
    throw new Error("Subscription order not found.");
  }

  if (order.status === "VERIFIED") {
    return {
      success: true,
      verified: true,
      message: "Subscription payment already verified and active.",
    };
  }

  if (order.status === "EXPIRED") {
    throw new Error("This subscription payment order has expired. Please initiate a new upgrade.");
  }

  const admin = getPlatformAdminMerchant();
  if (!admin) {
    throw new Error("Platform administrator record missing.");
  }

  // Check if matching transaction exists under Admin
  const matchingTrx = db.prepare(`
    SELECT id, trx_id, amount, service, sender, matched_order_id
    FROM transactions
    WHERE trx_id = ? AND merchant_id = ?
  `).get(normalizedTrx, admin.id) as any;

  if (!matchingTrx) {
    // Record TrxID in subscription order, set status to PENDING and clear any previous rejection reason
    db.prepare("UPDATE subscription_orders SET trx_id = ?, status = 'PENDING', rejection_reason = NULL WHERE id = ?").run(normalizedTrx, order.id);

    const adminDevice = getAdminDeviceStatus();
    return {
      success: true,
      verified: false,
      isPendingReview: true,
      isDeviceOffline: !adminDevice.isOnline,
      trxId: normalizedTrx,
      message: "Transaction ID recorded. Your payment is currently under review. As soon as it is approved or synced, you will be notified immediately.",
    };
  }

  // Validate amount
  if (matchingTrx.amount < order.amount) {
    throw new Error("Insufficient payment amount. Received: ৳" + matchingTrx.amount + ", Required: ৳" + order.amount);
  }

  // Execute subscription upgrade
  return applySubscriptionUpgrade(order, matchingTrx);
}

/**
 * Hook called whenever an incoming transaction is processed on the platform admin device.
 * Checks for any pending subscription orders with matching TrxID or amount.
 */
export function autoVerifySubscriptionForTransaction(trx: {
  trxId: string;
  amount: number;
  service: string;
  sender: string;
  id: string;
  merchantId: string;
}) {
  const admin = getPlatformAdminMerchant();
  if (!admin || admin.id !== trx.merchantId) {
    return null; // Not an admin transaction
  }

  // 1. Try to match by explicit TrxID in subscription_orders
  let pendingSubOrder = db.prepare(`
    SELECT * FROM subscription_orders
    WHERE status = 'PENDING'
      AND UPPER(trx_id) = ?
      AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `).get(trx.trxId.toUpperCase()) as any;

  // 2. If no explicit TrxID match, match by exact amount for orders waiting within last 60 mins
  if (!pendingSubOrder) {
    pendingSubOrder = db.prepare(`
      SELECT * FROM subscription_orders
      WHERE status = 'PENDING'
        AND amount = ?
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `).get(trx.amount) as any;
  }

  if (pendingSubOrder) {
    try {
      console.log(`[SUBSCRIPTION AUTO-VERIFY] Matching TrxID ${trx.trxId} with Subscription Order ${pendingSubOrder.id}`);
      return applySubscriptionUpgrade(pendingSubOrder, trx);
    } catch (err) {
      console.error("[SUBSCRIPTION AUTO-VERIFY ERROR]", err);
    }
  }

  return null;
}

/**
 * Background worker to automatically manage subscription lifecycles.
 * Marks expired trials/subscriptions and expired purchase orders.
 */
export function startSubscriptionLifecycleWorker() {
  setInterval(() => {
    try {
      // 1. Mark expired active subscriptions
      db.prepare(`
        UPDATE subscriptions
        SET status = 'expired'
        WHERE status = 'active'
          AND expires_at < CURRENT_TIMESTAMP
      `).run();

      // 2. Mark expired pending subscription orders
      db.prepare(`
        UPDATE subscription_orders
        SET status = 'EXPIRED'
        WHERE status = 'PENDING'
          AND expires_at < CURRENT_TIMESTAMP
      `).run();
    } catch (e) {
      console.error("[SUBSCRIPTION WORKER ERROR]", e);
    }
  }, 30000); // Check every 30 seconds
}
