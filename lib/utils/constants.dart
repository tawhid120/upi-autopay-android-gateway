class AppConstants {
  static const String appName = 'Payviro UPI';
  static const String appVersion = '2.3.0';

  // Database
  static const String dbName = 'payviro_upi.db';
  static const String tableName = 'upi_payments';

  // Indian UPI & Banking Providers
  static const String providerPhonePe = 'PhonePe';
  static const String providerGooglePay = 'Google Pay';
  static const String providerPaytm = 'Paytm';
  static const String providerBhim = 'BHIM';
  static const String providerCred = 'CRED';
  static const String providerFamPay = 'FamPay';
  static const String providerAmazonPay = 'Amazon Pay';
  static const String providerBank = 'Bank UPI';

  // Currency
  static const String currencySymbol = '₹';
  static const String currencyCode = 'INR';

  // Default Webhook
  static const String defaultWebhookUrl = 'http://38.127.8.169:8888/api/upi/webhook';
  static const String defaultWebhookSecret = 'mvpay_secret_2026';

  // Notification Channel
  static const String notificationChannelId = 'payviro_upi_foreground';
  static const String notificationChannelName = 'Payviro UPI Gateway Service';
}
