// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ShieldCheck, Clock, Copy, Check, ArrowRight, AlertCircle,
  Smartphone, CheckCircle2, Lock, Sparkles, RefreshCw
} from 'lucide-react';
import { api, API_BASE } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { copyToClipboard } from '../utils/clipboard';

export const HostedCheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [session, setSession] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDeviceOffline, setIsDeviceOffline] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(1200); // 20 mins in seconds

  const navigate = useNavigate();

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Load Session Data
  const loadSession = async () => {
    try {
      const res = await api.get(`/checkout/session/${orderId}`);
      if (res.data.success) {
        setSession(res.data.data);
        if (res.data.data.isDeviceOnline !== undefined) {
          setIsDeviceOffline(!res.data.data.isDeviceOnline);
        }
        if (res.data.data.order.status === 'VERIFIED') {
          triggerSuccess();
        }
      }
    } catch (err: any) {
      setError('Payment session invalid or expired.');
    }
  };

  const triggerSuccess = () => {
    setIsVerified(true);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  useEffect(() => {
    loadSession();

    // Setup SSE stream for instant real-time verification
    if (orderId) {
      const sseUrl = `${API_BASE}/checkout/session/${orderId}/stream`;
      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.status === 'VERIFIED') {
            triggerSuccess();
            if (payload.redirectUrl) {
              setTimeout(() => {
                window.location.href = payload.redirectUrl;
              }, 2500);
            }
          }
        } catch (e) {
          // ignore
        }
      };

      return () => {
        eventSource.close();
      };
    }
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmitTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) return;

    setError(null);
    setStatusMessage(null);
    setSubmitting(true);

    try {
      const res = await api.post(`/checkout/session/${orderId}/submit-trx`, {
        trxId: trxId.trim(),
        service: selectedProvider,
      });

      if (res.data.verified) {
        triggerSuccess();
        if (res.data.redirectUrl) {
          setTimeout(() => {
            window.location.href = res.data.redirectUrl;
          }, 2500);
        }
      } else {
        if (res.data.isDeviceOffline) {
          setIsDeviceOffline(true);
        }
        setStatusMessage(res.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Find active MFS account for the selected provider
  const currentAccount = session?.mfsAccounts?.find(
    (a: any) => a.provider.toLowerCase() === selectedProvider.toLowerCase()
  ) || {
    account_number: '01700000000',
    account_type: 'personal',
  };

  const themeColors = {
    bKash: {
      border: 'border-pink-500',
      bg: 'bg-pink-600',
      text: 'text-pink-600 dark:text-pink-400',
      lightBg: 'bg-pink-50 dark:bg-pink-500/10',
      gradient: 'from-pink-600 to-rose-700',
      instruction: 'Send Money (Personal) or Make Payment',
    },
    Nagad: {
      border: 'border-orange-500',
      bg: 'bg-orange-600',
      text: 'text-orange-600 dark:text-orange-400',
      lightBg: 'bg-orange-50 dark:bg-orange-500/10',
      gradient: 'from-orange-600 to-amber-700',
      instruction: 'Send Money to Nagad account',
    },
    Rocket: {
      border: 'border-purple-500',
      bg: 'bg-purple-600',
      text: 'text-purple-600 dark:text-purple-400',
      lightBg: 'bg-purple-50 dark:bg-purple-500/10',
      gradient: 'from-purple-600 to-indigo-700',
      instruction: 'Send Money to Rocket account',
    },
  }[selectedProvider];

  if (!session && !error) {
    return (
      <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] flex items-center justify-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
        <span>Initializing secure checkout...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="w-full max-w-lg flex justify-end mb-3">
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-lg glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#37e58a] via-[#12b56a] to-[#0a8f52] flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">Merchant</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{session?.order?.businessName || 'Payviro Checkout'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-amber-600 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Success State Screen */}
        {isVerified ? (
          <div className="py-10 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Payment <span className="hl-green">Verified!</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
              Your transaction has been confirmed in real time. Redirecting to merchant confirmation...
            </p>
            {session?.order?.redirectUrl && (
              <a
                href={session.order.redirectUrl}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-2"
              >
                <span>Continue to Merchant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Amount Banner */}
            <div className="text-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total Payable</span>
              <div className="text-3xl font-black text-emerald-700 dark:text-[#37e58a] mt-1 font-mono">
                ৳{session?.order?.amount?.toLocaleString() || '0'}.00
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Order ID: <span className="hl-underline">#{session?.order?.orderId}</span>
              </span>
            </div>

            {/* Provider Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-2">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['bKash', 'Nagad', 'Rocket'] as const).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => { setSelectedProvider(prov); setError(null); }}
                    className={`py-3 px-2 rounded-xl font-bold text-xs border transition-all flex flex-col items-center justify-center space-y-1 ${
                      selectedProvider === prov
                        ? prov === 'bKash'
                          ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-600/30'
                          : prov === 'Nagad'
                          ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/30'
                          : 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{prov}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Details & 1-Tap Copy */}
            <div className="p-4 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    {selectedProvider} Number ({currentAccount.account_type})
                  </span>
                  <span className="text-base font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                    {currentAccount.account_number}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(currentAccount.account_number, 'acc')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'acc' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Amount</span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">৳{session?.order?.amount}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(String(session?.order?.amount), 'amt')}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 text-xs flex items-center space-x-1 transition-colors"
                >
                  {copiedField === 'amt' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'amt' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Instruction Steps */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-slate-300">📌 Payment Steps:</p>
              <p>1. Open your {selectedProvider} app and {themeColors.instruction}.</p>
              <p>2. Copy the 8-10 digit Transaction ID (TrxID) from the confirmation SMS.</p>
              <p>3. Enter the TrxID below and click "Verify Payment".</p>
            </div>

            {/* TrxID Input Form */}
            <form onSubmit={handleSubmitTrx} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Transaction ID (TrxID)
                </label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  placeholder="e.g. BLG74H92KX"
                  className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl py-3 px-4 text-base font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 uppercase tracking-widest text-center transition-all"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {statusMessage && (
                <div className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 ${
                  isDeviceOffline
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                }`}>
                  {isDeviceOffline ? (
                    <Smartphone className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5 animate-pulse" />
                  ) : (
                    <RefreshCw className="w-4 h-4 flex-shrink-0 text-emerald-500 animate-spin mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold block">
                      {isDeviceOffline ? 'Admin Device Offline (Auto-Queued)' : 'Verification In Progress'}
                    </span>
                    <p className="text-[11px] leading-relaxed opacity-90">{statusMessage}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !trxId.trim()}
                className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-white font-bold text-sm shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Payment</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-[11px] text-slate-500 dark:text-slate-500 flex items-center justify-center space-x-1.5 pt-2">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>256-bit SSL Encrypted • Payviro Guard</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
