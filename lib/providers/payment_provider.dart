import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/device_session_model.dart';
import '../models/payment_model.dart';
import '../models/sms_model.dart';
import '../services/backend_api_service.dart';
import '../services/background_service.dart';
import '../services/connectivity_service.dart';
import '../services/database_helper.dart';
import '../services/sms_parser_service.dart';
import '../services/sms_reader_service.dart';
import '../services/webhook_service.dart';

class PaymentProvider extends ChangeNotifier {
  static const MethodChannel _nativeChannel = MethodChannel('com.payverify.bd/sms');
  final SmsReaderService _smsReader = SmsReaderService();

  List<PaymentModel> _payments = [];
  List<SmsModel> _allSms = [];
  Map<String, dynamic> _stats = {
    'totalCount': 0,
    'totalAmount': 0.0,
    'syncedCount': 0,
    'pendingCount': 0,
    'phonepeAmount': 0.0,
    'gpayAmount': 0.0,
    'paytmAmount': 0.0,
    'fampayAmount': 0.0,
    'bhimAmount': 0.0,
    'bankAmount': 0.0,
    'bkashAmount': 0.0,
    'nagadAmount': 0.0,
    'rocketAmount': 0.0,
  };

  DeviceSessionModel _deviceSession = DeviceSessionModel.unpaired();
  bool _isScanning = false;
  bool _isSyncing = false;
  bool _isOnline = false;
  bool _isBackgroundRunning = false;
  bool _hasSmsPermission = false;
  bool _isNotificationListenerEnabled = false;
  String _selectedFilter = 'All';
  SyncStatus? _selectedStatusFilter;

  // Getters
  List<PaymentModel> get payments => _payments;
  List<SmsModel> get allSms => _allSms;
  Map<String, dynamic> get stats => _stats;
  DeviceSessionModel get deviceSession => _deviceSession;
  bool get isPaired => _deviceSession.isPaired;
  bool get isScanning => _isScanning;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _isOnline;
  bool get isBackgroundRunning => _isBackgroundRunning;
  bool get hasSmsPermission => _hasSmsPermission;
  bool get isNotificationListenerEnabled => _isNotificationListenerEnabled;
  bool get isAnyTrackingActive => _hasSmsPermission || _isNotificationListenerEnabled;
  bool get isHybridActive => _hasSmsPermission && _isNotificationListenerEnabled;
  String get selectedFilter => _selectedFilter;
  SyncStatus? get selectedStatusFilter => _selectedStatusFilter;

  /// Initializes the provider, loads device session and database
  Future<void> initialize() async {
    _deviceSession = await BackendApiService.instance.loadSession();
    _hasSmsPermission = await _smsReader.hasPermission();
    _isBackgroundRunning = await AppBackgroundService.isRunning();

    // Check Notification Listener Status
    await checkNotificationListenerStatus();

    // Handle real-time incoming SMS/Notification from Android native listener
    _nativeChannel.setMethodCallHandler((call) async {
      if (call.method == 'onPaymentReceived') {
        final sender = call.arguments['sender']?.toString() ?? '';
        final body = call.arguments['body']?.toString() ?? '';
        final payment = SmsParserService.parseSms(sender, body);
        if (payment != null) {
          final id = await DatabaseHelper.instance.insertPayment(payment);
          if (id != null) {
            await refreshData();
            // Instantly send to UPI Webhook
            await WebhookService.instance.sendPayment(payment.copyWith(id: id));
            await refreshData();
            if (_isOnline) {
              await syncPending();
            }
          }
        }
      }
    });

    // Listen to background service events
    FlutterBackgroundService().on('onNewPayment').listen((event) {
      refreshData();
    });

    // Initialize network listener
    await ConnectivityService.instance.initialize(
      onAutoSynced: (count) {
        refreshData();
      },
    );
    _isOnline = ConnectivityService.instance.isOnline;
    ConnectivityService.instance.onConnectivityChanged.listen((online) {
      _isOnline = online;
      notifyListeners();
    });

    await refreshData();

    // Auto-scan on startup if permission is granted
    if (_hasSmsPermission) {
      await scanSms(limit: 150);
    }

    // Periodic heartbeat with real battery and connectivity to VPS (15s live telemetry)
    if (_deviceSession.isPaired) {
      BackendApiService.instance.sendHeartbeat();
    }
    Timer.periodic(const Duration(seconds: 15), (timer) async {
      if (_deviceSession.isPaired) {
        await BackendApiService.instance.sendHeartbeat();
      }
    });
  }

  /// Notify server that app is going offline
  Future<void> notifyAppExit() async {
    if (_deviceSession.isPaired) {
      await BackendApiService.instance.sendOfflineNotification();
    }
  }

  /// Refresh permissions state
  Future<void> refreshPermissions() async {
    _hasSmsPermission = await _smsReader.hasPermission();
    await checkNotificationListenerStatus();
    notifyListeners();
  }

  /// Request SMS and notification permissions
  Future<bool> requestPermissions() async {
    final granted = await _smsReader.requestPermissions();
    _hasSmsPermission = granted;
    await checkNotificationListenerStatus();
    if (granted) {
      await scanSms();
    }
    notifyListeners();
    return granted;
  }

