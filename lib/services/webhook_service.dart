import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/payment_model.dart';
import '../utils/constants.dart';
import 'database_helper.dart';

class WebhookService {
  static final WebhookService instance = WebhookService._internal();
  WebhookService._internal();

  static const String _prefWebhookUrlKey = 'upi_webhook_url';
  static const String _prefWebhookSecretKey = 'upi_webhook_secret';
  static const String _prefAutoSyncKey = 'upi_auto_sync_enabled';

  Future<String> getWebhookUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefWebhookUrlKey) ?? AppConstants.defaultWebhookUrl;
  }

  Future<void> setWebhookUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefWebhookUrlKey, url.trim());
  }

  Future<String> getWebhookSecret() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefWebhookSecretKey) ?? AppConstants.defaultWebhookSecret;
  }

  Future<void> setWebhookSecret(String secret) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefWebhookSecretKey, secret.trim());
  }

  Future<bool> isAutoSyncEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefAutoSyncKey) ?? true;
  }

  Future<void> setAutoSyncEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefAutoSyncKey, enabled);
  }

  /// Sends a single payment to the configured webhook endpoint
  Future<bool> sendPayment(PaymentModel payment) async {
    final url = await getWebhookUrl();
    final secret = await getWebhookSecret();

    if (url.isEmpty) return false;

    try {
      final endpoint = Uri.parse(url);
      final payload = payment.toWebhookJson(secret: secret);

      final response = await http.post(
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Secret': secret,
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 12));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        await DatabaseHelper.instance.markPaymentSynced(payment.trxId);
        return true;
      } else {
        await DatabaseHelper.instance.markPaymentFailed(
          payment.trxId,
          'HTTP ${response.statusCode}: ${response.body}',
        );
        return false;
      }
    } catch (e) {
      await DatabaseHelper.instance.markPaymentFailed(payment.trxId, e.toString());
      return false;
    }
  }

  /// Sends a ping / health check to the webhook endpoint
  Future<Map<String, dynamic>> testConnection() async {
    final url = await getWebhookUrl();
    final secret = await getWebhookSecret();

    try {
      // 1. First test health endpoint if available
      final healthUri = Uri.parse(url.replaceAll(RegExp(r'/webhook$'), '/health'));
      try {
        final healthRes = await http.get(healthUri).timeout(const Duration(seconds: 5));
        if (healthRes.statusCode == 200) {
          return {
            'success': true,
            'message': 'Webhook server is online and active! (${healthRes.body})',
          };
        }
      } catch (_) {}

      // 2. Test actual webhook endpoint with test ping payload
      final endpoint = Uri.parse(url);
      final res = await http.post(
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Secret': secret,
        },
        body: jsonEncode({
          'amount': 0.0,
          'utr': 'TEST_PING_001',
          'package_name': 'Payviro UPI',
          'sender': 'Gateway Test',
          'content': 'Test ping from Payviro UPI App',
          'secret': secret,
        }),
      ).timeout(const Duration(seconds: 8));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return {
          'success': true,
          'message': 'Webhook connected successfully! (HTTP ${res.statusCode})',
        };
      } else if (res.statusCode == 401) {
        return {
          'success': false,
          'message': 'Authentication failed! Invalid Webhook Secret key.',
        };
      } else {
        return {
          'success': false,
          'message': 'Server response code: ${res.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection failed: $e',
      };
    }
  }

  /// Syncs all pending payments to the Webhook
  Future<int> syncAllPending() async {
    final pending = await DatabaseHelper.instance.getPendingPayments();
    if (pending.isEmpty) return 0;

    int successCount = 0;
    for (final payment in pending) {
      final ok = await sendPayment(payment);
      if (ok) {
        successCount++;
      }
    }
    return successCount;
  }
}
