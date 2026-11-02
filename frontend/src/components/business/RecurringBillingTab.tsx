// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Plus, Search, Calendar, Clock, DollarSign,
  CheckCircle, AlertCircle, Play, Pause, Zap, User, ArrowRight, X
} from 'lucide-react';
import { api } from '../../services/api';

interface RecurringPlan {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  company_name?: string;
  service_name: string;
  charge_amount: number;
  billing_cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_billing_date: string;
  auto_generate_invoice: number;
  status: 'active' | 'paused' | 'cancelled';
  last_generated_at?: string;
  created_at: string;
}

export const RecurringBillingTab: React.FC = () => {
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Recurring Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [nextBillingDate, setNextBillingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecurring = async () => {
    try {
      setLoading(true);
      const [recRes, upRes, custRes] = await Promise.all([
        api.get('/business/recurring'),
        api.get('/business/recurring/upcoming', { params: { days: 30 } }),
        api.get('/business/customers'),
      ]);
      setPlans(recRes.data.data || []);
      setUpcoming(upRes.data.data || []);
      setCustomers(custRes.data.data || []);
    } catch (err) {
      console.error('Failed to load recurring subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/business/recurring', {
        customerId,
        serviceName,
        chargeAmount: parseFloat(chargeAmount) || 0,
        billingCycle,
        nextBillingDate: new Date(nextBillingDate).toISOString(),
        autoGenerateInvoice,
      });

      setShowCreateModal(false);
      setServiceName('');
      setChargeAmount('');
      fetchRecurring();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await api.put(`/business/recurring/${id}`, { status: newStatus });
      fetchRecurring();
    } catch (err) {
      alert('Failed to update subscription status.');
    }
  };

  const handleGenerateInvoiceNow = async (id: string, serviceName: string) => {
    if (!window.confirm(`Generate invoice right now for ${serviceName}?`)) return;
    try {
      const res = await api.post(`/business/recurring/${id}/generate`);
      alert(`Invoice generated successfully! #${res.data?.data?.invoice?.invoice_number}`);
      fetchRecurring();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate invoice.');
    }
  };

  // Metrics
  const activeCount = plans.filter((p) => p.status === 'active').length;
  const mrr = plans
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => {
      if (p.billing_cycle === 'monthly') return sum + p.charge_amount;
      if (p.billing_cycle === 'weekly') return sum + p.charge_amount * 4;
      if (p.billing_cycle === 'quarterly') return sum + p.charge_amount / 3;
      if (p.billing_cycle === 'yearly') return sum + p.charge_amount / 12;
      return sum + p.charge_amount;
    }, 0);

  const upcomingVolume = upcoming.reduce((sum, u) => sum + (u.charge_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Active Retainers</span>
            <RefreshCw className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{activeCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Automatic recurring clients</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Monthly Run-Rate (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">৳{Math.round(mrr).toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600/80 mt-1">Predictable recurring revenue</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Upcoming (30 Days)</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">৳{upcomingVolume.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">{upcoming.length} upcoming billing cycles</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Subscriptions</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{plans.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">All retainer schedules</div>
        </div>
      </div>

      {/* Upcoming Payments Banner (Highlighted from User Requirements) */}
      {upcoming.length > 0 && (
        <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Upcoming Recurring Inflows
              </h4>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold">
              {upcoming.length} Expected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {upcoming.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-white dark:bg-[#0c120f] border border-blue-200 dark:border-blue-900/40 rounded-xl shadow-xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{u.customer_name}</div>
                  <div className="text-[11px] text-slate-400">{u.service_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-600 dark:text-[#37e58a]">
                    ৳{Number(u.charge_amount).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {new Date(u.next_billing_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Recurring Billing Schedules
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Recurring Retainer</span>
        </button>
      </div>

      {/* Plans Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading recurring schedules...
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
          <RefreshCw className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Recurring Retainers Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Set up recurring billing for clients who pay on a monthly or quarterly subscription basis with automatic invoice generation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards View (<md) */}
          <div className="md:hidden space-y-3">
            {plans.map((p) => {
              const isActive = p.status === 'active';
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0e1512] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {p.customer_name}
                      </h4>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {p.customer_phone}
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-1 text-xs">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {p.service_name}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 capitalize">
                        {p.billing_cycle}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        p.auto_generate_invoice ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                      }`}>
                        Auto: {p.auto_generate_invoice ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-slate-100/60 dark:bg-black/20 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Recurring Fee</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-[#37e58a] mt-0.5 text-sm truncate">
                        ৳{Number(p.charge_amount).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Next Invoice</div>
                      <div className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 text-xs truncate">
                        {new Date(p.next_billing_date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateInvoiceNow(p.id, p.service_name)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Generate Bill Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p.id, p.status)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                      title={isActive ? 'Pause' : 'Activate'}
                    >
                      {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-500" />}
                    </button>
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
                  <th className="py-3 px-4 font-semibold">Client</th>
                  <th className="py-3 px-4 font-semibold">Service</th>
                  <th className="py-3 px-4 font-semibold">Cycle</th>
                  <th className="py-3 px-4 font-semibold text-right">Fee</th>
                  <th className="py-3 px-4 font-semibold">Next Invoice Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Auto-Invoice</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                {plans.map((p) => {
                  const isActive = p.status === 'active';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.customer_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{p.customer_phone}</div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {p.service_name}
                      </td>

                      <td className="py-3.5 px-4 capitalize">
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                          {p.billing_cycle}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-[#37e58a]">
                        ৳{Number(p.charge_amount).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {new Date(p.next_billing_date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          p.auto_generate_invoice
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                        }`}>
                          {p.auto_generate_invoice ? 'ON' : 'OFF'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleGenerateInvoiceNow(p.id, p.service_name)}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Generate Invoice Right Now"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Bill Now</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(p.id, p.status)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title={isActive ? 'Pause' : 'Activate'}
                          >
                            {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
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

      {/* New Recurring Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Setup Recurring Billing</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="recurring-form" onSubmit={handleCreateRecurring} className="overflow-y-auto px-5 py-4 flex-1 space-y-3.5 overscroll-contain text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Select Client *</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value="">Choose client...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Service / Retainer Name *</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Website Maintenance & Hosting"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Charge Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    placeholder="3000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Next Billing Date *</label>
                <input
                  type="date"
                  required
                  value={nextBillingDate}
                  onChange={(e) => setNextBillingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoGenCheck"
                  checked={autoGenerateInvoice}
                  onChange={(e) => setAutoGenerateInvoice(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <label htmlFor="autoGenCheck" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Auto-generate invoice on billing date
                </label>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="recurring-form"
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {submitting ? 'Setting Up...' : 'Start Retainer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
