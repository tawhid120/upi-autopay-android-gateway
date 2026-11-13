import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../providers/payment_provider.dart';
import '../providers/theme_provider.dart';
import '../services/app_update_service.dart';
import '../services/backend_api_service.dart';
import '../services/webhook_service.dart';
import '../utils/app_design.dart';
import '../utils/constants.dart';
import '../widgets/app_update_dialog.dart';
import '../widgets/liquid_glass.dart';
import '../widgets/permission_banner.dart';
import 'license_activation_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isTesting = false;
  String? _testResult;
  bool? _testSuccess;

  bool _isCheckingUpdate = false;

  String _webhookUrl = AppConstants.defaultWebhookUrl;
  String _webhookSecret = AppConstants.defaultWebhookSecret;
  bool _isTestingWebhook = false;
  String? _webhookTestResult;
  bool? _webhookTestSuccess;

  @override
  void initState() {
    super.initState();
    _loadWebhookConfig();
  }

  Future<void> _loadWebhookConfig() async {
    final url = await WebhookService.instance.getWebhookUrl();
    final secret = await WebhookService.instance.getWebhookSecret();
    if (mounted) {
      setState(() {
        _webhookUrl = url;
        _webhookSecret = secret;
      });
    }
  }

  Future<void> _testWebhookConnection() async {
    HapticFeedback.lightImpact();
    setState(() {
      _isTestingWebhook = true;
      _webhookTestResult = null;
      _webhookTestSuccess = null;
    });

    final res = await WebhookService.instance.testConnection();

    if (!mounted) return;
    setState(() {
      _isTestingWebhook = false;
      _webhookTestSuccess = res['success'] == true;
      _webhookTestResult = res['message'];
    });
    if (res['success'] == true) {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.heavyImpact();
    }
  }

  Future<void> _editWebhookDialog() async {
    final urlController = TextEditingController(text: _webhookUrl);
    final secretController = TextEditingController(text: _webhookSecret);
    final colors = context.colors;

    final updated = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.surfaceElevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Edit Webhook Settings',
          style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w800, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Webhook URL:', style: TextStyle(color: colors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: urlController,
              style: TextStyle(color: colors.textPrimary, fontSize: 13, fontFamily: 'monospace'),
              decoration: InputDecoration(
                filled: true,
                fillColor: colors.isDark ? colors.bgSecondary : colors.surfaceSecondary,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: colors.borderSubtle)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 14),
            Text('Secret Key:', style: TextStyle(color: colors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: secretController,
              style: TextStyle(color: colors.textPrimary, fontSize: 13, fontFamily: 'monospace'),
              decoration: InputDecoration(
                filled: true,
                fillColor: colors.isDark ? colors.bgSecondary : colors.surfaceSecondary,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: colors.borderSubtle)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: colors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: colors.accent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Save Settings', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (updated == true && mounted) {
      final newUrl = urlController.text.trim();
      final newSecret = secretController.text.trim();
      if (newUrl.isNotEmpty) {
        await WebhookService.instance.setWebhookUrl(newUrl);
        await WebhookService.instance.setWebhookSecret(newSecret);
        setState(() {
          _webhookUrl = newUrl;
          _webhookSecret = newSecret;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Webhook configuration updated successfully!'),
            backgroundColor: colors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _testVpsConnection() async {
    HapticFeedback.lightImpact();
    setState(() {
      _isTesting = true;
      _testResult = null;
      _testSuccess = null;
    });

    final isAlive = await BackendApiService.instance.pingServer();

    if (!mounted) return;

    setState(() {
      _isTesting = false;
      _testSuccess = isAlive;
      _testResult = isAlive
          ? "Connection to private VPS server successful and active!"
          : "Could not connect to server. Please check internet connection and URL.";
    });
    if (isAlive) {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.heavyImpact();
    }
  }

  Future<void> _handleCheckUpdate() async {
    HapticFeedback.lightImpact();
    setState(() {
      _isCheckingUpdate = true;
    });

    final updateInfo = await AppUpdateService.instance.checkUpdate();
    if (!mounted) return;

    setState(() {
      _isCheckingUpdate = false;
    });

    if (updateInfo == null) {
      final colors = context.colors;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: colors.surfaceElevated,
          content: Text(
            'Could not connect to update server. Please check your internet connection.',
            style: TextStyle(color: colors.error),
          ),
        ),
      );
      return;
    }

    if (updateInfo.hasUpdate) {
      AppUpdateDialog.show(context, updateInfo);
    } else {
      final colors = context.colors;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: colors.surfaceElevated,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Application is Up to Date',
            style: TextStyle(color: colors.success, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          content: Text(
            'Your device is running the latest version v${AppUpdateService.currentVersionName} (Build ${AppUpdateService.currentVersionCode}). No new updates available.',
            style: TextStyle(color: colors.textSecondary, fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('OK', style: TextStyle(color: colors.accent, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _confirmUnpair() async {
    HapticFeedback.selectionClick();
    final colors = context.colors;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.surfaceElevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Unpair Device?',
          style: TextStyle(color: colors.error, fontWeight: FontWeight.w800, fontSize: 17),
        ),
        content: Text(
          'Unpairing will disconnect this device from your private server. Incoming payments will not sync until re-activated with your license key.',
          style: TextStyle(color: colors.textSecondary, fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: colors.textSecondary, fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: colors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Unpair', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final provider = context.read<PaymentProvider>();
      await provider.unpairDevice();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => const LicenseActivationScreen(),
            transitionsBuilder: (context, animation, secondaryAnimation, child) => FadeTransition(opacity: animation, child: child),
          ),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PaymentProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final session = provider.deviceSession;
    final colors = context.colors;

    return Scaffold(
      backgroundColor: colors.bgPrimary,
      appBar: AppBar(
        title: Text(
          "Server & Device Settings",
          style: TextStyle(fontWeight: FontWeight.w700, color: colors.textPrimary, fontSize: 18),
        ),
        backgroundColor: colors.bgPrimary,
        elevation: 0,
        leading: IconButton(
          icon: Text(
            "←",
            style: TextStyle(color: colors.textPrimary, fontSize: 24, fontWeight: FontWeight.w400),
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 0. Apple Liquid Theme Selector Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(22),
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: colors.accent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          themeProvider.themeMode == ThemeMode.light
                              ? "☀️"
                              : (themeProvider.themeMode == ThemeMode.dark ? "🌙" : "⚙️"),
                          style: const TextStyle(fontSize: 16),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "App Theme & Display",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: colors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              themeProvider.themeMode == ThemeMode.system
                                  ? "Automatically adapts to system appearance (Default)"
                                  : (themeProvider.themeMode == ThemeMode.light
                                      ? "Light Mode (Pearl White HIG)"
                                      : "Dark Mode (OLED Black)"),
                              style: TextStyle(
                                fontSize: 12,
                                color: colors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  LiquidSegmentedControl<ThemeMode>(
                    selectedValue: themeProvider.themeMode,
                    items: const [
                      LiquidSegmentItem(
                        value: ThemeMode.system,
                        label: "System",
                        symbol: "⚙️",
                      ),
                      LiquidSegmentItem(
                        value: ThemeMode.light,
                        label: "Light",
                        symbol: "☀️",
                      ),
                      LiquidSegmentItem(
                        value: ThemeMode.dark,
                        label: "Dark",
                        symbol: "🌙",
                      ),
                    ],
                    onValueChanged: (mode) {
                      themeProvider.setThemeMode(mode);
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 0.5. UPI Webhook Gateway Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(22),
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppDesign.phonepe.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          "UPI",
                          style: TextStyle(
                            color: AppDesign.phonepe,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "UPI Webhook Gateway",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: colors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _webhookUrl,
                              style: TextStyle(
                                fontSize: 12,
                                color: colors.textSecondary,
                                fontFamily: 'monospace',
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.edit_rounded, color: colors.accent, size: 20),
                        onPressed: _editWebhookDialog,
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Divider(color: colors.divider),
                  const SizedBox(height: 10),

                  _buildInfoRow(context, "Webhook URL", _webhookUrl),
                  const SizedBox(height: 8),
                  _buildInfoRow(context, "Secret Key", "••••••••"),
                  const SizedBox(height: 8),
                  _buildInfoRow(context, "Currency", "₹ INR (Indian Rupee)"),

                  const SizedBox(height: 16),

                  // Test Webhook Button
                  LiquidGlassButton(
                    onPressed: _isTestingWebhook ? null : _testWebhookConnection,
                    variant: LiquidButtonVariant.secondary,
                    width: double.infinity,
                    isLoading: _isTestingWebhook,
                    child: Text(
                      _isTestingWebhook ? "Testing Webhook..." : "Test Webhook Connection (Ping)",
                      style: TextStyle(
                        color: colors.accent,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),

                  if (_webhookTestResult != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _webhookTestSuccess == true ? colors.successBg : colors.errorBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _webhookTestSuccess == true
                              ? colors.success.withValues(alpha: 0.4)
                              : colors.error.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Text(
                        _webhookTestResult!,
                        style: TextStyle(
                          color: _webhookTestSuccess == true ? colors.success : colors.error,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 1. VPS Server Connection Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(22),
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: colors.accent.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          "VPS",
                          style: TextStyle(
                            color: colors.accent,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Private VPS Server",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: colors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              session.serverUrl,
                              style: TextStyle(
                                fontSize: 12,
                                color: colors.textSecondary,
                                fontFamily: 'monospace',
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: session.isPaired ? colors.successBg : colors.errorBg,
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(
                            color: session.isPaired
                                ? colors.success.withValues(alpha: 0.35)
                                : colors.error.withValues(alpha: 0.35),
                          ),
                        ),
                        child: Text(
                          session.isPaired ? "Connected" : "Disconnected",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: session.isPaired ? colors.success : colors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Divider(color: colors.divider),
                  const SizedBox(height: 12),

                  // Merchant Details
                  _buildInfoRow(context, "Merchant Account", session.businessName.isNotEmpty ? session.businessName : "Unknown"),
                  const SizedBox(height: 10),
                  _buildInfoRow(context, "License Key", session.licenseKey.isNotEmpty ? session.licenseKey : "—"),
                  const SizedBox(height: 10),
                  _buildInfoRow(context, "Plan", session.plan.toUpperCase()),

                  const SizedBox(height: 18),

                  // Ping Test Button
                  LiquidGlassButton(
                    onPressed: _isTesting ? null : _testVpsConnection,
                    variant: LiquidButtonVariant.secondary,
                    width: double.infinity,
                    isLoading: _isTesting,
                    child: Text(
                      _isTesting ? "Testing Server..." : "VPS Server Ping Test",
                      style: TextStyle(
                        color: colors.accent,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),

                  if (_testResult != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _testSuccess == true ? colors.successBg : colors.errorBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _testSuccess == true
                              ? colors.success.withValues(alpha: 0.4)
                              : colors.error.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Text(
                        _testResult!,
                        style: TextStyle(
                          color: _testSuccess == true ? colors.success : colors.error,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 2. System Upgrade Section
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(22),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "System Upgrade",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: colors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Current Version: v${AppUpdateService.currentVersionName} (Build ${AppUpdateService.currentVersionCode})",
                            style: TextStyle(
                              fontSize: 12,
                              color: colors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: colors.successBg,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: colors.success.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          "Active",
                          style: TextStyle(
                            color: colors.success,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  LiquidGlassButton(
                    onPressed: _isCheckingUpdate ? null : _handleCheckUpdate,
                    variant: LiquidButtonVariant.secondary,
                    width: double.infinity,
                    isLoading: _isCheckingUpdate,
                    child: Text(
                      _isCheckingUpdate ? "Checking for Updates..." : "Check for Updates",
                      style: TextStyle(
                        color: colors.accent,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 3. Permissions Section
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 8),
              child: Text(
                "System & Automation Permissions",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: colors.textSecondary,
                  letterSpacing: 0.2,
                ),
              ),
            ),

            Container(
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(22),
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
                children: [
                  _buildCupertinoTile(
                    context: context,
                    badgeText: "SMS",
                    badgeBg: colors.accentCyan,
                    title: "SMS Reader",
                    subtitle: "Capture PhonePe, Paytm, GPay & Bank SMS",
                    trailing: CupertinoSwitch(
                      value: provider.hasSmsPermission,
                      activeTrackColor: colors.success,
                      onChanged: (val) async {
                        if (val) {
                          await Permission.sms.request();
                          await provider.refreshPermissions();
                        }
                      },
                    ),
                  ),
                  Divider(color: colors.divider, indent: 56),
                  _buildCupertinoTile(
                    context: context,
                    badgeText: "POP",
                    badgeBg: colors.warning,
                    title: "Notification Listener",
                    subtitle: "Capture instant UPI pop-ups from PhonePe, GPay, Paytm",
                    trailing: CupertinoSwitch(
                      value: provider.isNotificationListenerEnabled,
                      activeTrackColor: colors.success,
                      onChanged: (val) async {
                        await provider.openNotificationListenerSettings();
                      },
                    ),
                  ),
                  Divider(color: colors.divider, indent: 56),
                  _buildCupertinoTile(
                    context: context,
                    badgeText: "BAT",
                    badgeBg: colors.success,
                    title: "Disable Battery Optimization",
                    subtitle: "Keep running 24/7 continuously in background",
                    trailing: Text(
                      "Enable",
                      style: TextStyle(color: colors.accent, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    onTap: () async {
                      await Permission.ignoreBatteryOptimizations.request();
                    },
                  ),
                  Divider(color: colors.divider, indent: 56),
                  _buildCupertinoTile(
                    context: context,
                    badgeText: "A16",
                    badgeBg: AppDesign.phonepe,
                    title: "Android 14/15/16 Restricted Settings",
                    subtitle: "Step-by-step guide if permissions are greyed out",
                    trailing: Icon(Icons.chevron_right_rounded, color: colors.textSecondary),
                    onTap: () {
                      PermissionBanner.showRestrictedSettingsGuide(context);
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 4. Apple-style Info Callout
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colors.isDark ? Colors.white.withValues(alpha: 0.04) : colors.surfaceSecondary,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: colors.borderSubtle),
              ),
              child: Text(
                "Payviro UPI captures payment notifications and SMS on your device and relays them directly to your Telegram bot or Webhook server in real-time. All data remains under your full control.",
                style: TextStyle(color: colors.textSecondary, fontSize: 12.5, height: 1.45),
              ),
            ),

            const SizedBox(height: 24),

            // 5. Apple Destructive Button
            LiquidGlassButton(
              onPressed: _confirmUnpair,
              variant: LiquidButtonVariant.destructive,
              width: double.infinity,
              height: 50,
              child: const Text(
                "Unpair Device",
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
            ),

            const SizedBox(height: 28),

            // 6. Branded Footer
            Center(
              child: Column(
                children: [
                  Text(
                    "Payviro • v${AppUpdateService.currentVersionName} (Build ${AppUpdateService.currentVersionCode})",
                    style: TextStyle(
                      color: colors.textTertiary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Secure & Reliable Payment Automation",
                    style: TextStyle(
                      color: colors.textMuted,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 36),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, String label, String value) {
    final colors = context.colors;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: colors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
        Text(
          value,
          style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w700, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildCupertinoTile({
    required BuildContext context,
    required String badgeText,
    required Color badgeBg,
    required String title,
    required String subtitle,
    required Widget trailing,
    VoidCallback? onTap,
  }) {
    final colors = context.colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: badgeBg.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                badgeText,
                style: TextStyle(
                  color: badgeBg,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(color: colors.textPrimary, fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(color: colors.textSecondary, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            trailing,
          ],
        ),
      ),
    );
  }
}
