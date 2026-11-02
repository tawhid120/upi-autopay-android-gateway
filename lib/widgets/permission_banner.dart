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
                      "হাইব্রিড পেমেন্ট ট্র্যাকার সক্রিয় করুন",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: colors.textPrimary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "যেকোনো একটি অপশন অন করলেই স্বয়ংক্রিয়ভাবে মেসেজ রিড হবে",
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
                    "📌 অ্যান্ড্রয়েড ১৪, ১৫ ও ১৬ ব্যবহারকারী:\nযদি পারমিশন বন্ধ বা ধূসর দেখায়, তবে প্রথমে উপরে ডান পাশের ৩টি ডট (⋮) এ ক্লিক করে 'Allow restricted settings' অনুমোদন করুন, তারপর সুইচটি অন করুন।",
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
                          "১. নোটিফিকেশন",
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
                          "২. SMS পারমিশন",
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
                "৩টি ডট (⋮) কীভাবে খুঁজে পাবেন? সচিত্র নিয়ম দেখুন",
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
                        "৩টি বাটনে (⋮) ক্লিক করে এলাউ করার নিয়ম",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: colors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "অ্যান্ড্রয়েড ১৪, ১৫ ও ১৬-এ রেস্ট্রিকশন তোলার সঠিক পদ্ধতি",
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
                      "মনে রাখবেন: Permissions বা Notifications সাব-মেনুতে ৩টি ডট থাকে না। ৩টি ডট পেতে নিচের বাটনে চাপ দিয়ে সরাসরি Payviro-এর প্রধান App Info পেইজে যান।",
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
              number: "১",
              title: "নিচের 'App Info পেইজে যান' বাটনে চাপ দিন",
              desc: "এটি সরাসরি আপনার মোবাইলের Payviro প্রধান পেইজ খুলবে যেখানে Open, Uninstall থাকে।",
              icon: Icons.settings_rounded,
            ),
            _buildStep(
              context: context,
              number: "২",
              title: "স্ক্রিনের একদম উপরে ডান কোণায় তাকান (৩টি ডট ⋮)",
              desc: "স্ক্রিনের একদম উপরে ডান কর্নারে তিনটি উল্লম্ব ডট মেনু (⋮) দেখতে পাবেন।",
              icon: Icons.more_vert_rounded,
            ),
            _buildStep(
              context: context,
              number: "৩",
              title: "'Allow restricted settings' এ চাপ দিয়ে এলাউ করুন",
              desc: "বাংলায় থাকলে 'সীমাবদ্ধ সেটিংস অনুমোদন করুন'। এরপর ফিঙ্গারপ্রিন্ট বা পিন দিয়ে দিন।",
              icon: Icons.fingerprint_rounded,
            ),
            _buildStep(
              context: context,
              number: "৪",
              title: "এবার যেকোনো একটি পারমিশন অন করে দিন",
              desc: "অন করা মাত্রই এই সতর্কবার্তা পুরোপুরি চলে যাবে এবং মেসেজ রিড হওয়া শুরু হবে!",
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
                        "App Info পেইজে যান (৩টি ডটের জন্য)",
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
