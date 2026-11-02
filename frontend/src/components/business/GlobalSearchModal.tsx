// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, User, FileText, Receipt, Briefcase, Zap,
  ArrowRight, ExternalLink, ShieldCheck, Clock
} from 'lucide-react';
import { api } from '../../services/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (type: string, id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onSelectAction }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    customers: any[];
    invoices: any[];
    receipts: any[];
    projects: any[];
    transactions: any[];
  }>({
    customers: [],
    invoices: [],
    receipts: [],
    projects: [],
    transactions: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ customers: [], invoices: [], receipts: [], projects: [], transactions: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ customers: [], invoices: [], receipts: [], projects: [], transactions: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/business/search?q=${encodeURIComponent(query.trim())}`);
        if (res.data.success) {
          setResults(res.data.data);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.customers.length +
    results.invoices.length +
    results.receipts.length +
    results.projects.length +
    results.transactions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-white/10 gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, invoices, receipts, projects, TrxIDs..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 shrink-0">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Searching records...
            </div>
          )}

          {!loading && query.trim().length >= 2 && totalResults === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              No matching records found for "{query}".
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Type at least 2 characters to search across customers, invoices, receipts, and projects.
            </div>
          )}

          {/* Customers */}
          {results.customers.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 px-2 block mb-1.5">
                Customers ({results.customers.length})
              </span>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectAction?.('customer', c.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{c.phone} • {c.company_name || c.customer_type}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 px-2 block mb-1.5">
                Invoices ({results.invoices.length})
              </span>
              <div className="space-y-1">
                {results.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      onSelectAction?.('invoice', inv.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="font-mono">{inv.invoice_number}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{inv.customer_name} • ৳{Number(inv.total || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receipts */}
          {results.receipts.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 px-2 block mb-1.5">
                Receipts ({results.receipts.length})
              </span>
              <div className="space-y-1">
                {results.receipts.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      window.open(`/receipt/${r.id}`, '_blank');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{r.receipt_number}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {r.customer_name} • ৳{Number(r.amount_received || 0).toLocaleString()} via {r.payment_method}
                          {r.trx_id && ` (Trx: ${r.trx_id})`}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 px-2 block mb-1.5">
                Projects ({results.projects.length})
              </span>
              <div className="space-y-1">
                {results.projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectAction?.('project', p.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{p.customer_name} • ৳{Number(p.project_amount || 0).toLocaleString()} • {p.status}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {results.transactions.length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 px-2 block mb-1.5">
                MFS Transactions ({results.transactions.length})
              </span>
              <div className="space-y-1">
                {results.transactions.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectAction?.('transaction', t.trx_id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{t.trx_id}</div>
                        <div className="text-[11px] text-slate-400 truncate">{t.service} • From {t.sender} • ৳{Number(t.amount || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 dark:bg-black/40 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Tip: Press <kbd className="font-mono bg-white dark:bg-white/10 px-1 py-0.5 rounded border border-slate-200 dark:border-white/10">Esc</kbd> to exit</span>
          <span>Payviro Omnichannel Search</span>
        </div>
      </div>
    </div>
  );
};
