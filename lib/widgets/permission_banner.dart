import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/payment_provider.dart';
import '../utils/app_design.dart';

class PermissionBanner extends StatelessWidget {
  const PermissionBanner({super.key});

  static void showRestrictedSettingsGuide(BuildContext context) {
    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.65),
      builder: (ctx) => const _RestrictedSettingsSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PaymentProvider>();
    final colors = context.colors;

    // If EITHER SMS permission OR Notification Listener is active, the banner disappears
    if (provider.isAnyTrackingActive) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.warning.withValues(alpha: 0.35), width: 1.2),
        boxShadow: AppDesign.glowShadow(colors.warning, opacity: 0.15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: colors.warning.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.shield_outlined, color: colors.warning, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Enable Hybrid Payment Tracker",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: colors.textPrimary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "Enable either option to automatically capture incoming payment messages",
                      style: TextStyle(
                        fontSize: 12,
                        color: colors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Android 14/15 Notice Box (High-Contrast Callout)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.warningBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.warning.withValues(alpha: 0.25), width: 1),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline_rounded, color: colors.warning, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "📌 Android 14, 15 & 16 Users:\nIf permission is disabled or greyed out, tap the 3 dots (⋮) in the top-right corner of App Info, select 'Allow restricted settings', and turn the switch on.",
                    style: TextStyle(
                      fontSize: 12,
                      color: colors.isDark ? const Color(0xFFFDE68A) : const Color(0xFF92400E),
                      height: 1.45,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 2 Action Buttons
          Row(
            children: [
              // Option 1: Notification Access
              Expanded(
                child: AppleBouncingCard(
                  onTap: () async {
                    await provider.openNotificationListenerSettings();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: colors.success,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: AppDesign.glowShadow(colors.success, opacity: 0.3),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_active_rounded, size: 16, color: Colors.white),
                        SizedBox(width: 6),
                        Text(
                          "1. Notification Access",
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Option 2: SMS Permission
              Expanded(
                child: AppleBouncingCard(
                  onTap: () async {
                    await provider.requestPermissions();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: colors.accent,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: AppDesign.glowShadow(colors.accent, opacity: 0.3),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.sms_rounded, size: 16, color: Colors.white),
                        SizedBox(width: 6),
                        Text(
                          "2. SMS Permission",
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // High-Contrast 3-Dots Guide Link
          Center(
            child: TextButton.icon(
              onPressed: () => showRestrictedSettingsGuide(context),
              icon: Icon(Icons.help_outline_rounded, size: 15, color: colors.accentCyan),
              label: Text(
                "Can't find the 3 dots (⋮)? View Step-by-Step Guide",
                style: TextStyle(
                  fontSize: 12,
                  color: colors.accentCyan,
                  fontWeight: FontWeight.w700,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RestrictedSettingsSheet extends StatelessWidget {
  const _RestrictedSettingsSheet();

  @override
  Widget build(BuildContext context) {
    final provider = context.read<PaymentProvider>();
    final colors = context.colors;

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(color: colors.borderSubtle, width: 1),
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Apple Grabber
            Center(
              child: Container(
                width: 36,
                height: 5,
                decoration: BoxDecoration(
                  color: colors.isDark ? Colors.white.withValues(alpha: 0.2) : Colors.black.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 18),

            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: colors.accent.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.touch_app_rounded, color: colors.accent, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "How to Allow Restricted Settings (⋮)",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: colors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "Bypassing Android 14, 15 & 16 Restricted Settings",
                        style: TextStyle(fontSize: 12, color: colors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colors.warningBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: colors.warning.withValues(alpha: 0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lightbulb_outline_rounded, color: colors.warning, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Note: The 3 dots do not appear in Permissions or Notifications submenus. Tap the button below to go directly to the main App Info page.",
                      style: TextStyle(
                        fontSize: 12,
                        color: colors.isDark ? const Color(0xFFFDE68A) : const Color(0xFF92400E),
                        height: 1.45,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            _buildStep(
              context: context,
              number: "1",
              title: "Tap 'Go to App Info' below",
              desc: "This directly opens the main Payviro App Info screen where Open and Uninstall buttons are located.",
              icon: Icons.settings_rounded,
            ),
            _buildStep(
              context: context,
              number: "2",
              title: "Look at the top-right corner (3 dots ⋮)",
              desc: "In the top-right corner of your screen, you will see a three-dot menu icon (⋮).",
              icon: Icons.more_vert_rounded,
            ),
            _buildStep(
              context: context,
              number: "3",
              title: "Tap 'Allow restricted settings'",
              desc: "Select 'Allow restricted settings' and authenticate using your fingerprint or PIN.",
              icon: Icons.fingerprint_rounded,
            ),
            _buildStep(
              context: context,
              number: "4",
              title: "Enable either tracking permission",
              desc: "Once enabled, this warning disappears immediately and incoming payments will be tracked automatically!",
              icon: Icons.check_circle_outline_rounded,
            ),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: AppleBouncingCard(
                onTap: () {
                  Navigator.pop(context);
                  provider.openAppInfoSettings();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: colors.accent,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: AppDesign.glowShadow(colors.accent, opacity: 0.3),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.open_in_new_rounded, color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text(
                        "Go to App Info (for 3 dots)",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep({
    required BuildContext context,
    required String number,
    required String title,
    required String desc,
    required IconData icon,
  }) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              color: colors.accent.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border: Border.all(color: colors.accent.withValues(alpha: 0.4)),
            ),
            alignment: Alignment.center,
            child: Text(
              number,
              style: TextStyle(color: colors.accent, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: colors.textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: TextStyle(fontSize: 12, color: colors.textSecondary, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