  /// Checks if Notification Listener Service is granted
  Future<bool> checkNotificationListenerStatus() async {
    try {
      final bool? enabled = await _nativeChannel.invokeMethod('isNotificationListenerEnabled');
      _isNotificationListenerEnabled = enabled ?? false;
      notifyListeners();
      return _isNotificationListenerEnabled;
    } catch (_) {
      return false;
    }
  }

  /// Opens Android's Notification Access Settings screen
  Future<void> openNotificationListenerSettings() async {
    try {
      await _nativeChannel.invokeMethod('openNotificationListenerSettings');
    } catch (_) {}
  }

  /// Opens Android's App Info settings
  Future<void> openAppInfoSettings() async {
    try {
      await _nativeChannel.invokeMethod('openAppInfoSettings');
    } catch (_) {
      await openAppSettings();
    }
  }

  /// Re-checks all permissions and automatically scans when user returns to app
  Future<void> checkAllPermissionsAndRefresh() async {
    final smsPerm = await _smsReader.hasPermission();
    final notifPerm = await checkNotificationListenerStatus();
    _hasSmsPermission = smsPerm;
    _isNotificationListenerEnabled = notifPerm;
    notifyListeners();

    if (_hasSmsPermission) {
      await scanSms(limit: 100);
    } else {
      await refreshData();
    }
  }

  /// Refreshes payments list and stats from SQLite database
  Future<void> refreshData() async {
    _payments = await DatabaseHelper.instance.getAllPayments(
      serviceFilter: _selectedFilter,
      statusFilter: _selectedStatusFilter,
    );
    _stats = await DatabaseHelper.instance.getStatistics();
    notifyListeners();
  }

  /// Scans phone SMS inbox for new payments and loads raw SMS list
  Future<int> scanSms({int limit = 200}) async {
    if (_isScanning) return 0;
    _isScanning = true;
    notifyListeners();

    try {
      // 1. Fetch raw messages so user can see them in "All SMS" tab
      _allSms = await _smsReader.getAllInboxSms(limit: 100);

      // 2. Parse and save new payments
      final newPayments = await _smsReader.scanAndSavePaymentSms(limit: limit);

      // Send any newly parsed payments to webhook immediately
      for (final p in newPayments) {
        await WebhookService.instance.sendPayment(p);
      }

      // 3. Refresh database state
      await refreshData();

      // 4. Auto-sync if internet is available
      if (_isOnline && newPayments.isNotEmpty) {
        await syncPending();
      }

      _isScanning = false;
      notifyListeners();
      return newPayments.length;
    } catch (e) {
      print("Error in scanSms: $e");
      _isScanning = false;
      notifyListeners();
      return 0;
    }
  }

  /// Pair device with backend using license key
  Future<Map<String, dynamic>> pairDeviceWithLicense({
    required String serverUrl,
    required String licenseKey,
    String? deviceName,
  }) async {
    final result = await BackendApiService.instance.registerDevice(
      serverUrl: serverUrl,
      licenseKey: licenseKey,
      deviceName: deviceName,
    );
    if (result['success'] == true) {
      _deviceSession = result['session'] as DeviceSessionModel;
      notifyListeners();
      if (_isOnline) {
        await syncPending();
      }
    }
    return result;
  }

  /// Unpair and reset device locally
  Future<void> unpairDevice() async {
    await BackendApiService.instance.unpairDevice();
    _deviceSession = DeviceSessionModel.unpaired();
    notifyListeners();
  }

  /// Syncs all unsynced payments to Webhook and VPS Server Database
  Future<int> syncPending() async {
    if (_isSyncing) return 0;

    _isSyncing = true;
    notifyListeners();

    int syncedCount = 0;

    try {
      // 1. Sync pending payments to UPI Webhook (Cheapbot)
      final webhookSynced = await WebhookService.instance.syncAllPending();
      syncedCount += webhookSynced;

      // 2. Sync to VPS server if paired
      if (_deviceSession.isPaired) {
        final vpsSynced = await BackendApiService.instance.syncPendingOfflineQueue();
        syncedCount += vpsSynced;
      }

      await refreshData();
    } catch (e) {
      print("Error in syncPending: $e");
    } finally {
      _isSyncing = false;
      notifyListeners();
    }

    return syncedCount;
  }

  /// Changes service filter (All, bKash, Nagad, Rocket, Upay)
  void setFilter(String filter) {
    _selectedFilter = filter;
    refreshData();
  }

  /// Changes status filter (All, Synced, Pending, Failed)
  void setStatusFilter(SyncStatus? status) {
    _selectedStatusFilter = status;
    refreshData();
  }

  /// Toggles the background execution service
  Future<void> toggleBackgroundService() async {
    final running = await AppBackgroundService.isRunning();
    if (running) {
      AppBackgroundService.stop();
      _isBackgroundRunning = false;
    } else {
      AppBackgroundService.start();
      _isBackgroundRunning = true;
    }
    notifyListeners();
  }

  /// Inserts a mock payment for testing and simulation
  Future<void> simulatePayment(PaymentModel payment) async {
    final id = await DatabaseHelper.instance.insertPayment(payment);
    if (id != null) {
      await refreshData();
      if (_isOnline) {
        await syncPending();
      }
    }
  }

  /// Clears local database (useful for resetting data)
  Future<void> clearAllData() async {
    await DatabaseHelper.instance.clearAll();
    await refreshData();
  }
}
