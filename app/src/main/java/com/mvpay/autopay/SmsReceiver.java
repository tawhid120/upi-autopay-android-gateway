package com.mvpay.autopay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "SmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            String format = bundle.getString("format");

            if (pdus == null) return;

            StringBuilder fullBody = new StringBuilder();
            String sender = "";
            long timestamp = System.currentTimeMillis();

            for (Object pdu : pdus) {
                SmsMessage message;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    message = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    message = SmsMessage.createFromPdu((byte[]) pdu);
                }

                if (message != null) {
                    sender = message.getDisplayOriginatingAddress();
                    fullBody.append(message.getMessageBody());
                    timestamp = message.getTimestampMillis();
                }
            }

            String body = fullBody.toString();
            Log.d(TAG, "SMS received from: " + sender + " -> " + body);

            // Filter bank or UPI senders
            String senderUpper = sender.toUpperCase();
            boolean isFinancial = senderUpper.contains("FAM") ||
                    senderUpper.contains("UPI") ||
                    senderUpper.contains("BANK") ||
                    senderUpper.contains("PAY") ||
                    senderUpper.contains("SBI") ||
                    senderUpper.contains("HDFC") ||
                    senderUpper.contains("ICICI") ||
                    senderUpper.contains("AXIS") ||
                    senderUpper.contains("KOTAK") ||
                    senderUpper.contains("PNB");

            if (!isFinancial) {
                return;
            }

            UpiParser.ParsedPayment parsed = UpiParser.parse("SMS from " + sender, body);
            if (parsed != null && parsed.isCredit) {
                Log.i(TAG, "🎯 Payment detected via SMS! ₹" + parsed.amount + " UTR: " + parsed.utr);
                WebhookSender.sendPaymentAlert(
                        context.getApplicationContext(),
                        "com.android.sms",
                        sender,
                        "SMS from " + sender,
                        body,
                        parsed.amount,
                        parsed.utr,
                        timestamp
                );
            }

        } catch (Exception e) {
            Log.e(TAG, "Error parsing SMS: " + e.getMessage());
        }
    }
}
