class DeviceSessionModel {
  final String serverUrl;
  final String licenseKey;
  final String deviceId;
  final String deviceToken;
  final String merchantId;
  final String businessName;
  final String plan;
  final bool isPaired;
  final DateTime? lastSyncAt;

  DeviceSessionModel({
    required this.serverUrl,
    required this.licenseKey,
    required this.deviceId,
    required this.deviceToken,
    required this.merchantId,
    required this.businessName,
    required this.plan,
    this.isPaired = true,
    this.lastSyncAt,
  });

  factory DeviceSessionModel.unpaired() {
    return DeviceSessionModel(
      serverUrl: 'http://217.216.39.164:4000',
      licenseKey: '',
      deviceId: '',
      deviceToken: '',
      merchantId: '',
      businessName: '',
      plan: 'none',
      isPaired: false,
    );
  }

  DeviceSessionModel copyWith({
    String? serverUrl,
    String? licenseKey,
    String? deviceId,
    String? deviceToken,
    String? merchantId,
    String? businessName,
    String? plan,
    bool? isPaired,
    DateTime? lastSyncAt,
  }) {
    return DeviceSessionModel(
      serverUrl: serverUrl ?? this.serverUrl,
      licenseKey: licenseKey ?? this.licenseKey,
      deviceId: deviceId ?? this.deviceId,
      deviceToken: deviceToken ?? this.deviceToken,
      merchantId: merchantId ?? this.merchantId,
      businessName: businessName ?? this.businessName,
      plan: plan ?? this.plan,
      isPaired: isPaired ?? this.isPaired,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
    );
  }
}
