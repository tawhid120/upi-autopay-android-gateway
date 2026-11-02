// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState } from 'react';
import {
  Webhook, Send, RefreshCw, CheckCircle, AlertTriangle, Eye,
  Copy, Check, ShieldCheck, Clock, ExternalLink, Key
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard as doCopy } from '../utils/clipboard';

interface WebhookInspectorProps {
  webhookData: any;
  deliveries: any[];
  onRefresh: () => void;
}

export const WebhookInspectorTab: React.FC<WebhookInspectorProps> = ({ webhookData, deliveries, onRefresh }) => {
  const [webhookUrl, setWebhookUrl] = useState(webhookData?.url || '');
  const [isActive, setIsActive] = useState(Boolean(webhookData?.is_active ?? 1));
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/webhooks', { url: webhookUrl, isActive });
      alert('Webhook endpoint updated successfully!');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update webhook.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateSecret = async () => {
    if (!window.confirm('Regenerate webhook secret key? Existing integrations will need this new secret immediately.')) return;
    try {
      await api.post('/webhooks/regenerate-secret');
      alert('New webhook secret generated!');
      onRefresh();
    } catch (err) {
      alert('Failed to rotate secret key.');
    }
  };

  const handleResend = async (deliveryId: string) => {
    try {
      setResendingId(deliveryId);
      await api.post(`/webhooks/deliveries/${deliveryId}/resend`);
      alert('Webhook event resent successfully.');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resend webhook.');
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    const ok = await doCopy(text);
    if (ok) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const formatBST = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const iso = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(iso).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Webhook Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant real-time payment notifications dispatched to your server.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
              isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {isActive ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveWebhook} className="space-y-4 mt-5 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Endpoint URL *</label>
            <input
              type="url"
              required
              placeholder="https://yourdomain.com/api/payviro-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Webhook Secret Key */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                <span>Signing Secret</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">(HMAC-SHA256)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-[11px] font-medium"
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateSecret}
                  className="text-rose-600 dark:text-rose-400 hover:underline text-[11px] font-medium"
                >
                  Rotate Secret
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={webhookData?.secret_key || 'whsec_••••••••••••••••••••••••'}
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 font-mono text-xs select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookData?.secret_key || '', 'secret')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copiedKey === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Verify signature on incoming requests using the <code className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">X-Payviro-Signature</code> header.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Enable Webhook Notifications</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Webhook Deliveries Inspector */}
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Delivery Logs</h4>
            <span className="text-xs text-slate-500 font-mono">({deliveries.length} entries)</span>
          </div>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {deliveries.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs font-medium">
            No webhook deliveries recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Cards View (<md) */}
            <div className="md:hidden space-y-3">
              {deliveries.map((del) => {
                const isSuccess = del.status === 'SUCCESS';
                const statusCode = del.status_code || 0;

                return (
                  <div
                    key={del.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2.5 font-mono text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold truncate">
                        {del.event_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        isSuccess
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : del.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {del.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <div>
                        Status: <span className={`font-bold ${
                          statusCode >= 200 && statusCode < 300
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : statusCode === 0
                            ? 'text-rose-500'
                            : 'text-amber-500'
                        }`}>{statusCode > 0 ? `HTTP ${statusCode}` : 'Error'}</span>
                      </div>
                      <div>Attempt #{del.attempt || 1}</div>
                    </div>

                    <div className="text-[11px] text-slate-400 font-sans">
                      {formatBST(del.created_at)}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2 font-sans">
                      <button
                        type="button"
                        onClick={() => setSelectedDelivery(del)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Payload
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResend(del.id)}
                        disabled={resendingId === del.id}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Resend webhook"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${resendingId === del.id ? 'animate-spin' : ''}`} />
                        Resend
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>=md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Event</th>
                    <th className="py-3 px-4 font-semibold">HTTP Status</th>
                    <th className="py-3 px-4 font-semibold">Attempt</th>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {deliveries.map((del) => {
                    const isSuccess = del.status === 'SUCCESS';
                    const statusCode = del.status_code || 0;

                    return (
                      <tr key={del.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors font-mono">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                            {del.event_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${
                            statusCode >= 200 && statusCode < 300
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : statusCode === 0
                              ? 'text-rose-500'
                              : 'text-amber-500'
                          }`}>
                            {statusCode > 0 ? `HTTP ${statusCode}` : 'Error'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          #{del.attempt || 1}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {formatBST(del.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isSuccess
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : del.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          }`}>
                            {del.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2 font-sans">
                            <button
                              onClick={() => setSelectedDelivery(del)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Payload
                            </button>

                            <button
                              onClick={() => handleResend(del.id)}
                              disabled={resendingId === del.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Resend webhook"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${resendingId === del.id ? 'animate-spin' : ''}`} />
                              Resend
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
      </div>

      {/* Payload Inspection Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="relative w-full max-w-xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Webhook Payload (#{selectedDelivery.id.substring(0, 8)})
                </h3>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="space-y-4 px-5 py-4 overflow-y-auto text-xs flex-1 overscroll-contain">
              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold mb-1 block">Request Payload (JSON):</label>
                <div className="relative">
                  <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-900 dark:text-slate-200 overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedDelivery.payload_json || '{}'), null, 2)}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(selectedDelivery.payload_json, 'payload')}
                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Copy payload"
                  >
                    {copiedKey === 'payload' ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold mb-1 block">Server Response:</label>
                <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-300 overflow-x-auto">
                  {selectedDelivery.response_body || '(No response payload received)'}
                </pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Response Status:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">HTTP {selectedDelivery.status_code || 0}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Timestamp:</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatBST(selectedDelivery.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-end gap-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <button
                onClick={() => setSelectedDelivery(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleResend(selectedDelivery.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resend Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
