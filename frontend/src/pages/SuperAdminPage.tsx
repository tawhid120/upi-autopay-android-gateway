// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldAlert, Users, CreditCard, Smartphone, CheckCircle,
  AlertTriangle, ArrowLeft, RefreshCw, Lock, Unlock, Calendar, ShieldCheck,
  Check, X, Clock, Copy, ExternalLink, Filter, Search, Eye, UploadCloud, Download
} from "lucide-react";
import { api } from "../services/api";
import { ThemeToggle } from "../components/ThemeToggle";
import { copyToClipboard } from "../utils/clipboard";

export const SuperAdminPage: React.FC = () => {
  const [activeAdminTab, setActiveAdminTab] = useState<"requests" | "merchants" | "overview" | "releases">("requests");
  const [overview, setOverview] = useState<any>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [requestFilter, setRequestFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeRelease, setActiveRelease] = useState<any>(null);
  const [releasesHistory, setReleasesHistory] = useState<any[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [publishingRelease, setPublishingRelease] = useState(false);
  const [releaseForm, setReleaseForm] = useState({
    versionName: "2.2.0.0.1",
    versionCode: 4,
    downloadUrl: "https://github.com/tawhid120/payverify-bd/releases/download/v2.1.0/app-release.apk",
    changelog: "• In-App Hybrid APK installer with cached file detection\n• Direct upgrade trigger without redownloading\n• Full OTA background update check\n• Android Package Installer Unknown Sources permission check",
    isForceUpdate: false,
    minVersionCode: 1,
  });

  const navigate = useNavigate();

  const handleCopy = async (text: string, id: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const loadAdminData = async () => {
    try {
      const [ovRes, merRes, reqRes, relRes] = await Promise.all([
        api.get("/admin/overview"),
        api.get("/admin/merchants"),
        api.get("/admin/subscription-requests"),
        api.get("/admin/app-releases").catch(() => ({ data: { success: false } })),
      ]);
      setOverview(ovRes.data?.data);
      setMerchants(merRes.data?.data || []);
      setSubscriptionRequests(reqRes.data?.data || []);
      if (relRes.data?.success) {
        setActiveRelease(relRes.data.data?.activeRelease || null);
        setReleasesHistory(relRes.data.data?.history || []);
      }
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        alert("Admin authorization required. Please log in with an administrator account.");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadReleases = async () => {
    try {
      setLoadingReleases(true);
      const res = await api.get("/admin/app-releases");
      if (res.data?.success) {
        setActiveRelease(res.data.data?.activeRelease || null);
        setReleasesHistory(res.data.data?.history || []);
      }
    } catch (err: any) {
      console.error("Failed to load releases:", err);
    } finally {
      setLoadingReleases(false);
    }
  };

  const handlePublishRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseForm.versionName.trim() || !releaseForm.versionCode || !releaseForm.downloadUrl.trim()) {
      alert("Please provide Version Name, Version Code, and direct APK Download URL.");
      return;
    }

    setPublishingRelease(true);
    try {
      const res = await api.post("/admin/app-releases", releaseForm);
      if (res.data?.success) {
        alert(res.data?.message || "App release published successfully!");
        loadReleases();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to publish release.");
    } finally {
      setPublishingRelease(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(() => {
      api.get("/admin/subscription-requests")
        .then((res) => {
          if (res.data?.data) setSubscriptionRequests(res.data.data);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveSubscription = async (reqItem: any) => {
    if (!confirm(`Are you sure you want to APPROVE payment of ৳${reqItem.amount} (TrxID: ${reqItem.trx_id}) for ${reqItem.merchant_name} (${reqItem.plan.toUpperCase()})?`)) {
      return;
    }

    setActionLoading(reqItem.id);
    try {
      const res = await api.post(`/admin/subscription-requests/${reqItem.id}/approve`);
      alert(res.data?.message || "Subscription approved successfully!");
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve subscription.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubscription = async (reqItem: any) => {
    const reason = prompt(
      `Reject subscription request for ${reqItem.merchant_name}?\n\nEnter rejection reason:`,
      "Payment not received on bKash 01915575697 (Fake or invalid TrxID)"
    );
    if (reason === null) return; // User cancelled prompt

    setActionLoading(reqItem.id);
    try {
      const res = await api.post(`/admin/subscription-requests/${reqItem.id}/reject`, { reason });
      alert(res.data?.message || "Subscription request rejected.");
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject subscription.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (merchantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    if (!confirm(`Are you sure you want to ${nextStatus === "active" ? "activate" : "suspend"} this merchant?`)) return;

    setActionLoading(merchantId);
    try {
      await api.patch(`/admin/merchants/${merchantId}/status`, { status: nextStatus });
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendPlan = async (merchantId: string) => {
    const days = prompt("Extend subscription by how many days?", "30");
    if (!days) return;

    setActionLoading(merchantId);
    try {
      await api.post(`/admin/merchants/${merchantId}/subscription`, { extendDays: parseInt(days, 10) });
      alert("Subscription extended successfully!");
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to extend subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = subscriptionRequests.filter((r) => {
    const matchesFilter = requestFilter === "ALL" || r.status === requestFilter;
    const matchesSearch =
      !searchQuery ||
      r.trx_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.merchant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.merchant_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.merchant_phone?.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = subscriptionRequests.filter((r) => r.status === "PENDING").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] flex items-center justify-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
        <span>Loading Super Admin console...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center space-x-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#37e58a] via-[#12b56a] to-[#0a8f52] flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white stroke-[2.4]" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Payviro</span>
                <span className="hl-green">Super Admin Console</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">lorddanju@gmail.com</span> (Personal bKash Gateway: 01915575697)
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <ThemeToggle variant="dropdown" />
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Merchant Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveAdminTab("requests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeAdminTab === "requests"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>bKash Payment Approvals</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab("merchants")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeAdminTab === "merchants"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Merchants & Licenses ({merchants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeAdminTab === "overview"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Platform Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveAdminTab("releases");
              loadReleases();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeAdminTab === "releases"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>App Releases & OTA Updates</span>
          </button>
        </div>

        {/* ================= TAB 1: SUBSCRIPTION REQUESTS & FRAUD CHECK ================= */}
        {activeAdminTab === "requests" && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(["PENDING", "ALL", "VERIFIED", "REJECTED"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setRequestFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      requestFilter === filter
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                        : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                    }`}
                  >
                    {filter === "PENDING" ? `Pending (${pendingCount})` : filter}
                  </button>
                ))}
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search TrxID, merchant, phone..."
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Requests Table */}
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No subscription payment requests matching the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                        <th className="p-4">Merchant Info</th>
                        <th className="p-4">Plan & Amount</th>
                        <th className="p-4">Submitted TrxID</th>
                        <th className="p-4">Relay SMS Match</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredRequests.map((r) => {
                        const isPending = r.status === "PENDING";
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {r.merchant_name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                                {r.merchant_email}
                              </span>
                              {r.merchant_phone && (
                                <span className="text-[10px] text-slate-400 block">
                                  Phone: {r.merchant_phone}
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
                                {r.plan} Plan
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                                ৳{r.amount?.toLocaleString()}
                              </span>
                            </td>

                            <td className="p-4 font-mono font-bold">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-slate-900 dark:text-white text-xs select-all">
                                  {r.trx_id || "Awaiting Input"}
                                </span>
                                {r.trx_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(r.trx_id, r.id)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                  >
                                    {copiedId === r.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                                {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>

                            <td className="p-4">
                              {r.isFoundInRelaySms ? (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                    <span>Verified in Phone SMS</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 block font-mono">
                                    ৳{r.matchedTxn?.amount} from {r.matchedTxn?.sender}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    <span>Not in Relay SMS</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    Check your bKash app / statement
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                r.status === "VERIFIED"
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : r.status === "REJECTED"
                                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30"
                              }`}>
                                {r.status}
                              </span>
                              {r.rejection_reason && (
                                <span className="text-[10px] text-rose-500 block mt-1 line-clamp-1" title={r.rejection_reason}>
                                  Note: {r.rejection_reason}
                                </span>
                              )}
                            </td>

                            <td className="p-4 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveSubscription(r)}
                                    disabled={actionLoading === r.id}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1 shadow-sm transition-all disabled:opacity-50"
                                    title="Approve and activate subscription"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRejectSubscription(r)}
                                    disabled={actionLoading === r.id}
                                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center space-x-1 shadow-sm transition-all disabled:opacity-50"
                                    title="Reject fake/invalid TrxID"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">
                                  {r.status === "VERIFIED" ? "Activated" : "Closed"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MERCHANTS MANAGEMENT ================= */}
        {activeAdminTab === "merchants" && (
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Registered Merchants & License Status
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {merchants.length} registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="p-3">Merchant</th>
                    <th className="p-3">Plan & Expiry</th>
                    <th className="p-3">Devices</th>
                    <th className="p-3">Txns / Volume</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {merchants.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white block">{m.business_name}</span>
                        <span className="text-slate-500 text-[11px] block">{m.email}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{m.plan || "trial"}</span>
                        <span className="text-slate-400 block text-[11px]">
                          Expires: {m.expires_at ? new Date(m.expires_at).toLocaleDateString() : "Lifetime"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">{m.device_count || 0}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        ৳{m.total_volume?.toLocaleString() || 0} ({m.transaction_count || 0})
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === "active" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/20 text-rose-600"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleExtendPlan(m.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold"
                        >
                          +Extend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(m.id, m.status)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold text-rose-600"
                        >
                          {m.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PLATFORM OVERVIEW TELEMETRY ================= */}
        {activeAdminTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-emerald-500/20">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Merchants</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {overview?.merchants?.totalMerchants || 0}
              </div>
              <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{overview?.merchants?.activeMerchants || 0} active accounts</span>
              </div>
            </div>

            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-emerald-500/20">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Platform Volume</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                ৳{overview?.transactions?.totalVolume?.toLocaleString() || "0"}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Processed: {overview?.transactions?.totalTransactions || 0} transactions
              </div>
            </div>

            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-emerald-500/20">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Online Relay Devices</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-[#37e58a] mt-2 font-mono">
                {overview?.devices?.onlineDevices || 0} / {overview?.devices?.totalDevices || 0}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Active mobile heartbeats
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: APP RELEASES & OTA UPDATES ================= */}
        {activeAdminTab === "releases" && (
          <div className="space-y-6">
            {/* Live Active Release Summary Banner */}
            <div className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>Active Production Release:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        v{activeRelease?.version_name || "2.2.0.0.1"}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                        Build {activeRelease?.version_code || 4}
                      </span>
                      {activeRelease?.is_force_update === 1 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Force Upgrade
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Flexible Upgrade
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Devices running an older build code will receive the in-app update prompt automatically upon launch.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeRelease?.download_url || "https://github.com/tawhid120/payverify-bd/releases/download/v2.1.0/app-release.apk"}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Live APK</span>
                  </a>
                </div>
              </div>

              {/* Active Release Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-slate-400">APK Direct Download URL:</span>
                  <div className="mt-1 flex items-center space-x-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                    <span className="truncate">{activeRelease?.download_url || "—"}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeRelease?.download_url || "", "active_url")}
                      className="text-slate-400 hover:text-white shrink-0 ml-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Release Timestamp:</span>
                  <div className="mt-1 font-mono text-slate-700 dark:text-slate-300">
                    {activeRelease?.release_date ? new Date(activeRelease.release_date).toLocaleString() : "Recently"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Changelog Highlights:</span>
                  <div className="mt-1 text-slate-700 dark:text-slate-300 truncate font-medium">
                    {activeRelease?.changelog || "Latest production build with hybrid install system."}
                  </div>
                </div>
              </div>
            </div>

            {/* Release Publish Form & History Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Publish Form */}
              <div className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
                  <UploadCloud className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Publish New Android APK Version
                  </h3>
                </div>

                <form onSubmit={handlePublishRelease} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Version Name (e.g. 2.2.0.0.1)
                      </label>
                      <input
                        type="text"
                        required
                        value={releaseForm.versionName}
                        onChange={(e) => setReleaseForm({ ...releaseForm, versionName: e.target.value })}
                        placeholder="2.2.0.0.1"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        Version Code / Build Number (e.g. 4)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={releaseForm.versionCode}
                        onChange={(e) => setReleaseForm({ ...releaseForm, versionCode: parseInt(e.target.value) || 0 })}
                        placeholder="4"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Direct APK Download URL
                    </label>
                    <input
                      type="url"
                      required
                      value={releaseForm.downloadUrl}
                      onChange={(e) => setReleaseForm({ ...releaseForm, downloadUrl: e.target.value })}
                      placeholder="https://github.com/tawhid120/payverify-bd/releases/download/v2.1.0/app-release.apk"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Must be a direct link to the compiled .apk file (e.g. GitHub Releases artifact).
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Release Changelog / What's New
                    </label>
                    <textarea
                      rows={3}
                      value={releaseForm.changelog}
                      onChange={(e) => setReleaseForm({ ...releaseForm, changelog: e.target.value })}
                      placeholder="• Added new features&#10;• Performance improvements"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <input
                      type="checkbox"
                      id="forceUpdateCheck"
                      checked={releaseForm.isForceUpdate}
                      onChange={(e) => setReleaseForm({ ...releaseForm, isForceUpdate: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="forceUpdateCheck" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                      Force Update (Requires all devices to upgrade before proceeding)
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={publishingRelease}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition shadow-md shadow-emerald-600/20 text-xs flex items-center justify-center space-x-2"
                  >
                    {publishingRelease ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing Release to Devices...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Publish Release & Activate In-App Upgrade</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Release History */}
              <div className="bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Release History ({releasesHistory.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={loadReleases}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingReleases ? 'animate-spin text-emerald-500' : ''}`} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[360px] space-y-3 pr-1">
                  {releasesHistory.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No release records found.
                    </div>
                  ) : (
                    releasesHistory.map((rel: any) => (
                      <div
                        key={rel.id}
                        className={`p-3.5 rounded-xl border transition ${
                          rel.is_active === 1
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                              v{rel.version_name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-slate-600 dark:text-slate-300">
                              Build {rel.version_code}
                            </span>
                            {rel.is_active === 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rel.created_at ? new Date(rel.created_at).toLocaleDateString() : '—'}
                          </span>
                        </div>

                        {rel.changelog && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                            {rel.changelog}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <a
                            href={rel.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 truncate max-w-[240px]"
                          >
                            <span className="truncate">{rel.download_url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          {rel.is_force_update === 1 && (
                            <span className="text-[10px] text-rose-500 font-bold">
                              Mandatory
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
