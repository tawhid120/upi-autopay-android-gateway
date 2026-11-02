import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Semantic Color Tokens for Apple-Inspired Design System
/// Automatically adjusts between Dark, Light, and System appearances.
class AppSemanticColors {
  final Brightness brightness;
  final bool isDark;

  // Backgrounds & Surfaces
  final Color bgPrimary;
  final Color bgSecondary;
  final Color surface;
  final Color surfaceElevated;
  final Color surfaceSecondary;

  // Typography
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color textMuted;

  // Borders & Dividers
  final Color border;
  final Color borderSubtle;
  final Color divider;

  // Accents & Brand
  final Color accent;
  final Color accentSecondary;
  final Color accentCyan;

  // Semantic Status
  final Color success;
  final Color successBg;
  final Color warning;
  final Color warningBg;
  final Color error;
  final Color errorBg;

  // Buttons
  final Color buttonPrimary;
  final Color buttonPrimaryText;
  final Color buttonSecondary;
  final Color buttonSecondaryText;

  // Liquid Glass Material Tokens
  final Color glassBackground;
  final Color glassBackgroundElevated;
  final Color glassBorder;
  final Color glassHighlight;
  final List<BoxShadow> glassShadow;

  const AppSemanticColors({
    required this.brightness,
    required this.isDark,
    required this.bgPrimary,
    required this.bgSecondary,
    required this.surface,
    required this.surfaceElevated,
    required this.surfaceSecondary,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.textMuted,
    required this.border,
    required this.borderSubtle,
    required this.divider,
    required this.accent,
    required this.accentSecondary,
    required this.accentCyan,
    required this.success,
    required this.successBg,
    required this.warning,
    required this.warningBg,
    required this.error,
    required this.errorBg,
    required this.buttonPrimary,
    required this.buttonPrimaryText,
    required this.buttonSecondary,
    required this.buttonSecondaryText,
    required this.glassBackground,
    required this.glassBackgroundElevated,
    required this.glassBorder,
    required this.glassHighlight,
    required this.glassShadow,
  });

  /// Helpful alias for scaffold/root backgrounds
  Color get background => bgPrimary;

  /// Factory for Dark Mode (Apple Deep OLED Fintech)
  factory AppSemanticColors.dark() {
    return const AppSemanticColors(
      brightness: Brightness.dark,
      isDark: true,
      bgPrimary: Color(0xFF000000), // True OLED black
      bgSecondary: Color(0xFF0A0E17),
      surface: Color(0xFF121722),
      surfaceElevated: Color(0xFF181F2E),
      surfaceSecondary: Color(0xFF161B26),
      textPrimary: Color(0xFFFFFFFF), // 100% Crisp White
      textSecondary: Color(0xFF94A3B8), // Slate 400
      textTertiary: Color(0xFF64748B), // Slate 500
      textMuted: Color(0xFF475569), // Slate 600
      border: Color(0x24FFFFFF), // 14% subtle white
      borderSubtle: Color(0x14FFFFFF), // 8% border
      divider: Color(0x14FFFFFF),
      accent: Color(0xFF0A84FF), // Apple iOS Dark Blue
      accentSecondary: Color(0xFF6366F1),
      accentCyan: Color(0xFF38BDF8),
      success: Color(0xFF30D158),
      successBg: Color(0x2930D158),
      warning: Color(0xFFFF9F0A),
      warningBg: Color(0x29FF9F0A),
      error: Color(0xFFFF453A),
      errorBg: Color(0x29FF453A),
      buttonPrimary: Color(0xFF0A84FF),
      buttonPrimaryText: Color(0xFFFFFFFF),
      buttonSecondary: Color(0x24FFFFFF),
      buttonSecondaryText: Color(0xFFFFFFFF),
      glassBackground: Color(0x9E101520), // ~62% translucent slate
      glassBackgroundElevated: Color(0xBA161E2E), // ~73% translucent
      glassBorder: Color(0x2EFFFFFF), // 18% light edge
      glassHighlight: Color(0x40FFFFFF), // 25% top edge catch
      glassShadow: [
        BoxShadow(
          color: Color(0x66000000),
          blurRadius: 20,
          offset: Offset(0, 6),
        ),
      ],
    );
  }

