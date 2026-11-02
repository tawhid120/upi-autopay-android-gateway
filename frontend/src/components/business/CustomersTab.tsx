// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, Phone, Mail, Building, FileText,
  DollarSign, ArrowUpRight, CheckCircle, AlertCircle, Clock,
  MoreHorizontal, Plus, Edit2, Trash2, Send, CreditCard, X,
  ExternalLink, ChevronRight, Briefcase, RefreshCw, MessageSquare
} from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../utils/clipboard';
import { CustomerStatementModal } from './CustomerStatementModal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  company_name?: string;
  customer_type: string;
  notes?: string;
  total_invoiced: number;
  total_paid: number;
  total_due: number;
  invoice_count: number;
  receipt_count: number;
  active_projects: number;
  last_payment_date?: string;
  last_invoice_date?: string;
  created_at: string;
}

export const CustomersTab: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Customer 360 View Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'invoices' | 'receipts' | 'projects' | 'recurring'>('invoices');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    companyName: '',
    customerType: 'Client',
    address: '',
    notes: '',
  });

  // Payment form states
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [paymentTrxId, setPaymentTrxId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Reminder states
  const [reminderData, setReminderData] = useState<any | null>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/business/customers', {
        params: { search: search || undefined, type: typeFilter !== 'all' ? typeFilter : undefined },
      });
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const loadCustomer360 = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/business/customers/${id}`);
      setCustomerDetails(res.data.data);
    } catch (err) {
      console.error('Failed to load customer profile', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/business/customers', formData);
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '', companyName: '', customerType: 'Client', address: '', notes: '' });
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create customer.');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    try {
      await api.put(`/business/customers/${selectedCustomerId}`, formData);
      setShowEditModal(false);
      loadCustomer360(selectedCustomerId);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update customer.');
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your customer database?`)) return;
    try {
      await api.delete(`/business/customers/${id}`);
      if (selectedCustomerId === id) setSelectedCustomerId(null);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  const openReceivePayment = (customer: Customer, invoiceId?: string, dueAmount?: number) => {
    setPaymentCustomer(customer);
    setPaymentInvoiceId(invoiceId || '');
    setPaymentAmount(dueAmount ? String(dueAmount) : (customer.total_due > 0 ? String(customer.total_due) : ''));
    setPaymentMethod('bKash');
    setPaymentTrxId('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoiceId) {
      alert('Please select or create an invoice to credit this payment against.');
      return;
    }
    try {
      setSubmittingPayment(true);
      const res = await api.post(`/business/invoices/${paymentInvoiceId}/payment`, {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        trxId: paymentTrxId || undefined,
        notes: paymentNotes || undefined,
      });

      setShowPaymentModal(false);
      alert(`Payment recorded successfully! Receipt #${res.data?.data?.receipt_number}`);
      fetchCustomers();
      if (selectedCustomerId) loadCustomer360(selectedCustomerId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment recording failed.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openSendReminder = async (customerId: string, invoiceId?: string) => {
    try {
      const res = await api.get(`/business/dues/reminder/${customerId}`, { params: { invoiceId } });
      setReminderData(res.data.data);
      setShowReminderModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate reminder.');
    }
  };

  // Top Metrics
  const totalInvoiced = customers.reduce((sum, c) => sum + (c.total_invoiced || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalDue = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);
  const activeDebtors = customers.filter((c) => c.total_due > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Customers</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{customers.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">{activeDebtors} with outstanding dues</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Invoiced</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">৳{totalInvoiced.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all clients</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Collected</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">৳{totalPaid.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600/80 dark:text-[#37e58a]/80 mt-1">Verified inflows</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Due (Receivable)</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">৳{totalDue.toLocaleString()}</div>
          <div className="text-[11px] text-rose-500/80 mt-1">Uncollected khata balance</div>
        </div>
      </div>

      {/* Action Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone, or company..."
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
          {/* Customer Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Customer Types</option>
            <option value="Client">Client</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Retail">Retail</option>
            <option value="Subscriber">Subscriber</option>
            <option value="Agency">Agency</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setStatementCustomerId(null);
              setShowStatementModal(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Generate Customer Statement PDF (Single / Batch)"
          >
            <FileText className="w-4 h-4 text-[#c8501e]" />
            <span>
              {selectedCustomerIds.length > 0
                ? `Batch Statement (${selectedCustomerIds.length})`
                : 'Statement PDF'}
            </span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customer List / Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading digital khata...
        </div>
      ) : customers.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Customers Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add your first customer to start tracking invoices, payments, projects, and outstanding dues in one unified khata.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Customer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards View (<md) */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => {
              const hasDue = c.total_due > 0;
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0e1512] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3"
                  onClick={() => loadCustomer360(c.id)}
                >
                  {/* Top Row: Name, Type, and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {c.name}
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-normal bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 shrink-0">
                          {c.customer_type}
                        </span>
                      </div>
                      {c.company_name && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.company_name}</span>
                        </div>
                      )}
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      hasDue
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {hasDue ? 'Due' : 'Settled'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 text-xs">
                    <div className="font-mono text-slate-700 dark:text-slate-300">{c.phone}</div>
                    {c.email && (
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">{c.email}</div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-slate-100/60 dark:bg-black/20 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Invoiced</div>
                      <div className="font-mono font-medium text-slate-800 dark:text-slate-200 mt-0.5 text-xs truncate">
                        ৳{(c.total_invoiced || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Paid</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-[#37e58a] mt-0.5 text-xs truncate">
                        ৳{(c.total_paid || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-rose-500 uppercase font-semibold">Due</div>
                      <div className="font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5 text-xs truncate">
                        ৳{hasDue ? c.total_due.toLocaleString() : '0'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {hasDue && (
                        <>
                          <button
                            type="button"
                            onClick={() => openReceivePayment(c)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold inline-flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openSendReminder(c.id)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Send Reminder"
                          >
                            <Send className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setStatementCustomerId(c.id);
                          setShowStatementModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer transition-colors"
                        title="Customer Statement PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => loadCustomer360(c.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>Ledger</span>
                        <ChevronRight className="w-3.5 h-3.5" />
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
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={customers.length > 0 && selectedCustomerIds.length === customers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomerIds(customers.map((c) => c.id));
                        } else {
                          setSelectedCustomerIds([]);
                        }
                      }}
                      className="rounded border-slate-300 dark:border-white/20 text-[#c8501e] focus:ring-[#c8501e] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Customer / Company</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold text-right">Invoiced</th>
                  <th className="py-3 px-4 font-semibold text-right">Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Due Balance</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                {customers.map((c) => {
                  const hasDue = c.total_due > 0;
                  const isChecked = selectedCustomerIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors group cursor-pointer ${
                        isChecked
                          ? 'bg-[#c8501e]/5 dark:bg-[#c8501e]/10'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                      }`}
                      onClick={() => loadCustomer360(c.id)}
                    >
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomerIds([...selectedCustomerIds, c.id]);
                            } else {
                              setSelectedCustomerIds(selectedCustomerIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded border-slate-300 dark:border-white/20 text-[#c8501e] focus:ring-[#c8501e] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-normal bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                            {c.customer_type}
                          </span>
                        </div>
                        {c.company_name && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{c.company_name}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div>{c.phone}</div>
                        {c.email && <div className="text-[11px] text-slate-400 font-sans">{c.email}</div>}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                        ৳{(c.total_invoiced || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-[#37e58a]">
                        ৳{(c.total_paid || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black">
                        {hasDue ? (
                          <span className="text-rose-600 dark:text-rose-400">৳{c.total_due.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">৳0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasDue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Settled
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDue && (
                            <>
                              <button
                                onClick={() => openReceivePayment(c)}
                                title="Receive Payment"
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                              <button
                                onClick={() => openSendReminder(c.id)}
                                title="Send Reminder"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              >
                                <Send className="w-3.5 h-3.5 text-blue-500" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setStatementCustomerId(c.id);
                              setShowStatementModal(true);
                            }}
                            title="Customer Statement & Details PDF"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => loadCustomer360(c.id)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
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
      {/* CUSTOMER 360 DRAWER / MODAL                             */}
      {/* ======================================================== */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-[#0c120f] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-black/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Customer 360
                  </span>
                  <span className="text-xs text-slate-400">ID: {selectedCustomerId.slice(0, 8)}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {customerDetails?.customer?.name || 'Customer Profile'}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {customerDetails?.customer?.phone}
                  </span>
                  {customerDetails?.customer?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {customerDetails?.customer?.email}
                    </span>
                  )}
                  {customerDetails?.customer?.company_name && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {customerDetails?.customer?.company_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setStatementCustomerId(customerDetails?.customer?.id || null);
                    setShowStatementModal(true);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 cursor-pointer transition-colors"
                  title="Generate Statement PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const c = customerDetails?.customer;
                    if (c) {
                      setFormData({
                        name: c.name,
                        phone: c.phone,
                        email: c.email || '',
                        companyName: c.company_name || '',
                        customerType: c.customer_type || 'Client',
                        address: c.address || '',
                        notes: c.notes || '',
                      });
                      setShowEditModal(true);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Edit Customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 gap-2">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Loading ledger history...
              </div>
            ) : customerDetails ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Financial Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Total Invoiced
                    </span>
                    <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                      ৳{Number(customerDetails.customer.total_invoiced || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                      Total Paid
                    </span>
                    <div className="text-base font-black text-emerald-600 dark:text-[#37e58a] font-mono">
                      ৳{Number(customerDetails.customer.total_paid || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/10">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                      Outstanding Due
                    </span>
                    <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                      ৳{Number(customerDetails.customer.total_due || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => openReceivePayment(customerDetails.customer)}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Receive Pay</span>
                  </button>
                  <button
                    onClick={() => openSendReminder(customerDetails.customer.id)}
                    className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                    <span>Reminder</span>
                  </button>
                  <button
                    onClick={() => {
                      setStatementCustomerId(customerDetails.customer.id);
                      setShowStatementModal(true);
                    }}
                    className="py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Statement PDF</span>
                  </button>
                </div>

                {/* Sub-Tabs: Invoices, Receipts, Projects, Recurring */}
                <div className="space-y-4">
                  <div className="flex border-b border-slate-200 dark:border-white/10 gap-2">
                    <button
                      onClick={() => setDrawerTab('invoices')}
                      className={`pb-2.5 px-2 text-xs font-bold cursor-pointer transition-all border-b-2 -mb-[1px] ${
                        drawerTab === 'invoices'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      Invoices ({customerDetails.invoices?.length || 0})
                    </button>
                    <button
                      onClick={() => setDrawerTab('receipts')}
                      className={`pb-2.5 px-2 text-xs font-bold cursor-pointer transition-all border-b-2 -mb-[1px] ${
                        drawerTab === 'receipts'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      Receipts ({customerDetails.receipts?.length || 0})
                    </button>
                    <button
                      onClick={() => setDrawerTab('projects')}
                      className={`pb-2.5 px-2 text-xs font-bold cursor-pointer transition-all border-b-2 -mb-[1px] ${
                        drawerTab === 'projects'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      Projects ({customerDetails.projects?.length || 0})
                    </button>
                    <button
                      onClick={() => setDrawerTab('recurring')}
                      className={`pb-2.5 px-2 text-xs font-bold cursor-pointer transition-all border-b-2 -mb-[1px] ${
                        drawerTab === 'recurring'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      Recurring ({customerDetails.recurring?.length || 0})
                    </button>
                  </div>

                  {/* Tab Content */}
                  {drawerTab === 'invoices' && (
                    <div className="space-y-2">
                      {customerDetails.invoices?.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">No invoices issued for this customer yet.</div>
                      ) : (
                        customerDetails.invoices.map((inv: any) => (
                          <div
                            key={inv.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="font-mono">{inv.invoice_number}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : inv.status === 'PARTIAL'
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : 'bg-rose-500/10 text-rose-600'
                                }`}>
                                  {inv.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Due: {new Date(inv.due_date).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                                ৳{Number(inv.total || 0).toLocaleString()}
                              </div>
                              {Number(inv.due_amount || 0) > 0 && (
                                <div className="text-[11px] font-mono text-rose-500 font-bold">
                                  Due: ৳{Number(inv.due_amount).toLocaleString()}
                                </div>
                              )}
                              <div className="flex items-center justify-end gap-1.5 mt-1">
                                {Number(inv.due_amount || 0) > 0 && (
                                  <button
                                    onClick={() => openReceivePayment(customerDetails.customer, inv.id, inv.due_amount)}
                                    className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                                  >
                                    Receive Payment
                                  </button>
                                )}
                                <a
                                  href={`/invoice/${inv.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-blue-500 font-medium hover:underline inline-flex items-center gap-0.5"
                                >
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {drawerTab === 'receipts' && (
                    <div className="space-y-2">
                      {customerDetails.receipts?.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">No payment receipts recorded yet.</div>
                      ) : (
                        customerDetails.receipts.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                                {r.receipt_number}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(r.payment_date).toLocaleDateString()} • {r.payment_method}
                                {r.trx_id && <span className="font-mono text-emerald-600 ml-1">({r.trx_id})</span>}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-black text-emerald-600 dark:text-[#37e58a] font-mono">
                                +৳{Number(r.amount_received || 0).toLocaleString()}
                              </div>
                              <a
                                href={`/receipt/${r.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 hover:underline inline-flex items-center gap-0.5 mt-1"
                              >
                                View Receipt <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {drawerTab === 'projects' && (
                    <div className="space-y-2">
                      {customerDetails.projects?.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">No projects recorded for this client.</div>
                      ) : (
                        customerDetails.projects.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{p.title}</div>
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600">
                                {p.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                              <span>Fee: ৳{Number(p.project_amount || 0).toLocaleString()}</span>
                              <span className="text-emerald-600 font-bold">Paid: ৳{Number(p.paid_amount || 0).toLocaleString()}</span>
                              <span className="text-rose-500 font-bold">Due: ৳{Number(p.due_amount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {drawerTab === 'recurring' && (
                    <div className="space-y-2">
                      {customerDetails.recurring?.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">No recurring retainers set up.</div>
                      ) : (
                        customerDetails.recurring.map((rec: any) => (
                          <div
                            key={rec.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{rec.service_name}</div>
                              <div className="text-[11px] text-slate-400 capitalize">Cycle: {rec.billing_cycle}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-emerald-600 font-mono">৳{Number(rec.charge_amount).toLocaleString()}</div>
                              <div className="text-[10px] text-slate-400">Next: {new Date(rec.next_billing_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT CUSTOMER MODAL                                */}
      {/* ======================================================== */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {showAddModal ? 'Register New Customer' : 'Edit Customer Profile'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="customer-form" onSubmit={showAddModal ? handleCreateCustomer : handleUpdateCustomer} className="overflow-y-auto px-5 py-4 flex-1 space-y-3.5 overscroll-contain text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahim Ahmed"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Rahim Group Ltd."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Customer Category</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Client">Client</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Retail">Retail</option>
                    <option value="Subscriber">Subscriber</option>
                    <option value="Agency">Agency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Physical Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dhaka, Bangladesh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Payment preferences, credit limits, special instructions..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="customer-form"
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors shadow-sm"
              >
                {showAddModal ? 'Create Customer' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECEIVE PAYMENT MODAL                                    */}
      {/* ======================================================== */}
      {showPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Payment</h3>
                <p className="text-xs text-slate-400">Customer: {paymentCustomer.name}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="payment-form" onSubmit={handleSubmitPayment} className="overflow-y-auto px-5 py-4 flex-1 space-y-3.5 overscroll-contain text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Target Invoice *</label>
                {customerDetails?.invoices?.filter((i: any) => i.status !== 'PAID').length > 0 ? (
                  <select
                    required
                    value={paymentInvoiceId}
                    onChange={(e) => setPaymentInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">Select unpaid invoice...</option>
                    {customerDetails.invoices
                      .filter((i: any) => i.status !== 'PAID')
                      .map((inv: any) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} (Due: ৳{Number(inv.due_amount).toLocaleString()})
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                    No open invoices found. Please create an invoice first to credit payments.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Amount Received (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Wire</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Transaction ID / Reference (Optional for Cash)
                </label>
                <input
                  type="text"
                  value={paymentTrxId}
                  onChange={(e) => setPaymentTrxId(e.target.value)}
                  placeholder="e.g. 9K48X78A9B"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cleared 50% advance for milestone 1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="payment-form"
                type="submit"
                disabled={submittingPayment || !paymentInvoiceId}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {submittingPayment ? 'Recording...' : 'Generate Receipt & Settle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SEND REMINDER MODAL (WHATSAPP / SMS / EMAIL)            */}
      {/* ======================================================== */}
      {showReminderModal && reminderData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Due Reminder</h3>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto px-5 py-4 flex-1 space-y-3.5 overscroll-contain text-xs">
              <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl space-y-1">
                <div className="text-slate-500 dark:text-slate-400">Recipient: <span className="text-slate-900 dark:text-white font-bold">{reminderData.customerName} ({reminderData.customerPhone})</span></div>
                <div className="text-slate-500 dark:text-slate-400">Due Balance: <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">{reminderData.currency}{reminderData.dueAmount.toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Pre-Formatted Message</label>
                <textarea
                  readOnly
                  rows={6}
                  value={reminderData.textTemplate}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed select-all"
                />
              </div>

              {/* 1-Click Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <a
                  href={reminderData.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={async () => {
                    await copyToClipboard(reminderData.textTemplate);
                    setReminderCopied(true);
                    setTimeout(() => setReminderCopied(false), 2000);
                  }}
                  className="py-2.5 rounded-xl bg-slate-800 dark:bg-white/10 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{reminderCopied ? 'Copied!' : 'Copy SMS'}</span>
                </button>

                {reminderData.mailtoUrl ? (
                  <a
                    href={reminderData.mailtoUrl}
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
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Multi-Customer Batch Action Bar */}
      {selectedCustomerIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 dark:border-black/20 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-6 h-6 rounded-full bg-[#c8501e] text-white flex items-center justify-center font-mono text-[11px]">
              {selectedCustomerIds.length}
            </span>
            <span>Customers Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStatementCustomerId(null);
                setShowStatementModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#c8501e] hover:bg-[#b04316] text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Batch Statement PDF</span>
            </button>

            <button
              onClick={() => setSelectedCustomerIds([])}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 dark:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Customer Statement & Details PDF Modal */}
      <CustomerStatementModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        initialCustomerId={statementCustomerId}
        initialCustomerIds={selectedCustomerIds}
      />
    </div>
  );
};
