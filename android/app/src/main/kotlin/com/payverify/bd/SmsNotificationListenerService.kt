package com.payverify.bd

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class SmsNotificationListenerService : NotificationListenerService() {
    companion object {
        private const val TAG = "PayVerifyNotifListener"
        const val NOTIFICATION_RECEIVED_ACTION = "com.payverify.bd.NOTIFICATION_RECEIVED"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        try {
            val packageName = sbn.packageName ?: ""
            val extras = sbn.notification.extras ?: return

            val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
            val body = if (bigText.isNotEmpty()) bigText else text

            Log.d(TAG, "Notification from $packageName: Title='$title', Body='$body'")

            // Check if notification is from UPI, Bank, or SMS provider
            val combined = "$title $body".lowercase()
            val pkgLower = packageName.lowercase()

            val isFinancialPackage = pkgLower.contains("phonepe") ||
                    pkgLower.contains("paisa") || // Google Pay (com.google.android.apps.nbu.paisa.user)
                    pkgLower.contains("paytm") ||
                    pkgLower.contains("npci") ||  // BHIM UPI
                    pkgLower.contains("dreamplug") || // CRED
                    pkgLower.contains("fampay") ||
                    pkgLower.contains("amazon") ||
                    pkgLower.contains("bank") ||
                    pkgLower.contains("messaging") ||
                    pkgLower.contains("mms")

            val isFinancialText = combined.contains("phonepe") ||
                    combined.contains("gpay") ||
                    combined.contains("google pay") ||
                    combined.contains("paytm") ||
                    combined.contains("bhim") ||
                    combined.contains("cred") ||
                    combined.contains("fampay") ||
                    combined.contains("amazon pay") ||
                    combined.contains("upi") ||
                    combined.contains("sbi") ||
                    combined.contains("hdfc") ||
                    combined.contains("icici") ||
                    combined.contains("axis") ||
                    combined.contains("kotak") ||
                    combined.contains("pnb") ||
                    combined.contains("bob") ||
                    combined.contains("canara") ||
                    combined.contains("idfc") ||
                    combined.contains("indusind") ||
                    combined.contains("bank") ||
                    combined.contains("vpa") ||
                    combined.contains("bkash") ||
                    combined.contains("nagad")

            val isFinancialProvider = isFinancialPackage || isFinancialText

            val hasPaymentKeywords = combined.contains("credited") ||
                    combined.contains("received") ||
                    combined.contains("payment") ||
                    combined.contains("utr") ||
                    combined.contains("ref no") ||
                    combined.contains("rrn") ||
                    combined.contains("vpa") ||
                    combined.contains("txnid") ||
                    combined.contains("trxid") ||
                    combined.contains("txn id") ||
                    combined.contains("trx id") ||
                    combined.contains("transferred") ||
                    combined.contains("deposited") ||
                    combined.contains("paid you") ||
                    combined.contains("sent to you") ||
                    combined.contains("₹") ||
                    combined.contains("inr") ||
                    combined.contains("rs.") ||
                    combined.contains("rs ")

            if (isFinancialProvider && hasPaymentKeywords) {
                Log.d(TAG, "Payment Notification Captured! Provider=$title, Body=$body")

                // Broadcast local intent
                val localIntent = Intent(NOTIFICATION_RECEIVED_ACTION).apply {
                    putExtra("package", packageName)
                    putExtra("title", title)
                    putExtra("body", body)
                    putExtra("timestamp", System.currentTimeMillis())
                }
                sendBroadcast(localIntent)

                // Also invoke active Flutter channel if MainActivity is active
                MainActivity.channelInstance?.invokeMethod(
                    "onPaymentReceived",
                    mapOf(
                        "sender" to title,
                        "body" to body,
                        "timestamp" to System.currentTimeMillis()
                    )
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling notification in listener", e)
        }
    }
}