  /// Factory for Light Mode (Apple Clean Pearl HIG)
  factory AppSemanticColors.light() {
    return const AppSemanticColors(
      brightness: Brightness.light,
      isDark: false,
      bgPrimary: Color(0xFFF4F6F9), // Apple grouped background
      bgSecondary: Color(0xFFFFFFFF),
      surface: Color(0xFFFFFFFF),
      surfaceElevated: Color(0xFFFAFAFC),
      surfaceSecondary: Color(0xFFF1F5F9),
      textPrimary: Color(0xFF0F172A), // Slate 900 (AAA contrast)
      textSecondary: Color(0xFF475569), // Slate 600
      textTertiary: Color(0xFF64748B), // Slate 500
      textMuted: Color(0xFF94A3B8), // Slate 400
      border: Color(0xFFE2E8F0), // Slate 200
      borderSubtle: Color(0xFFEEF2F6),
      divider: Color(0xFFE2E8F0),
      accent: Color(0xFF007AFF), // Apple iOS Blue
      accentSecondary: Color(0xFF4F46E5),
      accentCyan: Color(0xFF0284C7),
      success: Color(0xFF16A34A),
      successBg: Color(0x1F16A34A),
      warning: Color(0xFFD97706),
      warningBg: Color(0x1FD97706),
      error: Color(0xFFDC2626),
      errorBg: Color(0x1FDC2626),
      buttonPrimary: Color(0xFF007AFF),
      buttonPrimaryText: Color(0xFFFFFFFF),
      buttonSecondary: Color(0xFFE2E8F0),
      buttonSecondaryText: Color(0xFF0F172A),
      glassBackground: Color(0xDEFFFFFF), // 87% frosted pearl
      glassBackgroundElevated: Color(0xF2FFFFFF), // 95% frosted pearl
      glassBorder: Color(0x2E000000), // 18% dark edge
      glassHighlight: Color(0x80FFFFFF), // 50% top white highlight
      glassShadow: [
        BoxShadow(
          color: Color(0x120F172A),
          blurRadius: 18,
          offset: Offset(0, 6),
        ),
      ],
    );
  }
}

/// Centralized Design Tokens & Utilities
class AppDesign {
  AppDesign._();

  /// Resolves the semantic colors for the given BuildContext
  static AppSemanticColors colors(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? AppSemanticColors.dark() : AppSemanticColors.light();
  }

  // ---------------------------------------------------------------------------
  // Backward-Compatible Static Tokens (Dark by default)
  // ---------------------------------------------------------------------------
  static const Color darkBgPrimary = Color(0xFF000000);
  static const Color darkBgSecondary = Color(0xFF0A0E17);
  static const Color darkBgTertiary = Color(0xFF141923);
  static const Color darkCardBg = Color(0xFF121722);
  static const Color darkCardBgElevated = Color(0xFF1A202C);
  static const Color darkCardBorder = Color(0x1FFFFFFF);
  static const Color darkDivider = Color(0x14FFFFFF);

