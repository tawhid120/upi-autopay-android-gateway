// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle, AlertTriangle, Clock, Smartphone,
  Send, ShieldCheck, FileText, Copy, Check, ExternalLink, X
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';

interface TimelineProps {
  transactionId: string;
  onClose: () => void;
}

export const TransactionIntelligenceModal: React.FC<TimelineProps> = ({ transactionId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [activeView, setActiveView] = useState<'timeline' | 'raw_sms'>('timeline');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/payments/transactions/${transactionId}/timeline`);
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load transaction timeline', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [transactionId]);

  const handleCopy = async (text: string, id: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const formatBST = (dateStr?: string) => {
    if (!dateStr) return '';
    const iso = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Transaction Intelligence</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  VERIFIED
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">End-to-end 9-stage audit lifecycle & telemetry</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs font-medium">Loading lifecycle telemetry...</div>
        ) : !data ? (
          <div className="py-16 text-center text-slate-500 text-xs">No transaction records found.</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-xs overscroll-contain">
            {/* Quick Summary Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">TrxID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1">
                  {data.transaction.trx_id}
                  <button onClick={() => handleCopy(data.transaction.trx_id, 'trx')} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                    {copied === 'trx' ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Amount</span>
                <span className="font-bold text-emerald-600 dark:text-[#37e58a] text-sm font-mono">৳{data.transaction.amount}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Provider & Sender</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{data.transaction.service} • {data.transaction.sender}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Fraud Shield</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {data.transaction.fraud_status || 'CLEAN'}
                </span>
              </div>
            </div>

            {/* View Toggle Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setActiveView('timeline')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeView === 'timeline'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Audit Timeline
              </button>
              <button
                onClick={() => setActiveView('raw_sms')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeView === 'raw_sms'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Raw SMS Payload
              </button>
            </div>

            {activeView === 'timeline' ? (
              /* 9-Stage Visual Timeline */
              <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {data.timeline.map((step: any, idx: number) => {
                  const isSuccess = step.status === 'SUCCESS';
                  const isFailed = step.status === 'FAILED';

                  return (
                    <div key={idx} className="relative group">
                      {/* Step Circle Indicator */}
                      <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                        isSuccess
                          ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : isFailed
                          ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-600 dark:text-rose-400'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-400 dark:border-slate-600 text-slate-500'
                      }`}>
                        {isSuccess ? '✓' : isFailed ? '✕' : idx + 1}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h5 className={`font-semibold ${isSuccess ? 'text-slate-900 dark:text-white' : isFailed ? 'text-rose-600 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>
                            {step.title}
                          </h5>
                          {step.timestamp && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {formatBST(step.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{step.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Raw SMS View */
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 relative">
                  <pre className="text-slate-800 dark:text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {data.transaction.raw_sms || 'No raw SMS payload captured (Direct settlement)'}
                  </pre>
                  {data.transaction.raw_sms && (
                    <button
                      onClick={() => handleCopy(data.transaction.raw_sms, 'sms')}
                      className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Copy payload"
                    >
                      {copied === 'sms' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {data.device && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Relay Device: <strong className="text-slate-900 dark:text-white">{data.device.device_name}</strong></span>
                    <span>Model: <strong className="text-slate-900 dark:text-white">{data.device.model}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-end bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
