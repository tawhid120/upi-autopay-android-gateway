// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Copy, Check, ExternalLink, Printer,
  Trash2, DollarSign, Clock, CheckCircle, AlertCircle, Share2,
  PlusCircle, X, Zap, CreditCard, Send, ArrowRight, ShieldCheck, Briefcase,
  Wallet, Hash
} from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../utils/clipboard';
import { CustomerStatementModal } from './CustomerStatementModal';
import { CryptoInvoiceGeneratorModal } from '../CryptoInvoiceGeneratorModal';
import {
  CRYPTO_NETWORKS,
  CRYPTO_CURRENCIES,
  getExplorerUrl,
  getNetworkConfig,
  formatAddressTruncated,
} from '../../utils/cryptoExplorers';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export const BusinessInvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Invoice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [businessType, setBusinessType] = useState<'general' | 'outsourcing' | 'sales' | 'subscription' | 'service'>('general');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [dueDays, setDueDays] = useState('7');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [initialPaid, setInitialPaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [serviceDurationOrType, setServiceDurationOrType] = useState('Monthly Retainer');
  const [cryptoCurrency, setCryptoCurrency] = useState('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState('BEP20');
  const [receivingWalletAddress, setReceivingWalletAddress] = useState('');
  const [txidHash, setTxidHash] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'Draft' | 'Pending' | 'Paid' | 'Under Review'>('Pending');
  const [notes, setNotes] = useState('Thank you for your business. Verified digital service payment.');
  const [items, setItems] = useState<LineItem[]>([
    { description: 'Professional Services', quantity: 1, unitPrice: 5000, amount: 5000 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Instant Verification Modal State
  const [verifyingInvoice, setVerifyingInvoice] = useState<any | null>(null);
  const [verifyTrxId, setVerifyTrxId] = useState('');
  const [verifyProvider, setVerifyProvider] = useState('bKash');
  const [verifyingLoading, setVerifyingLoading] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{ success: boolean; message: string; receipt?: any } | null>(null);

  // Manual Payment Modal State
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [manualPayAmount, setManualPayAmount] = useState('');
  const [manualPayMethod, setManualPayMethod] = useState('Cash');
  const [manualPayTrx, setManualPayTrx] = useState('');
  const [manualPayNotes, setManualPayNotes] = useState('');
  const [manualPayLoading, setManualPayLoading] = useState(false);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Customer Statement Modal State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const [invRes, custRes, projRes] = await Promise.all([
        api.get('/business/invoices', {
          params: { status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined },
        }),
        api.get('/business/customers'),
        api.get('/business/projects'),
      ]);
      setInvoices(invRes.data.data || []);
      setCustomers(custRes.data.data || []);
      setProjects(projRes.data.data || []);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email || '');
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(updated[index].quantity as any) || 0;
      const u = parseFloat(updated[index].unitPrice as any) || 0;
      updated[index].amount = q * u;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const discountVal = parseFloat(discount) || 0;
  const taxVal = parseFloat(tax) || 0;
  const total = Math.max(0, subtotal - discountVal + taxVal);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();
    const cleanEmail = customerEmail.trim();

    if (!cleanName) {
      setFormError('Customer name is required.');
      return;
    }
    if (!cleanPhone) {
      setFormError('Customer phone number is required.');
      return;
    }

    const sanitizedItems = items.map((it) => {
      const q = parseFloat(it.quantity as any) || 1;
      const u = parseFloat(it.unitPrice as any) || 0;
      return {
        description: it.description?.trim() || 'Item',
        quantity: q,
        unitPrice: u,
        amount: q * u,
      };
    });

    if (sanitizedItems.length === 0) {
      setFormError('Please add at least one line item.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/business/invoices', {
        customerId: selectedCustomerId || undefined,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail || undefined,
        projectId: selectedProjectId || undefined,
        businessType,
        dueDays: parseInt(dueDays, 10) || 7,
        items: sanitizedItems,
        discount: discountVal,
        tax: taxVal,
        paidAmount: parseFloat(initialPaid) || 0,
        paymentMethod,
        notes: notes?.trim() || undefined,
        clientTelegramUsername: telegramUsername.trim() || undefined,
        clientContact: telegramUsername.trim() || cleanPhone,
        serviceDurationOrType: serviceDurationOrType.trim(),
        cryptoCurrency,
        cryptoNetwork,
        receivingWalletAddress: receivingWalletAddress.trim() || undefined,
        txidHash: txidHash.trim() || undefined,
        paymentStatus,
      });

      setShowCreateModal(false);
      setFormError(null);
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setTelegramUsername('');
      setReceivingWalletAddress('');
      setTxidHash('');
      setPaymentStatus('Pending');
      setSelectedCustomerId('');
      setSelectedProjectId('');
      setItems([{ description: 'Professional Services', quantity: 1, unitPrice: 5000, amount: 5000 }]);
      fetchInvoices();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create invoice.';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/business/invoices/${id}`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  // Instant Verification via SMS Relay
  const handleVerifyTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingInvoice) return;

    try {
      setVerifyingLoading(true);
      setVerifyFeedback(null);
      const res = await api.post(`/business/invoices/${verifyingInvoice.id}/verify-trx`, {
        trxId: verifyTrxId.trim().toUpperCase(),
        service: verifyProvider,
      });

      if (res.data.matched) {
        setVerifyFeedback({
          success: true,
          message: res.data.message,
          receipt: res.data.receipt,
        });
        fetchInvoices();
      } else {
        setVerifyFeedback({
          success: false,
          message: res.data.message,
        });
      }
    } catch (err: any) {
      setVerifyFeedback({
        success: false,
        message: err.response?.data?.message || 'Verification failed.',
      });
    } finally {
      setVerifyingLoading(false);
    }
  };

  // Manual payment recording
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    try {
      setManualPayLoading(true);
      const res = await api.post(`/business/invoices/${payingInvoice.id}/payment`, {
        amount: parseFloat(manualPayAmount),
        paymentMethod: manualPayMethod,
        trxId: manualPayTrx || undefined,
        notes: manualPayNotes || undefined,
      });

      setPayingInvoice(null);
      alert(`Payment recorded! Official Receipt #${res.data?.data?.receipt_number}`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setManualPayLoading(false);
    }
  };

  const copyInvoiceUrl = async (id: string) => {
    const url = `${window.location.origin}/invoice/${id}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
  const totalDue = invoices.reduce((sum, i) => sum + (i.due_amount || (i.status !== 'PAID' ? i.total : 0)), 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE' || (new Date(i.due_date) < new Date() && i.status !== 'PAID')).length;

  return (
    <div className="space-y-6">
      {/* Top Financial Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Invoiced</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">৳{totalInvoiced.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">{invoices.length} total invoices</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Collected Volume</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">৳{totalPaid.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600/80 dark:text-[#37e58a]/80 mt-1">Directly received</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Receivable Dues</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">৳{totalDue.toLocaleString()}</div>
          <div className="text-[11px] text-amber-600/80 mt-1">Pending clearance</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Overdue Invoices</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{overdueCount}</div>
          <div className="text-[11px] text-rose-500/80 mt-1">Action required</div>
        </div>
      </div>

      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, customer name, phone..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setStatementCustomerId(null);
              setShowStatementModal(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Generate Customer Service & Account Statement PDF"
          >
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Customer Statement PDF</span>
          </button>

          <Link
            to="/history"
            className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Open Dedicated Cryptocurrency Audit & AML History Dashboard"
          >
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Audit History (/history)</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowCryptoModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer shrink-0"
            title="Open Crypto AML Audit Invoice Generator"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Crypto Invoice</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoice List Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Invoices Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Generate itemized professional invoices for your clients with automatic bKash verification and instant payment receipts.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Invoice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards View (<md) */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => {
              const isPaid = inv.status === 'PAID';
              const isPartial = inv.status === 'PARTIAL';
              const dueAmt = inv.due_amount !== undefined ? inv.due_amount : (isPaid ? 0 : inv.total);

              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0e1512] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3"
                >
                  {/* Top Row: Invoice # and Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a
                        href={`/invoice/${inv.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span className="truncate">{inv.invoice_number}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Due: {new Date(inv.due_date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isPartial
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {inv.status}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 capitalize">
                        {inv.business_type || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {inv.customer_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {inv.customer_phone}
                    </div>
                  </div>

                  {/* Financial Breakdown 3-Col Mini Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-slate-100/60 dark:bg-black/20 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 text-xs truncate">
                        ৳{Number(inv.total || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Paid</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-[#37e58a] mt-0.5 text-xs truncate">
                        ৳{Number(inv.paid_amount || (isPaid ? inv.total : 0)).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-rose-500 uppercase font-semibold">Due</div>
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5 text-xs truncate">
                        ৳{dueAmt > 0 ? Number(dueAmt).toLocaleString() : '0'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {!isPaid && inv.status !== 'CANCELLED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyingInvoice(inv);
                              setVerifyTrxId('');
                              setVerifyFeedback(null);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                            title="Auto-verify bKash TrxID"
                          >
                            <Zap className="w-3 h-3 text-pink-500 fill-pink-500" />
                            <span>Verify bKash</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPayingInvoice(inv);
                              setManualPayAmount(String(dueAmt));
                              setManualPayMethod('Cash');
                              setManualPayTrx('');
                              setManualPayNotes('');
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold inline-flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                            title="Record Cash/Bank Payment"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyInvoiceUrl(inv.id)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Copy Public Invoice Link"
                      >
                        {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const matchedCust = customers.find(c => c.id === inv.customer_id || c.phone === inv.customer_phone);
                          setStatementCustomerId(matchedCust ? matchedCust.id : (inv.customer_id || null));
                          setShowStatementModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                        title="Customer Statement PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`/invoice/${inv.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="View / Print Invoice"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>=md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e1512]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Client</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold text-right">Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Due</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isPartial = inv.status === 'PARTIAL';
                  const dueAmt = inv.due_amount !== undefined ? inv.due_amount : (isPaid ? 0 : inv.total);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="hover:underline text-emerald-600 dark:text-emerald-400">
                            {inv.invoice_number}
                          </a>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          Due: {new Date(inv.due_date).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                          {inv.client_telegram_username && (
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{inv.client_telegram_username}</span>
                          )}
                          {inv.customer_phone && inv.customer_phone !== 'N/A' && inv.customer_phone !== inv.client_telegram_username && (
                            <span>{inv.customer_phone}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {inv.crypto_network ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {inv.crypto_network}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 capitalize">
                            {inv.business_type || 'General'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {inv.crypto_currency ? `${inv.crypto_currency} ` : '৳'}{Number(inv.total || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-[#37e58a]">
                        ৳{Number(inv.paid_amount || (isPaid ? inv.total : 0)).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black">
                        {dueAmt > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">৳{dueAmt.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">৳0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : isPartial
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && inv.status !== 'CANCELLED' && (
                            <>
                              {/* Auto Verify bKash Button */}
                              <button
                                onClick={() => {
                                  setVerifyingInvoice(inv);
                                  setVerifyTrxId('');
                                  setVerifyFeedback(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Auto-verify bKash TrxID from SMS relay"
                              >
                                <Zap className="w-3 h-3 text-pink-500 fill-pink-500" />
                                <span>Verify bKash</span>
                              </button>

                              {/* Manual Pay Button */}
                              <button
                                onClick={() => {
                                  setPayingInvoice(inv);
                                  setManualPayAmount(String(dueAmt));
                                  setManualPayMethod('Cash');
                                  setManualPayTrx('');
                                  setManualPayNotes('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Record Cash/Bank Payment"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            </>
                          )}

                          {/* Copy Link Button */}
                          <button
                            onClick={() => copyInvoiceUrl(inv.id)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Copy Public Invoice Link"
                          >
                            {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Customer Statement PDF */}
                          <button
                            type="button"
                            onClick={() => {
                              const matchedCust = customers.find(c => c.id === inv.customer_id || c.phone === inv.customer_phone);
                              setStatementCustomerId(matchedCust ? matchedCust.id : (inv.customer_id || null));
                              setShowStatementModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                            title="Customer Statement & Details PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* View External Link */}
                          <a
                            href={`/invoice/${inv.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="View / Print Invoice"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete Invoice Button */}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE INVOICE MODAL (FLEXIBLE BUSINESS TYPES)          */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Professional Invoice</h3>
                <p className="text-xs text-slate-400">Generate itemized billing with automated payment tracking</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="create-invoice-form" onSubmit={handleCreateInvoice} className="overflow-y-auto px-5 py-4 flex-1 space-y-4 overscroll-contain text-xs">
              {/* Validation / Error Banner */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                  <div className="flex-1 font-medium">{formError}</div>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-rose-400 hover:text-rose-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Business Structure Selector */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1.5">Business & Work Model</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'general', label: 'Standard', desc: 'Itemized products/services' },
                    { id: 'outsourcing', label: 'Outsourcing / Freelance', desc: 'Milestone & Project based' },
                    { id: 'sales', label: 'Salesman / Retail', desc: 'Quantity & Unit Rate' },
                    { id: 'subscription', label: 'Monthly Retainer', desc: 'Recurring subscription' },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setBusinessType(m.id as any)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        businessType === m.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Selector / Input */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Customer Details</span>
                  {customers.length > 0 && (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 max-w-[180px] sm:max-w-xs truncate"
                    >
                      <option value="">Quick Pick Customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. John Doe / ABC Corp"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Telegram / Social Handle</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">@</span>
                      <input
                        type="text"
                        value={telegramUsername.replace(/^@/, '')}
                        onChange={(e) => setTelegramUsername(`@${e.target.value.replace(/^@/, '')}`)}
                        placeholder="satoshi_trader"
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Customer Phone / Contact *</label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="017XXXXXXXX or handle"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Customer Email</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="client@mail.com"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Cryptocurrency Settlement Block */}
                <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Crypto Payment & On-Chain Audit Details</span>
                    </span>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid (Verified)</option>
                      <option value="Under Review">Under Review</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">Crypto Currency</label>
                      <select
                        value={cryptoCurrency}
                        onChange={(e) => setCryptoCurrency(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold"
                      >
                        {CRYPTO_CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">Crypto Network</label>
                      <select
                        value={cryptoNetwork}
                        onChange={(e) => setCryptoNetwork(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold"
                      >
                        {CRYPTO_NETWORKS.map((n) => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">Service Duration / Milestone</label>
                      <input
                        type="text"
                        value={serviceDurationOrType}
                        onChange={(e) => setServiceDurationOrType(e.target.value)}
                        placeholder="e.g. Monthly Retainer, Milestone 1"
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">Receiving Wallet Address (Your Deposit Address)</label>
                      <input
                        type="text"
                        value={receivingWalletAddress}
                        onChange={(e) => setReceivingWalletAddress(e.target.value)}
                        placeholder="0x... or T..."
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">TXID (Transaction Hash)</span>
                        <span className="text-[10px] text-slate-400">Post-Payment Proof</span>
                      </label>
                      <input
                        type="text"
                        value={txidHash}
                        onChange={(e) => setTxidHash(e.target.value)}
                        placeholder="Paste on-chain hash once client pays..."
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {businessType === 'outsourcing' && projects.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Attach to Project (Optional)</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    >
                      <option value="">None / Standalone Milestone</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} (Fee: ৳{Number(p.project_amount).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {businessType === 'outsourcing' ? 'Milestones / Deliverables' : 'Services & Products'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 sm:p-0 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] sm:bg-transparent sm:dark:bg-transparent border border-slate-200/60 dark:border-white/5 sm:border-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Description / Milestone title..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white sm:bg-slate-50 dark:bg-slate-900 sm:dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-20 sm:w-16">
                          <span className="sm:hidden text-[10px] text-slate-400 block mb-0.5">Qty</span>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className="w-full px-2 py-2 rounded-xl bg-white sm:bg-slate-50 dark:bg-slate-900 sm:dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center focus:outline-none"
                          />
                        </div>
                        <div className="flex-1 sm:w-28">
                          <span className="sm:hidden text-[10px] text-slate-400 block mb-0.5">Price</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            placeholder="Unit Price"
                            className="w-full px-2 py-2 rounded-xl bg-white sm:bg-slate-50 dark:bg-slate-900 sm:dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-right focus:outline-none"
                          />
                        </div>
                        <div className="w-20 sm:w-24 text-right font-mono font-bold text-slate-900 dark:text-white px-1 sm:px-2 self-end sm:self-center">
                          <span className="sm:hidden text-[10px] text-slate-400 block font-normal">Total</span>
                          ৳{(item.amount || 0).toLocaleString()}
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer self-end sm:self-center transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/10">
                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Discount (৳):</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 px-2 py-1 text-right rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Tax / VAT (৳):</span>
                    <input
                      type="number"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      className="w-24 px-2 py-1 text-right rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-white/10">
                    <span>Total Due:</span>
                    <span className="text-emerald-600 dark:text-[#37e58a] font-mono">৳{total.toLocaleString()}</span>
                  </div>

                  {/* Initial Paid Amount */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Advance Paid (৳):</span>
                      <input
                        type="number"
                        value={initialPaid}
                        onChange={(e) => setInitialPaid(e.target.value)}
                        className="w-24 px-2 py-1 text-right rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Due Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Due In (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Terms & Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="create-invoice-form"
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Saving to Database...' : 'Save to History / Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INSTANT BKASH RELAY VERIFICATION MODAL                   */}
      {/* ======================================================== */}
      {verifyingInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center font-black text-xs">
                  bK
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Verify bKash Payment</h3>
                  <p className="text-xs text-slate-400">Invoice: {verifyingInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setVerifyingInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="verify-trx-form" onSubmit={handleVerifyTrxSubmit} className="overflow-y-auto px-5 py-4 flex-1 space-y-4 overscroll-contain text-xs">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-xs space-y-1">
                <div className="text-slate-500 dark:text-slate-400">Client: <span className="font-bold text-slate-800 dark:text-slate-200">{verifyingInvoice.customer_name}</span></div>
                <div className="text-slate-500 dark:text-slate-400">Expected Due: <span className="font-mono font-black text-rose-600 dark:text-rose-400">৳{Number(verifyingInvoice.due_amount || verifyingInvoice.total).toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  MFS Channel
                </label>
                <select
                  value={verifyProvider}
                  onChange={(e) => setVerifyProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="bKash">bKash Personal / Merchant</option>
                  <option value="Nagad">Nagad Personal / Merchant</option>
                  <option value="Rocket">Rocket Personal</option>
                  <option value="Upay">Upay</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Customer Transaction ID (TrxID) *
                </label>
                <input
                  type="text"
                  required
                  value={verifyTrxId}
                  onChange={(e) => setVerifyTrxId(e.target.value)}
                  placeholder="e.g. 9K48X78A9B"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono uppercase font-bold text-sm tracking-wider focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Matches instantly against SMS received by your connected Android relay phone.
                </p>
              </div>

              {verifyFeedback && (
                <div className={`p-3 rounded-xl text-xs border ${
                  verifyFeedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                }`}>
                  <div className="font-bold">{verifyFeedback.success ? 'Verification Successful!' : 'Verification Notice'}</div>
                  <div className="mt-0.5 leading-relaxed">{verifyFeedback.message}</div>
                  {verifyFeedback.receipt && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                      <span className="font-mono">Receipt: {verifyFeedback.receipt.receipt_number}</span>
                      <a
                        href={`/receipt/${verifyFeedback.receipt.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold inline-flex items-center gap-0.5"
                      >
                        View Receipt <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setVerifyingInvoice(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                form="verify-trx-form"
                type="submit"
                disabled={verifyingLoading}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{verifyingLoading ? 'Checking Relay...' : 'Verify Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MANUAL PAYMENT SETTLEMENT MODAL                          */}
      {/* ======================================================== */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Invoice Payment</h3>
                <p className="text-xs text-slate-400">Invoice: {payingInvoice.invoice_number}</p>
              </div>
              <button
                onClick={() => setPayingInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="manual-pay-form" onSubmit={handleManualPaymentSubmit} className="overflow-y-auto px-5 py-4 flex-1 space-y-4 overscroll-contain text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Amount Paid (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={manualPayAmount}
                    onChange={(e) => setManualPayAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Method</label>
                  <select
                    value={manualPayMethod}
                    onChange={(e) => setManualPayMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Reference / TrxID (Optional)</label>
                <input
                  type="text"
                  value={manualPayTrx}
                  onChange={(e) => setManualPayTrx(e.target.value)}
                  placeholder="Voucher or bank slip number..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={manualPayNotes}
                  onChange={(e) => setManualPayNotes(e.target.value)}
                  placeholder="Notes for the customer receipt..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="manual-pay-form"
                type="submit"
                disabled={manualPayLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {manualPayLoading ? 'Processing...' : 'Settle & Generate Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crypto AML Compliance Invoice Generator Modal */}
      <CryptoInvoiceGeneratorModal
        isOpen={showCryptoModal}
        onClose={() => setShowCryptoModal(false)}
        onInvoiceSaved={() => fetchInvoices()}
      />

      {/* Customer Statement & Details PDF Modal */}
      <CustomerStatementModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        initialCustomerId={statementCustomerId}
      />
    </div>
  );
};
