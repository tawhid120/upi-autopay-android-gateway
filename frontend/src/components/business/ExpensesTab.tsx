// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  TrendingDown, Plus, Search, Filter, Calendar, Tag, CreditCard,
  DollarSign, ArrowUpRight, ArrowDownRight, Trash2, X, AlertCircle,
  CheckCircle2, RefreshCw, BarChart2, PieChart, Layers, Download
} from 'lucide-react';
import { api } from '../../services/api';

interface Expense {
  id: string;
  merchant_id: string;
  category: string;
  title: string;
  amount: number;
  expense_date: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
  created_at: string;
}

interface ExpenseSummary {
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  byCategory: { category: string; total: number; count: number }[];
}

const PRESET_CATEGORIES = [
  'Office Rent',
  'Utilities & Internet',
  'Salaries & Payroll',
  'Software & Tools',
  'Marketing & Ads',
  'Hardware & Devices',
  'Hosting & Servers',
  'Freelancers & Contractors',
  'Travel & Transport',
  'Food & Team Entertainment',
  'Tax & Legal',
  'Miscellaneous'
];

const PAYMENT_METHODS = [
  'bKash',
  'Nagad',
  'Rocket',
  'Bank Transfer',
  'Cash',
  'Credit Card'
];

export const ExpensesTab: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    totalRevenue: 0,
    netProfit: 0,
    byCategory: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Software & Tools',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bKash',
    reference: '',
    notes: ''
  });

  const fetchExpenses = async () => {
    try {
      setRefreshing(true);
      let from: string | undefined;
      let to: string | undefined;

      const now = new Date();
      if (dateRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        from = start.toISOString();
        to = now.toISOString();
      } else if (dateRange === '7days') {
        const start = new Date(now.getTime() - 7 * 86400000);
        from = start.toISOString();
        to = now.toISOString();
      } else if (dateRange === '30days') {
        const start = new Date(now.getTime() - 30 * 86400000);
        from = start.toISOString();
        to = now.toISOString();
      } else if (dateRange === 'this_month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        from = start.toISOString();
        to = now.toISOString();
      } else if (dateRange === 'last_month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        from = start.toISOString();
        to = end.toISOString();
      } else if (dateRange === 'custom' && customFrom && customTo) {
        from = new Date(customFrom).toISOString();
        to = new Date(customTo + 'T23:59:59').toISOString();
      }

      const params: any = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (from) params.from = from;
      if (to) params.to = to;

      const [resExpenses, resSummary] = await Promise.all([
        api.get('/business/expenses', { params }),
        api.get('/business/expenses/summary', { params: { from, to } })
      ]);

      if (resExpenses.data.success) {
        setExpenses(resExpenses.data.data || []);
      }
      if (resSummary.data.success) {
        setSummary(resSummary.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory, dateRange, customFrom, customTo]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amountNum = parseFloat(formData.amount);
    if (!formData.title.trim()) {
      setErrorMessage('Expense title is required.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage('Please provide a valid expense amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        amount: amountNum,
        expenseDate: new Date(formData.expenseDate).toISOString(),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference.trim() || undefined,
        notes: formData.notes.trim() || undefined
      };

      const res = await api.post('/business/expenses', payload);
      if (res.data.success) {
        setSuccessMessage('Expense recorded successfully.');
        setTimeout(() => setSuccessMessage(null), 3500);
        setShowAddModal(false);
        setFormData({
          title: '',
          category: 'Software & Tools',
          amount: '',
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'bKash',
          reference: '',
          notes: ''
        });
        fetchExpenses();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await api.delete(`/business/expenses/${id}`);
      if (res.data.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        setDeleteExpenseId(null);
        fetchExpenses();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(term) ||
      e.category.toLowerCase().includes(term) ||
      (e.reference && e.reference.toLowerCase().includes(term)) ||
      (e.notes && e.notes.toLowerCase().includes(term))
    );
  });

  const exportCSV = () => {
    if (expenses.length === 0) return;
    const headers = ['Date', 'Category', 'Title', 'Amount (BDT)', 'Payment Method', 'Reference', 'Notes'];
    const rows = expenses.map(e => [
      new Date(e.expense_date).toISOString().split('T')[0],
      `"${e.category}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      e.payment_method || 'N/A',
      `"${e.reference || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayVerify_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingDown className="w-7 h-7 text-rose-600" />
            Expense Tracking
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Log operational overheads, monitor burn rate, and view real-time net operating income.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={expenses.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Executive Financial Cards: Revenue, Expenses, Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Period Cash Inflow</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            ৳{summary.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total verified customer payments received
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Operating Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            ৳{summary.totalExpenses.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {expenses.length} expense record{expenses.length === 1 ? '' : 's'} in selected period
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Net Operating Income</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-bold ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ৳{summary.netProfit.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {summary.netProfit >= 0 ? 'Profitable cash flow' : 'Negative operating cash margin'}
          </p>
        </div>
      </div>

      {/* Category Breakdown Progress Bar */}
      {summary.byCategory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-blue-600" />
              Category Breakdown
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              100% = ৳{summary.totalExpenses.toLocaleString()}
            </span>
          </div>

          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {summary.byCategory.map((cat, idx) => {
              const pct = summary.totalExpenses > 0 ? (cat.total / summary.totalExpenses) * 100 : 0;
              const colors = [
                'bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
                'bg-rose-500', 'bg-purple-500', 'bg-cyan-500', 'bg-orange-500'
              ];
              return (
                <div
                  key={cat.category}
                  style={{ width: `${pct}%` }}
                  title={`${cat.category}: ৳${cat.total.toLocaleString()} (${Math.round(pct)}%)`}
                  className={`${colors[idx % colors.length]} transition-all hover:opacity-80`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
            {summary.byCategory.map(cat => {
              const pct = summary.totalExpenses > 0 ? Math.round((cat.total / summary.totalExpenses) * 100) : 0;
              return (
                <div key={cat.category} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="text-slate-600 dark:text-slate-300 font-medium truncate">{cat.category}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-slate-900 dark:text-white">৳{cat.total.toLocaleString()}</span>
                    <span className="text-slate-400 font-medium">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or reference..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {PRESET_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Date Filter Dropdown */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
          )}

          <button
            onClick={fetchExpenses}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-sm">Loading expense records...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingDown className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No expenses recorded</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Start tracking overheads such as domain costs, office rent, salaries, or marketing ads.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record First Expense
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Cards View (<md) */}
            <div className="md:hidden space-y-3">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {expense.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {expense.category}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(expense.expense_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                        -৳{expense.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {expense.payment_method || 'Cash / General'}
                      </div>
                    </div>
                  </div>

                  {(expense.reference || expense.notes) && (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-500 space-y-0.5">
                      {expense.reference && <div>Ref: {expense.reference}</div>}
                      {expense.notes && <div className="italic text-slate-400">{expense.notes}</div>}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteExpenseId(expense.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>=md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Expense Details</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Payment Method</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{expense.title}</div>
                        {expense.reference && (
                          <div className="text-xs text-slate-400 mt-0.5">Ref: {expense.reference}</div>
                        )}
                        {expense.notes && (
                          <div className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">{expense.notes}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {expense.payment_method || 'Cash / Unspecified'}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {new Date(expense.expense_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        -৳{expense.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setDeleteExpenseId(expense.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Record Operating Expense</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="add-expense-form" onSubmit={handleCreateExpense} className="overflow-y-auto px-5 py-4 flex-1 space-y-4 overscroll-contain">
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud Hosting, Office Wi-Fi Bill"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRESET_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Amount (BDT ৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Date of Expense
                  </label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Voucher / TrxID / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Receipt #88392 or TrxID BL582K..."
                  value={formData.reference}
                  onChange={e => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or notes..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                form="add-expense-form"
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Expense Record?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will permanently remove this expense and update your net operating profit.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteExpenseId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteExpense(deleteExpenseId)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
