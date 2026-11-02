import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/payment_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/home_screen.dart';
import 'screens/license_activation_screen.dart';
import 'services/background_service.dart';
import 'utils/app_design.dart';
import 'utils/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final themeProvider = ThemeProvider();
  await themeProvider.initialize();

  try {
    await AppBackgroundService.initializeService();
  } catch (e) {
    debugPrint("Background service init error: $e");
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: themeProvider),
        ChangeNotifierProvider(create: (_) => PaymentProvider()..initialize()),
      ],
      child: const PayviroApp(),
    ),
  );
}

class PayviroApp extends StatelessWidget {
  const PayviroApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: themeProvider.isDarkMode(context) ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: themeProvider.isDarkMode(context) ? AppDesign.darkBgPrimary : AppDesign.lightBgPrimary,
        systemNavigationBarIconBrightness: themeProvider.isDarkMode(context) ? Brightness.light : Brightness.dark,
      ),
      child: MaterialApp(
        title: 'Payviro',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: themeProvider.themeMode,
        home: const HomeScreen(),
      ),
    );
  }
}
