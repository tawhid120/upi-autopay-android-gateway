import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_update_info.dart';
import '../models/device_session_model.dart';
import '../models/payment_model.dart';
import 'database_helper.dart';

class BackendApiService {
  static final BackendApiService instance = BackendApiService._internal();
  BackendApiService._internal();

  static const MethodChannel _nativeChannel = MethodChannel('com.payverify.bd/sms');
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  DeviceSessionModel? _cachedSession;

  DeviceSessionModel? get currentSession => _cachedSession;
  bool get isPaired => _cachedSession?.isPaired == true;

  /// Fetches real device hardware specs (model, Android version, battery level)
  Future<Map<String, dynamic>> getNativeDeviceInfo() async {
    try {
      final res = await _nativeChannel.invokeMethod<Map>('getDeviceInfo');
      if (res != null) {
        return Map<String, dynamic>.from(res);
      }
    } catch (e) {
      print('Could not get native device info: $e');
    }
    return {
      'batteryLevel': 100,
      'model': 'Android Phone',
      'androidVersion': 'Android',
    };
  }

  /// Loads saved session from Android Keystore-backed Secure Storage
  Future<DeviceSessionModel> loadSession() async {
    if (_cachedSession != null) return _cachedSession!;

    final prefs = await SharedPreferences.getInstance();
    String? deviceToken = await _secureStorage.read(key: 'v2_device_token');
    if (deviceToken == null || deviceToken.isEmpty) {
      // Automatic migration: check plain SharedPreferences and promote to Keystore
      deviceToken = prefs.getString('v2_device_token');
      if (deviceToken != null && deviceToken.isNotEmpty) {
        await _secureStorage.write(key: 'v2_device_token', value: deviceToken);
        await prefs.remove('v2_device_token');
      }
    }

    final licenseKey = prefs.getString('v2_license_key');
    final serverUrl = prefs.getString('v2_server_url') ?? 'http://217.216.39.164:4000';
    final deviceId = prefs.getString('v2_device_id') ?? '';
    final merchantId = prefs.getString('v2_merchant_id') ?? '';
    final businessName = prefs.getString('v2_business_name') ?? '';
    final plan = prefs.getString('v2_plan') ?? 'starter';

    if (deviceToken != null && deviceToken.isNotEmpty && licenseKey != null) {
      _cachedSession = DeviceSessionModel(
        serverUrl: serverUrl,
        licenseKey: licenseKey,
        deviceId: deviceId,
        deviceToken: deviceToken,
        merchantId: merchantId,
        businessName: businessName,
        plan: plan,
        isPaired: true,
      );
    } else {
      _cachedSession = DeviceSessionModel.unpaired();
    }

    return _cachedSession!;
  }

  /// Register device with backend via License Key
  Future<Map<String, dynamic>> registerDevice({
    required String serverUrl,
    required String licenseKey,
    String? deviceName,
    String? model,
    String? androidVersion,
  }) async {
    final cleanUrl = serverUrl.replaceAll(RegExp(r'/+$'), '');
    final endpoint = Uri.parse('$cleanUrl/api/v1/devices/register');

    try {
      final nativeInfo = await getNativeDeviceInfo();
      final realModel = model ?? nativeInfo['model'] ?? 'Android Phone';
      final realVersion = androidVersion ?? nativeInfo['androidVersion'] ?? 'Android';
      final realBat = nativeInfo['batteryLevel'] ?? 100;
      final fingerprint = nativeInfo['fingerprint'] ?? '';
      final resolvedName = (deviceName != null && deviceName.trim().isNotEmpty)
          ? deviceName.trim()
          : realModel;

      final response = await http.post(
        endpoint,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'licenseKey': licenseKey.trim().toUpperCase(),
          'deviceName': resolvedName,
          'model': realModel,
          'androidVersion': realVersion,
          'batteryLevel': realBat,
          'fingerprint': fingerprint,
        }),
      ).timeout(const Duration(seconds: 15));

      final body = jsonDecode(response.body);

