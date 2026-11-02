// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText, ShieldCheck, Printer, CreditCard, CheckCircle,
  Clock, AlertTriangle, ArrowRight, Download, Share2, Copy, Check,
  ExternalLink, ArrowLeft, Wallet, Hash, Globe, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { copyToClipboard } from '../utils/clipboard';
import { getExplorerUrl, getNetworkConfig } from '../utils/cryptoExplorers';

export const PublicInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/invoices/public/${id}`);
        setInvoice(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invoice not found.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchInvoice();
  }, [id]);

  const handlePayNow = async () => {
    try {
      setPaying(true);
      const res = await axios.post(`${API_BASE}/invoices/public/${id}/pay`);
      const { paymentId } = res.data.data;
      navigate(`/pay/${paymentId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment gateway connection failed.');
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async (text: string, fieldName: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#080d0b] flex items-center justify-center p-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2 font-medium">
          <div className="w-4 h-4 border-2 border-[#c8501e] border-t-transparent rounded-full animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#080d0b] flex items-center justify-center p-4 text-center">
        <div className="glass-panel border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl bg-white dark:bg-[#0f1714]">
          <AlertTriangle className="w-12 h-12 text-[#c8501e] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invoice Unavailable</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">{error}</p>
          <Link to="/history" className="px-5 py-2.5 bg-[#c8501e] hover:bg-[#b04316] text-white rounded-xl text-xs font-semibold inline-block">
            View Audit History
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID' || invoice.payment_status === 'Paid';
  const isOverdue = invoice.status === 'OVERDUE';
  const isCancelled = invoice.status === 'CANCELLED';
  const isUnderReview = invoice.status === 'UNDER_REVIEW' || invoice.payment_status === 'Under Review';

  const isCrypto = Boolean(
    invoice.crypto_currency ||
    invoice.crypto_network ||
    invoice.txid_hash ||
    invoice.receiving_wallet_address ||
    invoice.client_telegram_username
  );

  const currencySymbol = isCrypto ? (invoice.crypto_currency || 'USDT') : '৳';
  const cryptoNet = invoice.crypto_network || 'BNB Smart Chain (BEP20)';
  const netConfig = getNetworkConfig(cryptoNet);
  const txid = invoice.txid_hash || invoice.trx_id;
  const explorerUrl = txid ? getExplorerUrl(cryptoNet, txid) : null;
  const receivingWallet = invoice.receiving_wallet_address;
  const telegramHandle = invoice.client_telegram_username || invoice.client_contact;
  const serviceDuration = invoice.service_duration_or_type || 'Milestone Delivery';

  const issueDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  let rawBusinessName = invoice.business_name || 'Payviro Global';
  if (rawBusinessName.toLowerCase().includes('tawhid') || rawBusinessName.toLowerCase().includes('hablu')) {
    rawBusinessName = 'Payviro Global';
  }
  const primaryName = rawBusinessName.trim();

  const invoicePaidAmount = Number(invoice.paid_amount || invoice.total || 0);
  const invoicePaymentDate = invoice.paid_at
    ? new Date(invoice.paid_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date(invoice.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#080d0b] py-6 sm:py-10 px-2 sm:px-4 font-sans text-slate-900 transition-colors duration-200 flex flex-col items-center">
      {/* Printable CSS style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: white !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .invoice-sheet {
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: #000 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 8mm 10mm !important;
                margin: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .bg-\\[\\#c8501e\\] {
                background-color: #c8501e !important;
                color: white !important;
              }
              a {
                text-decoration: none !important;
                color: #000 !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `,
        }}
      />

      <div className="w-full max-w-[840px] space-y-4">
        {/* Top Floating Actions Bar (No-Print) */}
        <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel border border-slate-200 dark:border-white/10 p-3.5 sm:p-4 rounded-2xl shadow-xl bg-white dark:bg-[#0f1714]">
          <div className="flex items-center gap-2">
            <Link
              to="/history"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors text-xs flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Audit History</span>
            </Link>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                isPaid
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : isUnderReview
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                  : isOverdue
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  : isCancelled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              }`}
            >
              {invoice.payment_status || invoice.status}
            </span>

            {isCrypto && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {cryptoNet}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="dropdown" />

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{netConfig.explorerName}</span>
              </a>
            )}

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-[#c8501e] hover:bg-[#b04316] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#c8501e]/25 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>

            {!isPaid && !isCancelled && !isCrypto && (
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{paying ? 'Connecting...' : 'Pay Now'}</span>
              </button>
            )}
          </div>
        </div>

        {/* THE CORPORATE INVOICE SHEET (MATCHING OFFICIAL AUDIT SPEC) */}
        <div className="invoice-sheet relative w-full bg-white text-slate-900 shadow-2xl rounded-none sm:rounded-sm p-8 sm:p-12 overflow-hidden select-text text-[13px] leading-relaxed border border-slate-200/60">
          {/* TOP RIGHT GEOMETRIC ACCENT (SWOOSH + CIRCLES) */}
          <div className="absolute top-0 right-0 w-64 sm:w-80 h-44 sm:h-56 pointer-events-none overflow-hidden z-0">
            <svg viewBox="0 0 320 220" className="w-full h-full" fill="none" preserveAspectRatio="none">
              <path d="M120 0 C 180 50, 240 100, 320 180 L 320 0 Z" fill="#ea580c" />
              <path d="M165 0 C 220 40, 265 80, 320 135 L 320 0 Z" fill="#0f172a" />
              <circle cx="230" cy="115" r="22" fill="#f59e0b" />
              <circle cx="310" cy="90" r="34" fill="#f97316" />
            </svg>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1.5 max-w-sm">
                <div className="flex items-center gap-3.5 mb-2">
                  <img
                    src="/payviro-logo-transparent.png"
                    alt="Payviro"
                    className="w-10 h-12 object-contain shrink-0"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />

                  <div className="leading-tight">
                    <div className="text-xl font-black tracking-tight text-black uppercase font-sans">
                      {primaryName || 'PAYVIRO GLOBAL'}
                    </div>
                    <div className="text-[10px] font-bold tracking-widest text-[#c8501e] uppercase">
                      Digital Services & Blockchain Audit
                    </div>
                  </div>
                </div>

                <div className="text-[12px] text-slate-800 space-y-0.5 leading-normal">
                  <p className="font-semibold">Compliance & Freelance Remittance Office</p>
                  <p>Email: {invoice.merchant_email || 'compliance@payviro.global'}</p>
                  <p>Phone: {invoice.merchant_phone || '+880 1915575697'}</p>
                  <p className="font-mono text-[11px] text-slate-600">Audit Trail ID: PV-AML-{invoice.id.substring(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="sm:text-right space-y-1 pt-2 sm:pt-12 sm:pr-4">
                <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
                  OFFICIAL TAX & AUDIT INVOICE
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                  Invoice #{invoice.invoice_number.replace(/^[A-Z]+-/, '')}
                </h2>
                <div className="text-xs text-slate-800 space-y-0.5 font-medium">
                  <div>Issue Date: <span className="font-semibold text-black">{issueDate}</span></div>
                  <div>Valid Until: <span className="font-semibold text-black">{dueDate}</span></div>
                </div>
              </div>
            </div>

            {/* Customer & Client Handle Shaded Box */}
            <div className="space-y-1.5 pt-1">
              <div className="font-bold text-black text-[13px] flex items-center justify-between max-w-md">
                <span>Client & Payer Identifier</span>
                {telegramHandle && (
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Telegram: {telegramHandle}
                  </span>
                )}
              </div>
              <div className="bg-[#f3f4f6] border border-slate-300 rounded p-3.5 max-w-md text-slate-900 text-xs space-y-1 shadow-2xs">
                <div className="font-bold text-[13px] text-black">
                  To: {invoice.customer_name}
                </div>
                {telegramHandle && (
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold font-mono text-[11px]">
                    <span className="text-slate-500 font-normal">Social Handle:</span>
                    <span>{telegramHandle}</span>
                  </div>
                )}
                {invoice.customer_phone && invoice.customer_phone !== 'N/A' && (
                  <div className="font-mono text-[11px] text-slate-700">
                    Contact: {invoice.customer_phone}
                  </div>
                )}
                {invoice.customer_email && (
                  <div className="text-[11px] text-slate-700">
                    Email: {invoice.customer_email}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 pt-0.5">
                  Service Contract: {serviceDuration}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden pt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#c8501e] text-white font-bold text-[13px]">
                    <th className="py-2.5 px-4 font-semibold w-1/2">Service Description</th>
                    <th className="py-2.5 px-4 font-semibold text-center w-24">Quantity</th>
                    <th className="py-2.5 px-4 font-semibold text-right w-32">Unit Price</th>
                    <th className="py-2.5 px-4 font-semibold text-right w-36">Total ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-3 px-4 font-bold text-slate-900 text-[13px]">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                          {currencySymbol} {Number(item.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {currencySymbol} {Number(item.amount || (item.quantity * item.unitPrice) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-slate-200">
                      <td className="py-3 px-4 font-bold text-slate-900 text-[13px]">
                        Full-Stack Software Architecture & Digital Services
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">1</td>
                      <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                        {currencySymbol} {Number(invoice.total || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {currencySymbol} {Number(invoice.total || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="h-[1.5px] bg-[#c8501e] w-full" />
            </div>

            {/* Scope / Contract Specifications */}
            <div className="space-y-3 pt-1 text-[12px] text-slate-900">
              <div className="space-y-1">
                <div className="font-bold text-black flex items-center justify-between">
                  <span>Scope of Digital Services & Deliverables:</span>
                  <span className="font-mono text-[11px] text-[#c8501e]">{serviceDuration}</span>
                </div>
                <ul className="space-y-0.5 pl-4 text-slate-800 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Completed milestones, digital product architecture, code review & technical consulting.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>All intellectual property and work product transferred upon blockchain settlement confirmation.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Verifiable freelance remuneration backed by distributed public ledger proof.</span>
                  </li>
                </ul>
              </div>

              <div className="h-[1px] bg-slate-300 w-full pt-1" />
            </div>

            {/* Total Summary */}
            <div className="flex justify-between items-center py-2 text-base sm:text-lg font-black text-black">
              <div>Invoice Total:</div>
              <div className="font-mono text-right text-xl">
                {currencySymbol} {Number(invoice.total || 0).toLocaleString()}
              </div>
            </div>

            {/* BLOCKCHAIN AUDIT & AML COMPLIANCE SETTLEMENT BOX (BINANCE PROOF) */}
            <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-lg text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs" />
                  <div className="font-black text-black text-[12px] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Cryptocurrency Transaction & Compliance Audit Trail</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                  <span>✓</span> {isPaid ? 'PAID & BLOCKCHAIN VERIFIED' : (invoice.payment_status || invoice.status)}
                </span>
              </div>

              {/* 4-Column Audit Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-slate-800">
                {/* 1. Crypto Network */}
                <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Crypto Network
                  </div>
                  <div className="font-black text-slate-900 text-[12px] tracking-tight">
                    {cryptoNet}
                  </div>
                </div>

                {/* 2. Amount & Asset */}
                <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Settlement Currency
                  </div>
                  <div className="font-mono font-black text-emerald-700 text-[12px] tracking-tight">
                    {Number(invoice.total || 0).toLocaleString()} {currencySymbol}
                  </div>
                </div>

                {/* 3. Client Handle */}
                <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Client / Payer Handle
                  </div>
                  <div className="font-mono font-bold text-blue-700 text-[12px] tracking-tight truncate">
                    {telegramHandle || invoice.customer_name}
                  </div>
                </div>

                {/* 4. Payment Timestamp */}
                <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Verification Date
                  </div>
                  <div className="font-mono font-bold text-slate-800 text-[11px] tracking-tight">
                    {invoicePaymentDate}
                  </div>
                </div>
              </div>

              {/* Receiving Deposit Wallet Address */}
              {receivingWallet && (
                <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Receiving Exchange Deposit Wallet (Deposit Address)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(receivingWallet, 'wallet')}
                      className="no-print text-[#c8501e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'wallet' ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedField === 'wallet' ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-[12px] break-all select-all bg-slate-50 p-1.5 rounded border border-slate-200">
                    {receivingWallet}
                  </div>
                </div>
              )}

              {/* Blockchain TXID (Transaction Hash) */}
              <div className="p-2.5 rounded bg-white border-2 border-amber-300 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3 text-amber-600" />
                    <span>Blockchain Transaction Hash (TXID / Proof of Remittance)</span>
                  </span>
                  <div className="no-print flex items-center gap-2">
                    {txid && (
                      <button
                        type="button"
                        onClick={() => handleCopy(txid, 'txid')}
                        className="text-amber-800 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedField === 'txid' ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedField === 'txid' ? 'Copied' : 'Copy TXID'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="font-mono font-bold text-emerald-800 text-[12px] break-all select-all bg-emerald-50/50 p-2 rounded border border-emerald-200">
                  {txid || 'PENDING CLIENT BLOCKCHAIN HASH'}
                </div>

                {explorerUrl && (
                  <div className="text-[11px] text-slate-700 flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="font-bold text-black">Block Explorer Verification:</span>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-blue-700 underline break-all font-semibold"
                    >
                      {explorerUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Formal AML / Compliance Declaration */}
              <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-700 leading-relaxed space-y-1">
                <div className="font-bold text-black uppercase tracking-wider flex items-center gap-1">
                  <span>AML / CFT Compliance Verification Certificate</span>
                </div>
                <p>
                  This official invoice confirms the contractual legitimacy and proof-of-work origin of the cryptocurrency deposit referenced by TXID above. Rendered services have been delivered by the merchant to the client. This transaction complies with FATF Travel Rule requirements, international freelancing guidelines, and exchange deposit compliance standards.
                </p>
              </div>
            </div>

            {/* Notes & Terms */}
            {invoice.notes && (
              <div className="space-y-1 pt-1 text-[11px] text-slate-800">
                <div className="font-bold text-black">Compliance Memo / Notes:</div>
                <p className="pl-2 border-l-2 border-slate-300 italic">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 relative">
              <div className="h-[1.5px] bg-slate-400 w-full mb-3" />

              <div className="flex items-center justify-between">
                <div className="flex items-center text-black">
                  <ShieldCheck className="w-6 h-6 text-[#c8501e]" />
                </div>

                <div className="text-center font-bold text-black text-xs space-y-0.5">
                  <div className="tracking-wide uppercase font-black">{primaryName || 'PAYVIRO GLOBAL'}</div>
                  <div className="text-[10px] text-slate-600 font-medium flex items-center justify-center gap-1">
                    <span>© {new Date().getFullYear()} Payviro Compliance Systems. Irrefutable Digital Service Trail.</span>
                  </div>
                </div>

                <div className="flex items-center -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-[#ea580c] flex items-center justify-center text-white text-[8px] font-black shadow-xs">
                    AML
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#f59e0b] shadow-xs" />
                  <div className="w-7 h-7 rounded-full bg-[#fbbf24] shadow-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoicePage;
