import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/payment_provider.dart';
import '../utils/app_design.dart';

class StatusHeader extends StatefulWidget {
  const StatusHeader({super.key});

  @override
  State<StatusHeader> createState() => _StatusHeaderState();
}

class _StatusHeaderState extends State<StatusHeader> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.85, end: 1.25).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PaymentProvider>();
    final stats = provider.stats;
    final currencyFormatter = NumberFormat('#,##,##0.00', 'en_US');
    final colors = context.colors;

    final totalAmount = (stats['totalAmount'] as num?)?.toDouble() ?? 0.0;
    final totalCount = stats['totalCount'] ?? 0;
    final syncedCount = stats['syncedCount'] ?? 0;
    final pendingCount = stats['pendingCount'] ?? 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colors.borderSubtle, width: 1),
        boxShadow: colors.isDark
            ? AppDesign.subtleShadow
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Live Telemetry Status Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                _buildLiveChip(
                  label: provider.isOnline ? "Online" : "Offline",
                  isPositive: provider.isOnline,
                  activeColor: colors.success,
                  inactiveColor: colors.error,
                  icon: provider.isOnline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                ),
                const SizedBox(width: 8),
                _buildLiveChip(
                  label: provider.isAnyTrackingActive
                      ? (provider.isHybridActive
                          ? "Hybrid Tracker"
                          : (provider.hasSmsPermission ? "SMS Tracker" : "Notification Listener"))
                      : "Tracker Inactive",
                  isPositive: provider.isAnyTrackingActive,
                  activeColor: colors.success,
                  inactiveColor: colors.error,
                  icon: Icons.radar_rounded,
                ),
                const SizedBox(width: 8),
                _buildLiveChip(
                  label: provider.isBackgroundRunning ? "24/7 Active" : "Background Off",
                  isPositive: provider.isBackgroundRunning,
                  activeColor: colors.accentCyan,
                  inactiveColor: colors.textTertiary,
                  icon: Icons.autorenew_rounded,
                ),
                const SizedBox(width: 8),
                _buildServerChip(provider.isPaired, colors),
              ],
            ),
          ),

          const SizedBox(height: 22),

          // 2. Total Collected Section (Apple Wallet style)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                "Total Collected Volume",
                style: TextStyle(
                  color: colors.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.2,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: colors.isDark ? Colors.white.withValues(alpha: 0.08) : colors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(color: colors.borderSubtle),
                ),
                child: Text(
                  "$totalCount Payments",
                  style: TextStyle(
                    color: colors.textPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.1,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Total Currency & Amount
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                "₹ ",
                style: TextStyle(
                  color: colors.accent,
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Expanded(
                child: Text(
                  currencyFormatter.format(totalAmount),
                  style: TextStyle(
                    color: colors.textPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.8,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),
          Divider(color: colors.divider, height: 1),
          const SizedBox(height: 16),

          // 3. Synced vs Pending Cards (Apple Grouped Surface)
          Row(
            children: [
              // Synced
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: colors.successBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: colors.success.withValues(alpha: 0.3), width: 1),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: colors.success.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.cloud_done_rounded, size: 18, color: colors.success),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Server Synced",
                              style: TextStyle(
                                color: colors.textSecondary,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "$syncedCount",
                              style: TextStyle(
                                color: colors.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(width: 10),

              // Pending
              Expanded(
                child: AppleBouncingCard(
                  onTap: pendingCount > 0 && provider.isOnline && !provider.isSyncing
                      ? () => provider.syncPending()
                      : null,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: pendingCount > 0
                          ? colors.warningBg
                          : (colors.isDark ? Colors.white.withValues(alpha: 0.04) : colors.surfaceSecondary),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: pendingCount > 0
                            ? colors.warning.withValues(alpha: 0.4)
                            : colors.borderSubtle,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: pendingCount > 0
                                ? colors.warning.withValues(alpha: 0.2)
                                : (colors.isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.04)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            provider.isSyncing ? Icons.autorenew_rounded : Icons.hourglass_top_rounded,
                            size: 18,
                            color: pendingCount > 0 ? colors.warning : colors.textTertiary,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Pending Sync",
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "$pendingCount",
                                style: TextStyle(
                                  color: pendingCount > 0 ? colors.warning : colors.textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 4. Provider Mini Badges (Apple Wallet Cards)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                _buildProviderBadge("PhonePe", (stats['phonepeAmount'] as num?)?.toDouble() ?? 0.0, AppDesign.phonepe, colors),
                const SizedBox(width: 8),
                _buildProviderBadge("GPay", (stats['gpayAmount'] as num?)?.toDouble() ?? 0.0, AppDesign.gpay, colors),
                const SizedBox(width: 8),
                _buildProviderBadge("Paytm", (stats['paytmAmount'] as num?)?.toDouble() ?? 0.0, AppDesign.paytm, colors),
                const SizedBox(width: 8),
                _buildProviderBadge("FamPay", (stats['fampayAmount'] as num?)?.toDouble() ?? 0.0, AppDesign.fampay, colors),
                const SizedBox(width: 8),
                _buildProviderBadge("BHIM", (stats['bhimAmount'] as num?)?.toDouble() ?? 0.0, AppDesign.bhim, colors),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveChip({
    required String label,
    required bool isPositive,
    required Color activeColor,
    required Color inactiveColor,
    required IconData icon,
  }) {
    final color = isPositive ? activeColor : inactiveColor;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.28), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: isPositive ? _pulseAnimation.value : 1.0,
                child: Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    boxShadow: isPositive
                        ? [BoxShadow(color: color.withValues(alpha: 0.6), blurRadius: 4, spreadRadius: 1)]
                        : null,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServerChip(bool isPaired, AppSemanticColors colors) {
    final color = isPaired ? colors.success : colors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.28), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isPaired ? Icons.dns_rounded : Icons.cloud_off_rounded, size: 12, color: color),
          const SizedBox(width: 5),
          Text(
            isPaired ? "Server Connected" : "Server Disconnected",
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProviderBadge(String name, double amount, Color color, AppSemanticColors colors) {
    final fmt = NumberFormat('#,##,##0', 'en_US');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            "$name: ",
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(
            "₹${fmt.format(amount)}",
            style: TextStyle(
              color: colors.textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
