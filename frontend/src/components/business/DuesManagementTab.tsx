// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  Clock, AlertTriangle, CheckCircle, DollarSign, Send,
  CreditCard, Search, ArrowRight, ChevronRight, User,
  Calendar, Phone, Building, MessageSquare, Mail, X, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../utils/clipboard';

interface CustomerDue {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  company_name?: string;
  customer_total_due: number;
  customer_overdue: number;
  oldest_due_date: string;
  unpaid_invoice_count: number;
}

export const DuesManagementTab: React.FC<{ onNavigateToCustomer?: (id: string) => void }> = ({ onNavigateToCustomer }) => {
  const [data, setData] = useState<{
    overview: { totalReceivable: number; overdue: number; dueThisWeek: number };
    customerDues: CustomerDue[];
  }>({
    overview: { totalReceivable: 0, overdue: 0, dueThisWeek: 0 },
    customerDues: [],
  });

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue_only'>('all');
  const [search, setSearch] = useState('');

  // Payment Modal State
  const [activePaymentCustomer, setActivePaymentCustomer] = useState<CustomerDue | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [paymentTrxId, setPaymentTrxId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Reminder Modal State
  const [reminderModalData, setReminderModalData] = useState<any | null>(null);
  const [copiedReminder, setCopiedReminder] = useState(false);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/business/dues');
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load dues overview', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, []);

  const openReceivePayment = async (customer: CustomerDue) => {
    setActivePaymentCustomer(customer);
    setPaymentAmount(String(customer.customer_total_due));
    setPaymentMethod('bKash');
    setPaymentTrxId('');
    setPaymentNotes('');

    // Fetch invoices for this customer
    try {
      const res = await api.get(`/business/customers/${customer.customer_id}`);
      const invs = (res.data.data?.invoices || []).filter((i: any) => i.status !== 'PAID');
      setCustomerInvoices(invs);
      if (invs.length > 0) {
        setSelectedInvoiceId(invs[0].id);
        if (invs[0].due_amount) setPaymentAmount(String(invs[0].due_amount));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      alert('Please select an invoice to apply payment.');
      return;
    }

    try {
      setPaymentSubmitting(true);
      const res = await api.post(`/business/invoices/${selectedInvoiceId}/payment`, {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        trxId: paymentTrxId || undefined,
        notes: paymentNotes || undefined,
      });

      setActivePaymentCustomer(null);
      alert(`Payment recorded! Official Receipt #${res.data?.data?.receipt_number}`);
      fetchDues();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment recording failed.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const openReminder = async (customerId: string) => {
    try {
      const res = await api.get(`/business/dues/reminder/${customerId}`);
      setReminderModalData(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate reminder.');
    }
  };

  const filteredCustomers = data.customerDues.filter((c) => {
    const matchesSearch =
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_phone.includes(search) ||
      (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter = filter === 'all' || (filter === 'overdue_only' && c.customer_overdue > 0);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Dues Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Receivable</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            ৳{Number(data.overview.totalReceivable || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Across {data.customerDues.length} outstanding accounts
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs mb-1 font-medium">
            <span>Overdue Amount</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
            ৳{Number(data.overview.overdue || 0).toLocaleString()}
          </div>
          <div className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1 font-semibold">
            Requires immediate payment follow-up
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs mb-1 font-medium">
            <span>Due This Week</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
            ৳{Number(data.overview.dueThisWeek || 0).toLocaleString()}
          </div>
          <div className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
            Expected cash inflows within 7 days
          </div>
        </div>
      </div>

      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search debtor customers or company..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Outstanding ({data.customerDues.length})
          </button>
          <button
            onClick={() => setFilter('overdue_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === 'overdue_only'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            Overdue Only ({data.customerDues.filter((c) => c.customer_overdue > 0).length})
          </button>
        </div>
      </div>

      {/* Debtors List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Analyzing accounts receivable...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Zero Outstanding Dues!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All client invoices are currently settled in full. New unpaid invoices will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCustomers.map((c) => {
            const isOverdue = c.customer_overdue > 0;
            return (
              <div
                key={c.customer_id}
                className={`p-5 rounded-2xl border transition-all ${
                  isOverdue
                    ? 'border-rose-500/30 bg-rose-500/[0.02] dark:bg-rose-950/[0.08]'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e1512]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{c.customer_name}</h4>
                      {isOverdue && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                          Overdue
                        </span>
                      )}
                    </div>
                    {c.company_name && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{c.company_name}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {c.customer_phone}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Due</span>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                      ৳{Number(c.customer_total_due).toLocaleString()}
                    </div>
                    {isOverdue && (
                      <div className="text-[11px] text-rose-500 font-medium mt-0.5">
                        Overdue: ৳{Number(c.customer_overdue).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Oldest Due: {new Date(c.oldest_due_date).toLocaleDateString()}</span>
                  </div>
                  <div>{c.unpaid_invoice_count} unpaid invoice(s)</div>
                </div>

                {/* 3 Action Buttons */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onNavigateToCustomer?.(c.customer_id)}
                    className="py-2 px-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Khata</span>
                  </button>

                  <button
                    onClick={() => openReceivePayment(c)}
                    className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Receive Pay</span>
                  </button>

                  <button
                    onClick={() => openReminder(c.customer_id)}
                    className="py-2 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1 border border-blue-500/20 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reminder</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receive Payment Modal */}
      {activePaymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Receive Due Payment</h3>
                <p className="text-xs text-slate-400">{activePaymentCustomer.customer_name} • Due: ৳{activePaymentCustomer.customer_total_due.toLocaleString()}</p>
              </div>
              <button
                onClick={() => setActivePaymentCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="due-payment-form" onSubmit={handlePaymentSubmit} className="overflow-y-auto px-5 py-4 flex-1 space-y-3.5 overscroll-contain text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Select Invoice to Clear *</label>
                {customerInvoices.length > 0 ? (
                  <select
                    required
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = customerInvoices.find((i) => i.id === e.target.value);
                      if (inv?.due_amount) setPaymentAmount(String(inv.due_amount));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    {customerInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} (Outstanding Due: ৳{Number(inv.due_amount || inv.total).toLocaleString()})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                    Loading invoices...
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Amount Paid (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Wire</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Transaction ID (TrxID)</label>
                <input
                  type="text"
                  value={paymentTrxId}
                  onChange={(e) => setPaymentTrxId(e.target.value)}
                  placeholder="e.g. 9K48X78A9B"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Receipt Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Settlement notes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setActivePaymentCustomer(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="due-payment-form"
                type="submit"
                disabled={paymentSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {paymentSubmitting ? 'Recording...' : 'Generate Receipt & Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {reminderModalData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Send Due Reminder</h3>
              </div>
              <button
                onClick={() => setReminderModalData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto px-5 py-4 flex-1 space-y-3.5 overscroll-contain text-xs">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
                <div>Client: <span className="font-bold text-slate-900 dark:text-white">{reminderModalData.customerName}</span> ({reminderModalData.customerPhone})</div>
                <div>Outstanding Balance: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{reminderModalData.currency}{reminderModalData.dueAmount.toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Pre-formatted Message</label>
                <textarea
                  readOnly
                  rows={6}
                  value={reminderModalData.textTemplate}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed select-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <a
                  href={reminderModalData.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={async () => {
                    await copyToClipboard(reminderModalData.textTemplate);
                    setCopiedReminder(true);
                    setTimeout(() => setCopiedReminder(false), 2000);
                  }}
                  className="py-2.5 rounded-xl bg-slate-800 dark:bg-white/10 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer"
                >
                  {copiedReminder ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{copiedReminder ? 'Copied!' : 'Copy SMS'}</span>
                </button>

                {reminderModalData.mailtoUrl ? (
                  <a
                    href={reminderModalData.mailtoUrl}
                    className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all text-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </a>
                ) : (
                  <button disabled className="py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 text-xs font-medium cursor-not-allowed">
                    No Email
                  </button>
                )}
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setReminderModalData(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
