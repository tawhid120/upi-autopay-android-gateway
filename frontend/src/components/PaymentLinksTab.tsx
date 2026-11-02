// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  Link2, Plus, Search, Copy, Check, ExternalLink, Share2,
  Trash2, Eye, TrendingUp, CheckCircle, Clock, Ban, Filter, X
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard as doCopy } from '../utils/clipboard';

export const PaymentLinksTab: React.FC = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'collected' | 'views'>('date');

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isVariable, setIsVariable] = useState(false);
  const [amount, setAmount] = useState('500');
  const [expiryDays, setExpiryDays] = useState('30');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payment-links');
      setLinks(res.data.data || []);
    } catch (err) {
      console.error('Failed to load payment links', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/payment-links', {
        title,
        description,
        isVariable,
        amount: isVariable ? null : parseFloat(amount),
        expiryDays: parseInt(expiryDays, 10),
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setIsVariable(false);
      setAmount('500');
      fetchLinks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create payment link.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/payment-links/${id}/status`, { status: newStatus });
      fetchLinks();
    } catch (err) {
      alert('Failed to update link status.');
    }
  };

  const handleDelete = async (id: string, linkTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete payment link '${linkTitle}'?`)) return;
    try {
      await api.delete(`/payment-links/${id}`);
      fetchLinks();
    } catch (err) {
      alert('Failed to delete payment link.');
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    const ok = await doCopy(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleShare = (link: any) => {
    const shareUrl = `${window.location.origin}/link/${link.link_code}`;
    if (navigator.share) {
      navigator.share({
        title: link.title,
        text: `${link.title} - Pay securely via Payviro:`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `${link.title}\nPayment Link: ${shareUrl}`
      )}`;
      window.open(waUrl, '_blank');
    }
  };

  // Filter & Sort
  const filteredLinks = links
    .filter((l) => {
      const matchesSearch =
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.link_code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'collected') return (b.total_collected || 0) - (a.total_collected || 0);
      if (sortBy === 'views') return (b.views_count || 0) - (a.views_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Aggregated Metrics
  const totalCollected = links.reduce((sum, l) => sum + (l.total_collected || 0), 0);
  const totalViews = links.reduce((sum, l) => sum + (l.views_count || 0), 0);
  const totalPayments = links.reduce((sum, l) => sum + (l.payments_count || 0), 0);
  const overallConversion = totalViews > 0 ? ((totalPayments / totalViews) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">৳{totalCollected.toLocaleString()}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Views</span>
            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{totalViews.toLocaleString()}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Paid Orders</span>
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{totalPayments.toLocaleString()}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Conversion Rate</span>
            <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">{overallConversion}%</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search links or codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="date">Latest First</option>
            <option value="collected">Top Revenue</option>
            <option value="views">Most Viewed</option>
          </select>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Payment Link</span>
        </button>
      </div>

      {/* Links List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs font-medium">Loading payment links...</div>
      ) : filteredLinks.length === 0 ? (
        <div className="py-16 text-center glass-panel border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Link2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">No payment links found</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Create shareable links to accept payments via social media or messaging.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLinks.map((link) => {
            const publicUrl = `${window.location.origin}/link/${link.link_code}`;
            const conv = link.views_count > 0 ? ((link.payments_count / link.views_count) * 100).toFixed(1) : '0.0';

            return (
              <div
                key={link.id}
                className="glass-panel bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">{link.title}</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          link.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : link.status === 'expired'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {link.status}
                        </span>
                      </div>
                      {link.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 line-clamp-2">{link.description}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        {link.is_variable ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">Customer Decides</span>
                        ) : (
                          `৳${(link.amount || 0).toLocaleString()}`
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{link.link_code}</div>
                    </div>
                  </div>

                  {/* Analytics Bar */}
                  <div className="grid grid-cols-3 gap-2 my-4 py-2.5 px-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Views</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{link.views_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Payments</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{link.payments_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Conv.</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-[#37e58a] mt-0.5">{conv}%</div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <button
                      onClick={() => copyToClipboard(publicUrl, link.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Copy public link"
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleShare(link)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Share link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Open payment page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(link.id, link.status)}
                      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                        link.status === 'active'
                          ? 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400 hover:underline'
                      }`}
                    >
                      {link.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => handleDelete(link.id, link.title)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Create Payment Link</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Shareable hosted checkout page for customers.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="create-link-form" onSubmit={handleCreate} className="overflow-y-auto px-5 sm:px-6 py-4 flex-1 space-y-4 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graphic Design Masterclass, Premium Subscription"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Provide instructions or what this payment is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVariable}
                    onChange={(e) => setIsVariable(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Allow Customer to Choose Amount (Donation / Open Invoice)
                  </span>
                </label>
              </div>

              {!isVariable && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fixed Amount (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expires After (Days)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={365}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
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
                form="create-link-form"
                type="submit"
                disabled={submitting || !title.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Generating...' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