      if ((response.statusCode == 200 || response.statusCode == 201) && body['success'] == true) {
        final data = body['data'];
        final prefs = await SharedPreferences.getInstance();

        await prefs.setString('v2_server_url', cleanUrl);
        await prefs.setString('v2_license_key', licenseKey.trim().toUpperCase());
        await _secureStorage.write(key: 'v2_device_token', value: data['deviceToken'] ?? '');
        await prefs.remove('v2_device_token'); // Strict rule: No plaintext tokens in SharedPreferences
        await prefs.setString('v2_device_id', data['deviceId'] ?? '');
        await prefs.setString('v2_merchant_id', data['merchantId'] ?? '');
        await prefs.setString('v2_business_name', data['businessName'] ?? '');
        await prefs.setString('v2_plan', data['plan'] ?? 'starter');

        _cachedSession = DeviceSessionModel(
          serverUrl: cleanUrl,
          licenseKey: licenseKey.trim().toUpperCase(),
          deviceId: data['deviceId'] ?? '',
          deviceToken: data['deviceToken'] ?? '',
          merchantId: data['merchantId'] ?? '',
          businessName: data['businessName'] ?? '',
          plan: data['plan'] ?? 'starter',
          isPaired: true,
        );

        return {
          'success': true,
          'message': body['message'] ?? 'Device registered successfully.',
          'session': _cachedSession,
        };
      } else {
        return {
          'success': false,
          'message': body['message'] ?? 'Device activation failed (${response.statusCode})',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Could not connect to server ($cleanUrl): $e',
      };
    }
  }

  /// Sends periodic heartbeat to backend with real battery level
  Future<bool> sendHeartbeat({
    int? batteryLevel,
    bool isCharging = false,
    String networkType = 'wifi',
  }) async {
    final session = await loadSession();
    if (!session.isPaired) return false;

    final nativeInfo = await getNativeDeviceInfo();
    final actualBat = batteryLevel ?? nativeInfo['batteryLevel'] ?? 100;

    final endpoint = Uri.parse('${session.serverUrl}/api/v1/devices/heartbeat');

    try {
      final response = await http.post(
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': session.deviceToken,
        },
        body: jsonEncode({
          'batteryLevel': actualBat,
          'isCharging': isCharging,
          'networkType': networkType,
        }),
      ).timeout(const Duration(seconds: 10));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Explicitly marks device as offline upon app exit or closing
  Future<bool> sendOfflineNotification() async {
    final session = await loadSession();
    if (!session.isPaired) return false;

    final endpoint = Uri.parse('${session.serverUrl}/api/v1/devices/offline');

    try {
      final response = await http.post(
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': session.deviceToken,
        },
        body: jsonEncode({
          'reason': 'app_closed',
          'timestamp': DateTime.now().toIso8601String(),
        }),
      ).timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Batch syncs parsed payments to v2 backend
  Future<Map<String, dynamic>> syncPayments(List<PaymentModel> payments) async {
    final session = await loadSession();
    if (!session.isPaired) {
      return {'success': false, 'message': 'Device is not paired.'};
    }

    final endpoint = Uri.parse('${session.serverUrl}/api/v1/devices/sync');

    final payloadList = payments.map((p) => {
      'trxId': p.trxId,
      'service': p.service,
      'sender': p.sender,
      'amount': p.amount,
      'reference': p.reference,
      'rawSms': p.rawMessage,
      'detectionSource': 'hybrid_sms',
      'timestamp': p.timestamp.toIso8601String(),
    }).toList();

    try {
      final response = await http.post(
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': session.deviceToken,
        },
        body: jsonEncode({'payments': payloadList}),
      ).timeout(const Duration(seconds: 15));

      final body = jsonDecode(response.body);

      if (response.statusCode == 200 && body['success'] == true) {
        return {
          'success': true,
          'syncedCount': body['data']?['syncedCount'] ?? 0,
          'syncedTrxIds': body['data']?['syncedTrxIds'] ?? [],
          'duplicates': body['data']?['duplicates'] ?? [],
        };
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        return {
          'success': false,
          'isRevoked': true,
          'message': body['message'] ?? 'Device or merchant access has been revoked.',
        };
      } else {
        return {
          'success': false,
          'message': body['message'] ?? 'Sync failed (${response.statusCode})',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Server connection failed: $e',
      };
    }
  }

  /// Test network connectivity to the VPS server
  Future<bool> pingServer([String? customUrl]) async {
    try {
      final session = await loadSession();
      final target = customUrl ?? session.serverUrl;
      final endpoint = Uri.parse('${target.replaceAll(RegExp(r'/+$'), '')}/health');
      final res = await http.get(endpoint).timeout(const Duration(seconds: 5));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// High-level method: pulls pending payments from local SQLite and syncs to VPS server
  Future<int> syncPendingOfflineQueue() async {
    final session = await loadSession();
    if (!session.isPaired) return 0;

    final pending = await DatabaseHelper.instance.getPendingPayments();
    if (pending.isEmpty) return 0;

    final res = await syncPayments(pending);
    int count = 0;
    if (res['success'] == true) {
      count = res['syncedCount'] ?? 0;
      final syncedIds = List<String>.from(res['syncedTrxIds'] ?? []);
      final dupIds = List<String>.from(res['duplicates'] ?? []);
      for (final trxId in [...syncedIds, ...dupIds]) {
        await DatabaseHelper.instance.markPaymentSynced(trxId);
      }
    } else if (res['isRevoked'] == true) {
      await unpairDevice();
    }
    return count;
  }

  /// Check server for app updates
  Future<AppUpdateInfo?> checkAppUpdate([int currentVersionCode = 4, String currentVersionName = '2.2.0.0.1']) async {
    try {
      final session = await loadSession();
      final cleanUrl = session.serverUrl.replaceAll(RegExp(r'/+$'), '');
      final endpoint = Uri.parse('$cleanUrl/api/v1/devices/check-update?version_code=$currentVersionCode&version_name=$currentVersionName');

      final response = await http.get(endpoint).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true && body['data'] != null) {
          return AppUpdateInfo.fromJson(Map<String, dynamic>.from(body['data']));
        }
      }
    } catch (e) {
      print('Check update error: $e');
    }
    return null;
  }

  /// Unpair and reset device locally
  Future<void> unpairDevice() async {
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.delete(key: 'v2_device_token');
    await prefs.remove('v2_device_token');
    await prefs.remove('v2_license_key');
    await prefs.remove('v2_device_id');
    await prefs.remove('v2_merchant_id');
    await prefs.remove('v2_business_name');
    await prefs.remove('v2_plan');

    _cachedSession = DeviceSessionModel.unpaired();
  }
}
