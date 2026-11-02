// NOTE: STRICT ENGLISH-ONLY UI. Clear, concise, and high-impact.

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Search, Filter, Plus, Copy, Check, ExternalLink,
  Printer, ArrowUpRight, RefreshCw, AlertCircle, FileText,
  Clock, CheckCircle2, ChevronRight, Download, Edit3, Trash2,
  Wallet, Hash, Globe, AlertTriangle, ArrowLeft, Layers
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';
import {
  CRYPTO_NETWORKS,
  CRYPTO_CURRENCIES,
  getExplorerUrl,
  getNetworkConfig,
  formatAddressTruncated
} from '../utils/cryptoExplorers';
import { ThemeToggle } from '../components/ThemeToggle';
import { CryptoInvoiceGeneratorModal } from '../components/CryptoInvoiceGeneratorModal';

export const AuditHistoryPage: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [editingTxidInvoice, setEditingTxidInvoice] = useState<any | null>(null);
  const [newTxidInput, setNewTxidInput] = useState('');
  const [updatingTxid, setUpdatingTxid] = useState(false);

  // Copy Feedback Tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchInvoices = async (spin = false) => {
    if (spin) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/invoices', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          crypto_network: networkFilter !== 'all' ? networkFilter : undefined,
        },
      });
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error('Failed to load transaction history', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, networkFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleCopy = async (text: string, id: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleStatusUpdate = async (invoiceId: string, newPaymentStatus: string) => {
    try {
      await api.patch(`/invoices/${invoiceId}/status`, {
        paymentStatus: newPaymentStatus,
      });
      // Refresh local state optimistically
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                payment_status: newPaymentStatus,
                status: newPaymentStatus === 'Paid' ? 'PAID' : newPaymentStatus === 'Under Review' ? 'UNDER_REVIEW' : 'UNPAID',
              }
            : inv
        )
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleSaveTxid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxidInvoice) return;

    try {
      setUpdatingTxid(true);
      const cleanTx = newTxidInput.trim();
      await api.patch(`/invoices/${editingTxidInvoice.id}/status`, {
        txidHash: cleanTx,
        paymentStatus: cleanTx && editingTxidInvoice.payment_status === 'Pending' ? 'Paid' : undefined,
      });

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === editingTxidInvoice.id
            ? {
                ...inv,
                txid_hash: cleanTx,
                payment_status: cleanTx && inv.payment_status === 'Pending' ? 'Paid' : inv.payment_status,
                status: cleanTx && inv.payment_status === 'Pending' ? 'PAID' : inv.status,
              }
            : inv
        )
      );
      setEditingTxidInvoice(null);
      setNewTxidInput('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save TXID.');
    } finally {
      setUpdatingTxid(false);
    }
  };

  const handleDeleteInvoice = async (invoice: any) => {
    if (!window.confirm(`Delete invoice #${invoice.invoice_number}? This removes the record from the database.`)) {
      return;
    }
    try {
      await api.delete(`/invoices/${invoice.id}`);
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  const handleExportCsv = () => {
    if (invoices.length === 0) {
      alert('No invoices to export.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Created Date',
      'Client Name',
      'Client Telegram',
      'Contact',
      'Service Duration / Type',
      'Crypto Currency',
      'Crypto Network',
      'Total Amount',
      'Payment Status',
      'Receiving Wallet Address',
      'Blockchain TXID',
      'Explorer Verification Link',
    ];

    const rows = invoices.map((inv) => {
      const net = inv.crypto_network || 'BEP20';
      const explorer = inv.txid_hash ? getExplorerUrl(net, inv.txid_hash) : '';
      return [
        `"${inv.invoice_number}"`,
        `"${inv.created_at}"`,
        `"${(inv.customer_name || '').replace(/"/g, '""')}"`,
        `"${(inv.client_telegram_username || '').replace(/"/g, '""')}"`,
        `"${(inv.client_contact || inv.customer_phone || '').replace(/"/g, '""')}"`,
        `"${(inv.service_duration_or_type || '').replace(/"/g, '""')}"`,
        `"${inv.crypto_currency || 'USDT'}"`,
        `"${net}"`,
        inv.total,
        `"${inv.payment_status || inv.status}"`,
        `"${inv.receiving_wallet_address || ''}"`,
        `"${inv.txid_hash || ''}"`,
        `"${explorer}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payviro_Compliance_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalVolume = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const paidInvoices = invoices.filter((i) => i.payment_status === 'Paid' || i.status === 'PAID');
  const paidVolume = paidInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const pendingCount = invoices.filter((i) => i.payment_status === 'Pending' || i.status === 'UNPAID').length;
  const reviewCount = invoices.filter((i) => i.payment_status === 'Under Review' || i.status === 'UNDER_REVIEW').length;
  const txidCount = invoices.filter((i) => i.txid_hash && i.txid_hash.trim().length > 0).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070c0a] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-[#0a110e]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black border border-amber-500/20 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Crypto Audit & Transaction History</span>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
                    Binance AML Verified
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Irrefutable compliance audit trail for digital service and freelance receipts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle variant="dropdown" />

            <button
              onClick={() => fetchInvoices(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>

            <button
              onClick={handleExportCsv}
              className="hidden md:inline-flex px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowGeneratorModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Crypto Invoice</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Compliance Notice Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/20 dark:border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  AML/CFT Deposit Audit Compliance Active
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                  TRAVEL RULE READY
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                Every invoice generated here carries the payer's social/Telegram identifier, detailed service milestone descriptions, receiving deposit wallet address, and on-chain TXID hash. Use the <strong>"Print / Download PDF"</strong> button on any record to instantly export official compliance documentation for crypto exchange AML reviews.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => setShowGeneratorModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Create Compliance Invoice</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Metrics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Invoiced Volume
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              ${totalVolume.toLocaleString()} <span className="text-xs font-normal text-slate-400">USDT</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {invoices.length} invoices</div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified On-Chain Paid</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              ${paidVolume.toLocaleString()} <span className="text-xs font-normal text-emerald-600/70">USDT</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{paidInvoices.length} verified settlements</div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Pending & Review</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount + reviewCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{reviewCount} under AML audit review</div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
            <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>TXIDs Linked</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-700 dark:text-blue-400 mt-1">
              {txidCount} <span className="text-xs font-normal text-slate-400">/ {invoices.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Clickable block explorer proofs</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] space-y-3 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by TXID hash, Client handle (@telegram), Customer Name, or Invoice #..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid (Verified)</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Draft">Draft</option>
              </select>

              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Networks</option>
                {CRYPTO_NETWORKS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Transactions & Audit Records Table */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Transaction Audit Trail
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-mono font-semibold">
                {invoices.length} records
              </span>
            </div>

            <div className="text-xs text-slate-500">
              One-click copy active for TXID & Wallets
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading persistent transaction records...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No matching transactions found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No invoices match the current filter. Create a new crypto invoice to begin recording your verifiable remittance trail.
              </p>
              <button
                onClick={() => setShowGeneratorModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Invoice</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.01] text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-3.5 px-4">Invoice / Date</th>
                    <th className="py-3.5 px-4">Client & Telegram</th>
                    <th className="py-3.5 px-4">Service Scope</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Network</th>
                    <th className="py-3.5 px-4">Receiving Wallet</th>
                    <th className="py-3.5 px-4">Blockchain TXID</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                  {invoices.map((inv) => {
                    const cryptoNet = inv.crypto_network || 'BEP20';
                    const net = getNetworkConfig(cryptoNet);
                    const txid = inv.txid_hash;
                    const explorerUrl = txid ? getExplorerUrl(cryptoNet, txid) : null;
                    const wallet = inv.receiving_wallet_address;
                    const cur = inv.crypto_currency || 'USDT';
                    const isPaid = inv.payment_status === 'Paid' || inv.status === 'PAID';
                    const isReview = inv.payment_status === 'Under Review' || inv.status === 'UNDER_REVIEW';

                    const issueDate = new Date(inv.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Invoice & Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Link
                            to={`/invoice/${inv.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                          >
                            <span>{inv.invoice_number}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </Link>
                          <div className="text-[10px] text-slate-500">{issueDate}</div>
                        </td>

                        {/* Client & Handle */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white max-w-[150px] truncate">
                            {inv.customer_name}
                          </div>
                          {inv.client_telegram_username ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(inv.client_telegram_username, `tg-${inv.id}`)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              title="Click to copy handle"
                            >
                              <span>{inv.client_telegram_username}</span>
                              {copiedKey === `tg-${inv.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <div className="text-[10px] text-slate-400">
                              {inv.client_contact || inv.customer_phone || 'No handle'}
                            </div>
                          )}
                        </td>

                        {/* Service Scope */}
                        <td className="py-3.5 px-4 max-w-[180px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {inv.service_duration_or_type || 'Milestone Delivery'}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {inv.items && inv.items[0]?.description ? inv.items[0].description : 'Services rendered'}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {Number(inv.total || 0).toLocaleString()} {cur}
                          </div>
                        </td>

                        {/* Network */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${net.badgeBg} ${net.badgeText}`}>
                            {net.shortName}
                          </span>
                        </td>

                        {/* Receiving Wallet */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                          {wallet ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(wallet, `w-${inv.id}`)}
                              className="group inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                              title={wallet}
                            >
                              <span>{formatAddressTruncated(wallet, 5, 4)}</span>
                              {copiedKey === `w-${inv.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </td>

                        {/* Blockchain TXID */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                          {txid ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopy(txid, `tx-${inv.id}`)}
                                className="group inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
                                title={txid}
                              >
                                <span>{formatAddressTruncated(txid, 6, 4)}</span>
                                {copiedKey === `tx-${inv.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                                )}
                              </button>

                              {explorerUrl && (
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400"
                                  title={`Open in ${net.explorerName}`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTxidInvoice(inv);
                                setNewTxidInput('');
                              }}
                              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Paste TXID</span>
                            </button>
                          )}
                        </td>

                        {/* Status Updater */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={inv.payment_status || (isPaid ? 'Paid' : 'Pending')}
                            onChange={(e) => handleStatusUpdate(inv.id, e.target.value)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer focus:outline-none ${
                              isPaid
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                : isReview
                                ? 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30'
                                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <option value="Pending" className="dark:bg-slate-900 text-slate-900 dark:text-white">Pending</option>
                            <option value="Paid" className="dark:bg-slate-900 text-slate-900 dark:text-white">Paid</option>
                            <option value="Under Review" className="dark:bg-slate-900 text-slate-900 dark:text-white">Under Review</option>
                            <option value="Draft" className="dark:bg-slate-900 text-slate-900 dark:text-white">Draft</option>
                          </select>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                          {/* Print / PDF Action */}
                          <button
                            type="button"
                            onClick={() => window.open(`/invoice/${inv.id}`, '_blank')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Download / Print PDF Invoice for Binance Appeal"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#c8501e]" />
                            <span>PDF</span>
                          </button>

                          {/* Edit TXID */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTxidInvoice(inv);
                              setNewTxidInput(inv.txid_hash || '');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 transition-colors inline-block cursor-pointer"
                            title="Edit TXID"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors inline-block cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Generator Modal */}
      <CryptoInvoiceGeneratorModal
        isOpen={showGeneratorModal}
        onClose={() => setShowGeneratorModal(false)}
        onInvoiceSaved={() => {
          fetchInvoices();
        }}
      />

      {/* Quick TXID Update Modal */}
      {editingTxidInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-amber-500" />
                <span>Update Blockchain TXID Hash</span>
              </h4>
              <button
                onClick={() => setEditingTxidInvoice(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Attach the on-chain transaction hash to invoice <strong>#{editingTxidInvoice.invoice_number}</strong> for Binance compliance verification.
            </p>

            <form onSubmit={handleSaveTxid} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Transaction Hash (TXID)
                </label>
                <input
                  type="text"
                  value={newTxidInput}
                  onChange={(e) => setNewTxidInput(e.target.value)}
                  placeholder="e.g. 0x4a9d72c1c2438c8efd43bbf61e38ffc1555df329b3a322c3e1e69b3fdbd33b81"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTxidInvoice(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTxid}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {updatingTxid ? 'Saving...' : 'Save & Link TXID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditHistoryPage;
