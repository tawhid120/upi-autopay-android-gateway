import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/payment_model.dart';
import '../providers/payment_provider.dart';
import '../screens/payment_detail_screen.dart';
import '../utils/app_design.dart';

class PaymentCard extends StatefulWidget {
  final PaymentModel payment;

  const PaymentCard({super.key, required this.payment});

  @override
  State<PaymentCard> createState() => _PaymentCardState();
}

class _PaymentCardState extends State<PaymentCard> {
  bool _isSyncing = false;

  Future<void> _uploadSingle(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final colors = context.colors;
    setState(() => _isSyncing = true);
    final provider = context.read<PaymentProvider>();

    try {
      if (!provider.isPaired) {
        throw Exception("প্রথমে সেটিংস থেকে আপনার প্রাইভেট VPS সার্ভার সংযুক্ত করুন।");
      }

      final count = await provider.syncPending();

      if (!mounted) return;
      HapticFeedback.mediumImpact();
      if (count > 0) {
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: colors.surfaceElevated,
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: AppDesign.statusSuccess, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    "পেমেন্ট (${widget.payment.trxId}) সফলভাবে VPS সার্ভারে সিঙ্ক হয়েছে!",
                    style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: colors.surfaceElevated,
            content: Text(
              "পেমেন্টটি ইতিমধ্যে সার্ভারে আপলোড করা হয়েছে অথবা অপেক্ষমাণ নেই।",
              style: TextStyle(color: colors.textSecondary),
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppDesign.statusErrorBg,
          content: Text("আপলোড ব্যর্থ: $e", style: const TextStyle(color: AppDesign.statusError)),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat('#,##,##0.00', 'en_US');
    final dateFormatter = DateFormat('dd MMM, hh:mm a');
    final providerColor = AppDesign.getProviderColor(widget.payment.service);
    final colors = context.colors;

    return AppleBouncingCard(
      onTap: () {
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => PaymentDetailScreen(payment: widget.payment),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return SlideTransition(
                position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero).animate(
                  CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
                ),
                child: child,
              );
            },
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: colors.borderSubtle, width: 1),
          boxShadow: colors.isDark
              ? AppDesign.subtleShadow
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: MFS Provider Badge + High-Contrast Amount
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      gradient: AppDesign.getProviderGradient(widget.payment.service),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: AppDesign.glowShadow(providerColor, opacity: 0.35),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.account_balance_wallet_rounded, size: 14, color: Colors.white),
                        const SizedBox(width: 5),
                        Text(
                          widget.payment.service,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Amount in High Contrast
                  Text(
                    "₹ ${currencyFormatter.format(widget.payment.amount)}",
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 20,
                      letterSpacing: -0.6,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // TrxID Pill with 1-Tap Copy Action
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: colors.isDark ? colors.bgSecondary : colors.surfaceSecondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.borderSubtle, width: 0.8),
                ),
                child: Row(
                  children: [
                    Text(
                      "UTR / Ref: ",
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        widget.payment.trxId,
                        style: TextStyle(
                          color: colors.textPrimary,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: widget.payment.trxId));
                        HapticFeedback.lightImpact();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("TrxID (${widget.payment.trxId}) কপি হয়েছে!"),
                            duration: const Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: colors.isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.copy_rounded, size: 14, color: colors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Sender Info & Ref Pill
              Row(
                children: [
                  Icon(Icons.person_rounded, size: 15, color: colors.textTertiary),
                  const SizedBox(width: 6),
                  Text(
                    widget.payment.sender,
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 12.5,
                      letterSpacing: -0.1,
                    ),
                  ),
                  if (widget.payment.reference != null && widget.payment.reference!.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: colors.isDark ? Colors.white.withValues(alpha: 0.06) : colors.surfaceSecondary,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: colors.borderSubtle),
                      ),
                      child: Text(
                        "Ref: ${widget.payment.reference}",
                        style: TextStyle(
                          color: colors.textSecondary,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 12),
              Divider(color: colors.divider, height: 1),
              const SizedBox(height: 10),

              // Bottom Row: Timestamp + Apple-Style Sync Status Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.schedule_rounded, size: 13, color: colors.textTertiary),
                      const SizedBox(width: 4),
                      Text(
                        dateFormatter.format(widget.payment.timestamp),
                        style: TextStyle(
                          color: colors.textTertiary,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  _buildSyncStatusBadge(context),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyncStatusBadge(BuildContext context) {
    final colors = context.colors;
    switch (widget.payment.syncStatus) {
      case SyncStatus.synced:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: colors.successBg,
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: colors.success.withValues(alpha: 0.35), width: 0.8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_done_rounded, size: 13, color: colors.success),
              const SizedBox(width: 5),
              Text(
                "সার্ভার সিঙ্কড",
                style: TextStyle(
                  color: colors.success,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.1,
                ),
              ),
            ],
          ),
        );
      case SyncStatus.failed:
        return InkWell(
          onTap: _isSyncing ? null : () => _uploadSingle(context),
          borderRadius: BorderRadius.circular(100),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: colors.errorBg,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: colors.error.withValues(alpha: 0.35), width: 0.8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _isSyncing
                    ? SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: colors.error))
                    : Icon(Icons.refresh_rounded, size: 13, color: colors.error),
                const SizedBox(width: 5),
                Text(
                  "সিঙ্ক ব্যর্থ • রিট্রাই",
                  style: TextStyle(
                    color: colors.error,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        );
      case SyncStatus.pending:
        return InkWell(
          onTap: _isSyncing ? null : () => _uploadSingle(context),
          borderRadius: BorderRadius.circular(100),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: colors.warningBg,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: colors.warning.withValues(alpha: 0.4), width: 0.8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _isSyncing
                    ? SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: colors.warning))
                    : Icon(Icons.cloud_upload_rounded, size: 13, color: colors.warning),
                const SizedBox(width: 5),
                Text(
                  "সিঙ্ক বাকি",
                  style: TextStyle(
                    color: colors.warning,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        );
    }
  }
}
