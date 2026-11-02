import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/payment_model.dart';
import '../providers/payment_provider.dart';
import '../utils/app_design.dart';
import '../widgets/payment_card.dart';
import '../widgets/permission_banner.dart';
import '../widgets/status_header.dart';
import '../services/backend_api_service.dart';
import '../services/app_update_service.dart';
import '../widgets/app_update_dialog.dart';
import '../widgets/liquid_glass.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _hasCheckedUpdate = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAutoAppUpdate();
    });
  }

  @override
  void dispose() {
    BackendApiService.instance.sendOfflineNotification();
    WidgetsBinding.instance.removeObserver(this);
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<PaymentProvider>().checkAllPermissionsAndRefresh();
      BackendApiService.instance.sendHeartbeat();
      _checkAutoAppUpdate();
    } else if (state == AppLifecycleState.detached || state == AppLifecycleState.paused) {
      BackendApiService.instance.sendOfflineNotification();
    }
  }

  Future<void> _checkAutoAppUpdate() async {
    if (_hasCheckedUpdate) return;
    try {
      final updateInfo = await AppUpdateService.instance.checkUpdate();
      if (!mounted) return;
      if (updateInfo != null && updateInfo.hasUpdate) {
        _hasCheckedUpdate = true;
        AppUpdateDialog.show(context, updateInfo);
      }
    } catch (e) {
      print('Auto update check error: $e');
    }
  }

  List<PaymentModel> _filterPayments(List<PaymentModel> payments) {
    if (_searchQuery.trim().isEmpty) return payments;
    final q = _searchQuery.trim().toLowerCase();
    return payments.where((p) {
      return p.trxId.toLowerCase().contains(q) ||
          p.sender.toLowerCase().contains(q) ||
          (p.reference != null && p.reference!.toLowerCase().contains(q)) ||
          p.amount.toString().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PaymentProvider>();
    final colors = context.colors;
    final filteredPayments = _filterPayments(provider.payments);

    return Scaffold(
      backgroundColor: colors.bgPrimary,
      appBar: AppBar(
        backgroundColor: colors.bgPrimary,
        elevation: 0,
        centerTitle: false,
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "Payviro",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: colors.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              "অটো পেমেন্ট ভেরিফিকেশন সিস্টেম",
              style: TextStyle(
                fontSize: 11,
                color: colors.textSecondary,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.1,
              ),
            ),
          ],
        ),
        actions: [
          // VPS Sync Action Button (Apple subtle pill)
          Center(
            child: AppleBouncingCard(
              onTap: provider.isSyncing
                  ? null
                  : () async {
                      HapticFeedback.lightImpact();
                      final count = await provider.syncPending();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: count > 0 ? colors.success : colors.surfaceElevated,
                            content: Text(
                              count > 0
                                  ? "$count টি পেমেন্ট VPS সার্ভারে সফলভাবে আপলোড হয়েছে!"
                                  : "কোনো অপেক্ষমাণ পেমেন্ট নেই অথবা সার্ভারের সাথে সংযোগ করা যায়নি।",
                              style: TextStyle(fontWeight: FontWeight.w600, color: count > 0 ? Colors.white : colors.textPrimary),
                            ),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    },
              child: Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: colors.success.withValues(alpha: context.isDarkMode ? 0.14 : 0.12),
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(color: colors.success.withValues(alpha: 0.35), width: 0.8),
                ),
                child: provider.isSyncing
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: colors.success),
                      )
                    : Icon(Icons.cloud_upload_rounded, color: colors.success, size: 20),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Settings Action Button (Crisp contrast theme-adaptive icon)
          Center(
            child: AppleBouncingCard(
              onTap: () {
                HapticFeedback.lightImpact();
                Navigator.push(
                  context,
                  PageRouteBuilder(
                    pageBuilder: (context, animation, secondaryAnimation) => const SettingsScreen(),
                    transitionsBuilder: (context, animation, secondaryAnimation, child) {
                      return SlideTransition(
                        position: Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(
                          CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
                        ),
                        child: FadeTransition(opacity: animation, child: child),
                      );
                    },
                  ),
                );
              },
              child: Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: colors.isDark ? Colors.white.withValues(alpha: 0.08) : colors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(color: colors.borderSubtle, width: 0.8),
                ),
                child: Icon(Icons.settings_rounded, color: colors.textPrimary, size: 20),
              ),
            ),
          ),
          const SizedBox(width: 16),
        ],
        // Apple-style Segmented Tab Bar
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(54),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: colors.isDark ? const Color(0x28FFFFFF) : const Color(0xFFE5E7EB),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.borderSubtle, width: 0.8),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: colors.borderSubtle, width: 0.8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: colors.isDark ? 0.35 : 0.06),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              labelColor: colors.textPrimary,
              unselectedLabelColor: colors.textTertiary,
              labelPadding: const EdgeInsets.symmetric(horizontal: 4),
              labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: -0.1),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.account_balance_wallet_rounded, size: 14),
                      const SizedBox(width: 5),
                      Text("পেমেন্ট (${provider.payments.length})"),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.sms_rounded, size: 14),
                      const SizedBox(width: 5),
                      Text("SMS (${provider.allSms.length > 99 ? '99+' : provider.allSms.length})"),
                    ],
                  ),
                ),
                const Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.integration_instructions_rounded, size: 14),
                      SizedBox(width: 5),
                      Text("API গাইড"),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        physics: const BouncingScrollPhysics(),
        children: [
          _buildPaymentsTab(provider, filteredPayments),
          _buildAllSmsTab(provider),
          _buildGuideTab(),
        ],
      ),
      // Apple-styled tactile Floating Action Button
      floatingActionButton: AppleBouncingCard(
        onTap: provider.isScanning
            ? null
            : () async {
                HapticFeedback.mediumImpact();
                final newCount = await provider.scanSms();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: colors.surfaceElevated,
                      content: Row(
                        children: [
                          Icon(
                            newCount > 0 ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                            color: newCount > 0 ? colors.success : colors.accentCyan,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              newCount > 0
                                  ? "🎉 $newCount টি নতুন পেমেন্ট পাওয়া গেছে এবং সংরক্ষিত হয়েছে!"
                                  : "ইনবক্সে কোনো নতুন পেমেন্ট মেসেজ পাওয়া যায়নি।",
                              style: TextStyle(fontWeight: FontWeight.w600, color: colors.textPrimary),
                            ),
                          ),
                        ],
                      ),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [colors.accent, colors.accentSecondary],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(100),
            boxShadow: AppDesign.glowShadow(colors.accent, opacity: 0.4),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              provider.isScanning
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.sync_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                provider.isScanning ? "স্ক্যান হচ্ছে..." : "নতুন SMS স্ক্যান করুন",
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  letterSpacing: -0.1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Tab 1: Payments List View
  Widget _buildPaymentsTab(PaymentProvider provider, List<PaymentModel> payments) {
    final colors = context.colors;

    return RefreshIndicator(
      color: colors.accent,
      backgroundColor: colors.surfaceElevated,
      onRefresh: () async {
        HapticFeedback.lightImpact();
        await provider.scanSms();
      },
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          // Restricted Settings & Permission Banner
          const SliverToBoxAdapter(
            child: PermissionBanner(),
          ),

          // Top Header Widget with Stats & Revenue
          const SliverToBoxAdapter(
            child: StatusHeader(),
          ),

          // Search Field (Apple Input Style with Liquid Frosted Surface)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: TextField(
                controller: _searchController,
                style: TextStyle(fontSize: 13.5, color: colors.textPrimary, fontWeight: FontWeight.w500),
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: "TrxID, ফোন নম্বর বা রেফারেন্স দিয়ে খুঁজুন...",
                  hintStyle: TextStyle(fontSize: 13, color: colors.textTertiary),
                  prefixIcon: Icon(Icons.search_rounded, size: 20, color: colors.textSecondary),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: Icon(Icons.cancel_rounded, size: 18, color: colors.textSecondary),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: colors.surface,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: colors.borderSubtle, width: 0.8),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: colors.borderSubtle, width: 0.8),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: colors.accent, width: 1.5),
                  ),
                ),
              ),
            ),
          ),

          // Provider Filter Chips (Apple Capsule Pills)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: ['All', 'PhonePe', 'Google Pay', 'Paytm', 'FamPay', 'BHIM', 'Bank UPI'].map((filter) {
                    final isSelected = provider.selectedFilter == filter;
                    final color = AppDesign.getProviderColor(filter);
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: AppleBouncingCard(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          provider.setFilter(filter);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (filter == 'All' ? colors.accent : color)
                                : colors.surface,
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(
                              color: isSelected
                                  ? Colors.transparent
                                  : colors.borderSubtle,
                              width: 0.8,
                            ),
                            boxShadow: isSelected
                                ? AppDesign.glowShadow(filter == 'All' ? colors.accent : color, opacity: 0.3)
                                : null,
                          ),
                          child: Text(
                            filter == 'All' ? 'সব পেমেন্ট' : filter,
                            style: TextStyle(
                              color: isSelected ? Colors.white : colors.textSecondary,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),

          // Status Filter Chips
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  _buildStatusChip(provider, null, "সব অবস্থা"),
                  const SizedBox(width: 8),
                  _buildStatusChip(provider, SyncStatus.pending, "সিঙ্ক বাকি"),
                  const SizedBox(width: 8),
                  _buildStatusChip(provider, SyncStatus.synced, "সার্ভার সিঙ্কড"),
                ],
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 8)),

          // Payments List or Apple Empty State
          if (payments.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: colors.surfaceElevated,
                          shape: BoxShape.circle,
                          border: Border.all(color: colors.borderSubtle),
                          boxShadow: colors.isDark ? AppDesign.subtleShadow : [],
                        ),
                        child: Icon(Icons.receipt_long_rounded, size: 44, color: colors.accentCyan),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        _searchQuery.isNotEmpty ? "কোনো ম্যাচিং পেমেন্ট পাওয়া যায়নি" : "এখনো কোনো পেমেন্ট পাওয়া যায়নি",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: colors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _searchQuery.isNotEmpty
                            ? "অন্য কোনো TrxID বা মোবাইল নম্বর দিয়ে সার্চ করুন"
                            : "ফোনের মেসেজ ইনবক্স স্ক্যান করে পেমেন্ট স্বয়ংক্রিয়ভাবে ডিটেক্ট করুন",
                        style: TextStyle(fontSize: 12.5, color: colors.textSecondary, height: 1.4),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      AppleBouncingCard(
                        onTap: () => provider.scanSms(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                          decoration: BoxDecoration(
                            color: colors.accent,
                            borderRadius: BorderRadius.circular(100),
                            boxShadow: AppDesign.glowShadow(colors.accent, opacity: 0.3),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.sync_rounded, color: Colors.white, size: 18),
                              SizedBox(width: 8),
                              Text("ইনবক্স SMS স্ক্যান করুন", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final payment = payments[index];
                  return PaymentCard(payment: payment);
                },
                childCount: payments.length,
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 90)),
        ],
      ),
    );
  }

  Widget _buildStatusChip(PaymentProvider provider, SyncStatus? status, String label) {
    final colors = context.colors;
    final isSelected = provider.selectedStatusFilter == status;
    return AppleBouncingCard(
      onTap: () {
        HapticFeedback.selectionClick();
        provider.setStatusFilter(isSelected ? null : status);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? colors.accent.withValues(alpha: 0.2) : colors.surface,
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: isSelected ? colors.accent : colors.borderSubtle,
            width: 0.8,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? colors.accent : colors.textSecondary,
          ),
        ),
      ),
    );
  }

  /// Tab 2: All Device SMS View (High Contrast Apple Grouped Card)
  Widget _buildAllSmsTab(PaymentProvider provider) {
    final colors = context.colors;
    final dateFormatter = DateFormat('dd MMM yyyy, hh:mm a');

    if (provider.allSms.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: colors.surfaceElevated,
                  shape: BoxShape.circle,
                  border: Border.all(color: colors.borderSubtle),
                ),
                child: Icon(Icons.mark_email_unread_outlined, size: 44, color: colors.textSecondary),
              ),
              const SizedBox(height: 18),
              Text(
                "কোনো SMS লোড হয়নি",
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: colors.textPrimary),
              ),
              const SizedBox(height: 6),
              Text(
                "নিচের বাটনে চাপ দিয়ে ফোনের ইনবক্সের মেসেজগুলো স্ক্যান করে দেখুন",
                style: TextStyle(fontSize: 12.5, color: colors.textSecondary, height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              AppleBouncingCard(
                onTap: () => provider.scanSms(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                  decoration: BoxDecoration(
                    color: colors.accent,
                    borderRadius: BorderRadius.circular(100),
                    boxShadow: AppDesign.glowShadow(colors.accent, opacity: 0.3),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.refresh_rounded, color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text("ফোনের মেসেজ লোড করুন", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 90),
      itemCount: provider.allSms.length,
      itemBuilder: (context, index) {
        final sms = provider.allSms[index];
        final isFin = sms.isPayment;
        final providerColor = isFin ? AppDesign.getProviderColor(sms.matchedProvider ?? '') : colors.textTertiary;

        return Container(
          margin: const EdgeInsets.symmetric(vertical: 5),
          decoration: BoxDecoration(
            color: isFin ? providerColor.withValues(alpha: 0.08) : colors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isFin ? providerColor.withValues(alpha: 0.35) : colors.borderSubtle,
              width: 1,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: providerColor.withValues(alpha: 0.18),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isFin ? Icons.monetization_on_rounded : Icons.sms_outlined,
                            size: 15,
                            color: providerColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          sms.address,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: isFin ? providerColor : colors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    if (isFin)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: providerColor.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: providerColor.withValues(alpha: 0.35)),
                        ),
                        child: Text(
                          "${sms.matchedProvider} পেমেন্ট",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: providerColor,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  sms.body,
                  style: TextStyle(fontSize: 12.5, color: colors.textPrimary, height: 1.45),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(Icons.schedule_rounded, size: 12, color: colors.textTertiary),
                    const SizedBox(width: 5),
                    Text(
                      dateFormatter.format(sms.date),
                      style: TextStyle(fontSize: 11, color: colors.textTertiary, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Tab 3: Apple Developer Documentation Style Guide
  Widget _buildGuideTab() {
    final colors = context.colors;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LiquidGlassContainer(
            padding: const EdgeInsets.all(18),
            borderRadius: BorderRadius.circular(22),
            tintColor: colors.surface,
            borderColor: colors.borderSubtle,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.bolt_rounded, color: colors.accentCyan, size: 22),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "UPI Webhook অটোমেশন আর্কিটেকচার",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: colors.textPrimary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  "গ্রাহক PhonePe, Google Pay, Paytm, FamPay বা ব্যাংকে UPI পেমেন্ট করলে আপনার ফোন থেকে তাৎক্ষণিকভাবে Webhook সার্ভারে চলে যাবে এবং টেলিগ্রাম বট বা ওয়েবসাইটে ১ সেকেন্ডে ব্যালেন্স যুক্ত হবে।",
                  style: TextStyle(fontSize: 12.5, color: colors.textSecondary, height: 1.5),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          _buildStepCard(
            stepNumber: "১",
            title: "টেলিগ্রাম বট Webhook সংযোগ",
            description: "অ্যাপ সেটিংস থেকে Webhook URL (ডিফল্ট: http://38.127.8.169:8888/api/upi/webhook) এবং Secret কি কনফিগার করুন।",
          ),
          const SizedBox(height: 10),
          _buildStepCard(
            stepNumber: "২",
            title: "২৪/৭ অটো ব্যাকগ্রাউন্ড মনিটরিং",
            description: "অ্যাপে 'নোটিফিকেশন লিসেনার' ও ব্যাকগ্রাউন্ড সার্ভিস চালু রাখুন। ইন্টারনেট সাময়িক বিচ্ছিন্ন হলেও সমস্ত পেমেন্ট অফলাইনে জমা থাকবে এবং কানেকশন আসা মাত্র স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।",
          ),
          const SizedBox(height: 10),
          _buildStepCard(
            stepNumber: "৩",
            title: "Webhook JSON পে-লোড ফরম্যাট",
            description: "প্রতিটি পেমেন্টে নিচের ফরম্যাটে বট/সার্ভারে HTTP POST রিকোয়েস্ট পৌঁছায়:",
          ),

          const SizedBox(height: 12),

          // High-Contrast Syntax Container with Copy Button & Horizontal Scroll
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colors.isDark ? colors.bgSecondary : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.borderSubtle),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFFFF5F56), shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFFFFBD2E), shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFF27C93F), shape: BoxShape.circle)),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        Clipboard.setData(const ClipboardData(
                          text: '''// Incoming Webhook Request Payload (HTTP POST)
// Headers:
//   Content-Type: application/json
//   X-Gateway-Secret: mvpay_secret_2026

{
  "amount": 500.0,
  "utr": "612345678901",
  "trx_id": "612345678901",
  "package_name": "PhonePe",
  "provider": "PhonePe",
  "sender": "Rahul Sharma",
  "content": "Received Rs.500 from Rahul Sharma via UPI (UTR: 612345678901)",
  "secret": "mvpay_secret_2026",
  "timestamp": "2026-11-02T10:00:00.000Z"
}''',
                        ));
                        HapticFeedback.lightImpact();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text("কোড ক্লিপবোর্ডে কপি হয়েছে!"),
                            duration: Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                    ),
                  ],
                ),
                Divider(color: colors.isDark ? colors.divider : const Color(0x33FFFFFF), height: 14),
                const SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: BouncingScrollPhysics(),
                  child: SelectableText(
                    '''// Incoming Webhook Request Payload (HTTP POST)
// Headers:
//   Content-Type: application/json
//   X-Gateway-Secret: mvpay_secret_2026

{
  "amount": 500.0,
  "utr": "612345678901",
  "trx_id": "612345678901",
  "package_name": "PhonePe",
  "provider": "PhonePe",
  "sender": "Rahul Sharma",
  "content": "Received Rs.500 from Rahul Sharma via UPI (UTR: 612345678901)",
  "secret": "mvpay_secret_2026",
  "timestamp": "2026-11-02T10:00:00.000Z"
}''',
                    style: TextStyle(
                      color: Color(0xFF38BDF8),
                      fontSize: 12,
                      fontFamily: 'monospace',
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildStepCard({required String stepNumber, required String title, required String description}) {
    final colors = context.colors;
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.borderSubtle),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: colors.accent.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border: Border.all(color: colors.accent.withValues(alpha: 0.4)),
            ),
            alignment: Alignment.center,
            child: Text(
              stepNumber,
              style: TextStyle(color: colors.accent, fontSize: 11.5, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: colors.textPrimary)),
                const SizedBox(height: 3),
                Text(description, style: TextStyle(fontSize: 12, color: colors.textSecondary, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
