import 'package:flutter/services.dart';
import 'package:flutter_sms_inbox/flutter_sms_inbox.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/payment_model.dart';
import '../models/sms_model.dart';
import 'database_helper.dart';
import 'sms_parser_service.dart';

class SmsReaderService {
  static const MethodChannel _channel = MethodChannel('com.payverify.bd/sms');
  final SmsQuery _smsQuery = SmsQuery();

  /// Requests SMS permission from the user
  Future<bool> requestPermissions() async {
    final status = await Permission.sms.request();
    if (await Permission.notification.isDenied) {
      await Permission.notification.request();
    }
    if (await Permission.ignoreBatteryOptimizations.isDenied) {
      await Permission.ignoreBatteryOptimizations.request();
    }
    return status.isGranted;
  }

  /// Checks if SMS permission is granted
  Future<bool> hasPermission() async {
    return await Permission.sms.isGranted;
  }

  /// Reads all SMS messages from device inbox
  Future<List<SmsModel>> getAllInboxSms({int limit = 100}) async {
    final hasPerm = await hasPermission();
    if (!hasPerm) {
      final granted = await requestPermissions();
      if (!granted) return [];
    }

    // Try Native MethodChannel first for maximum speed and Android 14+ stability
    try {
      final List<dynamic>? result = await _channel.invokeMethod('getInboxSms', {'limit': limit});
      if (result != null && result.isNotEmpty) {
        return result.map((item) {
          final map = Map<String, dynamic>.from(item as Map);
          final sms = SmsModel.fromMap(map);
          final isFin = SmsParserService.isFinancialSms(sms.address, sms.body);
          final provider = isFin ? SmsParserService.detectProvider(sms.address, sms.body) : null;
          return sms.copyWith(isPayment: isFin, matchedProvider: provider);
        }).toList();
      }
    } catch (e) {
      print("Native MethodChannel SMS query error or fallback: $e");
    }

    // Fallback to flutter_sms_inbox plugin
    try {
      final messages = await _smsQuery.querySms(
        kinds: [SmsQueryKind.inbox],
        count: limit,
        sort: true,
      );

      return messages.map((m) {
        final sms = SmsModel(
          id: (m.id ?? 0).toString(),
          address: m.address ?? 'Unknown',
          body: m.body ?? '',
          date: m.date ?? DateTime.now(),
        );
        final isFin = SmsParserService.isFinancialSms(sms.address, sms.body);
        final provider = isFin ? SmsParserService.detectProvider(sms.address, sms.body) : null;
        return sms.copyWith(isPayment: isFin, matchedProvider: provider);
      }).toList();
    } catch (e) {
      print("flutter_sms_inbox query error: $e");
      return [];
    }
  }

  /// Scans inbox SMS, identifies bKash/Nagad/Rocket payments,
  /// saves new ones to SQLite database, and returns list of newly discovered payments.
  Future<List<PaymentModel>> scanAndSavePaymentSms({int limit = 300}) async {
    final smsList = await getAllInboxSms(limit: limit);
    final List<PaymentModel> newPayments = [];

    for (final sms in smsList) {
      final payment = SmsParserService.parseSms(sms.address, sms.body, smsDate: sms.date);
      if (payment != null) {
        final exists = await DatabaseHelper.instance.hasPayment(payment.trxId);
        if (!exists) {
          final id = await DatabaseHelper.instance.insertPayment(payment);
          if (id != null) {
            newPayments.add(payment.copyWith(id: id));
          }
        }
      }
    }

    return newPayments;
  }
}
