// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.
import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  ShieldCheck, Check, Copy, Zap, Crown, Smartphone, Wifi,
  AlertCircle, CheckCircle2, RefreshCw, ArrowRight, Lock, X, Clock,
  HelpCircle, AlertTriangle
} from "lucide-react";
import { api } from "../services/api";
import { copyToClipboard } from "../utils/clipboard";

interface SubscriptionPlansTabProps {
  merchantData: any;
  onSubscriptionUpdated: () => void;
}

export const SubscriptionPlansTab: React.FC<SubscriptionPlansTabProps> = ({
  merchantData,
  onSubscriptionUpdated,
}) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [adminStatus, setAdminStatus] = useState<any>(null);
  const [activePendingOrder, setActivePendingOrder] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const loadPlansAndActiveOrder = async () => {
    try {
      const [plansRes, activeRes, adminRes] = await Promise.all([
        api.get("/subscriptions/plans"),
        api.get("/subscriptions/orders/active"),
        api.get("/subscriptions/admin-status"),
      ]);

      if (plansRes.data?.success) {
        setPlans(plansRes.data.data.plans || []);
      }
      if (activeRes.data?.success) {
        setActivePendingOrder(activeRes.data.data);
      }
      if (adminRes.data?.success) {
        setAdminStatus(adminRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load subscription telemetry:", err);
    }
  };

  useEffect(() => {
    loadPlansAndActiveOrder();
    const interval = setInterval(() => {
      api.get("/subscriptions/orders/active")
        .then((res) => {
          if (res.data?.success) {
            const prev = activePendingOrder?.order?.status;
            const curr = res.data.data?.order?.status;
            if (prev === "PENDING" && curr === "VERIFIED") {
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
              onSubscriptionUpdated();
            }
            setActivePendingOrder(res.data.data);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [activePendingOrder?.order?.status]);

  const handleOpenUpgrade = async (plan: any) => {
    setSelectedPlan(plan);
    setError(null);
    setTrxId("");
    setCreatingOrder(true);
    setModalOpen(true);

    try {
      const res = await api.post("/subscriptions/upgrade-order", { planId: plan.id });
      if (res.data?.success) {
        setOrderData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initialize payment order.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim() || !orderData?.subscriptionOrderId) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post("/subscriptions/verify-payment", {
        subscriptionOrderId: orderData.subscriptionOrderId,
        trxId: trxId.trim().toUpperCase(),
      });

      if (res.data?.verified) {
        setModalOpen(false);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
        onSubscriptionUpdated();
        loadPlansAndActiveOrder();
      } else {
        // As requested: Close modal, transition to waiting review state on the page
        setModalOpen(false);
        loadPlansAndActiveOrder();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed. Please check the TrxID.");
    } finally {
      setSubmitting(false);
    }
  };

  const sub = merchantData?.subscription;
  const isTrial = sub?.isTrial ?? (sub?.plan === "trial");
  const isExpired = sub?.isExpired ?? (sub?.status === "expired" || (sub?.expires_at && new Date(sub.expires_at) < new Date()));
  const daysRemaining = sub?.daysRemaining ?? (sub?.expires_at ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0);

  const isAdminDeviceOnline = adminStatus?.isOnline;
  const pendingOrder = activePendingOrder?.order?.status === "PENDING" ? activePendingOrder.order : null;
  const rejectedOrder = activePendingOrder?.order?.status === "REJECTED" ? activePendingOrder.order : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================= PENDING REVIEW CARD ================= */}
      {pendingOrder && (
        <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 space-y-4 shadow-lg shadow-amber-500/5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Payment Verification Pending
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                    Awaiting Approval
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Your Transaction ID has been recorded. Verification will complete automatically once SMS is synced or admin approves.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const p = plans.find((x) => x.id === pendingOrder.plan) || plans[1] || plans[0];
                handleOpenUpgrade(p);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-white/80 dark:bg-white/5 hover:bg-amber-500/20 text-xs font-bold text-amber-900 dark:text-amber-200 transition-colors shrink-0"
            >
              Update TrxID
            </button>
          </div>

          {/* Details Bar */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/30 border border-amber-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Plan</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase text-xs">
                {pendingOrder.plan} Plan
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Payable Amount</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                ৳{pendingOrder.amount?.toLocaleString()}.00
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted TrxID</span>
              <span className="font-mono font-black text-slate-900 dark:text-white text-xs select-all">
                {pendingOrder.trx_id || "Awaiting submission"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">bKash Gateway</span>
              <span className="font-mono font-bold text-pink-600 dark:text-pink-400 text-xs">
                01915575697
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-amber-800 dark:text-amber-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-500" />
            <span>Waiting for approval. As soon as approved, your premium features will unlock immediately!</span>
          </div>
        </div>
      )}

      {/* ================= REJECTED PAYMENT ALERT CARD ================= */}
      {rejectedOrder && !pendingOrder && (
        <div className="p-5 sm:p-6 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 space-y-4 shadow-lg shadow-rose-500/5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Payment Verification Rejected
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    Rejected by Admin
                  </span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-medium">
                  Reason: {rejectedOrder.rejection_reason || "Payment not received on bKash 01915575697 (Invalid TrxID)."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const p = plans.find((x) => x.id === rejectedOrder.plan) || plans[1] || plans[0];
                handleOpenUpgrade(p);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all shrink-0 flex items-center space-x-1.5"
            >
              <span>Submit Valid TrxID →</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Previously submitted TrxID: <span className="font-bold text-rose-600 dark:text-rose-400">{rejectedOrder.trx_id}</span>
          </div>
        </div>
      )}

      {/* Top Banner: Current Subscription Health & License Status */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isExpired
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                : isTrial
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            }`}>
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize">
                  {sub?.plan ? sub.plan + " Plan" : "Free Trial"}
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  isExpired
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : isTrial
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                }`}>
                  {isExpired ? "Expired" : isTrial ? "Free Trial" : "Active"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isExpired
                  ? "Your trial period has ended. Automated verification is paused. Upgrade with bKash to restore access."
                  : isTrial
                  ? `${daysRemaining} day(s) remaining in your 14-day Free Trial. Upgrade anytime for higher limits.`
                  : `Active subscription valid until ${sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "Active"}.`}
              </p>
            </div>
          </div>

          {/* Quick License Key Pill */}
          <div className="flex items-center space-x-2 self-start lg:self-auto bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">License Key</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {sub?.license_key || "PV-TRIAL-ACTIVE"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(sub?.license_key || "PV-TRIAL-ACTIVE", "license")}
              className="p-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
              title="Copy License Key"
            >
              {copiedField === "license" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Live Admin Device Status Banner */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isAdminDeviceOnline ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isAdminDeviceOnline ? "bg-emerald-500" : "bg-amber-500"
              }`} />
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Admin Relay Phone ({adminStatus?.deviceName || "Realme RMX3939"}):
            </span>
            <span className={`font-bold ${isAdminDeviceOnline ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {isAdminDeviceOnline ? "Online • Instant Verification" : "Offline • Auto-Queue Active"}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Platform Gateway: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">bKash Personal (01915575697)</span>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Available Subscription Plans
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Zero merchant account required. Automated settlement directly through personal bKash.
          </p>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = sub?.plan?.toLowerCase() === plan.id.toLowerCase() && !isExpired;
          const isPro = plan.id === "pro";

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                isPro
                  ? "bg-white dark:bg-[#0d1712] border-2 border-emerald-500/80 shadow-xl shadow-emerald-500/10 dark:shadow-emerald-950/40"
                  : "bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm"
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center space-x-2">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isPro ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300"
                  }`}>
                    {isPro ? <Zap className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {plan.name}
                  </h4>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[36px]">
                  {plan.description}
                </p>

                <div className="mt-4 pb-4 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      / {plan.billingPeriod}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                    {plan.durationDays} Days Full Access
                  </span>
                </div>

                {/* Features List */}
                <div className="mt-5 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                    Features Included
                  </span>
                  {plan.features?.map((feat: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgrade CTA Button */}
              <div className="mt-7 pt-4">
                <button
                  type="button"
                  onClick={() => handleOpenUpgrade(plan)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                    isCurrentPlan
                      ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-default"
                      : isPro
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                      : "bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 active:scale-[0.98]"
                  }`}
                >
                  <span>{isCurrentPlan ? "Current Plan" : `Upgrade to ${plan.name}`}</span>
                  {!isCurrentPlan && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* bKash Payment & Verification Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-hidden animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1410] shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0 bg-white/95 dark:bg-[#0c1410]/95 backdrop-blur z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center text-white font-bold shadow-md shadow-pink-600/20">
                  bK
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Upgrade via bKash</span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedPlan?.name} (৳{selectedPlan?.price?.toLocaleString()})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto px-5 sm:px-6 py-4 flex-1 space-y-4 overscroll-contain">
              {/* Live Admin Device Indicator */}
              <div className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 ${
                isAdminDeviceOnline
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
              }`}>
                {isAdminDeviceOnline ? (
                  <Wifi className="w-4 h-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <Smartphone className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5 animate-pulse" />
                )}
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    {isAdminDeviceOnline ? "Admin Mobile Device Online" : "Admin Mobile Device Offline"}
                  </span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {isAdminDeviceOnline
                      ? "Verification is automated. Once you submit your TrxID, your plan will activate as soon as verified."
                      : "The admin phone is currently offline. You can submit your TrxID; the modal will close and the page will show your pending status. It will verify automatically once the admin device reconnects."}
                  </p>
                </div>
              </div>

              {/* bKash Payment Details Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      bKash Number (Personal)
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-pink-600 dark:text-pink-400 tracking-wider">
                      01915575697
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy("01915575697", "bkash")}
                    className="px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === "bkash" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === "bkash" ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Payable Amount
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-white">
                      ৳{selectedPlan?.price?.toLocaleString()}.00
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(selectedPlan?.price || 0), "amt")}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedField === "amt" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === "amt" ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Reference Note
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedPlan?.id?.toUpperCase() || "SUB"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedPlan?.id?.toUpperCase() || "SUB", "ref")}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedField === "ref" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === "ref" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-slate-100/70 dark:bg-white/[0.02] p-3 rounded-xl">
                <span className="font-bold text-slate-900 dark:text-slate-200 block">Payment Steps:</span>
                <p>1. Open your bKash app and select <strong>Send Money</strong>.</p>
                <p>2. Send <strong>৳{selectedPlan?.price}</strong> to <strong>01915575697</strong>.</p>
                <p>3. Copy the 8-10 character <strong>TrxID</strong> from the bKash SMS.</p>
                <p>4. Enter the TrxID below and click "Verify & Activate".</p>
              </div>

              {/* TrxID Form */}
              <form onSubmit={handleVerifyPayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Enter bKash Transaction ID (TrxID)
                  </label>
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                    placeholder="e.g. BLG74H92KX"
                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl py-3 px-4 text-base font-mono font-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-center uppercase tracking-widest transition-all"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !trxId.trim() || creatingOrder}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-pink-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying with bKash...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Activate Plan</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1 pt-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Personal bKash Automated Verification • Payviro Guard</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
