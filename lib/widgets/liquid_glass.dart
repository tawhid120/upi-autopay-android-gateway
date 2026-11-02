import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/app_design.dart';

/// Apple-Inspired Liquid Glass Material Container
/// Simulates Apple Camera & Control Center translucent depth with:
/// - Backdrop blur
/// - Translucent tint
/// - Directional top-edge light reflection (specular highlight)
/// - Subtle perimeter border
/// - Soft ambient diffuse elevation shadow
class LiquidGlassContainer extends StatelessWidget {
  final Widget child;
  final double blur;
  final BorderRadius? borderRadius;
  final Color? backgroundColor;
  final Color? tintColor;
  final Color? borderColor;
  final Color? highlightColor;
  final List<BoxShadow>? shadows;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? width;
  final double? height;
  final BoxConstraints? constraints;
  final AlignmentGeometry? alignment;
  final bool enableHighlight;

  const LiquidGlassContainer({
    super.key,
    required this.child,
    this.blur = 18.0,
    this.borderRadius,
    this.backgroundColor,
    this.tintColor,
    this.borderColor,
    this.highlightColor,
    this.shadows,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.constraints,
    this.alignment,
    this.enableHighlight = true,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final radius = borderRadius ?? AppDesign.roundedLg;
    final bg = backgroundColor ?? tintColor ?? colors.glassBackground;
    final border = borderColor ?? colors.glassBorder;
    final highlight = highlightColor ?? colors.glassHighlight;
    final activeShadows = shadows ?? colors.glassShadow;

    Widget content = Container(
      width: width,
      height: height,
      constraints: constraints,
      alignment: alignment,
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: radius,
        border: Border.all(color: border, width: 0.8),
        gradient: enableHighlight
            ? LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  highlight.withValues(alpha: context.isDarkMode ? 0.18 : 0.45),
                  bg,
                  bg,
                ],
                stops: const [0.0, 0.25, 1.0],
              )
            : null,
      ),
      child: child,
    );

    // Apply BackdropFilter blur
    content = ClipRRect(
      borderRadius: radius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: content,
      ),
    );

    // Apply elevation shadow wrapper
    if (activeShadows.isNotEmpty) {
      content = Container(
        margin: margin,
        decoration: BoxDecoration(
          borderRadius: radius,
          boxShadow: activeShadows,
        ),
        child: content,
      );
    } else if (margin != null) {
      content = Padding(padding: margin!, child: content);
    }

    return content;
  }
}

/// Interactive Apple Control Center / Camera Style Liquid Button
/// Provides spring scale down, brightness feedback, and tactile haptic response.
enum LiquidButtonVariant {
  primary,
  secondary,
  destructive,
  ghost,
}

class LiquidGlassButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final LiquidButtonVariant variant;
  final double? width;
  final double height;
  final BorderRadius? borderRadius;
  final EdgeInsetsGeometry padding;
  final bool isLoading;
  final Color? backgroundColor;
  final Color? borderColor;

  const LiquidGlassButton({
    super.key,
    required this.child,
    this.onPressed,
    this.variant = LiquidButtonVariant.primary,
    this.width,
    this.height = 48.0,
    this.borderRadius,
    this.padding = const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
    this.isLoading = false,
    this.backgroundColor,
    this.borderColor,
  });

  @override
  State<LiquidGlassButton> createState() => _LiquidGlassButtonState();
}

