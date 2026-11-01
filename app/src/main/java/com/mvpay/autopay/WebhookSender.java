package com.mvpay.autopay;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.util.Log;

import org.json.JSONObject;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class WebhookSender {

    private static final String TAG = "WebhookSender";
    public static final String ACTION_LOG_UPDATE = "com.mvpay.autopay.LOG_UPDATE";
    public static final String EXTRA_LOG_MSG = "log_msg";

    public static final String PREF_NAME = "upi_gateway_prefs";
    public static final String KEY_WEBHOOK_URL = "webhook_url";
    public static final String KEY_SECRET_KEY = "secret_key";

    public static final String DEFAULT_WEBHOOK_URL = "http://38.127.8.169:8888/api/upi/webhook";
    public static final String DEFAULT_SECRET_KEY = "mvpay_secret_2026";

    private static final MediaType JSON_MEDIA = MediaType.get("application/json; charset=utf-8");
    private static final OkHttpClient client = new OkHttpClient.Builder().build();
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static boolean isNetworkAvailable(Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        android.net.Network activeNetwork = cm.getActiveNetwork();
        if (activeNetwork == null) return false;
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(activeNetwork);
        return capabilities != null &&
                (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                 capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                 capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
    }

    public static String getWebhookUrl(Context context) {
        SharedPreferences sp = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        return sp.getString(KEY_WEBHOOK_URL, DEFAULT_WEBHOOK_URL);
    }

    public static String getSecretKey(Context context) {
        SharedPreferences sp = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        return sp.getString(KEY_SECRET_KEY, DEFAULT_SECRET_KEY);
    }

    public static void sendPaymentAlert(Context context, String packageName, String sender, String title,
                                         String content, double amount, String utr, long timestamp) {
        executor.execute(() -> {
            DatabaseHelper db = DatabaseHelper.getInstance(context);

            // Always insert into local SQLite first to prevent data loss
            long rowId = db.insertTransaction(packageName, sender, title, content, amount, utr, timestamp, "PENDING");
            broadcastLog(context, "📥 Captured payment: ₹" + amount + " (UTR: " + (utr.isEmpty() ? "N/A" : utr) + ")");

            if (!isNetworkAvailable(context)) {
                broadcastLog(context, "⚠️ Offline: Queued in SQLite [Queue: " + db.getPendingCount() + "]");
                return;
            }

            // Post to server
            boolean success = postPayload(context, rowId, packageName, sender, title, content, amount, utr, timestamp);
            if (!success) {
                broadcastLog(context, "❌ Webhook failed. Saved to offline queue for auto-retry.");
            }
        });
    }

    public static void syncPendingQueue(Context context) {
        executor.execute(() -> {
            if (!isNetworkAvailable(context)) {
                broadcastLog(context, "⚠️ Sync skipped: Device is offline.");
                return;
            }

            DatabaseHelper db = DatabaseHelper.getInstance(context);
            List<DatabaseHelper.TransactionItem> pending = db.getPendingTransactions();

            if (pending.isEmpty()) {
                broadcastLog(context, "✅ Offline queue is clean. (0 pending)");
                return;
            }

            broadcastLog(context, "🔄 Syncing " + pending.size() + " offline payments to server...");
            int syncedCount = 0;

            for (DatabaseHelper.TransactionItem item : pending) {
                boolean ok = postPayload(context, item.id, item.packageName, item.sender, item.title,
                        item.content, item.amount, item.utr, item.timestamp);
                if (ok) {
                    syncedCount++;
                }
            }

            broadcastLog(context, "✅ Sync finished. " + syncedCount + "/" + pending.size() + " uploaded.");
        });
    }

    private static boolean postPayload(Context context, long localId, String packageName, String sender,
                                       String title, String content, double amount, String utr, long timestamp) {
        DatabaseHelper db = DatabaseHelper.getInstance(context);
        String url = getWebhookUrl(context);
        String secret = getSecretKey(context);

        try {
            JSONObject json = new JSONObject();
            json.put("secret", secret);
            json.put("package_name", packageName != null ? packageName : "");
            json.put("sender", sender != null ? sender : "");
            json.put("title", title != null ? title : "");
            json.put("content", content != null ? content : "");
            json.put("amount", amount);
            json.put("utr", utr != null ? utr : "");
            json.put("timestamp", timestamp);
            json.put("device_time", System.currentTimeMillis());

            RequestBody body = RequestBody.create(json.toString(), JSON_MEDIA);
            Request request = new Request.Builder()
                    .url(url)
                    .post(body)
                    .addHeader("X-Gateway-Secret", secret)
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String resStr = response.body().string();
                    Log.d(TAG, "Server response: " + resStr);

                    // Requirement 5: If verified, delete transaction data immediately from local DB
                    try {
                        JSONObject resObj = new JSONObject(resStr);
                        boolean isVerified = resObj.optBoolean("verified", false);
                        if (isVerified) {
                            db.deleteTransaction(localId);
                            broadcastLog(context, "🎉 Verified by Bot & purged sensitive data: ₹" + amount);
                            return true;
                        }
                    } catch (Exception ignored) {}

                    db.markAsSynced(localId);
                    broadcastLog(context, "🚀 Uploaded: ₹" + amount + " (UTR: " + utr + ") -> HTTP " + response.code());
                    return true;
                } else {
                    broadcastLog(context, "❌ Server error HTTP " + response.code());
                    return false;
                }
            }
        } catch (IOException e) {
            broadcastLog(context, "🔌 Network error: " + e.getMessage());
            return false;
        } catch (Exception e) {
            broadcastLog(context, "⚠️ Error: " + e.getMessage());
            return false;
        }
    }

    private static void broadcastLog(Context context, String msg) {
        Intent intent = new Intent(ACTION_LOG_UPDATE);
        intent.putExtra(EXTRA_LOG_MSG, msg);
        context.sendBroadcast(intent);
    }
}
