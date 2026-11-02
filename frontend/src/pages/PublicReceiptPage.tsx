// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, Printer, CheckCircle, AlertTriangle, Download,
  Share2, FileText, ArrowLeft, Building, Phone, Mail, Globe, Check
} from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { copyToClipboard } from '../utils/clipboard';

export const PublicReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/business/receipts/public/${id}`);
        setReceipt(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Payment receipt not found.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d0b] flex items-center justify-center p-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2.5 font-medium">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading payment receipt...
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d0b] flex items-center justify-center p-4 text-center">
        <div className="glass-panel border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl bg-white dark:bg-[#0f1714]">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Receipt Unavailable</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">{error}</p>
          <Link to="/" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const paymentDate = new Date(receipt.payment_date || receipt.created_at).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const currency = receipt.currency_symbol || '৳';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d0b] py-8 sm:py-12 px-4 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Print CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .receipt-sheet { border: none !important; box-shadow: none !important; background: white !important; color: black !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          .text-white, .dark\\:text-white { color: #111 !important; }
          .text-slate-400, .text-slate-500, .text-slate-300, .text-slate-600 { color: #555 !important; }
          .bg-slate-50, .bg-slate-900, .dark\\:bg-\\[\\#0e1512\\] { background: #f8fafc !important; color: #111 !important; }
          .border-slate-800, .border-slate-200, .dark\\:border-white\\/10 { border-color: #cbd5e1 !important; }
        }
      `}} />

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Floating Top Bar (No print) */}
        <div className="no-print flex items-center justify-between gap-3 glass-panel border border-slate-200 dark:border-white/10 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f1714] shadow-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {receipt.payment_status || 'VERIFIED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="dropdown" />
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Link Copied' : 'Share'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Receipt Document Card */}
        <div className="receipt-sheet glass-panel bg-white dark:bg-[#0e1512] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
          {/* Subtle Verified Watermark Stamp */}
          <div className="absolute right-6 top-6 sm:right-12 sm:top-12 pointer-events-none select-none opacity-[0.06] dark:opacity-[0.08] text-emerald-600 rotate-[-15deg]">
            <CheckCircle className="w-48 h-48 sm:w-64 sm:h-64" />
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-100 dark:border-white/10">
            <div className="space-y-2">
              {receipt.logo_url ? (
                <img
                  src={receipt.logo_url}
                  alt={receipt.business_name}
                  className="h-12 w-auto max-w-[180px] object-contain rounded-lg mb-2"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  <Building className="w-5 h-5" />
                </div>
              )}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {receipt.business_name}
              </h1>
              {receipt.business_address && (
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">{receipt.business_address}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {receipt.business_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {receipt.business_phone}</span>}
                {receipt.business_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {receipt.business_email}</span>}
              </div>
            </div>

            <div className="sm:text-right space-y-1 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                Official Payment Receipt
              </span>
              <h2 className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {receipt.receipt_number}
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Date: <span className="text-slate-800 dark:text-slate-200 font-semibold">{paymentDate}</span>
              </div>
              {receipt.invoice_number && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Ref Invoice: <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">#{receipt.invoice_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer and Amount Received Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 sm:p-6 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Received From:
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {receipt.customer_name}
              </div>
              {receipt.customer_company && (
                <div className="text-xs text-slate-600 dark:text-slate-300">{receipt.customer_company}</div>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{receipt.customer_phone}</div>
              {receipt.customer_email && (
                <div className="text-xs text-slate-500 dark:text-slate-400">{receipt.customer_email}</div>
              )}
            </div>

            <div className="sm:text-right flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Amount Received:
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-[#37e58a] font-mono tracking-tight">
                {currency}{Number(receipt.amount_received || 0).toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                Method: <span className="text-slate-900 dark:text-white font-bold">{receipt.payment_method}</span>
              </div>
            </div>
          </div>

          {/* Payment Verification Details */}
          <div className="p-5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Transaction Verification Ledger
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Payment Method</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{receipt.payment_method}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Transaction ID</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block break-all">
                  {receipt.trx_id || 'OFFLINE / CASH'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Previous Due</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {currency}{Number(receipt.previous_due || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Remaining Due</span>
                <span className={`font-mono font-bold mt-0.5 block ${Number(receipt.remaining_due || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {currency}{Number(receipt.remaining_due || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {receipt.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Notes: </span>
                {receipt.notes}
              </div>
            )}
          </div>

          {/* Footer Security Seal */}
          <div className="pt-6 border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Authentic Digital Payment Receipt</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Powered by Payviro Enterprise Core • Thank you for your payment!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
