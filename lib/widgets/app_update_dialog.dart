import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/app_update_info.dart';
import '../services/app_update_service.dart';
import '../utils/app_design.dart';
import 'liquid_glass.dart';

class AppUpdateDialog extends StatefulWidget {
  final AppUpdateInfo updateInfo;

  const AppUpdateDialog({
    super.key,
    required this.updateInfo,
  });

  /// Static helper to display the update dialog
  static Future<void> show(BuildContext context, AppUpdateInfo updateInfo) {
    return showDialog(
      context: context,
      barrierDismissible: !updateInfo.isForceUpdate,
      builder: (ctx) => PopScope(
        canPop: !updateInfo.isForceUpdate,
        child: AppUpdateDialog(updateInfo: updateInfo),
      ),
    );
  }

  @override
  State<AppUpdateDialog> createState() => _AppUpdateDialogState();
}

class _AppUpdateDialogState extends State<AppUpdateDialog> {
  bool _isCheckingLocal = true;
  bool _isAlreadyDownloaded = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String? _errorMessage;
  String? _statusText;
  StreamSubscription<double>? _downloadSubscription;

  @override
  void initState() {
    super.initState();
    _checkLocalFile();
  }

  @override
  void dispose() {
    _downloadSubscription?.cancel();
    super.dispose();
  }

  Future<void> _checkLocalFile() async {
    setState(() {
      _isCheckingLocal = true;
      _errorMessage = null;
    });

    final exists = await AppUpdateService.instance.isApkAlreadyDownloaded(widget.updateInfo.versionCode);

    if (!mounted) return;
    setState(() {
      _isAlreadyDownloaded = exists;
      _isCheckingLocal = false;
      if (exists) {
        _statusText = 'File was previously downloaded and ready in local storage.';
      }
    });
  }

  Future<void> _handleInstall() async {
    HapticFeedback.mediumImpact();
    setState(() {
      _errorMessage = null;
      _statusText = 'Launching package installer...';
    });

    try {
      final success = await AppUpdateService.instance.triggerInstallation(widget.updateInfo.versionCode);
      if (!mounted) return;

      if (success) {
        setState(() {
          _statusText = 'Installation process initiated.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Could not launch installer: $e';
        _statusText = null;
      });
    }
  }

  Future<void> _startDownload({bool isRedownload = false}) async {
    HapticFeedback.selectionClick();
    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _errorMessage = null;
      _statusText = isRedownload
          ? 'Clearing previous file and starting fresh download...'
          : 'Downloading new version...';
    });

