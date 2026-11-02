// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck, LayoutDashboard, CreditCard, Smartphone, Webhook,
  Key, Settings, LogOut, Plus, Search, RefreshCw, CheckCircle,
  AlertTriangle, Battery, Wifi, WifiOff, Copy, Check, ExternalLink, Zap,
  Link2, FileText, Activity, Globe, Menu, X, ChevronRight, TrendingUp,
  ArrowUpRight, SlidersHorizontal, Layers, Bell, Trash2, Crown,
  Users, Briefcase, TrendingDown, BarChart3, Building2, CheckCircle2, Clock, DollarSign,
  HelpCircle, Sparkles, BookOpen, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';
import { DeviceHealthCard } from '../components/DeviceHealthCard';
import { PaymentLinksTab } from '../components/PaymentLinksTab';
import { WebhookInspectorTab } from '../components/WebhookInspectorTab';
import { TransactionIntelligenceModal } from '../components/TransactionIntelligenceModal';
import { SubscriptionPlansTab } from '../components/SubscriptionPlansTab';
import { ThemeToggle } from '../components/ThemeToggle';
import { HowItWorksDrawer } from '../components/HowItWorksDrawer';
import { QuickActionModal } from '../components/QuickActionModal';

// Business & Digital Khata Modular Tabs
import { CustomersTab } from '../components/business/CustomersTab';
import { BusinessInvoicesTab } from '../components/business/BusinessInvoicesTab';
import { PaymentReceiptsTab } from '../components/business/PaymentReceiptsTab';
import { DuesManagementTab } from '../components/business/DuesManagementTab';
import { ProjectsWorkTab } from '../components/business/ProjectsWorkTab';
import { RecurringBillingTab } from '../components/business/RecurringBillingTab';
import { ExpensesTab } from '../components/business/ExpensesTab';
import { FinancialReportsTab } from '../components/business/FinancialReportsTab';
import { BusinessProfileTab } from '../components/business/BusinessProfileTab';
import { GlobalSearchModal } from '../components/business/GlobalSearchModal';
import { AuditHistoryPage } from './AuditHistoryPage';

type DashboardTab =
  | 'overview'
  | 'plans'
  | 'links'
  | 'invoices'
  | 'auditHistory'
  | 'transactions'
  | 'mfs'
  | 'devices'
  | 'webhooks'
  | 'customers'
  | 'receipts'
  | 'dues'
  | 'projects'
  | 'recurring'
  | 'expenses'
  | 'reports'
  | 'profile';

