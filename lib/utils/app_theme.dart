import 'package:flutter/material.dart';
import 'app_design.dart';

/// Central Apple-Inspired Theme Manager for Payviro
class AppTheme {
  // Brand & MFS Colors (Referencing AppDesign tokens)
  static const Color primary = AppDesign.darkBgSecondary;
  static const Color accent = AppDesign.accentBlue;
  static const Color accentCyan = AppDesign.accentCyan;
  static const Color background = AppDesign.darkBgPrimary;
  static const Color surface = AppDesign.darkCardBg;

  // MFS Provider Brand Colors
  static const Color bkash = AppDesign.bkash;
  static const Color bkashGradient = AppDesign.bkashLight;
  static const Color nagad = AppDesign.nagad;
  static const Color nagadGradient = AppDesign.nagadLight;
  static const Color rocket = AppDesign.rocket;
  static const Color rocketGradient = AppDesign.rocketLight;
  static const Color upay = AppDesign.upay;

  // Status colors
  static const Color statusSynced = AppDesign.statusSuccess;
  static const Color statusPending = AppDesign.statusWarning;
  static const Color statusFailed = AppDesign.statusError;

  // Static Fallback Typography
  static const TextStyle mono = TextStyle(
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
  );

  static Color getProviderColor(String service) => AppDesign.getProviderColor(service);
  static LinearGradient getProviderGradient(String service) => AppDesign.getProviderGradient(service);

  // ---------------------------------------------------------------------------
  // DARK THEME (Default Apple Dark Fintech)
  // ---------------------------------------------------------------------------
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppDesign.darkBgPrimary,
      colorScheme: const ColorScheme.dark(
        primary: AppDesign.accentBlue,
        onPrimary: Colors.white,
        secondary: AppDesign.accentCyan,
        onSecondary: Colors.black,
        surface: AppDesign.darkCardBg,
        onSurface: AppDesign.darkTextPrimary,
        error: AppDesign.statusError,
        onError: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppDesign.darkTextPrimary, size: 22),
        titleTextStyle: TextStyle(
          color: AppDesign.darkTextPrimary,
          fontSize: 19,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppDesign.darkCardBg,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppDesign.darkCardBorder, width: 0.8),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppDesign.accentBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppDesign.darkCardBgElevated,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppDesign.darkTextTertiary, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.darkCardBorder, width: 0.8),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.darkCardBorder, width: 0.8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.accentBlue, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.statusError, width: 1.2),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppDesign.darkDivider,
        thickness: 0.8,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppDesign.darkCardBgElevated,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: AppDesign.darkCardBorder, width: 0.8),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // LIGHT THEME (Apple Light HIG)
  // ---------------------------------------------------------------------------
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppDesign.lightBgPrimary,
      colorScheme: const ColorScheme.light(
        primary: AppDesign.accentBlue,
        onPrimary: Colors.white,
        secondary: AppDesign.accentIndigo,
        onSecondary: Colors.white,
        surface: AppDesign.lightCardBg,
        onSurface: AppDesign.lightTextPrimary,
        error: AppDesign.statusError,
        onError: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppDesign.lightTextPrimary, size: 22),
        titleTextStyle: TextStyle(
          color: AppDesign.lightTextPrimary,
          fontSize: 19,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppDesign.lightCardBg,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppDesign.lightCardBorder, width: 0.8),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppDesign.accentBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppDesign.lightTextTertiary, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.lightCardBorder, width: 0.8),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.lightCardBorder, width: 0.8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.accentBlue, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppDesign.statusError, width: 1.2),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppDesign.lightDivider,
        thickness: 0.8,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: Colors.white,
        contentTextStyle: const TextStyle(color: AppDesign.lightTextPrimary, fontSize: 13, fontWeight: FontWeight.w600),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: AppDesign.lightCardBorder, width: 0.8),
        ),
      ),
    );
  }
}
