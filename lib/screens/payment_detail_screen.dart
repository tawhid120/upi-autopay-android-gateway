import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/payment_model.dart';
import '../providers/payment_provider.dart';
import '../utils/app_design.dart';
import '../widgets/liquid_glass.dart';

class PaymentDetailScreen extends StatefulWidget {
  final PaymentModel payment;

  const PaymentDetailScreen({super.key, required this.payment});

  @override
  State<PaymentDetailScreen> createState() => _PaymentDetailScreenState();
}

class _PaymentDetailScreenState extends State<PaymentDetailScreen> {
  late PaymentModel _payment;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _payment = widget.payment;
  }

  Future<void> _manualSync() async {
    HapticFeedback.lightImpact();
    setState(() => _isSyncing = true);
    final provider = context.read<PaymentProvider>();
    try {
      if (!provider.isPaired) {
        throw Exception("Please connect your private VPS server in Settings first.");
      }

      await provider.syncPending();
      await provider.refreshData();

      setState(() {
        _payment = _payment.copyWith(syncStatus: SyncStatus.synced, syncedAt: DateTime.now());
        _isSyncing = false;
      });

      if (mounted) {
        HapticFeedback.mediumImpact();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppDesign.statusSuccess,
            content: Text("Payment synced successfully to VPS server!", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() => _isSyncing = false);
      if (mounted) {
        HapticFeedback.heavyImpact();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppDesign.statusErrorBg,
            content: Text("Sync failed: $e", style: const TextStyle(color: AppDesign.statusError)),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final currencyFormatter = NumberFormat('#,##,##0.00', 'en_US');
    final dateFormatter = DateFormat('dd MMMM yyyy, hh:mm:ss a');
    final providerColor = AppDesign.getProviderColor(_payment.service);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text("Payment Details", style: TextStyle(fontWeight: FontWeight.w700, color: colors.textPrimary, fontSize: 18)),
        backgroundColor: colors.background,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: colors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Apple Wallet Style Hero Card with Liquid Glass
            LiquidGlassContainer(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              borderRadius: BorderRadius.circular(24),
              tintColor: colors.surface,
              borderColor: providerColor.withValues(alpha: 0.35),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: AppDesign.getProviderGradient(_payment.service),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 15),
                        const SizedBox(width: 6),
                        Text(
                          _payment.service,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "₹ ${currencyFormatter.format(_payment.amount)}",
                    style: TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: colors.textPrimary,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: colors.surfaceElevated,
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: colors.border),
                    ),
                    child: Text(
                      "Type: ${_payment.paymentType.toUpperCase()}",
                      style: TextStyle(color: colors.textSecondary, fontSize: 11.5, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 2. Apple Inset Metadata Group
            LiquidGlassContainer(
              borderRadius: BorderRadius.circular(20),
              tintColor: colors.surface,
              borderColor: colors.border,
              child: Column(
                children: [
                  _buildDetailRow(
                    context: context,
                    icon: Icons.vpn_key_rounded,
                    title: "UTR / Transaction ID",
                    value: _payment.trxId,
                    isMonospace: true,
                    showCopy: true,
                  ),
                  Divider(height: 1, color: colors.border),
                  _buildDetailRow(
                    context: context,
                    icon: Icons.phone_android_rounded,
                    title: "Sender Phone / VPA",
                    value: _payment.sender,
                    showCopy: true,
                  ),
                  Divider(height: 1, color: colors.border),
                  _buildDetailRow(
                    context: context,
                    icon: Icons.bookmark_border_rounded,
                    title: "Reference",
                    value: (_payment.reference != null && _payment.reference!.isNotEmpty)
                        ? _payment.reference!
                        : "No reference",
                  ),
                  Divider(height: 1, color: colors.border),
                  _buildDetailRow(
                    context: context,
                    icon: Icons.schedule_rounded,
                    title: "Message Timestamp",
                    value: dateFormatter.format(_payment.timestamp),
                  ),
                  Divider(height: 1, color: colors.border),
                  _buildDetailRow(
                    context: context,
                    icon: Icons.cloud_sync_rounded,
                    title: "Server Sync Status",
                    valueWidget: _buildStatusWidget(),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 3. Raw SMS Message (Apple Terminal Capsule)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Raw SMS Text:",
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: colors.textSecondary),
                ),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: _payment.rawMessage));
                    HapticFeedback.lightImpact();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Message copied!"),
                        duration: Duration(seconds: 1),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.copy_rounded, size: 14, color: AppDesign.accentCyan),
                      SizedBox(width: 4),
                      Text("Copy", style: TextStyle(fontSize: 12, color: AppDesign.accentCyan, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colors.surfaceElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: colors.border),
              ),
              child: SelectableText(
                _payment.rawMessage,
                style: TextStyle(fontSize: 13, height: 1.5, color: colors.textPrimary),
              ),
            ),

            const SizedBox(height: 24),

            // 4. Manual Upload Action Button (Liquid Glass Button)
            if (_payment.syncStatus != SyncStatus.synced)
              LiquidGlassButton(
                onPressed: _isSyncing ? null : _manualSync,
                height: 52,
                borderRadius: BorderRadius.circular(16),
                backgroundColor: AppDesign.accentBlue,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _isSyncing
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.cloud_upload_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      _isSyncing ? "Syncing..." : "Sync to Server Now",
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required BuildContext context,
    required IconData icon,
    required String title,
    String? value,
    Widget? valueWidget,
    bool isMonospace = false,
    bool showCopy = false,
  }) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: colors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 11, color: colors.textTertiary, fontWeight: FontWeight.w600)),
                const SizedBox(height: 3),
                if (valueWidget != null)
                  valueWidget
                else
                  Text(
                    value ?? '',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: colors.textPrimary,
                      fontFamily: isMonospace ? 'monospace' : null,
                    ),
                  ),
              ],
            ),
          ),
          if (showCopy && value != null)
            IconButton(
              icon: Icon(Icons.copy_rounded, size: 16, color: colors.textSecondary),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value));
                HapticFeedback.lightImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text("$title copied!"), duration: const Duration(seconds: 1), behavior: SnackBarBehavior.floating),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildStatusWidget() {
    switch (_payment.syncStatus) {
      case SyncStatus.synced:
        return const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: AppDesign.statusSuccess, size: 15),
            SizedBox(width: 6),
            Text("Successfully synced to server", style: TextStyle(color: AppDesign.statusSuccess, fontWeight: FontWeight.w700, fontSize: 13)),
          ],
        );
      case SyncStatus.failed:
        return Row(
          children: [
            const Icon(Icons.cancel_rounded, color: AppDesign.statusError, size: 15),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                "Failed: ${_payment.syncError ?? 'Unknown error'}",
                style: const TextStyle(color: AppDesign.statusError, fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          ],
        );
      case SyncStatus.pending:
        return const Row(
          children: [
            Icon(Icons.hourglass_bottom_rounded, color: AppDesign.statusWarning, size: 15),
            SizedBox(width: 6),
            Text("Pending (Will upload automatically when online)", style: TextStyle(color: AppDesign.statusWarning, fontWeight: FontWeight.w700, fontSize: 13)),
          ],
        );
    }
  }
}
