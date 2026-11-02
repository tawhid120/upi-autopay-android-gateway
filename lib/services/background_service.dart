import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'backend_api_service.dart';
import 'sms_reader_service.dart';
import 'webhook_service.dart';

const String notificationChannelId = 'payviro_upi_foreground';
const int notificationId = 888;

class AppBackgroundService {
  static final AppBackgroundService instance = AppBackgroundService._init();
  AppBackgroundService._init();

  static Future<void> initializeService() async {
    final service = FlutterBackgroundService();

    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      notificationChannelId,
      'Payviro UPI Gateway Service',
      description: 'Keeps UPI notifications and SMS monitoring active 24/7.',
      importance: Importance.low,
    );

    final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
        FlutterLocalNotificationsPlugin();

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: true,
        isForegroundMode: true,
        notificationChannelId: notificationChannelId,
        initialNotificationTitle: 'Payviro UPI Active',
        initialNotificationContent: 'Monitoring PhonePe, GPay, Paytm, and UPI SMS...',
        foregroundServiceNotificationId: notificationId,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  static Future<bool> isRunning() async {
    return await FlutterBackgroundService().isRunning();
  }

  static void start() {
    FlutterBackgroundService().startService();
  }

  static void stop() {
    FlutterBackgroundService().invoke('stopService');
  }
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });

    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  // Background Periodic Monitor (every 15 seconds)
  Timer.periodic(const Duration(seconds: 15), (timer) async {
    try {
      final reader = SmsReaderService();
      final newPayments = await reader.scanAndSavePaymentSms(limit: 50);

      if (newPayments.isNotEmpty) {
        // Send new payments directly to UPI Webhook
        for (final payment in newPayments) {
          await WebhookService.instance.sendPayment(payment);
        }

        // Sync new payments directly to VPS backend if online
        await BackendApiService.instance.syncPendingOfflineQueue();

        // Update notification
        if (service is AndroidServiceInstance) {
          service.setForegroundNotificationInfo(
            title: 'New Payment Received!',
            content: 'Processed ${newPayments.length} new transaction(s).',
          );
        }

        // Notify active UI if open
        service.invoke('onNewPayment', {
          'count': newPayments.length,
          'trxId': newPayments.first.trxId,
          'amount': newPayments.first.amount,
        });
      } else {
        // Attempt to sync any pending offline payments to Webhook and VPS server
        await WebhookService.instance.syncAllPending();
        await BackendApiService.instance.syncPendingOfflineQueue();
      }
    } catch (e) {
      print("Background monitor loop error: $e");
    }
  });
}
