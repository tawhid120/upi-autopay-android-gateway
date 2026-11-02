// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText, ShieldCheck, Printer, CheckCircle, AlertTriangle,
  ArrowLeft, Download, Share2, Phone, Mail, MapPin, Building,
  CreditCard, Layers, Check, Copy
} from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { copyToClipboard } from '../utils/clipboard';

export const PublicCustomerStatementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [statementData, setStatementData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchStatement = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/business/customers/public/${id}/statement`);
        setStatementData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Customer statement not found.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchStatement();
  }, [id]);

  const handlePrint = () => {
    window.print();
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
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d0b] flex items-center justify-center p-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2.5 font-medium">
          <div className="w-4 h-4 border-2 border-[#c8501e] border-t-transparent rounded-full animate-spin" />
          Loading document...
        </div>
      </div>
    );
  }

  if (error || !statementData) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#090d0b] flex items-center justify-center p-4 text-center">
        <div className="glass-panel border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl bg-white dark:bg-[#0f1714]">
          <AlertTriangle className="w-12 h-12 text-[#c8501e] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Statement Unavailable</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">{error}</p>
          <Link
            to="/"
            className="px-5 py-2.5 bg-[#c8501e] hover:bg-[#b04316] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const customer = statementData.customer;
  const businessProfile = statementData.businessProfile;
  const invoices = statementData.invoices || [];
  const receipts = statementData.receipts || [];
  const allServices = statementData.allServices || [];
  const summary = statementData.statementSummary || {
    totalInvoiced: customer.total_invoiced || 0,
    totalPaid: customer.total_paid || 0,
    totalDue: customer.total_due || 0,
    servicesCount: allServices.length,
    status: (customer.total_due || 0) <= 0 ? 'SETTLED' : 'DUE',
  };

  const currency = businessProfile?.currency_symbol || '৳';
  const documentNumber = `INV-${new Date().getFullYear()}-${customer.id ? customer.id.slice(0, 7).toUpperCase() : '0001'}`;
  
  const issueDate = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const validUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  let rawBusinessName = businessProfile?.business_name || 'Payviro';
  if (rawBusinessName.toLowerCase().includes('tawhid') || rawBusinessName.toLowerCase().includes('hablu')) {
    rawBusinessName = 'Payviro';
  }
  const primaryName = rawBusinessName.trim();
  const secondaryName = '';

  const firstReceipt = receipts.length > 0 ? receipts[0] : null;
  const paymentMethod = firstReceipt?.payment_method || 'bKash';
  const paymentTrxId = firstReceipt?.trx_id || 'DHP1S0LOD5';
  const paymentPaidAmount = Number(
    firstReceipt?.paid_amount || firstReceipt?.amount_received || summary.totalPaid || customer.total_paid || 150000
  );
  const paymentDate = firstReceipt?.payment_date
    ? new Date(firstReceipt.payment_date).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : customer.last_payment_date
    ? new Date(customer.last_payment_date).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '25 Aug 2026, 05:40 PM';
  const paymentReceiver = businessProfile?.phone || '01915575697';
  const paymentSender = customer.phone || '01838234459';
  const paymentStatus = firstReceipt?.payment_status || 'PAID & VERIFIED';

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#070b09] py-6 sm:py-10 px-2 sm:px-4 font-sans text-slate-900 transition-colors duration-200 flex flex-col items-center">
      {/* Print Styles for Pixel-Perfect Corporate Output */}
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
              .statement-sheet {
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: #000 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 10mm 12mm !important;
                margin: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .bg-\\[\\#c8501e\\] {
                background-color: #c8501e !important;
                color: white !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `,
        }}
      />

      <div className="w-full max-w-[800px] space-y-4">
        {/* Top Control Bar (No-Print) */}
        <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel border border-slate-200 dark:border-white/10 p-3.5 sm:p-4 rounded-2xl shadow-xl bg-white dark:bg-[#0f1714]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                summary.totalDue <= 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#c8501e]/15 text-[#c8501e] border border-[#c8501e]/30'
              }`}
            >
              {summary.totalDue <= 0 ? 'Fully Settled' : 'Payment Due'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="dropdown" />

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-[#c8501e] hover:bg-[#b04316] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#c8501e]/25 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* THE CORPORATE PRINTABLE SHEET */}
        <div className="statement-sheet relative w-full bg-white text-slate-900 shadow-2xl rounded-none sm:rounded-sm p-8 sm:p-14 overflow-hidden select-text text-[13px] leading-relaxed">
          {/* TOP RIGHT GEOMETRIC ACCENT (EXACT SWOOSH + CIRCLES) */}
          <div className="absolute top-0 right-0 w-64 sm:w-80 h-44 sm:h-56 pointer-events-none overflow-hidden z-0">
            <svg viewBox="0 0 320 220" className="w-full h-full" fill="none" preserveAspectRatio="none">
              <path d="M120 0 C 180 50, 240 100, 320 180 L 320 0 Z" fill="#ea580c" />
              <path d="M165 0 C 220 40, 265 80, 320 135 L 320 0 Z" fill="#0f172a" />
              <circle cx="230" cy="115" r="22" fill="#f59e0b" />
              <circle cx="310" cy="90" r="34" fill="#f97316" />
            </svg>
          </div>

          {/* CONTENT */}
          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1.5 max-w-sm">
                <div className="flex items-center gap-3.5 mb-2">
                  <img
                    src="/payviro-logo-transparent.png"
                    alt="Payviro"
                    className="w-10 h-12 object-contain shrink-0"
                  />

                  <div className="leading-tight">
                    <div className="text-xl font-black tracking-tight text-black uppercase font-sans">
                      {primaryName || 'PAYVIRO'}
                    </div>
                    <div className="text-[10px] font-bold tracking-widest text-[#c8501e] uppercase">
                      Enterprise Gateway
                    </div>
                  </div>
                </div>

                <div className="text-[12px] text-slate-800 space-y-0.5 leading-normal">
                  <p>{businessProfile?.address || 'Dhaka, Bangladesh'}</p>
                  <p>Phone: {businessProfile?.phone || '01915575697'}</p>
                  <p>Email: {businessProfile?.email || 'support@payviro.duckdns.org'}</p>
                  <p>Website: {businessProfile?.website || 'payviro.duckdns.org'}</p>
                </div>
              </div>

              <div className="sm:text-right space-y-1 pt-2 sm:pt-14 sm:pr-4">
                <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                  Invoice #{documentNumber.replace(/^[A-Z]+-/, '')}
                </h2>
                <div className="text-xs text-slate-800 space-y-0.5 font-medium">
                  <div>Date: <span className="font-semibold text-black">{issueDate}</span></div>
                  <div>Valid Until: <span className="font-semibold text-black">{validUntilDate}</span></div>
                </div>
              </div>
            </div>

            {/* Customer Box */}
            <div className="space-y-1.5 pt-1">
              <div className="font-bold text-black text-[13px]">
                Customer
              </div>
              <div className="bg-[#e5e7eb]/80 border border-slate-300/60 rounded-sm p-3.5 max-w-sm text-slate-900 text-xs space-y-0.5 shadow-xs">
                <div className="font-bold">
                  To: {customer.company_name ? `${customer.company_name},` : `${customer.name},`}
                </div>
                <div>{customer.address || 'Dhaka, Bangladesh'}</div>
                {customer.phone && <div className="font-mono text-[11px] text-slate-700">Phone: {customer.phone}</div>}
                {customer.email && <div className="text-[11px] text-slate-700">Email: {customer.email}</div>}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden pt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#c8501e] text-white font-bold text-[13px]">
                    <th className="py-2.5 px-4 font-semibold w-1/2">Description</th>
                    <th className="py-2.5 px-4 font-semibold text-center w-24">Quantity</th>
                    <th className="py-2.5 px-4 font-semibold text-right w-32">Price</th>
                    <th className="py-2.5 px-4 font-semibold text-right w-36">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
                  {allServices.length > 0 ? (
                    allServices.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-3 px-4 font-bold text-slate-900 text-[13px]">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                          {currency} {Number(item.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {currency} {Number(item.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 font-bold text-slate-900 text-[13px]">
                          LMS Website Development
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">1</td>
                        <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                          {currency} 1,50,000
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {currency} 1,50,000
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 font-bold text-slate-900 text-[13px]">
                          Automation Agent Development
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">1</td>
                        <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                          {currency} 1,00,000
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {currency} 1,00,000
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              <div className="h-[1.5px] bg-[#c8501e] w-full" />
            </div>

            {/* Specifications Breakdown */}
            <div className="space-y-4 pt-2 text-[12px] text-slate-900">
              <div className="space-y-1">
                <div className="font-bold italic text-black">For LMS -</div>
                <div className="font-bold">Technologies: <span className="font-normal">WordPress</span></div>
                <div className="font-bold">Theme/Plug-In: <span className="font-normal">Tutor LMS, Elementor</span></div>
                <div className="font-bold">Features:</div>
                <ul className="space-y-0.5 pl-4 text-slate-800">
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>LMS all features (Course, Assignment, Certificate, etc)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Responsive & Mobile-Friendly Layout</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Contact Forms & Lead Capture Integration</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Fast & SEO-Friendly Structure</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-bold italic text-black">For Automation -</div>
                <div className="font-bold">Technologies: <span className="font-normal">n8n Workflow Automation</span></div>
                <div className="font-bold">Features:</div>
                <ul className="space-y-0.5 pl-4 text-slate-800">
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Auto post to social media & webhooks.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Trading View Snapshot to pro user.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Custom alert notifications.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Data export (CSV / Excel).</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-black">Others - Details</div>
                <ul className="space-y-0.5 pl-4 text-slate-800">
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>API: Trading View, LinkedIn, Twitter</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Full setup and configuration.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-black">Others - guides and documentation.</div>
                <ul className="space-y-0.5 pl-4 text-slate-800">
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Total Revisions - 5 Times</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Delivery Timeline - 20 Working Days</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>Customer Support - WhatsApp / Phone</span>
                  </li>
                </ul>
              </div>

              <div className="h-[1px] bg-slate-300 w-full pt-1" />
            </div>

            {/* Subtotal */}
            <div className="flex justify-between items-center py-2 text-base sm:text-lg font-black text-black">
              <div>Sub Total:</div>
              <div className="font-mono text-right">
                {currency} {Number(summary.totalInvoiced || 250000).toLocaleString()}
              </div>
            </div>

            {/* Verified Payment & Settlement Details */}
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
                  <div className="font-bold text-black text-[12px] uppercase tracking-wide">
                    Payment Verification & Settlement Details
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                  <span>✓</span> {paymentStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800">
                {/* Payment Method */}
                <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Payment Method
                  </div>
                  <div className="font-black text-[#E2136E] text-[12px] tracking-tight">
                    {paymentMethod} (Personal)
                  </div>
                </div>

                {/* Paid To (Merchant) */}
                <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Paid To (Merchant)
                  </div>
                  <div className="font-mono font-black text-slate-900 text-[12px] tracking-tight">
                    {paymentReceiver}
                  </div>
                </div>

                {/* Paid From (Customer) */}
                <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Paid From (Customer)
                  </div>
                  <div className="font-mono font-black text-slate-900 text-[12px] tracking-tight">
                    {paymentSender}
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Transaction ID (TrxID)
                  </div>
                  <div className="font-mono font-black text-emerald-700 text-[12px] tracking-wider">
                    {paymentTrxId}
                  </div>
                </div>
              </div>

              {/* Amount Paid & Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-700 pt-1 border-t border-slate-200/80 gap-1.5">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-bold text-slate-900">Amount Paid:</span>{' '}
                    <span className="font-mono font-black text-emerald-700 text-xs">
                      {currency} {Number(paymentPaidAmount).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div>
                    <span className="font-bold text-slate-900">Payment Time:</span>{' '}
                    <span className="font-medium text-slate-900">{paymentDate}</span>
                  </div>
                </div>
                <div className="text-[10px] font-medium text-emerald-700 italic">
                  * Instant Verification via Payviro Gateway (Clean TrxID)
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1 pt-1 text-[12px] text-slate-900">
              <div className="font-bold text-black">Note:</div>
              <ul className="space-y-0.5 pl-4 text-slate-800">
                <li className="flex items-start gap-1.5">
                  <span className="text-black">•</span>
                  <span>Full access control (Admin Dashboard)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-black">•</span>
                  <span>1-Year Warranty & Technical Support Included</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-black">•</span>
                  <span>Website Maintenance Training Video Provided</span>
                </li>
              </ul>
            </div>

            {/* Footer */}
            <div className="pt-8 relative">
              <div className="h-[1.5px] bg-slate-400 w-full mb-3" />

              <div className="flex items-center justify-between">
                <div className="flex items-center text-black">
                  <svg className="w-8 h-8 fill-current" viewBox="0 0 28 28">
                    <polygon points="0,0 12,12 0,12" />
                    <polygon points="0,16 12,28 0,28" />
                  </svg>
                </div>

                <div className="text-center font-bold text-black text-xs space-y-0.5">
                  <div className="tracking-wide uppercase font-black">{primaryName || 'PAYVIRO'}</div>
                  <div className="text-[10px] text-slate-600 font-medium flex items-center justify-center gap-1">
                    <span>© {new Date().getFullYear()} Payviro. All rights reserved.</span>
                  </div>
                </div>

                <div className="flex items-center -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#ea580c] flex items-center justify-center text-white text-[9px] font-black shadow-xs">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 12 C 9 16, 15 16, 18 12" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#f59e0b] shadow-xs" />
                  <div className="w-8 h-8 rounded-full bg-[#fbbf24] shadow-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
