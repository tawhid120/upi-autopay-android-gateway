// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Link2, CreditCard, ArrowRight, Lock, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';

export const PublicPaymentLinkPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customer Input
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/payment-links/public/${code}`);
        setLinkData(res.data.data);
        if (!res.data.data.is_variable && res.data.data.amount) {
          setCustomAmount(res.data.data.amount.toString());
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Payment link not found or expired.');
      } finally {
        setLoading(false);
      }
    };
    if (code) fetchLink();
  }, [code]);

  const handleProceedToPay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPaying(true);
      const res = await axios.post(`${API_BASE}/payment-links/public/${code}/pay`, {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        amount: linkData.is_variable ? parseFloat(customAmount) : undefined,
      });

      const { paymentId } = res.data.data;
      navigate(`/pay/${paymentId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to initiate checkout.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] flex items-center justify-center p-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2 font-medium">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading payment link...
        </div>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] flex items-center justify-center p-4 text-center">
        <div className="glass-panel border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Payment Link Unavailable</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">{error}</p>
          <Link to="/" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const finalAmount = linkData.is_variable ? parseFloat(customAmount) || 0 : linkData.amount;

  return (
    <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] flex flex-col items-center justify-center p-4 font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <div className="w-full max-w-md flex justify-end mb-3">
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-md glass-panel border border-emerald-500/20 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-emerald-950/20 via-slate-100 dark:via-slate-900/50 to-emerald-950/30 p-6 border-b border-slate-200 dark:border-white/10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Payviro Secure Checkout
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{linkData.business_name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{linkData.title}</p>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleProceedToPay} className="p-6 space-y-4">
          {linkData.description && (
            <div className="p-3 bg-slate-100 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {linkData.description}
            </div>
          )}

          {/* Amount Display or Input */}
          <div className="p-4 bg-emerald-50/70 dark:bg-black/40 rounded-2xl border border-emerald-500/20 text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-medium">Total Payable</span>
            {linkData.is_variable ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-[#37e58a]">৳</span>
                <input
                  type="number"
                  required
                  min={10}
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-44 text-2xl font-black text-slate-900 dark:text-white bg-transparent text-center border-b-2 border-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="text-3xl font-black text-emerald-700 dark:text-[#37e58a] tracking-tight font-mono">
                ৳{(linkData.amount || 0).toLocaleString()}
                <span className="text-xs font-normal text-slate-500 ml-1">BDT</span>
              </div>
            )}
          </div>

          {/* Customer Inputs */}
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Tanvir Ahmed"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          {/* Pay Button */}
          <button
            type="submit"
            disabled={paying || finalAmount <= 0 || !customerPhone}
            className="w-full mt-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {paying ? (
              'Connecting Gateway...'
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pay via bKash / Nagad / Rocket</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-2">
            <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>256-bit Encrypted Protection • Payviro</span>
          </div>
        </form>
      </div>
    </div>
  );
};
