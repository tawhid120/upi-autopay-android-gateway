class AppUpdateInfo {
  final bool hasUpdate;
  final String versionName;
  final int versionCode;
  final String downloadUrl;
  final String changelog;
  final bool isForceUpdate;
  final DateTime? releaseDate;

  const AppUpdateInfo({
    required this.hasUpdate,
    required this.versionName,
    required this.versionCode,
    required this.downloadUrl,
    required this.changelog,
    required this.isForceUpdate,
    this.releaseDate,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      hasUpdate: json['hasUpdate'] == true,
      versionName: (json['latestVersionName'] ?? json['versionName'] ?? '').toString(),
      versionCode: (json['latestVersionCode'] ?? json['versionCode'] ?? 0) as int,
      downloadUrl: (json['downloadUrl'] ?? '').toString(),
      changelog: (json['changelog'] ?? '').toString(),
      isForceUpdate: json['isForceUpdate'] == true,
      releaseDate: json['releaseDate'] != null ? DateTime.tryParse(json['releaseDate'].toString()) : null,
    );
  }
}
