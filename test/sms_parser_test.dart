import 'package:flutter_test/flutter_test.dart';
import 'package:payviro_upi/services/sms_parser_service.dart';

void main() {
  group('Indian UPI & Banking Parser Tests', () {
    test('Parse PhonePe Received Notification', () {
      const sender = 'PhonePe';
      const body = 'Received ₹500.00 from Rohit Sharma via UPI. UTR: 430612345678';

      final payment = SmsParserService.parseSms(sender, body);
      expect(payment, isNotNull);
      expect(payment!.service, 'PhonePe');
      expect(payment.amount, 500.0);
      expect(payment.trxId, '430612345678');
    });

    test('Parse Google Pay Received Notification', () {
      const sender = 'Google Pay';
      const body = 'You received ₹1,250.00 from ananya@okhdfcbank. UPI Ref: 430698765432';

      final payment = SmsParserService.parseSms(sender, body);
      expect(payment, isNotNull);
      expect(payment!.service, 'Google Pay');
      expect(payment.amount, 1250.0);
      expect(payment.trxId, '430698765432');
      expect(payment.sender, 'ananya@okhdfcbank');
    });

    test('Parse Paytm Received Notification', () {
      const sender = 'Paytm';
      const body = 'Received ₹200 from Ravi Kumar on UPI. UPI Ref 430611223344';

      final payment = SmsParserService.parseSms(sender, body);
      expect(payment, isNotNull);
      expect(payment!.service, 'Paytm');
      expect(payment.amount, 200.0);
      expect(payment.trxId, '430611223344');
    });

    test('Parse FamPay Payment Notification', () {
      const sender = 'FamPay';
      const body = 'You got ₹350 from ajay90980@fam. Ref: 430677889900';

      final payment = SmsParserService.parseSms(sender, body);
      expect(payment, isNotNull);
      expect(payment!.service, 'FamPay');
      expect(payment.amount, 350.0);
      expect(payment.trxId, '430677889900');
      expect(payment.sender, 'ajay90980@fam');
    });

    test('Parse SBI Bank Credit SMS', () {
      const sender = 'SBIUPI';
      const body = 'Dear SBI User, your A/c X1234 credited by Rs. 500.00 on 01Nov26 by UPI/430655443322/Rohan-SBI';

      final payment = SmsParserService.parseSms(sender, body);
      expect(payment, isNotNull);
      expect(payment!.amount, 500.0);
      expect(payment.trxId, '430655443322');
    });

    test('Parse HDFC Bank Credit SMS', () {
      const sender = 'HDFCBK';
      const body = 'Rs. 1,000.00 credited to a/c **5678 on 01-11-26 by UPI txn with UTR 430699887766. - HDFC Bank';

      final payment = SmsParserService.parseSms(sender, body);
      expect(payment, isNotNull);
      expect(payment!.amount, 1000.0);
      expect(payment.trxId, '430699887766');
    });
  });
}
