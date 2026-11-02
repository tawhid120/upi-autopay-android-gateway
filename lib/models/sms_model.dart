class SmsModel {
  final String id;
  final String address;
  final String body;
  final DateTime date;
  final bool isPayment;
  final String? matchedProvider;

  SmsModel({
    required this.id,
    required this.address,
    required this.body,
    required this.date,
    this.isPayment = false,
    this.matchedProvider,
  });

  factory SmsModel.fromMap(Map<dynamic, dynamic> map) {
    final rawDate = map['date'];
    DateTime parsedDate;
    if (rawDate is int) {
      parsedDate = DateTime.fromMillisecondsSinceEpoch(rawDate);
    } else if (rawDate is DateTime) {
      parsedDate = rawDate;
    } else {
      parsedDate = DateTime.now();
    }

    return SmsModel(
      id: (map['id'] ?? map['_id'] ?? '').toString(),
      address: (map['address'] ?? 'Unknown').toString(),
      body: (map['body'] ?? '').toString(),
      date: parsedDate,
    );
  }

  SmsModel copyWith({
    String? id,
    String? address,
    String? body,
    DateTime? date,
    bool? isPayment,
    String? matchedProvider,
  }) {
    return SmsModel(
      id: id ?? this.id,
      address: address ?? this.address,
      body: body ?? this.body,
      date: date ?? this.date,
      isPayment: isPayment ?? this.isPayment,
      matchedProvider: matchedProvider ?? this.matchedProvider,
    );
  }
}
