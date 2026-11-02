// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Copy, Check, ExternalLink, Printer,
  Trash2, DollarSign, Clock, CheckCircle, AlertCircle, Share2, PlusCircle, X
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';
import { CustomerStatementModal } from './business/CustomerStatementModal';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export const InvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'UNPAID' | 'PAID' | 'CANCELLED' | 'OVERDUE'>('all');

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [dueDays, setDueDays] = useState('7');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('Thank you for your business. Contact us if you have any questions.');
  const [items, setItems] = useState<LineItem[]>([
    { description: 'Professional Services', quantity: 1, unitPrice: 5000, amount: 5000 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Customer Statement Modal State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices');
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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
    const sanitizedItems = items.map((it) => {
      const q = parseFloat(it.quantity as any) || 1;
      const u = parseFloat(it.unitPrice as any) || 0;
      return {
        description: it.description?.trim() || 'Services',
        quantity: q,
        unitPrice: u,
        amount: q * u,
      };
    });

    try {
      setSubmitting(true);
      await api.post('/invoices', {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        dueDays: parseInt(dueDays, 10) || 7,
        items: sanitizedItems,
        discount: discountVal,
        tax: taxVal,
        notes: notes.trim() || undefined,
      });
      setShowModal(false);
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setItems([{ description: 'Services', quantity: 1, unitPrice: 1000, amount: 1000 }]);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvoice = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Cancel invoice ${invoiceNumber}? This cannot be undone.`)) return;
    try {
      await api.patch(`/invoices/${id}/status`, { status: 'CANCELLED' });
      fetchInvoices();
    } catch (err) {
      alert('Failed to cancel invoice.');
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Delete invoice ${invoiceNumber}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete invoice.');
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
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + (i.total || 0), 0);
  const unpaidCount = invoices.filter((i) => i.status === 'UNPAID').length;
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_phone.includes(search);
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Invoiced</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">৳{totalInvoiced.toLocaleString()}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Paid Volume</span>
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">৳{totalPaid.toLocaleString()}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Unpaid Invoices</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{unpaidCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">{overdueCount}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, or invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="all">All Invoices</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setStatementCustomerId(null);
              setShowStatementModal(true);
            }}
            className="w-full sm:w-auto px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Customer Service & Account Statement PDF"
          >
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Customer Statement PDF</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs font-medium">Loading invoices...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center glass-panel border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <FileText className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">No invoices found</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Generate digital invoices with hosted payment links for your clients.</p>
        </div>
      ) : (
        <>
          {/* Mobile Invoices Card List */}
          <div className="md:hidden space-y-3">
            {filtered.map((inv) => {
              const isPaid = inv.status === 'PAID';
              const isOverdue = inv.status === 'OVERDUE';
              const dueDate = new Date(inv.due_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div key={inv.id} className="glass-panel bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">{inv.invoice_number}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{inv.customer_name}</h4>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{inv.customer_phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900 dark:text-white font-mono">৳{(inv.total || 0).toLocaleString()}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isPaid
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : isOverdue
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          : inv.status === 'CANCELLED'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Due: {dueDate}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyInvoiceUrl(inv.id)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Copy public link"
                      >
                        {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setStatementCustomerId(inv.customer_id || null);
                          setShowStatementModal(true);
                        }}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-emerald-500/10 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors"
                        title="Customer Statement PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`/invoice/${inv.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="View Public Invoice"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {inv.status !== 'PAID' && (
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                          className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block glass-panel bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Invoice #</th>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Due Date</th>
                  <th className="py-3.5 px-5">Total</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filtered.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isOverdue = inv.status === 'OVERDUE';
                  const dueDate = new Date(inv.due_date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">{inv.invoice_number}</td>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900 dark:text-white">{inv.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{inv.customer_phone}</div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400">{dueDate}</td>
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">৳{(inv.total || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          isPaid
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : isOverdue
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            : inv.status === 'CANCELLED'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyInvoiceUrl(inv.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Copy link"
                          >
                            {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              setStatementCustomerId(inv.customer_id || null);
                              setShowStatementModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-500/10 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors"
                            title="Customer Statement PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={`/invoice/${inv.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="View Public Invoice"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {inv.status !== 'PAID' && (
                            <button
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Create Digital Invoice</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Generate an itemized invoice with instant payment link.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="create-invoice-tab-form" onSubmit={handleCreateInvoice} className="overflow-y-auto px-5 sm:px-6 py-4 flex-1 space-y-4 overscroll-contain text-xs">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asif Mahmud"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="customer@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Due In (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={90}
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="p-2 sm:p-0 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] sm:bg-transparent sm:dark:bg-transparent border border-slate-200/60 dark:border-white/5 sm:border-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white sm:bg-slate-50 dark:bg-slate-900 sm:dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-20 sm:w-16">
                        <span className="sm:hidden text-[10px] text-slate-400 block mb-0.5">Qty</span>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className="w-full px-2 py-2 bg-white sm:bg-slate-50 dark:bg-slate-900 sm:dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white text-center font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex-1 sm:w-24">
                        <span className="sm:hidden text-[10px] text-slate-400 block mb-0.5">Unit Price</span>
                        <input
                          type="number"
                          required
                          min={0}
                          placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-2 bg-white sm:bg-slate-50 dark:bg-slate-900 sm:dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white text-right font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="w-20 sm:w-24 text-right font-mono font-bold text-xs text-slate-900 dark:text-white self-end sm:self-center">
                        <span className="sm:hidden text-[10px] text-slate-400 block font-normal">Total</span>
                        ৳{item.amount.toLocaleString()}
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer self-end sm:self-center transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Adjustments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount (BDT)</label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax / VAT (BDT)</label>
                  <input
                    type="number"
                    min={0}
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Total Banner */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Total Invoice Payable:</span>
                <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-[#37e58a] font-mono">
                  ৳{total.toLocaleString()} BDT
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes & Terms</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                form="create-invoice-tab-form"
                type="submit"
                disabled={submitting || !customerName.trim() || !customerPhone.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Creating...' : 'Issue Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Statement & Details PDF Modal */}
      <CustomerStatementModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        initialCustomerId={statementCustomerId}
      />
    </div>
  );
};
