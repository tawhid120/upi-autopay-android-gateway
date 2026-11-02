import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'backend_api_service.dart';

class ConnectivityService {
  static final ConnectivityService instance = ConnectivityService._init();
  ConnectivityService._init();

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _isOnline = false;

  final _statusController = StreamController<bool>.broadcast();
  Stream<bool> get onConnectivityChanged => _statusController.stream;
  bool get isOnline => _isOnline;

  Future<void> initialize({Function(int syncedCount)? onAutoSynced}) async {
    // Initial check
    final results = await _connectivity.checkConnectivity();
    _updateOnlineStatus(results);

    // Listen for changes
    _subscription = _connectivity.onConnectivityChanged.listen((results) async {
      final wasOffline = !_isOnline;
      _updateOnlineStatus(results);

      // If just came back online, automatically trigger offline payment sync to VPS server!
      if (wasOffline && _isOnline) {
        print("Internet connection restored. Triggering auto-sync to VPS backend...");
        final synced = await BackendApiService.instance.syncPendingOfflineQueue();
        if (synced > 0 && onAutoSynced != null) {
          onAutoSynced(synced);
        }
      }
    });
  }

  void _updateOnlineStatus(List<ConnectivityResult> results) {
    _isOnline = results.any((r) => r != ConnectivityResult.none);
    _statusController.add(_isOnline);
  }

  void dispose() {
    _subscription?.cancel();
    _statusController.close();
  }
}
