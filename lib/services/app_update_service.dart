import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../models/app_update_info.dart';
import 'backend_api_service.dart';

class AppUpdateService {
  static final AppUpdateService instance = AppUpdateService._internal();
  AppUpdateService._internal();

  static const int currentVersionCode = 5;
  static const String currentVersionName = '2.3.0.0.1';

  static const MethodChannel _nativeChannel = MethodChannel('com.payverify.bd/sms');

  bool _isDownloading = false;
  bool get isDownloading => _isDownloading;

  /// Check backend for available updates
  Future<AppUpdateInfo?> checkUpdate() async {
    return await BackendApiService.instance.checkAppUpdate(currentVersionCode, currentVersionName);
  }

  /// Get the target local APK file path for a version code
  Future<File> getLocalApkFile(int targetVersionCode) async {
    final tempDir = await getTemporaryDirectory();
    return File('${tempDir.path}/payviro_update_$targetVersionCode.apk');
  }

  /// Check if the APK file has already been fully downloaded
  Future<bool> isApkAlreadyDownloaded(int targetVersionCode) async {
    try {
      final file = await getLocalApkFile(targetVersionCode);
      if (await file.exists()) {
        final length = await file.length();
        // Completed release APK must be at least 1MB
        return length > 1024 * 1024;
      }
    } catch (_) {}
    return false;
  }

  /// Delete partially or completely downloaded APK if user requests re-download
  Future<void> clearDownloadedApk(int targetVersionCode) async {
    try {
      final file = await getLocalApkFile(targetVersionCode);
      if (await file.exists()) {
        await file.delete();
      }
      final tempFile = File('${file.path}.tmp');
      if (await tempFile.exists()) {
        await tempFile.delete();
      }
    } catch (_) {}
  }

  /// Download APK with stream progress
  Stream<double> downloadApkStream(AppUpdateInfo info) async* {
    if (_isDownloading) {
      throw Exception('Another download is already in progress.');
    }

    _isDownloading = true;

    final targetFile = await getLocalApkFile(info.versionCode);
    final tempFile = File('${targetFile.path}.tmp');

    // Remove any leftover partial download
    if (await tempFile.exists()) {
      await tempFile.delete();
    }

    final client = http.Client();
    try {
      final request = http.Request('GET', Uri.parse(info.downloadUrl));
      final response = await client.send(request);

      if (response.statusCode >= 400) {
        throw Exception('Download failed with HTTP status ${response.statusCode}');
      }

      final contentLength = response.contentLength ?? 0;
      int receivedBytes = 0;

      final sink = tempFile.openWrite();

      await for (final chunk in response.stream) {
        sink.add(chunk);
        receivedBytes += chunk.length;

        if (contentLength > 0) {
          final progress = receivedBytes / contentLength;
          yield progress.clamp(0.0, 1.0);
        } else {
          // Indeterminate progress representation
          yield -1.0;
        }
      }

      await sink.flush();
      await sink.close();

      // Rename temp file to final apk file on successful complete download
      if (await targetFile.exists()) {
        await targetFile.delete();
      }
      await tempFile.rename(targetFile.path);

      yield 1.0;
    } finally {
      client.close();
      _isDownloading = false;
    }
  }

  /// Trigger Android system Package Installer for the downloaded APK
  Future<bool> triggerInstallation(int targetVersionCode) async {
    try {
      final file = await getLocalApkFile(targetVersionCode);
      if (!await file.exists() || (await file.length()) < 1024 * 1024) {
        throw Exception('APK file is not downloaded or incomplete.');
      }

      // Check Android 8.0+ Unknown App Sources permission
      final canInstall = await _nativeChannel.invokeMethod<bool>('canRequestPackageInstalls') ?? true;
      if (!canInstall) {
        await _nativeChannel.invokeMethod('openInstallPermissionSettings');
        // Give the user a moment, then invoke installer
      }

      final result = await _nativeChannel.invokeMethod<bool>('installApk', {
        'filePath': file.path,
      });

      return result == true;
    } on PlatformException catch (e) {
      print('Install APK PlatformException: ${e.message}');
      rethrow;
    } catch (e) {
      print('Install APK error: $e');
      rethrow;
    }
  }
}
