package com.payverify.bd

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.telephony.SmsMessage
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "PayVerifySmsReceiver"
        const val SMS_RECEIVED_ACTION = "com.payverify.bd.SMS_RECEIVED"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.provider.Telephony.SMS_RECEIVED") {
            val bundle: Bundle? = intent.extras
            if (bundle != null) {
                try {
                    val pdus = bundle.get("pdus") as? Array<*> ?: return
                    val format = bundle.getString("format")

                    val fullMessage = StringBuilder()
                    var sender = ""

                    for (pdu in pdus) {
                        val smsMessage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            SmsMessage.createFromPdu(pdu as ByteArray, format)
                        } else {
                            @Suppress("DEPRECATION")
                            SmsMessage.createFromPdu(pdu as ByteArray)
                        }

                        sender = smsMessage.originatingAddress ?: ""
                        fullMessage.append(smsMessage.messageBody)
                    }

                    val messageBody = fullMessage.toString()
                    Log.d(TAG, "SMS Received from $sender: $messageBody")

                    // Broadcast internal intent for Flutter background service or active UI
                    val localIntent = Intent(SMS_RECEIVED_ACTION).apply {
                        putExtra("sender", sender)
                        putExtra("body", messageBody)
                        putExtra("timestamp", System.currentTimeMillis())
                    }
                    context.sendBroadcast(localIntent)

                } catch (e: Exception) {
                    Log.e(TAG, "Error processing incoming SMS", e)
                }
            }
        }
    }
}
