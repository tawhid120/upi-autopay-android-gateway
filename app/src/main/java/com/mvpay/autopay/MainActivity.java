package com.mvpay.autopay;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private TextView tvServiceStatus;
    private TextView tvNetworkStatus;
    private TextView tvQueueStatus;
    private TextView tvNotifPermission;
    private TextView tvBatteryStatus;
    private TextView tvLogs;
    private TextView tvClearLogs;

    private EditText etWebhookUrl;
    private EditText etSecretKey;
    private Button btnSaveConfig;
    private Button btnForceSync;
    private Button btnTestNotif;
    private Button btnToggleService;
    private Button btnRestrictedHelp;

    private BroadcastReceiver logReceiver;
    private SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        loadSettings();
        requestNecessaryPermissions();
        startGatewayService();
        setupListeners();
        registerLogReceiver();
        updateStatus();
    }

    private void initViews() {
        tvServiceStatus = findViewById(R.id.tvServiceStatus);
        tvNetworkStatus = findViewById(R.id.tvNetworkStatus);
        tvQueueStatus = findViewById(R.id.tvQueueStatus);
        tvNotifPermission = findViewById(R.id.tvNotifPermission);
        tvBatteryStatus = findViewById(R.id.tvBatteryStatus);
        tvLogs = findViewById(R.id.tvLogs);
        tvClearLogs = findViewById(R.id.tvClearLogs);

        etWebhookUrl = findViewById(R.id.etWebhookUrl);
        etSecretKey = findViewById(R.id.etSecretKey);
        btnSaveConfig = findViewById(R.id.btnSaveConfig);
        btnForceSync = findViewById(R.id.btnForceSync);
        btnTestNotif = findViewById(R.id.btnTestNotif);
        btnToggleService = findViewById(R.id.btnToggleService);
        btnRestrictedHelp = findViewById(R.id.btnRestrictedHelp);
    }

    private void loadSettings() {
        SharedPreferences sp = getSharedPreferences(WebhookSender.PREF_NAME, Context.MODE_PRIVATE);
        etWebhookUrl.setText(sp.getString(WebhookSender.KEY_WEBHOOK_URL, WebhookSender.DEFAULT_WEBHOOK_URL));
        etSecretKey.setText(sp.getString(WebhookSender.KEY_SECRET_KEY, WebhookSender.DEFAULT_SECRET_KEY));
    }

    private void saveSettings() {
        String url = etWebhookUrl.getText().toString().trim();
        String secret = etSecretKey.getText().toString().trim();

        if (TextUtils.isEmpty(url)) {
            url = WebhookSender.DEFAULT_WEBHOOK_URL;
            etWebhookUrl.setText(url);
        }

        SharedPreferences sp = getSharedPreferences(WebhookSender.PREF_NAME, Context.MODE_PRIVATE);
        sp.edit()
                .putString(WebhookSender.KEY_WEBHOOK_URL, url)
                .putString(WebhookSender.KEY_SECRET_KEY, secret)
                .apply();

        Toast.makeText(this, "Settings Saved!", Toast.LENGTH_SHORT).show();
        appendLog("💾 Settings saved. Target: " + url);
    }

    private void setupListeners() {
        btnSaveConfig.setOnClickListener(v -> saveSettings());

        btnForceSync.setOnClickListener(v -> {
            appendLog("🔄 Triggering manual sync of offline queue...");
            WebhookSender.syncPendingQueue(this);
            updateStatus();
        });

        btnTestNotif.setOnClickListener(v -> sendTestNotification());

        btnToggleService.setOnClickListener(v -> {
            startGatewayService();
            updateStatus();
            Toast.makeText(this, "Service Launched", Toast.LENGTH_SHORT).show();
        });

        tvClearLogs.setOnClickListener(v -> tvLogs.setText("[Ready] Logs cleared.\n"));

        tvNotifPermission.setOnClickListener(v -> {
            if (!isNotificationServiceEnabled() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                showRestrictedSettingsHelp();
            } else {
                openNotificationAccessSettings();
            }
        });

        tvBatteryStatus.setOnClickListener(v -> requestDisableBatteryOptimization());

        btnRestrictedHelp.setOnClickListener(v -> showRestrictedSettingsHelp());
    }

    private void startGatewayService() {
        Intent serviceIntent = new Intent(this, GatewayForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                startForegroundService(serviceIntent);
            } catch (Exception e) {
                appendLog("⚠️ Service start error: " + e.getMessage());
            }
        } else {
            startService(serviceIntent);
        }
    }

    private void updateStatus() {
        // Service Status
        if (GatewayForegroundService.isRunning) {
            tvServiceStatus.setText("🟢 Service: Running 24/7 (Active)");
            tvServiceStatus.setTextColor(ContextCompat.getColor(this, R.color.green_status));
        } else {
            tvServiceStatus.setText("🟡 Service: Ready (Tap Start)");
            tvServiceStatus.setTextColor(ContextCompat.getColor(this, R.color.orange_status));
        }

        // Internet Status
        boolean online = WebhookSender.isNetworkAvailable(this);
        if (online) {
            tvNetworkStatus.setText("🟢 Internet: Connected (Online)");
            tvNetworkStatus.setTextColor(ContextCompat.getColor(this, R.color.green_status));
        } else {
            tvNetworkStatus.setText("🔴 Internet: Disconnected (Storing Offline)");
            tvNetworkStatus.setTextColor(ContextCompat.getColor(this, R.color.red_status));
        }

        // Offline Queue
        DatabaseHelper db = DatabaseHelper.getInstance(this);
        int pending = db.getPendingCount();
        tvQueueStatus.setText("📦 Offline Queue: " + pending + " pending");

        // Notification Access Check
        boolean notifGranted = isNotificationServiceEnabled();
        if (notifGranted) {
            tvNotifPermission.setText("🔔 Notification Access: Granted ✅");
            tvNotifPermission.setTextColor(ContextCompat.getColor(this, R.color.green_status));
        } else {
            tvNotifPermission.setText("⚠️ Notification Access: Action Needed (Tap to Grant)");
            tvNotifPermission.setTextColor(ContextCompat.getColor(this, R.color.orange_status));
        }

        // Battery Optimization Check
        boolean batteryIgnored = isBatteryOptimizationIgnored();
        if (batteryIgnored) {
            tvBatteryStatus.setText("🔋 Battery Saver: Disabled (Background Allowed) ✅");
            tvBatteryStatus.setTextColor(ContextCompat.getColor(this, R.color.green_status));
        } else {
            tvBatteryStatus.setText("⚠️ Battery Saver: Active (Tap to Disable Optimization)");
            tvBatteryStatus.setTextColor(ContextCompat.getColor(this, R.color.orange_status));
        }
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getPackageName();
        final String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (!TextUtils.isEmpty(flat)) {
            final String[] names = flat.split(":");
            for (String name : names) {
                final ComponentName cn = ComponentName.unflattenFromString(name);
                if (cn != null && TextUtils.equals(pkgName, cn.getPackageName())) {
                    return true;
                }
            }
        }
        return false;
    }

    private void openNotificationAccessSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Could not open Notification Settings: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private boolean isBatteryOptimizationIgnored() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
        }
        return true;
    }

    @SuppressLint("BatteryLife")
    private void requestDisableBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            } catch (Exception e) {
                Toast.makeText(this, "Failed to request battery ignore: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void requestNecessaryPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.POST_NOTIFICATIONS
            }, 101);
        }
    }

    private void showRestrictedSettingsHelp() {
        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("🔓 Android 13–16 Permission Fix")
                .setMessage("On modern Android (13, 14, 15, 16), Google temporarily grays out Notification Access for sideloaded apps for security.\n\n" +
                        "How to enable it in 10 seconds:\n\n" +
                        "1. Tap 'OPEN APP INFO' below.\n" +
                        "2. Tap the 3 vertical dots (⋮) in the top-right corner.\n" +
                        "3. Select 'Allow restricted settings' & confirm your PIN/Fingerprint.\n" +
                        "4. Return to this app and tap 'Notification Access' to turn it ON!")
                .setPositiveButton("⚙️ Open App Info", (dialog, which) -> {
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    } catch (Exception e) {
                        Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Open Notification Settings", (dialog, which) -> openNotificationAccessSettings())
                .show();
    }

    private void sendTestNotification() {
        // Send a realistic test UPI transaction to verify end-to-end webhook delivery
        String testTitle = "FamPay: Payment Received";
        String testUtr = String.valueOf((long) (100000000000L + Math.random() * 900000000000L));
        String testContent = "Received ₹100.00 from Rahul Kumar via UPI. Ref No: " + testUtr;

        appendLog("🧪 Generating test FamPay notification: ₹100 (UTR: " + testUtr + ")...");
        WebhookSender.sendPaymentAlert(
                this,
                "in.fampay.app",
                "FamPay",
                testTitle,
                testContent,
                100.0,
                testUtr,
                System.currentTimeMillis()
        );
    }

    private void appendLog(String message) {
        String time = timeFormat.format(new Date());
        String entry = "[" + time + "] " + message + "\n";
        runOnUiThread(() -> {
            if (tvLogs != null) {
                tvLogs.append(entry);
            }
        });
    }

    private void registerLogReceiver() {
        logReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent != null && WebhookSender.ACTION_LOG_UPDATE.equals(intent.getAction())) {
                    String msg = intent.getStringExtra(WebhookSender.EXTRA_LOG_MSG);
                    if (msg != null) {
                        appendLog(msg);
                        updateStatus();
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter(WebhookSender.ACTION_LOG_UPDATE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(logReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(logReceiver, filter);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }

    @Override
    protected void onDestroy() {
        if (logReceiver != null) {
            try {
                unregisterReceiver(logReceiver);
            } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