    try {
      if (isRedownload) {
        await AppUpdateService.instance.clearDownloadedApk(widget.updateInfo.versionCode);
      }

      await _downloadSubscription?.cancel();
      _downloadSubscription = AppUpdateService.instance.downloadApkStream(widget.updateInfo).listen(
        (progress) {
          if (!mounted) return;
          setState(() {
            _downloadProgress = progress;
            if (progress >= 0) {
              _statusText = 'Downloading ${(progress * 100).toStringAsFixed(0)}%';
            } else {
              _statusText = 'Download in progress, please wait...';
            }
          });
        },
        onError: (err) {
          if (!mounted) return;
          setState(() {
            _isDownloading = false;
            _errorMessage = 'Download failed: $err';
            _statusText = null;
          });
        },
        onDone: () async {
          if (!mounted) return;
          setState(() {
            _isDownloading = false;
            _isAlreadyDownloaded = true;
            _downloadProgress = 1.0;
            _statusText = 'Download completed successfully!';
          });

          // Automatically trigger package installation after successful download
          await _handleInstall();
        },
        cancelOnError: true,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isDownloading = false;
        _errorMessage = 'Failed to start download: $e';
        _statusText = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final info = widget.updateInfo;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: LiquidGlassContainer(
        constraints: const BoxConstraints(maxWidth: 400),
        borderRadius: BorderRadius.circular(24),
        tintColor: colors.surface,
        borderColor: info.isForceUpdate
            ? AppDesign.statusError.withValues(alpha: 0.5)
            : AppDesign.accentBlue.withValues(alpha: 0.3),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: info.isForceUpdate
                        ? AppDesign.statusErrorBg
                        : AppDesign.accentBlue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: info.isForceUpdate
                          ? AppDesign.statusError.withValues(alpha: 0.4)
                          : AppDesign.accentBlue.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    info.isForceUpdate ? 'CRITICAL SYSTEM UPDATE' : 'NEW VERSION UPDATE',
                    style: TextStyle(
                      color: info.isForceUpdate ? AppDesign.statusError : AppDesign.accentBlue,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: colors.surfaceElevated,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: colors.border),
                  ),
                  child: Text(
                    'v${info.versionName}',
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Title
            Text(
              'System Upgrade Ready',
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 6),

            // Versions comparison pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: colors.surfaceElevated,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: colors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Current: v${AppUpdateService.currentVersionName}',
                    style: TextStyle(
                      color: colors.textTertiary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    'New: v${info.versionName}',
                    style: const TextStyle(
                      color: AppDesign.statusSuccess,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Changelog Box
            if (info.changelog.trim().isNotEmpty) ...[
              Text(
                'What\'s New in this Release:',
                style: TextStyle(
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                constraints: const BoxConstraints(maxHeight: 120),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.border),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    info.changelog,
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontSize: 13,
                      height: 1.45,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Local File Saved / Ready Indicator
            if (!_isCheckingLocal && _isAlreadyDownloaded && !_isDownloading)
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppDesign.statusSuccessBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppDesign.statusSuccess.withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'File Already Downloaded',
                      style: TextStyle(
                        color: AppDesign.statusSuccess,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'No need to re-download. Tap below to install directly.',
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),

            // Download Progress Indicator
            if (_isDownloading) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Download Progress',
                          style: TextStyle(
                            color: colors.textSecondary,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          _downloadProgress >= 0
                              ? '${(_downloadProgress * 100).toStringAsFixed(0)}%'
                              : 'Processing...',
                          style: const TextStyle(
                            color: AppDesign.accentCyan,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: _downloadProgress >= 0
                          ? LinearProgressIndicator(
                              value: _downloadProgress,
                              backgroundColor: colors.border,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppDesign.accentBlue),
                              minHeight: 6,
                            )
                          : LinearProgressIndicator(
                              backgroundColor: colors.border,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppDesign.accentBlue),
                              minHeight: 6,
                            ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Status or Error Message
            if (_statusText != null && !_isDownloading)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  _statusText!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppDesign.statusSuccess,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppDesign.statusErrorBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppDesign.statusError.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(
                    color: AppDesign.statusError,
                    fontSize: 11,
                    height: 1.3,
                  ),
                ),
              ),

            // Action Buttons
            if (_isCheckingLocal)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Checking storage...',
                    style: TextStyle(color: colors.textTertiary, fontSize: 13),
                  ),
                ),
              )
            else if (_isDownloading)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: colors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  'Downloading, please wait...',
                  style: TextStyle(
                    color: colors.textTertiary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              )
            else if (_isAlreadyDownloaded) ...[
              // Direct Install Button (Hybrid primary action with Liquid Glass)
              LiquidGlassButton(
                onPressed: _handleInstall,
                height: 48,
                borderRadius: BorderRadius.circular(12),
                backgroundColor: AppDesign.statusSuccess,
                child: const Text(
                  'Install Now',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              // Re-download option in case cached file was corrupt or interrupted
              SizedBox(
                height: 40,
                child: OutlinedButton(
                  onPressed: () => _startDownload(isRedownload: true),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: colors.textSecondary,
                    side: BorderSide(color: colors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text(
                    'Re-download APK',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ] else ...[
              // Download Button (Liquid Glass Button)
              LiquidGlassButton(
                onPressed: () => _startDownload(isRedownload: false),
                height: 48,
                borderRadius: BorderRadius.circular(12),
                backgroundColor: AppDesign.accentBlue,
                child: const Text(
                  'Download Upgrade',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],

            // Close / Later Button (if not forced and not downloading)
            if (!info.isForceUpdate && !_isDownloading) ...[
              const SizedBox(height: 6),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(
                  'Later',
                  style: TextStyle(
                    color: colors.textTertiary,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
