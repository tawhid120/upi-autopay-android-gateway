// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  FileText, Calendar, Download, Printer, TrendingUp, TrendingDown,
  DollarSign, ArrowUpRight, ArrowDownRight, CheckCircle2, RefreshCw,
  PieChart, BarChart3, Users, CreditCard, ShieldCheck, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

interface ReportData {
  period: {
    from: string;
    to: string;
    range: string;
  };
  sales: {
    totalSales: number;
    totalCollected: number;
    totalOutstanding: number;
    totalInvoices: number;
    averageInvoice: number;
  };
  profitAndLoss: {
    revenue: number;
    expenses: number;
    netProfit: number;
    profitMargin: number;
  };
  inflowsByMethod: {
    payment_method: string;
    total: number;
    count: number;
  }[];
  topCustomers: {
    id: string;
    name: string;
    phone: string;
    company_name?: string;
    total_paid: number;
    payment_count: number;
  }[];
  expenseMetrics: {
    category: string;
    total: number;
    count: number;
  }[];
}

export const FinancialReportsTab: React.FC = () => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<string>('30days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchReport = async () => {
    try {
      setRefreshing(true);
      const params: any = { range };
      if (range === 'custom' && customFrom && customTo) {
        params.from = new Date(customFrom).toISOString();
        params.to = new Date(customTo + 'T23:59:59').toISOString();
      }

      const res = await api.get('/business/reports', { params });
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load financial report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [range, customFrom, customTo]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const lines: string[] = [
      'PAYVERIFY BD - FINANCIAL AUDIT & P&L REPORT',
      `Generated Date: ${new Date().toISOString()}`,
      `Period: ${new Date(report.period.from).toLocaleDateString()} to ${new Date(report.period.to).toLocaleDateString()}`,
      '',
      '--- 1. EXECUTIVE SUMMARY ---',
      `Gross Billed Sales (BDT):,${report.sales.totalSales}`,
      `Cash Collected (BDT):,${report.sales.totalCollected}`,
      `Accounts Receivable Due (BDT):,${report.sales.totalOutstanding}`,
      `Total Invoices Issued:,${report.sales.totalInvoices}`,
      `Average Ticket Value (BDT):,${report.sales.averageInvoice}`,
      `Operating Expenses (BDT):,${report.profitAndLoss.expenses}`,
      `Net Operating Profit (BDT):,${report.profitAndLoss.netProfit}`,
      `Net Profit Margin:,${report.profitAndLoss.profitMargin}%`,
      '',
      '--- 2. INFLOWS BY PAYMENT METHOD ---',
      'Method,Total Collected (BDT),Transaction Count'
    ];

    report.inflowsByMethod.forEach(m => {
      lines.push(`"${m.payment_method}",${m.total},${m.count}`);
    });

    lines.push('');
    lines.push('--- 3. OPERATING EXPENSES BY CATEGORY ---');
    lines.push('Category,Total (BDT),Expense Count');
    report.expenseMetrics.forEach(e => {
      lines.push(`"${e.category}",${e.total},${e.count}`);
    });

    lines.push('');
    lines.push('--- 4. TOP REVENUE CUSTOMERS ---');
    lines.push('Customer Name,Company,Phone,Total Paid (BDT),Transactions');
    report.topCustomers.forEach(c => {
      lines.push(`"${c.name}","${c.company_name || ''}","${c.phone}",${c.total_paid},${c.payment_count}`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayVerify_Financial_Report_${report.period.range}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRangeLabel = () => {
    switch (range) {
      case 'today': return 'Today';
      case '7days': return 'Past 7 Days';
      case '30days': return 'Past 30 Days';
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'this_year': return 'This Year (YTD)';
      case 'custom': return `${customFrom || 'Start'} to ${customTo || 'End'}`;
      default: return 'Reporting Period';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Financial Reports & Auditing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive balance sheet, profit & loss, cash collections, and customer revenue breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Range Selector */}
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="today">Today</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year (YTD)</option>
            <option value="custom">Custom Range</option>
          </select>

          {range === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1 bg-transparent text-xs text-slate-900 dark:text-white"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1 bg-transparent text-xs text-slate-900 dark:text-white"
              />
            </div>
          )}

          <button
            onClick={fetchReport}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition-colors"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!report}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            disabled={!report}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-slate-500">Compiling financial balance sheet...</p>
        </div>
      ) : !report ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Unable to compile report</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Printable Report Header */}
          <div className="hidden print:block pb-4 border-b border-slate-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">PayVerify BD - Executive Financial Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reporting Window: {new Date(report.period.from).toLocaleDateString()} to {new Date(report.period.to).toLocaleDateString()} ({getRangeLabel()})
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                Printed: {new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Billed (Sales)
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                ৳{report.sales.totalSales.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
                <span>{report.sales.totalInvoices} invoices</span>
                <span>Avg: ৳{report.sales.averageInvoice.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Cash Collected
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ৳{report.sales.totalCollected.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Verified payment receipts
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Operating Expenses
              </div>
              <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                ৳{report.profitAndLoss.expenses.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {report.expenseMetrics.length} logged expense categories
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Net Operating Profit
              </div>
              <div className={`mt-2 text-2xl font-bold ${report.profitAndLoss.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ৳{report.profitAndLoss.netProfit.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-semibold flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[11px] ${report.profitAndLoss.profitMargin >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                  {report.profitAndLoss.profitMargin}% Margin
                </span>
                <span className="text-slate-400 font-normal">of cash collected</span>
              </div>
            </div>
          </div>

          {/* Profit & Loss Statement */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Profit & Loss Statement
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operating inflows vs outflows for period: {new Date(report.period.from).toLocaleDateString()} – {new Date(report.period.to).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Accounting Basis</span>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cash Flow</div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Revenue Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="uppercase tracking-wider text-xs text-slate-500">1. Operating Cash Inflows</span>
                  <span>৳{report.profitAndLoss.revenue.toLocaleString()}</span>
                </div>
                <div className="space-y-1.5 pl-3 text-sm">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Verified Customer Payments (Receipts)</span>
                    <span className="font-medium text-slate-900 dark:text-white">৳{report.profitAndLoss.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Outstanding Accounts Receivable (Pending)</span>
                    <span>৳{report.sales.totalOutstanding.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="uppercase tracking-wider text-xs text-slate-500">2. Operating Expenses</span>
                  <span className="text-rose-600 dark:text-rose-400">-৳{report.profitAndLoss.expenses.toLocaleString()}</span>
                </div>
                {report.expenseMetrics.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-3">No expenses recorded in this period.</p>
                ) : (
                  <div className="space-y-1.5 pl-3 text-sm">
                    {report.expenseMetrics.map(exp => (
                      <div key={exp.category} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span>{exp.category} ({exp.count} entries)</span>
                        <span className="font-medium text-rose-600 dark:text-rose-400">-৳{exp.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Net Profit Calculation */}
              <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">Net Operating Profit</div>
                  <div className="text-xs text-slate-500">Gross Cash Inflow minus Total Operating Expenses</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${report.profitAndLoss.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ৳{report.profitAndLoss.netProfit.toLocaleString()}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">
                    Profit Margin: {report.profitAndLoss.profitMargin}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Columns: Payment Inflows By Method & Top Revenue Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inflows By Method */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Inflow by Payment Method
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {report.inflowsByMethod.reduce((sum, m) => sum + m.count, 0)} Total Receipts
                </span>
              </div>

              {report.inflowsByMethod.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No verified payments recorded in this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.inflowsByMethod.map(method => {
                    const pct = report.profitAndLoss.revenue > 0 ? (method.total / report.profitAndLoss.revenue) * 100 : 0;
                    return (
                      <div key={method.payment_method} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {method.payment_method}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">({method.count} txns)</span>
                            <span className="font-bold text-slate-900 dark:text-white">৳{method.total.toLocaleString()}</span>
                            <span className="text-slate-500 w-10 text-right font-medium">{Math.round(pct)}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Revenue Clients */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Top Revenue Clients
                </h3>
                <span className="text-xs text-slate-400 font-medium">Top 5</span>
              </div>

              {report.topCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No customer payment transactions recorded in this period.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.topCustomers.map((cust, idx) => (
                    <div key={cust.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{cust.name}</div>
                          <div className="text-xs text-slate-400">
                            {cust.company_name ? `${cust.company_name} • ` : ''}{cust.phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{cust.total_paid.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">{cust.payment_count} payments</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
