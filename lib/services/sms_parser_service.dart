import '../models/payment_model.dart';
import '../utils/constants.dart';

class SmsParserService {
  /// Checks whether an SMS or Notification is a valid financial payment credit
  static bool isFinancialSms(String sender, String body) {
    final cleanSender = sender.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    final cleanBody = body.toLowerCase();

    // Check sender identities (Indian UPI & Banking)
    final isUpiSender = cleanSender.contains('PHONEPE') ||
        cleanSender.contains('GPAY') ||
        cleanSender.contains('GOOGLEPAY') ||
        cleanSender.contains('PAYTM') ||
        cleanSender.contains('BHIM') ||
        cleanSender.contains('CRED') ||
        cleanSender.contains('FAMPAY') ||
        cleanSender.contains('AMAZON') ||
        cleanSender.contains('SBI') ||
        cleanSender.contains('HDFC') ||
        cleanSender.contains('ICICI') ||
        cleanSender.contains('AXIS') ||
        cleanSender.contains('KOTAK') ||
        cleanSender.contains('PNB') ||
        cleanSender.contains('BOB') ||
        cleanSender.contains('CANARA') ||
        cleanSender.contains('UNION');

    // Check transaction keywords
    final hasTrxKeyword = cleanBody.contains('utr') ||
        cleanBody.contains('upi ref') ||
        cleanBody.contains('ref no') ||
        cleanBody.contains('ref:') ||
        cleanBody.contains('rrn') ||
        cleanBody.contains('txnid') ||
        cleanBody.contains('trxid') ||
        cleanBody.contains('txn id') ||
        cleanBody.contains('upi/');

    final hasCreditKeyword = cleanBody.contains('received') ||
        cleanBody.contains('credited') ||
        cleanBody.contains('sent you') ||
        cleanBody.contains('got') ||
        cleanBody.contains('deposit');

    final hasCurrency = cleanBody.contains('₹') ||
        cleanBody.contains('rs.') ||
        cleanBody.contains('rs ') ||
        cleanBody.contains('inr');

    if (isUpiSender) {
      return (hasTrxKeyword || hasCreditKeyword) && hasCurrency;
    }

    // Generic notification from SMS or third-party app
    return (hasTrxKeyword && hasCreditKeyword && hasCurrency) ||
        (hasCreditKeyword && hasCurrency && (cleanBody.contains('upi') || cleanBody.contains('vpa')));
  }

  /// Identifies the service provider name
  static String detectProvider(String sender, String body) {
    final cleanSender = sender.toUpperCase();
    final cleanBody = body.toLowerCase();

    if (cleanSender.contains('PHONEPE') || cleanBody.contains('phonepe')) {
      return AppConstants.providerPhonePe;
    } else if (cleanSender.contains('GPAY') || cleanSender.contains('GOOGLE') || cleanBody.contains('gpay') || cleanBody.contains('google pay')) {
      return AppConstants.providerGooglePay;
    } else if (cleanSender.contains('PAYTM') || cleanBody.contains('paytm')) {
      return AppConstants.providerPaytm;
    } else if (cleanSender.contains('BHIM') || cleanBody.contains('bhim')) {
      return AppConstants.providerBhim;
    } else if (cleanSender.contains('CRED') || cleanBody.contains('cred')) {
      return AppConstants.providerCred;
    } else if (cleanSender.contains('FAMPAY') || cleanSender.contains('FAMAPP') || cleanBody.contains('fampay') || cleanBody.contains('@fam')) {
      return AppConstants.providerFamPay;
    } else if (cleanSender.contains('AMAZON') || cleanBody.contains('amazon pay')) {
      return AppConstants.providerAmazonPay;
    } else if (cleanSender.contains('SBI') || cleanBody.contains('sbi')) {
      return 'SBI UPI';
    } else if (cleanSender.contains('HDFC') || cleanBody.contains('hdfc')) {
      return 'HDFC UPI';
    } else if (cleanSender.contains('ICICI') || cleanBody.contains('icici')) {
      return 'ICICI UPI';
    } else if (cleanSender.contains('AXIS') || cleanBody.contains('axis')) {
      return 'Axis UPI';
    } else if (cleanSender.contains('KOTAK') || cleanBody.contains('kotak')) {
      return 'Kotak UPI';
    } else if (cleanSender.contains('PNB') || cleanBody.contains('pnb')) {
      return 'PNB UPI';
    }
    return AppConstants.providerBank;
  }

  /// Parses an SMS or notification and returns PaymentModel, or null if not a payment
  static PaymentModel? parseSms(String sender, String body, {DateTime? smsDate}) {
    if (!isFinancialSms(sender, body)) {
      return null;
    }

    final provider = detectProvider(sender, body);
    return _parseUpiGeneric(sender, body, provider, smsDate);
  }