class _LiquidGlassButtonState extends State<LiquidGlassButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 90),
      reverseDuration: const Duration(milliseconds: 160),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic, reverseCurve: Curves.easeOutBack),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    if (widget.onPressed == null || widget.isLoading) return;
    setState(() => _isPressed = true);
    _controller.forward();
    HapticFeedback.lightImpact();
  }

  void _handleTapUp(TapUpDetails details) {
    if (widget.onPressed == null || widget.isLoading) return;
    setState(() => _isPressed = false);
    _controller.reverse();
  }

  void _handleTapCancel() {
    if (widget.onPressed == null || widget.isLoading) return;
    setState(() => _isPressed = false);
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final isDark = context.isDarkMode;
    final radius = widget.borderRadius ?? AppDesign.roundedMd;

    Color bg;
    Color border;
    Color textColor;
    List<BoxShadow> shadows = [];

    switch (widget.variant) {
      case LiquidButtonVariant.primary:
        bg = isDark
            ? (_isPressed ? colors.accent.withValues(alpha: 0.85) : colors.accent)
            : (_isPressed ? colors.accent.withValues(alpha: 0.85) : colors.accent);
        border = Colors.white.withValues(alpha: 0.25);
        textColor = Colors.white;
        shadows = isDark
            ? [
                BoxShadow(
                  color: colors.accent.withValues(alpha: 0.35),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                )
              ]
            : [
                BoxShadow(
                  color: colors.accent.withValues(alpha: 0.25),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                )
              ];
        break;

      case LiquidButtonVariant.secondary:
        bg = isDark
            ? (_isPressed ? const Color(0x38FFFFFF) : const Color(0x1FFFFFFF))
            : (_isPressed ? const Color(0xFFE2E8F0) : const Color(0xFFF1F5F9));
        border = isDark ? const Color(0x28FFFFFF) : const Color(0xFFE2E8F0);
        textColor = colors.textPrimary;
        shadows = isDark ? [] : AppDesign.subtleShadow;
        break;

      case LiquidButtonVariant.destructive:
        bg = isDark
            ? (_isPressed ? colors.error.withValues(alpha: 0.28) : colors.error.withValues(alpha: 0.16))
            : (_isPressed ? colors.error.withValues(alpha: 0.20) : colors.error.withValues(alpha: 0.10));
        border = colors.error.withValues(alpha: isDark ? 0.35 : 0.25);
        textColor = colors.error;
        break;

      case LiquidButtonVariant.ghost:
        bg = _isPressed
            ? (isDark ? const Color(0x1FFFFFFF) : const Color(0x14000000))
            : Colors.transparent;
        border = Colors.transparent;
        textColor = colors.textSecondary;
        break;
    }

    if (widget.backgroundColor != null) {
      bg = _isPressed
          ? widget.backgroundColor!.withValues(alpha: 0.85)
          : widget.backgroundColor!;
    }
    if (widget.borderColor != null) {
      border = widget.borderColor!;
    }

    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      onTap: widget.isLoading ? null : widget.onPressed,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            width: widget.width,
            height: widget.height,
            decoration: BoxDecoration(
              borderRadius: radius,
              boxShadow: shadows,
            ),
            child: ClipRRect(
              borderRadius: radius,
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  padding: widget.padding,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: bg,
                    borderRadius: radius,
                    border: Border.all(color: border, width: 0.8),
                    gradient: (widget.variant == LiquidButtonVariant.primary || widget.variant == LiquidButtonVariant.secondary)
                        ? LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.white.withValues(alpha: isDark ? 0.20 : 0.35),
                              Colors.white.withValues(alpha: 0.0),
                            ],
                            stops: const [0.0, 0.45],
                          )
                        : null,
                  ),
                  child: widget.isLoading
                      ? SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(textColor),
                          ),
                        )
                      : DefaultTextStyle(
                          style: TextStyle(
                            color: textColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                          child: widget.child,
                        ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Apple Control Center Style Liquid Segmented Control
class LiquidSegmentedControl<T> extends StatelessWidget {
  final T selectedValue;
  final List<LiquidSegmentItem<T>> items;
  final ValueChanged<T> onValueChanged;
  final double height;

  const LiquidSegmentedControl({
    super.key,
    required this.selectedValue,
    required this.items,
    required this.onValueChanged,
    this.height = 44.0,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final isDark = context.isDarkMode;

    return Container(
      height: height,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: isDark ? const Color(0x28FFFFFF) : const Color(0xFFE5E7EB),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? const Color(0x18FFFFFF) : const Color(0x18000000),
          width: 0.8,
        ),
      ),
      child: Row(
        children: items.map((item) {
          final isSelected = item.value == selectedValue;

          return Expanded(
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                onValueChanged(item.value);
              },
              behavior: HitTestBehavior.opaque,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeInOutCubicEmphasized,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? colors.surfaceElevated : Colors.white)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(11),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                  border: isSelected
                      ? Border.all(
                          color: isDark ? const Color(0x33FFFFFF) : const Color(0x1F000000),
                          width: 0.8,
                        )
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (item.symbol != null) ...[
                      Text(
                        item.symbol!,
                        style: TextStyle(
                          fontSize: 13,
                          color: isSelected
                              ? (isDark ? Colors.white : colors.accent)
                              : colors.textTertiary,
                        ),
                      ),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      item.label,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? colors.textPrimary : colors.textTertiary,
                        letterSpacing: -0.1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class LiquidSegmentItem<T> {
  final T value;
  final String label;
  final String? symbol;

  const LiquidSegmentItem({
    required this.value,
    required this.label,
    this.symbol,
  });
}