  static const Color darkTextPrimary = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFF94A3B8);
  static const Color darkTextTertiary = Color(0xFF64748B);
  static const Color darkTextMuted = Color(0xFF475569);

  static const Color lightBgPrimary = Color(0xFFF2F4F7);
  static const Color lightBgSecondary = Color(0xFFFFFFFF);
  static const Color lightBgTertiary = Color(0xFFE5E7EB);
  static const Color lightCardBg = Color(0xFFFFFFFF);
  static const Color lightCardBgElevated = Color(0xFFF9FAFB);
  static const Color lightCardBorder = Color(0xFFE2E8F0);
  static const Color lightDivider = Color(0xFFF1F5F9);

  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF475569);
  static const Color lightTextTertiary = Color(0xFF64748B);
  static const Color lightTextMuted = Color(0xFF94A3B8);

  static const Color accentBlue = Color(0xFF0A84FF);
  static const Color accentIndigo = Color(0xFF6366F1);
  static const Color accentCyan = Color(0xFF38BDF8);

  static const Color statusSuccess = Color(0xFF30D158);
  static const Color statusSuccessBg = Color(0x2430D158);
  static const Color statusWarning = Color(0xFFFF9F0A);
  static const Color statusWarningBg = Color(0x24FF9F0A);
  static const Color statusError = Color(0xFFFF453A);
  static const Color statusErrorBg = Color(0x24FF453A);
  static const Color statusPending = Color(0xFFF59E0B);

  // MFS & UPI Provider Brand Palettes
  static const Color bkash = Color(0xFFE2136E);
  static const Color bkashLight = Color(0xFFFF4088);
  static const Color bkashBg = Color(0x24E2136E);

  static const Color nagad = Color(0xFFF7941D);
  static const Color nagadLight = Color(0xFFFF9E3D);
  static const Color nagadBg = Color(0x24F7941D);

  static const Color rocket = Color(0xFF8C3494);
  static const Color rocketLight = Color(0xFFA855F7);
  static const Color rocketBg = Color(0x248C3494);

  static const Color upay = Color(0xFF0284C7);
  static const Color upayLight = Color(0xFF38BDF8);
  static const Color upayBg = Color(0x240284C7);

  // Indian UPI Providers
  static const Color phonepe = Color(0xFF5F259F);
  static const Color phonepeLight = Color(0xFF8B5CF6);
  static const Color phonepeBg = Color(0x245F259F);

  static const Color gpay = Color(0xFF1A73E8);
  static const Color gpayLight = Color(0xFF4285F4);
  static const Color gpayBg = Color(0x241A73E8);

  static const Color paytm = Color(0xFF002E6E);
  static const Color paytmLight = Color(0xFF00BAF2);
  static const Color paytmBg = Color(0x2400BAF2);

  static const Color fampay = Color(0xFFFFB300);
  static const Color fampayLight = Color(0xFFFFC107);
  static const Color fampayBg = Color(0x24FFB300);

  static const Color bhim = Color(0xFF00796B);
  static const Color bhimLight = Color(0xFF26A69A);
  static const Color bhimBg = Color(0x2400796B);

  static const Color cred = Color(0xFF263238);
  static const Color credLight = Color(0xFF455A64);
  static const Color credBg = Color(0x24263238);

  static const Color amazonpay = Color(0xFFFF9900);
  static const Color amazonpayBg = Color(0x24FF9900);

  // Radius Tokens
  static const double radiusXs = 8.0;
  static const double radiusSm = 12.0;
  static const double radiusMd = 16.0;
  static const double radiusLg = 20.0;
  static const double radiusXl = 28.0;
  static const double radiusPill = 999.0;

  static const BorderRadius roundedXs = BorderRadius.all(Radius.circular(radiusXs));
  static const BorderRadius roundedSm = BorderRadius.all(Radius.circular(radiusSm));
  static const BorderRadius roundedMd = BorderRadius.all(Radius.circular(radiusMd));
  static const BorderRadius roundedLg = BorderRadius.all(Radius.circular(radiusLg));
  static const BorderRadius roundedXl = BorderRadius.all(Radius.circular(radiusXl));
  static const BorderRadius roundedPill = BorderRadius.all(Radius.circular(radiusPill));

  // Shadow tokens
  static List<BoxShadow> get subtleShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.20),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get elevatedShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.30),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> glowShadow(Color color, {double opacity = 0.25}) => [
        BoxShadow(
          color: color.withValues(alpha: opacity),
          blurRadius: 18,
          spreadRadius: -2,
          offset: const Offset(0, 6),
        ),
      ];

  static Color getProviderColor(String service) {
    switch (service.toLowerCase()) {
      case 'phonepe':
        return phonepe;
      case 'google pay':
      case 'gpay':
        return gpay;
      case 'paytm':
        return paytm;
      case 'fampay':
        return fampay;
      case 'bhim':
        return bhim;
      case 'cred':
        return cred;
      case 'amazon pay':
        return amazonpay;
      case 'bkash':
        return bkash;
      case 'nagad':
        return nagad;
      case 'rocket':
        return rocket;
      case 'upay':
        return upay;
      default:
        return accentBlue;
    }
  }

  static Color getProviderBgColor(String service) {
    switch (service.toLowerCase()) {
      case 'phonepe':
        return phonepeBg;
      case 'google pay':
      case 'gpay':
        return gpayBg;
      case 'paytm':
        return paytmBg;
      case 'fampay':
        return fampayBg;
      case 'bhim':
        return bhimBg;
      case 'cred':
        return credBg;
      case 'amazon pay':
        return amazonpayBg;
      case 'bkash':
        return bkashBg;
      case 'nagad':
        return nagadBg;
      case 'rocket':
        return rocketBg;
      case 'upay':
        return upayBg;
      default:
        return const Color(0x240A84FF);
    }
  }

  static LinearGradient getProviderGradient(String service) {
    switch (service.toLowerCase()) {
      case 'bkash':
        return const LinearGradient(
          colors: [Color(0xFFE2136E), Color(0xFFFF2A85)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'nagad':
        return const LinearGradient(
          colors: [Color(0xFFF7941D), Color(0xFFFF851B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'rocket':
        return const LinearGradient(
          colors: [Color(0xFF8C3494), Color(0xFFA855F7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'upay':
        return const LinearGradient(
          colors: [Color(0xFF0284C7), Color(0xFF38BDF8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      default:
        return const LinearGradient(
          colors: [Color(0xFF0A84FF), Color(0xFF6366F1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }
}

/// Convenient extension for BuildContext to access semantic tokens and appearance
extension AppThemeContextExtension on BuildContext {
  AppSemanticColors get colors => AppDesign.colors(this);
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;
}

/// Scale feedback wrapper that provides iOS-style spring press micro-interaction
class AppleBouncingCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scaleFactor;
  final BorderRadius? borderRadius;

  const AppleBouncingCard({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scaleFactor = 0.97,
    this.borderRadius,
  });

  @override
  State<AppleBouncingCard> createState() => _AppleBouncingCardState();
}

class _AppleBouncingCardState extends State<AppleBouncingCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
      reverseDuration: const Duration(milliseconds: 180),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: widget.scaleFactor).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic, reverseCurve: Curves.easeOutBack),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    if (widget.onTap != null || widget.onLongPress != null) {
      _controller.forward();
      HapticFeedback.lightImpact();
    }
  }

  void _onTapUp(TapUpDetails details) {
    if (widget.onTap != null || widget.onLongPress != null) {
      _controller.reverse();
    }
  }

  void _onTapCancel() {
    if (widget.onTap != null || widget.onLongPress != null) {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap,
      onLongPress: widget.onLongPress,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: widget.child,
        ),
      ),
    );
  }
}
