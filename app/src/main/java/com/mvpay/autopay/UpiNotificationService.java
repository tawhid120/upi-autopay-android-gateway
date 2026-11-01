package com.mvpay.autopay;

import android.app.Notification;
import android.content.Intent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class UpiNotificationService extends NotificationListenerService {

    private static final String TAG = "UpiNotifService";

    // Known UPI and banking apps
    private static final Set<String> TARGET_PACKAGES = new HashSet<>(Arrays.asList(
            "in.fampay.app",                                // FamPay
            "com.phonepe.app",                              // PhonePe
            "com.google.android.apps.nbu.paisa.user",       // Google Pay (Tez)
            "net.one97.paytm",                              // Paytm
            "in.org.npci.upiapp",                           // BHIM
            "com.dreamplug.androidapp",                     // CRED
            "com.axis.mobile",                              // Axis Bank
            "com.msf.kbank.mobile",                         // Kotak
            "com.icicibank.mobile",                         // ICICI iMobile
            "com.sbi.lotusintouch",                         // SBI Yono
            "com.google.android.apps.messaging",            // Google Messages (SMS)
            "com.samsung.android.messaging",                // Samsung Messages
            "com.android.mms"                               // Default AOSP SMS
    ));

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.d(TAG, "Notification listener connected successfully.");
        // Ensure foreground service is also running
        try {
            Intent svc = new Intent(this, GatewayForegroundService.class);
            startService(svc);
        } catch (Exception ignored) {}
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // Check if package is target or messaging app
        boolean isTarget = TARGET_PACKAGES.contains(packageName) ||
                packageName.toLowerCase().contains("pay") ||
                packageName.toLowerCase().contains("bank") ||
                packageName.toLowerCase().contains("mms") ||
                packageName.toLowerCase().contains("sms");

        if (!isTarget) {
            return;
        }

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence subTextCs = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String text = textCs != null ? textCs.toString() : "";
        if (bigTextCs != null && bigTextCs.length() > text.length()) {
            text = bigTextCs.toString();
        }
        if (subTextCs != null) {
            text = text + " " + subTextCs.toString();
        }

        Log.d(TAG, "Notification from " + packageName + " -> Title: " + title + " | Text: " + text);

        // Parse with UpiParser
        UpiParser.ParsedPayment parsed = UpiParser.parse(title, text, packageName);
        if (parsed != null && parsed.isCredit) {
            long timestamp = sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis();
            Log.i(TAG, "🎯 Valid payment detected! Provider: " + parsed.provider + " | Amount: ₹" + parsed.amount + " | UTR: " + parsed.utr);

            WebhookSender.sendPaymentAlert(
                    getApplicationContext(),
                    packageName,
                    parsed.provider,
                    title,
                    text,
                    parsed.amount,
                    parsed.utr,
                    timestamp
            );
        }
    }
}
