// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  Receipt, Search, Copy, Check, ExternalLink, Printer,
  DollarSign, CheckCircle, Clock, ShieldCheck, Share2, Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../utils/clipboard';

export const PaymentReceiptsTab: React.FC = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/business/receipts', {
        params: { search: search || undefined },
      });
      setReceipts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load receipts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReceipts();
  };

  const handleCopy = async (text: string, id: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Metrics
  const totalReceipts = receipts.length;
  const totalVolume = receipts.reduce((sum, r) => sum + (r.amount_received || 0), 0);
  const mfsVolume = receipts
    .filter((r) => ['bKash', 'Nagad', 'Rocket', 'Upay'].includes(r.payment_method))
    .reduce((sum, r) => sum + (r.amount_received || 0), 0);
  const cashBankVolume = totalVolume - mfsVolume;

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Receipts</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalReceipts}</div>
          <div className="text-[11px] text-slate-400 mt-1">Official proofs issued</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Verified Volume</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">৳{totalVolume.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600/80 dark:text-[#37e58a]/80 mt-1">100% verified inflows</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>MFS (bKash/Nagad)</span>
            <DollarSign className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">৳{mfsVolume.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Automated TrxID receipts</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Cash & Bank Wire</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">৳{cashBankVolume.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Manual offline settlements</div>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt #, TrxID, customer, or invoice..."
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
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading payment receipts...
        </div>
      ) : receipts.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
          <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Payment Receipts Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Official payment receipts are automatically generated whenever a customer pays an invoice or when payments are verified via bKash.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards View (<md) */}
          <div className="md:hidden space-y-3">
            {receipts.map((r) => {
              const isMfs = ['bKash', 'Nagad', 'Rocket', 'Upay'].includes(r.payment_method);
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0e1512] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3"
                >
                  {/* Top Row: Receipt # & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a
                        href={`/receipt/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span className="truncate">{r.receipt_number}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(r.payment_date || r.created_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-2.5 h-2.5" />
                        {r.payment_status || 'VERIFIED'}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isMfs ? 'bg-pink-500/10 text-pink-600 border border-pink-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}>
                        {r.payment_method}
                      </span>
                    </div>
                  </div>

                  {/* Customer and Invoice Details */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{r.customer_name}</span>
                      {r.invoice_number ? (
                        <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                          #{r.invoice_number}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 shrink-0">Direct Pay</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{r.customer_phone}</div>
                  </div>

                  {/* TrxID if present */}
                  {r.trx_id && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">TrxID:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        <span>{r.trx_id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(r.trx_id, r.id)}
                          className="p-1 hover:bg-emerald-500/10 rounded cursor-pointer"
                          title="Copy TrxID"
                        >
                          {copiedId === r.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-slate-100/60 dark:bg-black/20 text-xs">
                    <div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Amount Received</div>
                      <div className="font-mono font-black text-emerald-600 dark:text-[#37e58a] mt-0.5 text-sm truncate">
                        ৳{Number(r.amount_received || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Due</div>
                      <div className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 text-sm truncate">
                        ৳{Number(r.remaining_due || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <a
                      href={`/receipt/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View & Print Official Receipt</span>
                    </a>
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
                  <th className="py-3 px-4 font-semibold">Receipt #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Invoice Ref</th>
                  <th className="py-3 px-4 font-semibold">Method & TrxID</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount Received</th>
                  <th className="py-3 px-4 font-semibold text-right">Remaining Due</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                {receipts.map((r) => {
                  const isMfs = ['bKash', 'Nagad', 'Rocket', 'Upay'].includes(r.payment_method);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <a
                          href={`/receipt/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                        >
                          <span>{r.receipt_number}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {new Date(r.payment_date || r.created_at).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{r.customer_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{r.customer_phone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {r.invoice_number ? (
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            #{r.invoice_number}
                          </span>
                        ) : (
                          <span className="text-slate-400">Direct Payment</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isMfs ? 'bg-pink-500/10 text-pink-600 border border-pink-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          }`}>
                            {r.payment_method}
                          </span>
                        </div>
                        {r.trx_id && (
                          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                            <span>{r.trx_id}</span>
                            <button
                              onClick={() => handleCopy(r.trx_id, r.id)}
                              className="p-0.5 text-slate-400 hover:text-slate-600"
                              title="Copy TrxID"
                            >
                              {copiedId === r.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-[#37e58a] text-sm">
                        ৳{Number(r.amount_received || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        ৳{Number(r.remaining_due || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          {r.payment_status || 'VERIFIED'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/receipt/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            <span>View & Print</span>
                          </a>
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
    </div>
  );
};