  /// Core universal Indian UPI parser
  static PaymentModel? _parseUpiGeneric(String senderHeader, String body, String provider, DateTime? smsDate) {
    try {
      // 1. Extract Amount in INR (₹, Rs., Rs, INR)
      // Patterns: "received ₹500", "credited by Rs. 500.00", "credited with INR 1,200.00", "sent you ₹250"
      final amountRegex = RegExp(
        r'(?:received|credited(?: for| by| with)?|sent you|got)\s*(?:payment of\s*)?(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)',
        caseSensitive: false,
      );
      var amountMatch = amountRegex.firstMatch(body);

      // Fallback amount regex: Any occurrence of ₹ or Rs followed by numbers
      if (amountMatch == null) {
        final fallbackAmountRegex = RegExp(
          r'(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)',
          caseSensitive: false,
        );
        amountMatch = fallbackAmountRegex.firstMatch(body);
      }

      if (amountMatch == null) return null;

      final rawAmountStr = amountMatch.group(1)?.replaceAll(',', '') ?? '0';
      final amount = double.tryParse(rawAmountStr) ?? 0.0;
      if (amount <= 0) return null;

      // 2. Extract 12-Digit UTR / Transaction Reference ID
      // Patterns:
      // "UTR: 430612345678", "UTR 430612345678", "UPI Ref: 430612345678", "UPI Ref no 430612345678"
      // "UPI/430612345678/", "Ref: 430612345678", "RRN: 430612345678", "Txn ID: T241101..."
      String? trxId;

      final utrRegex = RegExp(
        r'(?:UTR(?:\s*No\.?|\s*Number)?|UPI\s*Ref(?:\s*No\.?|\s*Number)?|Ref\s*No\.?|RRN|Txn\s*ID|Trx\s*ID)\s*[:=\s/]\s*([A-Za-z0-9]{8,35})',
        caseSensitive: false,
      );
      final utrMatch = utrRegex.firstMatch(body);

      if (utrMatch != null) {
        trxId = utrMatch.group(1)!.trim();
      } else {
        // Check for slash format: "UPI/430612345678/" or "UPI/CR/430612345678"
        final slashRegex = RegExp(r'UPI/(?:[A-Za-z]+/)?([0-9]{10,16})', caseSensitive: false);
        final slashMatch = slashRegex.firstMatch(body);
        if (slashMatch != null) {
          trxId = slashMatch.group(1)!.trim();
        } else {
          // Look for any isolated 12-digit numeric sequence (Standard NPCI UTR length)
          final twelveDigitRegex = RegExp(r'\b([0-9]{12})\b');
          final twelveMatch = twelveDigitRegex.firstMatch(body);
          if (twelveMatch != null) {
            trxId = twelveMatch.group(1)!.trim();
          }
        }
      }

      // If still no UTR found, generate unique timestamp-hash fallback so transaction is never lost
      if (trxId == null || trxId.isEmpty) {
        final hash = (body.hashCode.abs() % 100000000).toString().padLeft(8, '0');
        trxId = 'UPI$hash';
      }

      // 3. Extract Sender Name / VPA / Phone
      // Patterns: "from Rohit Sharma", "from ajay90980@fam", "from user@okhdfcbank"
      String sender = 'UPI User';
      final senderVpaRegex = RegExp(r'([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)');
      final vpaMatch = senderVpaRegex.firstMatch(body);

      if (vpaMatch != null) {
        sender = vpaMatch.group(1)!;
      } else {
        final senderNameRegex = RegExp(
          r'(?:from|by)\s+([A-Za-z0-9\s._-]+?)(?:\s+on|\s+via|\s+to|\s+with|\s+UTR|\s+UPI|\.|\()',
          caseSensitive: false,
        );
        final nameMatch = senderNameRegex.firstMatch(body);
        if (nameMatch != null) {
          final candidate = nameMatch.group(1)?.trim();
          if (candidate != null && candidate.isNotEmpty && candidate.length <= 40) {
            sender = candidate;
          }
        }
      }

      // 4. Extract Reference (if available)
      String? reference;
      final refRegex = RegExp(r'(?:Ref|Reference|Remark)\s*[:]?\s*([^.]+?)(?:\.|\s+Date|\s+Fee|\s+Balance|$)', caseSensitive: false);
      final refMatch = refRegex.firstMatch(body);
      if (refMatch != null) {
        reference = refMatch.group(1)?.trim();
      }

      // 5. Timestamp
      DateTime timestamp = smsDate ?? DateTime.now();

      return PaymentModel(
        trxId: trxId,
        service: provider,
        sender: sender,
        amount: amount,
        reference: reference,
        timestamp: timestamp,
        rawMessage: body,
        paymentType: 'received',
      );
    } catch (e) {
      print("Error parsing Indian UPI SMS/Notification: $e");
      return null;
    }
  }
}