export const MerchantDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedTrxId, setSelectedTrxId] = useState<string | null>(null);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [mfsAccounts, setMfsAccounts] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [webhookData, setWebhookData] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Beginner-First UX Guides & Quick Action Launchers
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Global search modal and digital khata state
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [businessStats, setBusinessStats] = useState<{
    totalDues: number;
    overdueCount: number;
    netProfit: number;
    totalExpenses: number;
    activeProjects: number;
  } | null>(null);

  // Responsive mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter & Search
  const [trxSearch, setTrxSearch] = useState('');
  const [trxFilter, setTrxFilter] = useState('All');

  // Modals & Forms
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMfsModal, setShowMfsModal] = useState(false);
  const [orderAmount, setOrderAmount] = useState('500');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('017XXXXXXXX');
  const [newOrderResult, setNewOrderResult] = useState<any>(null);

  // MFS Form
  const [mfsProvider, setMfsProvider] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay'>('bKash');
  const [mfsType, setMfsType] = useState<'personal' | 'merchant'>('personal');
  const [mfsNumber, setMfsNumber] = useState('');

  // Webhook Form
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  const navigate = useNavigate();

  const handleCopy = async (text: string, id: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleGenerateApiKey = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await api.post('/auth/api-keys/generate', { label: 'Live API Key' });
      if (res.data?.success && res.data?.data?.apiKey) {
        setNewlyGeneratedKey(res.data.data.apiKey);
        await loadData(false);
      }
    } catch (err: any) {
      console.error('Failed to generate API key:', err);
      alert(err.response?.data?.message || 'Failed to generate API key.');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? External bots or integrations using this key will immediately lose access.')) {
      return;
    }
    try {
      await api.delete(`/auth/api-keys/${keyId}`);
      await loadData(false);
    } catch (err: any) {
      console.error('Failed to revoke API key:', err);
      alert(err.response?.data?.message || 'Failed to revoke API key.');
    }
  };

  const loadData = async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const [meRes, statsRes, trxRes, mfsRes, devRes, whRes, delRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/payments/stats'),
        api.get('/payments/transactions'),
        api.get('/mfs/accounts'),
        api.get('/mfs/list'),
        api.get('/webhooks'),
        api.get('/webhooks/deliveries'),
      ]);

      setMerchantData(meRes.data.data);
      setStats(statsRes.data.data);
      setTransactions(trxRes.data.data || []);
      setMfsAccounts(mfsRes.data.data || []);
      setDevices(devRes.data.data || []);
      setWebhookData(whRes.data.data);
      if (whRes.data.data?.url) setWebhookUrl(whRes.data.data.url);
      setDeliveries(delRes.data.data || []);

      // Load Digital Khata overview stats in parallel
      try {
        const [duesRes, expenseRes, projRes] = await Promise.all([
          api.get('/business/dues/overview').catch(() => ({ data: { data: null } })),
          api.get('/business/expenses/summary').catch(() => ({ data: { data: null } })),
          api.get('/business/projects?status=active').catch(() => ({ data: { count: 0 } })),
        ]);
        setBusinessStats({
          totalDues: duesRes.data?.data?.summary?.totalDues || 0,
          overdueCount: duesRes.data?.data?.summary?.overdueInvoices || 0,
          netProfit: expenseRes.data?.data?.netProfit || 0,
          totalExpenses: expenseRes.data?.data?.totalExpenses || 0,
          activeProjects: projRes.data?.count || 0
        });
      } catch (e) {
        // Fallback gracefully
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
      if (showSpin) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 3000); // 3s real-time refresh
    return () => clearInterval(interval);
  }, []);

  // Global Ctrl+K / Cmd+K search listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGlobalSearchSelect = (type: string, id: string) => {
    if (type === 'customer') {
      setActiveTab('customers');
    } else if (type === 'invoice') {
      setActiveTab('invoices');
    } else if (type === 'receipt') {
      setActiveTab('receipts');
    } else if (type === 'project') {
      setActiveTab('projects');
    } else if (type === 'transaction') {
      setActiveTab('transactions');
    }
    setShowGlobalSearch(false);
  };

  const handleQuickActionSelect = (actionId: string) => {
    switch (actionId) {
      case 'new-invoice':
        setActiveTab('invoices');
        break;
      case 'new-link':
        setActiveTab('links');
        break;
      case 'new-customer':
        setActiveTab('customers');
        break;
      case 'new-expense':
        setActiveTab('expenses');
        break;
      case 'connect-relay':
        setActiveTab('devices');
        break;
      case 'test-checkout':
        setShowOrderModal(true);
        break;
      default:
        break;
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/payments/create-order', {
        orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        amount: parseFloat(orderAmount),
        customerPhone: orderCustomerPhone,
        redirectUrl: window.location.origin + '/dashboard',
      });
      setNewOrderResult(res.data.data);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create order');
    }
  };

  const handleAddMfs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/mfs/accounts', {
        provider: mfsProvider,
        accountType: mfsType,
        accountNumber: mfsNumber,
        dailyLimit: 50000,
      });
      setShowMfsModal(false);
      setMfsNumber('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('payviro_token');
    localStorage.removeItem('payviro_user');
    localStorage.removeItem('payverify_token');
    localStorage.removeItem('payverify_user');
    navigate('/login');
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = trxFilter === 'All' || t.service === trxFilter;
    const matchesSearch =
      !trxSearch ||
      t.trx_id?.toLowerCase().includes(trxSearch.toLowerCase()) ||
      t.sender?.includes(trxSearch) ||
      t.reference?.toLowerCase().includes(trxSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const onlineDevicesCount = devices.filter((d) => {
    let secondsAgo = 999999;
    if (d.last_heartbeat) {
      const iso = d.last_heartbeat.endsWith('Z') || d.last_heartbeat.includes('+')
        ? d.last_heartbeat
        : d.last_heartbeat.replace(' ', 'T') + 'Z';
      secondsAgo = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    }
    return Boolean(d.is_online) && secondsAgo <= 25;
  }).length;
  const isAnyDeviceOnline = onlineDevicesCount > 0;

  const isTrial = merchantData?.subscription?.isTrial ?? (merchantData?.subscription?.plan === 'trial');
  const isExpired = merchantData?.subscription?.isExpired;

  const tabDescriptions: Record<DashboardTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Dashboard Overview',
      subtitle: 'Bird\'s-eye view of your business revenue, verified payments, and quick actions.',
    },
    invoices: {
      title: 'Invoices & Billing',
      subtitle: 'Create and send professional invoices. Clients pay via bKash, Nagad, or Rocket with automatic verification.',
    },
    auditHistory: {
      title: 'Crypto Transaction History & AML Audit Trail',
      subtitle: 'Verifiable audit records with blockchain TXIDs, deposit addresses, and client Telegram handles for exchange AML appeals.',
    },
    links: {
      title: 'Quick Payment Links',
      subtitle: 'Generate fast checkout links with fixed or custom amounts to share on WhatsApp, Facebook, or SMS.',
    },
    dues: {
      title: 'Unpaid Dues & Receivables',
      subtitle: 'Track outstanding balances, overdue customer accounts, and send one-click reminder alerts.',
    },
    customers: {
      title: 'Customers & Digital Khata',
      subtitle: 'Complete customer directory recording lifetime spend, outstanding dues, and contact details.',
    },
    receipts: {
      title: 'Payment Receipts',
      subtitle: 'Official printable payment vouchers issued automatically upon successful transaction matching.',
    },
    projects: {
      title: 'Projects & Work Milestones',
      subtitle: 'Track client milestones, outsourcing deadlines, and link billable stages directly to invoices.',
    },
    recurring: {
      title: 'Recurring Subscriptions',
      subtitle: 'Automate recurring monthly retainers and recurring billing schedules for ongoing client contracts.',
    },
    expenses: {
      title: 'Expense Tracker',
      subtitle: 'Record business overheads, software licenses, and team expenses to compute your true net profit.',
    },
    reports: {
      title: 'Financial Reports & P&L',
      subtitle: 'Analyze net operating income, cash flow trends, and export comprehensive audit summaries.',
    },
    transactions: {
      title: 'Verified Transactions',
      subtitle: 'Live chronological stream of customer payments verified automatically by your Android phone.',
    },
    devices: {
      title: 'Phone Auto-Verify (Relay)',
      subtitle: 'Connect your Android smartphone to automatically read bKash & Nagad SMS with zero merchant fees.',
    },
    mfs: {
      title: 'bKash & Nagad Numbers',
      subtitle: 'Configure your receiving mobile banking accounts (Personal Send Money or Merchant Payment).',
    },
    webhooks: {
      title: 'Developer APIs & Webhooks',
      subtitle: 'Generate live API keys and configure HTTP webhooks to automate your website or backend system.',
    },
    plans: {
      title: 'Subscription & License',
      subtitle: 'Manage your active Payviro subscription plan and renew conveniently using personal bKash.',
    },
    profile: {
      title: 'Business Profile & Branding',
      subtitle: 'Update your company name, logo, contact phone, and invoice header information.',
    },
  };

  const navGroups = [
    {
      title: 'Workspace',
      items: [
        { id: 'overview' as DashboardTab, label: 'Dashboard', icon: LayoutDashboard, badge: null, desc: 'Bird\'s-eye view & quick actions' }
      ]
    },
    {
      title: 'Invoicing & Sales',
      items: [
        { id: 'invoices' as DashboardTab, label: 'Invoices', icon: FileText, badge: null, desc: 'Bill clients with bKash/Nagad checkout' },
        { id: 'auditHistory' as DashboardTab, label: 'Crypto Audit Trail', icon: ShieldCheck, badge: 'AML', desc: 'Blockchain TXID & social handle records' },
        { id: 'links' as DashboardTab, label: 'Payment Links', icon: Link2, badge: null, desc: 'Instant one-click checkout URLs' },
        { id: 'dues' as DashboardTab, label: 'Unpaid Dues', icon: Clock, badge: businessStats?.totalDues ? `৳${Math.round(businessStats.totalDues / 1000)}k` : null, desc: 'Receivables & WhatsApp reminders' },
        { id: 'customers' as DashboardTab, label: 'Customers & Khata', icon: Users, badge: null, desc: 'Customer balances & ledger' },
        { id: 'receipts' as DashboardTab, label: 'Payment Receipts', icon: CheckCircle2, badge: null, desc: 'Official payment vouchers' }
      ]
    },
    {
      title: 'Business Tracking',
      items: [
        { id: 'projects' as DashboardTab, label: 'Projects & Work', icon: Briefcase, badge: businessStats?.activeProjects ? String(businessStats.activeProjects) : null, desc: 'Milestones & billable stages' },
        { id: 'recurring' as DashboardTab, label: 'Subscriptions', icon: RefreshCw, badge: null, desc: 'Monthly client retainers' },
        { id: 'expenses' as DashboardTab, label: 'Expenses & Costs', icon: TrendingDown, badge: null, desc: 'Track overheads & net margin' },
        { id: 'reports' as DashboardTab, label: 'Financial Reports', icon: BarChart3, badge: null, desc: 'P&L and balance sheet' }
      ]
    },
    {
      title: 'Payment Automation',
      items: [
        { id: 'transactions' as DashboardTab, label: 'Transactions', icon: CreditCard, badge: transactions.length ? String(transactions.length) : null, desc: 'Real-time verified payments' },
        { id: 'devices' as DashboardTab, label: 'Phone Auto-Verify', icon: Wifi, badge: isAnyDeviceOnline ? 'Online' : 'Offline', desc: '0% fee Android relay' },
        { id: 'mfs' as DashboardTab, label: 'bKash / Nagad Numbers', icon: Smartphone, badge: mfsAccounts.length ? String(mfsAccounts.length) : null, desc: 'Receiving mobile accounts' }
      ]
    },
    {
      title: 'Settings & Integrations',
      items: [
        { id: 'profile' as DashboardTab, label: 'Business Profile', icon: Building2, badge: null, desc: 'Branding & invoice info' },
        { id: 'plans' as DashboardTab, label: 'Subscription Plan', icon: Crown, badge: isExpired ? 'Expired' : isTrial ? 'Trial' : 'Pro', desc: 'Plan status & renewal' },
        { id: 'webhooks' as DashboardTab, label: 'Developer & APIs', icon: Webhook, badge: null, desc: 'API keys & webhooks' }
      ]
    }
  ];

  const navItems = navGroups.flatMap((g) => g.items);

  const quickBottomTabs: { id: DashboardTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'dues', label: 'Dues', icon: Clock },
    { id: 'customers', label: 'Khata', icon: Users },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f6f9f7] dark:bg-[#070b09] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-emerald-500 selection:text-white">
      {/* ---------------- MOBILE TOP BAR (<lg) ---------------- */}
      <header className="lg:hidden sticky top-0 z-40 w-full max-w-full bg-white/98 dark:bg-[#070b09]/98 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 shadow-xs safe-top">
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 transition-colors shrink-0 active:scale-95 cursor-pointer"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <img
              src="/payviro-icon-192.png"
              alt="Payviro"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-sm shrink-0"
            />
            <div className="flex items-baseline">
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">Payviro</span>
              <span className="text-emerald-500 font-black text-sm sm:text-base">.</span>
            </div>
          </Link>
        </div>

        {/* Right: Search, Relay Telemetry & Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick How It Works Button for Mobile */}
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1 transition-colors shrink-0 active:scale-95 cursor-pointer"
            title="How It Works Guide"
            aria-label="How It Works Guide"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Quick Action Button for Mobile */}
          <button
            type="button"
            onClick={() => setShowQuickActions(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1 transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
            title="Quick Actions"
            aria-label="Quick Actions"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="hidden sm:inline">Action</span>
          </button>

          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => setShowGlobalSearch(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 transition-colors shrink-0 cursor-pointer"
            title="Search records (Ctrl + K)"
            aria-label="Search records"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Quick status pill */}
          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            title={
              isAnyDeviceOnline
                ? `Relay Active • ${onlineDevicesCount} device(s) operational. Tap to view.`
                : 'Relay Offline • Tap to pair device.'
            }
            aria-label={isAnyDeviceOnline ? 'Relay is Active. Tap to view devices' : 'Relay is Offline. Tap to view devices'}
            className={`shrink-0 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-all active:scale-95 touch-manipulation cursor-pointer ${
              isAnyDeviceOnline
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-xs'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 shadow-xs'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {isAnyDeviceOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isAnyDeviceOnline ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span className="hidden sm:inline select-none text-[11px]">
              {isAnyDeviceOnline ? 'Relay Active' : 'Relay Off'}
            </span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle variant="icon-cycle" className="shrink-0" />
        </div>
      </header>

      {/* ---------------- MOBILE DRAWER (<lg) ---------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-[#0c1210] border-r border-slate-200 dark:border-white/10 p-5 flex flex-col justify-between shadow-2xl z-50 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2.5"
                >
                  <img
                    src="/payviro-icon-192.png"
                    alt="Payviro"
                    className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-sm"
                  />
                  <div>
                    <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">Payviro</span>
                    <span className="text-emerald-500 font-black">.</span>
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                      Merchant
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick How It Works Guide in Mobile Drawer */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowHowItWorks(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>How It Works (Guide)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
              </button>

              {/* Omnichannel Search Button in Drawer */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowGlobalSearch(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>Search records...</span>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10">⌘K</span>
              </button>

              {/* Merchant Profile */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {merchantData?.merchant?.business_name || 'My Store'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {merchantData?.subscription?.plan || 'PRO'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {merchantData?.merchant?.email}
                </p>
              </div>

              {/* Relay Telemetry Quick Card in Drawer */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('devices');
                  setMobileMenuOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all text-left active:scale-[0.98] ${
                  isAnyDeviceOnline
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/25'
                    : 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/25'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${
                    isAnyDeviceOnline
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Android Relay</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isAnyDeviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isAnyDeviceOnline ? `${onlineDevicesCount} device(s) online` : 'No phone paired'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                  isAnyDeviceOnline
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}>
                  {isAnyDeviceOnline ? 'Active' : 'Offline'}
                </span>
              </button>

              {/* Theme Selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-2">
                  Appearance
                </p>
                <div className="p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <ThemeToggle variant="segmented" />
                </div>
              </div>

              {/* Grouped Navigation Items */}
              <nav className="space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pb-1">
                      {group.title}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.badge === 'Online'
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : item.badge === 'Offline'
                                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                  : isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {merchantData?.merchant?.role === 'admin' && (
                  <div className="pt-2">
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition-all shadow-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span>Super Admin Panel</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950">
                        Admin
                      </span>
                    </Link>
                  </div>
                )}
              </nav>
            </div>

            <div className="pt-5 border-t border-slate-200 dark:border-white/10 space-y-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ---------------- DESKTOP SIDEBAR (lg+) ---------------- */}
      <aside className="hidden lg:flex w-64 xl:w-72 border-r border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1210]/90 backdrop-blur-xl p-5 flex-col justify-between flex-shrink-0 sticky top-0 h-screen z-20">
        <div className="space-y-5 overflow-hidden flex flex-col min-h-0 flex-1">
          <div>
            <Link to="/" className="flex items-center space-x-3">
              <img
                src="/payviro-icon-192.png"
                alt="Payviro"
                className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-white/10 shadow-md"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Payviro</span>
                  <span className="text-emerald-500 font-black text-xl">.</span>
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">
                  Enterprise Gateway
                </p>
              </div>
            </Link>
          </div>

          {/* Global Omnichannel Search Shortcut */}
          <button
            type="button"
            onClick={() => setShowGlobalSearch(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10 text-xs font-medium transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search records...</span>
            </div>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-500">⌘K</kbd>
          </button>

          {/* Beginner-First Help & Guide Button in Sidebar */}
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span>How Payviro Works</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase">Guide</span>
          </button>

          {/* Grouped Nav Items */}
          <nav className="space-y-4 text-xs font-medium overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pb-1 pt-1">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.badge === 'Online'
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : item.badge === 'Offline'
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              : isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {merchantData?.merchant?.role === 'admin' && (
              <div className="pt-3">
                <Link
                  to="/admin"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition-all shadow-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>Super Admin Panel</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950">
                    Admin
                  </span>
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-white/10 space-y-3.5">
          {/* Theme Selector */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-1.5">
              Theme Mode
            </p>
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <ThemeToggle variant="segmented" />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                {merchantData?.merchant?.business_name || 'My Store'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                {merchantData?.subscription?.plan || 'PRO'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {merchantData?.merchant?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-12 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  <span className="hl-green">{tabDescriptions[activeTab]?.title || 'Dashboard'}</span>
                </h1>
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/5 transition-colors cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {tabDescriptions[activeTab]?.subtitle}
              </p>
            </div>

            <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 w-full sm:w-auto">
              {/* How It Works Button */}
              <button
                type="button"
                onClick={() => setShowHowItWorks(true)}
                className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
                title="Open Interactive Guide"
              >
                <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>How It Works</span>
              </button>

              {/* Quick Actions Launcher */}
              <button
                type="button"
                onClick={() => setShowQuickActions(true)}
                className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                title="Launch a task"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Quick Actions</span>
                <span className="text-[10px] opacity-70">▾</span>
              </button>

              {/* Universal Desktop & Tablet Relay Telemetry Pill */}
              <button
                type="button"
                onClick={() => setActiveTab('devices')}
                title={
                  isAnyDeviceOnline
                    ? `Relay Active • ${onlineDevicesCount} of ${devices.length} device(s) online. Click to manage.`
                    : 'Relay Offline • No phone paired. Click to pair.'
                }
                className={`hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                  isAnyDeviceOnline
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-xs'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 shadow-xs'
                }`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {isAnyDeviceOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isAnyDeviceOnline ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                </span>
                <span className="whitespace-nowrap">{isAnyDeviceOnline ? 'Relay Active' : 'Relay Offline'}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isAnyDeviceOnline
                      ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-500/20 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {onlineDevicesCount}/{devices.length}
                </span>
              </button>

              {/* Omnichannel Quick Search Button */}
              <button
                type="button"
                onClick={() => setShowGlobalSearch(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-white/10 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                title="Global Search (Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search</span>
                <kbd className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500">⌘K</kbd>
              </button>

              <ThemeToggle variant="dropdown" className="hidden sm:block shrink-0" />

              {merchantData?.merchant?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all items-center justify-center space-x-1.5 active:scale-95 shrink-0"
                  title="Super Admin Console"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                  <span>Admin</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className="hidden sm:inline-flex px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all items-center justify-center space-x-1.5 active:scale-95 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Invoice</span>
              </button>
            </div>
          </div>

          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Trial or Expired Alert Banner */}
              {isExpired ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                        Free Trial Expired • Automated Verification Paused
                      </h4>
                      <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-0.5">
                        Your free trial has ended. Upgrade to Pro or Enterprise using personal bKash (01915575697) to restore instant 24/7 verification.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('plans')}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shrink-0 w-full sm:w-auto flex items-center justify-center space-x-1.5"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade via bKash →</span>
                  </button>
                </div>
              ) : isTrial ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          14-Day Free Trial Active
                        </h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {merchantData?.subscription?.daysRemaining ?? 14} Days Left
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        You can upgrade to Pro or Enterprise anytime with personal bKash for multi-device relay.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('plans')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm shrink-0 w-full sm:w-auto flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Upgrade Plan →</span>
                  </button>
                </div>
              ) : null}
              {!isAnyDeviceOnline && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                        No Active Android Relay Phone
                      </h4>
                      <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                        Launch Payviro on your phone to start automated SMS verification for bKash, Nagad, and Rocket.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('devices')}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors shrink-0 w-full sm:w-auto shadow-sm"
                  >
                    Pair Device →
                  </button>
                </div>
              )}

              {devices.length > 0 && (
                <DeviceHealthCard device={devices[0]} onRefresh={() => loadData(false)} />
              )}

              {/* Beginner-First "What would you like to do?" Action Hub */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>What would you like to do today?</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pick a core workflow below to get started, or check your live metrics.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHowItWorks(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold self-start sm:self-auto cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>New here? Read the 2-minute guide →</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
                  {/* Action 1: Invoices */}
                  <div
                    onClick={() => setActiveTab('invoices')}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          Billing
                        </span>
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Create Invoice
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Send a professional bill with bKash/Nagad checkout and WhatsApp sharing.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>Create Invoice</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Action 2: Payment Links */}
                  <div
                    onClick={() => setActiveTab('links')}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] hover:border-purple-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <Link2 className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          Fast Link
                        </span>
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Payment Link
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Generate a quick checkout URL for ৳500 or any amount to collect instantly.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                      <span>Create Link</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Action 3: Add Customer */}
                  <div
                    onClick={() => setActiveTab('customers')}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          Khata
                        </span>
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Add Customer
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Save client contact details to track their purchases, dues, and payment history.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <span>Customer Khata</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Action 4: Relay Phone */}
                  <div
                    onClick={() => setActiveTab('devices')}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isAnyDeviceOnline
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                        }`}>
                          {isAnyDeviceOnline ? 'Connected' : 'Setup Required'}
                        </span>
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Auto-Verify Phone
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Automate 0% fee SMS verification for your personal bKash & Nagad accounts.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <span>{isAnyDeviceOnline ? 'Manage Relay' : 'Connect Phone'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Top Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between relative overflow-hidden min-w-0">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                    <span className="font-semibold truncate">Today's Volume</span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 min-w-0">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono truncate">
                      ৳{stats?.transactions?.totalAmount?.toLocaleString() || '0'}
                    </div>
                    <div className="mt-1.5 sm:mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 truncate">
                      <CheckCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{stats?.transactions?.totalCount || 0} verified</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between relative overflow-hidden min-w-0">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                    <span className="font-semibold truncate">Success Rate</span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 min-w-0">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
                      {stats?.orders?.totalOrders > 0
                        ? `${Math.round((stats.orders.verifiedOrders / stats.orders.totalOrders) * 100)}%`
                        : '100%'}
                    </div>
                    <div className="mt-1.5 sm:mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Total orders: {stats?.orders?.totalOrders || 0}
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between relative overflow-hidden min-w-0">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                    <span className="font-semibold truncate">Active Relay</span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 min-w-0">
                    <div className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono truncate">
                      {onlineDevicesCount} / {devices.length}
                    </div>
                    <div className="mt-1.5 sm:mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isAnyDeviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="truncate">{isAnyDeviceOnline ? 'Operational' : 'Offline'}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between relative overflow-hidden min-w-0">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                    <span className="font-semibold truncate">License Validity</span>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 min-w-0">
                    <div className="text-base sm:text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-300 truncate font-mono">
                      {merchantData?.subscription?.expires_at
                        ? new Date(merchantData.subscription.expires_at).toLocaleDateString()
                        : 'Lifetime'}
                    </div>
                    <div className="mt-1.5 sm:mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Plan: <span className="uppercase font-bold text-emerald-600 dark:text-emerald-400">{merchantData?.subscription?.plan || 'PRO'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Khata & Business Performance Snapshot */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Digital Khata &amp; Business Operations
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('customers')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      Customers →
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reports')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      P&amp;L Report →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Dues Outstanding */}
                  <div
                    onClick={() => setActiveTab('dues')}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-amber-500/40 cursor-pointer transition-all shadow-sm group min-w-0"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold truncate">Receivables</span>
                      <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-mono truncate">
                      ৳{businessStats?.totalDues?.toLocaleString() || '0'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {businessStats?.overdueCount || 0} overdue invoice(s)
                    </p>
                  </div>

                  {/* Net Operating Income */}
                  <div
                    onClick={() => setActiveTab('reports')}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all shadow-sm group min-w-0"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold truncate">Net Margin</span>
                      <DollarSign className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />
                    </div>
                    <div className={`mt-2 text-lg sm:text-xl font-bold font-mono truncate ${(businessStats?.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      ৳{businessStats?.netProfit?.toLocaleString() || '0'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {(businessStats?.netProfit || 0) >= 0 ? 'Profitable cash flow' : 'Operating deficit'}
                    </p>
                  </div>

                  {/* Operating Overhead */}
                  <div
                    onClick={() => setActiveTab('expenses')}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-rose-500/40 cursor-pointer transition-all shadow-sm group min-w-0"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold truncate">Expenses</span>
                      <TrendingDown className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono truncate">
                      ৳{businessStats?.totalExpenses?.toLocaleString() || '0'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      Overheads & costs
                    </p>
                  </div>

                  {/* Active Outsourcing Projects */}
                  <div
                    onClick={() => setActiveTab('projects')}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-blue-500/40 cursor-pointer transition-all shadow-sm group min-w-0"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold truncate">Active Work</span>
                      <Briefcase className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
                    </div>
                    <div className="mt-2 text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 font-mono truncate">
                      {businessStats?.activeProjects || 0}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      Projects in flight
                    </p>
                  </div>
                </div>

                {/* Quick Action Shortcuts Bar */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('customers')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>+ New Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('invoices')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>+ Create Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('expenses')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors whitespace-nowrap"
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>+ Log Expense</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('receipts')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 hover:bg-purple-100 transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Receipts Ledger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dues')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Send Reminders</span>
                  </button>
                </div>
              </div>

              {/* MFS Providers Volume Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Gateway Breakdown
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('mfs')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold"
                  >
                    MFS Settings →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* bKash */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-pink-950/40 dark:via-slate-900 dark:to-slate-950 border border-pink-500/25 shadow-sm dark:shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">bKash Volume</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20">
                        bKash
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                      ৳{stats?.transactions?.bkashAmount?.toLocaleString() || '0'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Personal & Merchant auto-match</p>
                  </div>

                  {/* Nagad */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-orange-950/40 dark:via-slate-900 dark:to-slate-950 border border-orange-500/25 shadow-sm dark:shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Nagad Volume</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
                        Nagad
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                      ৳{stats?.transactions?.nagadAmount?.toLocaleString() || '0'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Instant SMS match & verify</p>
                  </div>

                  {/* Rocket */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-950 border border-purple-500/25 shadow-sm dark:shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Rocket Volume</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                        Rocket
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                      ৳{stats?.transactions?.rocketAmount?.toLocaleString() || '0'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">DBBL Rocket MFS stream</p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions Widget */}
              <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time verified customer payments</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold"
                  >
                    View All →
                  </button>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {transactions.slice(0, 5).map((trx) => (
                    <div
                      key={trx.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                          {trx.trx_id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trx.service === 'bKash'
                              ? 'bg-pink-500/20 text-pink-700 dark:text-pink-400'
                              : trx.service === 'Nagad'
                              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                              : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                          }`}
                        >
                          {trx.service}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            ৳{trx.amount}.00
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Sender: {trx.sender}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            {trx.fraud_status === 'CLEAN' ? 'VERIFIED' : trx.fraud_status}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {new Date(trx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedTrxId(trx.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-1"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Audit</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {transactions.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No transactions recorded yet.
                    </div>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase">
                      <tr>
                        <th className="pb-3 px-3">TrxID</th>
                        <th className="pb-3 px-3">Gateway</th>
                        <th className="pb-3 px-3">Sender</th>
                        <th className="pb-3 px-3">Amount</th>
                        <th className="pb-3 px-3">Status</th>
                        <th className="pb-3 px-3">Time</th>
                        <th className="pb-3 px-3 text-right">Intelligence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                      {transactions.slice(0, 5).map((trx) => (
                        <tr key={trx.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-300">{trx.trx_id}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                trx.service === 'bKash'
                                  ? 'bg-pink-500/20 text-pink-700 dark:text-pink-400'
                                  : trx.service === 'Nagad'
                                  ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                                  : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                              }`}
                            >
                              {trx.service}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">{trx.sender}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">৳{trx.amount}.00</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              {trx.fraud_status === 'CLEAN' ? 'VERIFIED' : trx.fraud_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{new Date(trx.created_at).toLocaleTimeString()}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTrxId(trx.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center space-x-1"
                            >
                              <Activity className="w-3 h-3" />
                              <span>Audit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No transactions recorded yet. Connect a relay phone or run a test checkout.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB: PLANS & BILLING ================= */}
          {activeTab === 'plans' && (
            <SubscriptionPlansTab
              merchantData={merchantData}
              onSubscriptionUpdated={() => loadData(true)}
            />
          )}

          {/* ================= TAB 2: PAYMENT LINKS ================= */}
          {activeTab === 'links' && <PaymentLinksTab />}

          {/* ================= DIGITAL KHATA & BUSINESS TABS ================= */}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'invoices' && <BusinessInvoicesTab />}
          {activeTab === 'auditHistory' && <AuditHistoryPage />}
          {activeTab === 'receipts' && <PaymentReceiptsTab />}
          {activeTab === 'dues' && <DuesManagementTab />}
          {activeTab === 'projects' && <ProjectsWorkTab />}
          {activeTab === 'recurring' && <RecurringBillingTab />}
          {activeTab === 'expenses' && <ExpensesTab />}
          {activeTab === 'reports' && <FinancialReportsTab />}
          {activeTab === 'profile' && <BusinessProfileTab />}

          {/* ================= TAB 4: TRANSACTIONS ================= */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trxSearch}
                    onChange={(e) => setTrxSearch(e.target.value)}
                    placeholder="Search TrxID, sender, reference..."
                    className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
                  {['All', 'bKash', 'Nagad', 'Rocket'].map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setTrxFilter(prov)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                        trxFilter === prov
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                          : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {prov === 'All' ? 'All Gateways' : prov}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredTransactions.map((trx) => (
                  <div
                    key={trx.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 select-all">
                            {trx.trx_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(trx.trx_id, `card-${trx.id}`)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                          >
                            {copiedKey === `card-${trx.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {trx.sender} {trx.reference && `• Ref: ${trx.reference}`}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          trx.service === 'bKash'
                            ? 'bg-pink-500/20 text-pink-700 dark:text-pink-400'
                            : trx.service === 'Nagad'
                            ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                            : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                        }`}
                      >
                        {trx.service}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                      <div>
                        <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                          ৳{trx.amount}.00
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(trx.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          {trx.fraud_status === 'CLEAN' ? 'VERIFIED' : trx.fraud_status}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedTrxId(trx.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                          title="Audit Lifecycle"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTransactions.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs glass-panel rounded-2xl border border-slate-200 dark:border-white/10">
                    No transactions found.
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase">
                      <tr>
                        <th className="py-4 px-5">TrxID</th>
                        <th className="py-4 px-5">Gateway</th>
                        <th className="py-4 px-5">Sender</th>
                        <th className="py-4 px-5">Amount</th>
                        <th className="py-4 px-5">Reference</th>
                        <th className="py-4 px-5">Fraud Guard</th>
                        <th className="py-4 px-5">Time</th>
                        <th className="py-4 px-5 text-right">Intelligence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                      {filteredTransactions.map((trx) => (
                        <tr key={trx.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5 font-mono font-bold text-emerald-700 dark:text-emerald-300 select-all">
                            {trx.trx_id}
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                                trx.service === 'bKash'
                                  ? 'bg-pink-500/20 text-pink-700 dark:text-pink-400'
                                  : trx.service === 'Nagad'
                                  ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                                  : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                              }`}
                            >
                              {trx.service}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-mono">{trx.sender}</td>
                          <td className="py-4 px-5 font-bold text-slate-900 dark:text-white font-mono">৳{trx.amount}.00</td>
                          <td className="py-4 px-5 text-slate-500 dark:text-slate-400">{trx.reference || '—'}</td>
                          <td className="py-4 px-5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              {trx.fraud_status === 'CLEAN' ? 'VERIFIED' : trx.fraud_status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-slate-500 dark:text-slate-400">{new Date(trx.created_at).toLocaleString()}</td>
                          <td className="py-4 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTrxId(trx.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>Lifecycle</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            No transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: CONNECTED DEVICES & PAIRING ================= */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 dark:bg-emerald-950/25 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/10">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Android Relay Setup & Credentials</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Paste these credentials into the Payviro mobile app to activate 24/7 SMS relay verification.
                    </p>
                  </div>

                  <a
                    href="https://github.com/tawhid120/payverify-bd/releases/download/v2.1.0/app-release.apk"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/25 shrink-0 self-start sm:self-center w-full sm:w-auto"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Download Android APK</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                </div>

                {/* 2-Column Pairing Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: License Key */}
                  <div className="bg-white dark:bg-black/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>1. Merchant License Key</span>
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 dark:bg-black/60 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-white/10">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-300 text-sm tracking-wider select-all break-all">
                        {merchantData?.subscription?.license_key || 'PV-ENTERPRISE-KEY'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(merchantData?.subscription?.license_key || 'PV-ENTERPRISE-KEY', 'lic')}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                        copiedKey === 'lic'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                      }`}
                    >
                      {copiedKey === 'lic' ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>License Key Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy License Key</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Paste into <strong>'Merchant License Key'</strong> field in mobile app.
                    </p>
                  </div>

                  {/* Card 2: Server Base URL */}
                  <div className="bg-white dark:bg-black/50 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
                        <span>2. Server Base URL (API Host)</span>
                      </span>
                      <span className="text-[10px] font-semibold text-teal-600 dark:text-cyan-400 bg-teal-500/10 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full border border-teal-500/20 dark:border-cyan-500/20">
                        Online
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 dark:bg-black/60 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-white/10">
                      <span className="font-mono font-bold text-teal-700 dark:text-cyan-300 text-xs select-all break-all">
                        {typeof window !== 'undefined' ? window.location.origin : 'http://217.216.39.164:4000'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(typeof window !== 'undefined' ? window.location.origin : 'http://217.216.39.164:4000', 'base_url')}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                        copiedKey === 'base_url'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20'
                      }`}
                    >
                      {copiedKey === 'base_url' ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Base URL Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Base URL</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Paste into <strong>'Server URL'</strong> field in mobile app.
                    </p>
                  </div>
                </div>

                {/* 3-Step Guide */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1 shadow-sm dark:shadow-none">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Step 1</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Install APK</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Download and install the APK on your Android relay phone.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1 shadow-sm dark:shadow-none">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Step 2</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Input Credentials</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Paste your License Key and Server Base URL into the app.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1 shadow-sm dark:shadow-none">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Step 3</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pair & Sync</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tap 'Login & Pair' to initiate 24/7 SMS listening.</p>
                  </div>
                </div>
              </div>

              {/* Devices List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Connected Relay Phones ({devices.length})
                </h3>
                {devices.map((dev) => (
                  <DeviceHealthCard key={dev.id} device={dev} onRefresh={() => loadData(false)} />
                ))}
                {devices.length === 0 && (
                  <div className="py-16 text-center text-slate-500 glass-panel rounded-2xl border border-slate-200 dark:border-white/10">
                    No relay phones connected. Install the APK and login with your license key.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 6: WEBHOOKS & API ================= */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6 sm:space-y-8">
              <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
                      <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Developer Live API Keys</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Authenticate Telegram Bots, external automation scripts, and server-side payment queries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateApiKey}
                    disabled={isGeneratingKey}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all self-start sm:self-auto hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isGeneratingKey ? 'Generating...' : 'Generate New API Key'}</span>
                  </button>
                </div>

                {/* Newly Generated API Key Alert Banner */}
                {newlyGeneratedKey && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>New API Key Generated Successfully!</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewlyGeneratedKey(null)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-black/60 p-3 rounded-lg border border-slate-200 dark:border-white/10 font-mono text-xs text-emerald-700 dark:text-emerald-300 gap-2">
                      <span className="break-all select-all font-semibold">{newlyGeneratedKey}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(newlyGeneratedKey, 'new-api-key')}
                        className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 cursor-pointer transition-all shadow-sm"
                      >
                        {copiedKey === 'new-api-key' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                      ⚠️ Copy this key now! For security reasons, the full raw key cannot be displayed again after you leave this page.
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
                  {merchantData?.apiKeys?.map((k: any) => (
                    <div
                      key={k.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 gap-2"
                    >
                      <div>
                        <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                          {k.key_prefix}••••••••••••••••
                        </span>
                        <span className="ml-3 text-[10px] text-slate-500">Label: {k.label}</span>
                        {k.last_used_at && (
                          <span className="ml-2 text-[10px] text-slate-400">
                            Last used: {new Date(k.last_used_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 self-start sm:self-center">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                          Active
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRevokeApiKey(k.id)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-xs p-1 hover:bg-rose-500/10 rounded transition-colors"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!merchantData?.apiKeys || merchantData.apiKeys.length === 0) && (
                    <div className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                      No active API keys found. Click "Generate New API Key" above to create one.
                    </div>
                  )}
                </div>
              </div>

              <WebhookInspectorTab
                webhookData={webhookData}
                deliveries={deliveries}
                onRefresh={() => loadData(false)}
              />
            </div>
          )}

          {/* ================= TAB 7: MFS ACCOUNTS ================= */}
          {activeTab === 'mfs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage receiving bKash, Nagad, and Rocket numbers shown on checkout pages.
                </p>
                <button
                  type="button"
                  onClick={() => setShowMfsModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Account</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mfsAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 relative flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                            acc.provider === 'bKash'
                              ? 'bg-pink-500/20 text-pink-700 dark:text-pink-400'
                              : acc.provider === 'Nagad'
                              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                              : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                          }`}
                        >
                          {acc.provider} ({acc.account_type})
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            acc.is_active ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-400 dark:bg-slate-600'
                          }`}
                        />
                      </div>

                      <div className="text-lg font-mono font-bold text-slate-900 dark:text-white mb-2 tracking-wide">
                        {acc.account_number}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between text-[11px]">
                        <span>Daily Limit</span>
                        <span className="font-mono text-slate-900 dark:text-white">৳{acc.daily_limit?.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              ((acc.current_daily_total || 0) / (acc.daily_limit || 50000)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Current: ৳{acc.current_daily_total || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {mfsAccounts.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 glass-panel rounded-2xl border border-slate-200 dark:border-white/10">
                    No MFS accounts configured. Click "Add Account" above.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- MOBILE BOTTOM BAR (<lg) ---------------- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c1210]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-2 py-2 safe-bottom flex items-center justify-around shadow-2xl">
        {quickBottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg relative ${isActive ? 'bg-emerald-500/10' : ''}`}>
                <Icon className="w-5 h-5" />
                {tab.id === 'devices' && (
                  <span
                    className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#0c1210] ${
                      isAnyDeviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                )}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <div className="p-1">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>

      {/* ---------------- MODALS ---------------- */}

      {/* MODAL: Create Test Order */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c1210] shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0c1210]/95 backdrop-blur z-10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Test Payment Checkout</h2>
              <button
                type="button"
                onClick={() => {
                  setShowOrderModal(false);
                  setNewOrderResult(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto px-5 py-4 flex-1 space-y-4 overscroll-contain">
              {newOrderResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                    <p className="font-bold flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Checkout Link Ready!</span>
                    </p>
                    <p className="font-mono break-all text-slate-900 dark:text-white bg-slate-100 dark:bg-black/40 p-2.5 rounded-lg text-xs border border-slate-200 dark:border-white/10">
                      {newOrderResult.checkoutUrl}
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => handleCopy(newOrderResult.checkoutUrl, 'order_url')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'order_url' ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                    <a
                      href={newOrderResult.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderModal(false);
                      setNewOrderResult(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form id="test-order-form" onSubmit={handleCreateOrder} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Amount (BDT)
                    </label>
                    <input
                      type="number"
                      required
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(e.target.value)}
                      placeholder="500"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Customer Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={orderCustomerPhone}
                      onChange={(e) => setOrderCustomerPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 font-semibold text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      Generate Checkout
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add MFS Account */}
      {showMfsModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c1210] shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0c1210]/95 backdrop-blur z-10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add Receiving Account</h2>
              <button
                type="button"
                onClick={() => setShowMfsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="add-mfs-form" onSubmit={handleAddMfs} className="overflow-y-auto px-5 py-4 flex-1 space-y-4 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Payment Method</label>
                <select
                  value={mfsProvider}
                  onChange={(e) => setMfsProvider(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-white"
                >
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Upay">Upay</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Account Type</label>
                <select
                  value={mfsType}
                  onChange={(e) => setMfsType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-white"
                >
                  <option value="personal">Personal (Send Money)</option>
                  <option value="merchant">Merchant (Payment)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={mfsNumber}
                  onChange={(e) => setMfsNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMfsModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 font-semibold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Transaction Intelligence */}
      {selectedTrxId && (
        <TransactionIntelligenceModal
          transactionId={selectedTrxId}
          onClose={() => setSelectedTrxId(null)}
        />
      )}

      {/* MODAL: Global Omnichannel Search (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onSelectAction={handleGlobalSearchSelect}
      />

      {/* MODAL: How It Works Interactive Guide Drawer */}
      <HowItWorksDrawer
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setShowHowItWorks(false);
        }}
      />

      {/* MODAL: Quick Action Launcher Modal */}
      <QuickActionModal
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onSelectAction={handleQuickActionSelect}
      />
    </div>
  );
};
