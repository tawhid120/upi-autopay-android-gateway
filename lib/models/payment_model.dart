enum SyncStatus {
  pending,
  synced,
  failed;

  int toInt() {
    switch (this) {
      case SyncStatus.pending:
        return 0;
      case SyncStatus.synced:
        return 1;
      case SyncStatus.failed:
        return 2;
    }
  }

  static SyncStatus fromInt(int value) {
    switch (value) {
      case 1:
        return SyncStatus.synced;
      case 2:
        return SyncStatus.failed;
      case 0:
      default:
        return SyncStatus.pending;
    }
  }
}

class PaymentModel {
  final int? id;
  final String trxId;
  final String service; // bKash, Nagad, Rocket, Upay
  final String sender;  // Phone number
  final double amount;
  final String? reference;
  final DateTime timestamp;
  final String rawMessage;
  final String paymentType; // received, payment, cash_in
  final SyncStatus syncStatus;
  final String? syncError;
  final DateTime? syncedAt;

  PaymentModel({
    this.id,
    required this.trxId,
    required this.service,
    required this.sender,
    required this.amount,
    this.reference,
    required this.timestamp,
    required this.rawMessage,
    this.paymentType = 'received',
    this.syncStatus = SyncStatus.pending,
    this.syncError,
    this.syncedAt,
  });

  PaymentModel copyWith({
    int? id,
    String? trxId,
    String? service,
    String? sender,
    double? amount,
    String? reference,
    DateTime? timestamp,
    String? rawMessage,
    String? paymentType,
    SyncStatus? syncStatus,
    String? syncError,
    DateTime? syncedAt,
  }) {
    return PaymentModel(
      id: id ?? this.id,
      trxId: trxId ?? this.trxId,
      service: service ?? this.service,
      sender: sender ?? this.sender,
      amount: amount ?? this.amount,
      reference: reference ?? this.reference,
      timestamp: timestamp ?? this.timestamp,
      rawMessage: rawMessage ?? this.rawMessage,
      paymentType: paymentType ?? this.paymentType,
      syncStatus: syncStatus ?? this.syncStatus,
      syncError: syncError ?? this.syncError,
      syncedAt: syncedAt ?? this.syncedAt,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'trx_id': trxId,
      'service': service,
      'sender': sender,
      'amount': amount,
      'reference': reference ?? '',
      'timestamp': timestamp.millisecondsSinceEpoch,
      'date_time_str': timestamp.toIso8601String(),
      'raw_message': rawMessage,
      'payment_type': paymentType,
      'sync_status': syncStatus.toInt(),
      'sync_error': syncError ?? '',
      'synced_at': syncedAt?.toIso8601String() ?? '',
    };
  }

  factory PaymentModel.fromMap(Map<String, dynamic> map) {
    return PaymentModel(
      id: map['id'] as int?,
      trxId: map['trx_id'] as String? ?? '',
      service: map['service'] as String? ?? 'Unknown',
      sender: map['sender'] as String? ?? '',
      amount: (map['amount'] is num) ? (map['amount'] as num).toDouble() : 0.0,
      reference: map['reference'] as String?,
      timestamp: map['timestamp'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['timestamp'] as int)
          : DateTime.now(),
      rawMessage: map['raw_message'] as String? ?? '',
      paymentType: map['payment_type'] as String? ?? 'received',
      syncStatus: SyncStatus.fromInt(map['sync_status'] as int? ?? 0),
      syncError: map['sync_error'] as String?,
      syncedAt: (map['synced_at'] != null && (map['synced_at'] as String).isNotEmpty)
          ? DateTime.tryParse(map['synced_at'] as String)
          : null,
    );
  }

  /// Converts this model into a standardized Webhook JSON structure for bot/server
  Map<String, dynamic> toWebhookJson({String secret = 'mvpay_secret_2026'}) {
    return {
      'amount': amount,
      'utr': trxId,
      'trx_id': trxId,
      'package_name': service,
      'provider': service,
      'sender': sender,
      'reference': reference ?? '',
      'content': rawMessage,
      'raw_message': rawMessage,
      'payment_type': paymentType,
      'secret': secret,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  /// Converts this model into a Firestore document structure
  /// Compatible with Firestore REST API
  Map<String, dynamic> toFirestoreFields() {
    return {
      'fields': {
        'trxId': {'stringValue': trxId},
        'service': {'stringValue': service},
        'sender': {'stringValue': sender},
        'amount': {'doubleValue': amount},
        'reference': {'stringValue': reference ?? ''},
        'timestamp': {'integerValue': timestamp.millisecondsSinceEpoch.toString()},
        'dateTime': {'stringValue': timestamp.toIso8601String()},
        'paymentType': {'stringValue': paymentType},
        'rawMessage': {'stringValue': rawMessage},
        'verified': {'booleanValue': false},
        'syncedAt': {'stringValue': DateTime.now().toIso8601String()},
      }
    };
  }

  Map<String, dynamic> toFirestoreJson() => toFirestoreFields();
  String get rawSms => rawMessage;

  /// Standard JSON map for Custom Webhooks
  Map<String, dynamic> toJson() {
    return {
      'trxId': trxId,
      'service': service,
      'sender': sender,
      'amount': amount,
      'reference': reference ?? '',
      'timestamp': timestamp.millisecondsSinceEpoch,
      'dateTime': timestamp.toIso8601String(),
      'paymentType': paymentType,
      'rawMessage': rawMessage,
      'verified': false,
    };
  }
}
