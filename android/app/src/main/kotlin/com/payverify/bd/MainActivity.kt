package com.payverify.bd

import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    companion object {
        const val CHANNEL = "com.payverify.bd/sms"
        var channelInstance: MethodChannel? = null
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        channelInstance = channel

        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "getInboxSms" -> {
                    val limit = call.argument<Int>("limit") ?: 100
                    val smsList = readInboxSms(limit)
                    result.success(smsList)
                }
                "isNotificationListenerEnabled" -> {
                    result.success(isNotificationListenerEnabled())
                }
                "openNotificationListenerSettings" -> {
                    try {
                        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("INTENT_ERROR", e.message, null)
                    }
                }
                "openAppInfoSettings" -> {
                    try {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.fromParts("package", packageName, null)
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("INTENT_ERROR", e.message, null)
                    }
                }
                "getDeviceInfo" -> {
                    try {
                        val bm = getSystemService(BATTERY_SERVICE) as? android.os.BatteryManager
                        val batLevel = bm?.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
                        val model = "${android.os.Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${android.os.Build.MODEL}"
                        val osVersion = "Android ${android.os.Build.VERSION.RELEASE}"
                        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: ""
                        val data = mapOf(
                            "batteryLevel" to batLevel,
                            "model" to model,
                            "androidVersion" to osVersion,
                            "fingerprint" to androidId
                        )
                        result.success(data)
                    } catch (e: Exception) {
                        result.success(mapOf("batteryLevel" to 100, "model" to "Android Phone", "androidVersion" to "Android", "fingerprint" to ""))
                    }
                }
                "installApk" -> {
                    val filePath = call.argument<String>("filePath")
                    if (filePath.isNullOrEmpty()) {
                        result.error("INVALID_PATH", "File path is required", null)
                        return@setMethodCallHandler
                    }
                    try {
                        val file = java.io.File(filePath)
                        if (!file.exists()) {
                            result.error("FILE_NOT_FOUND", "APK file does not exist: $filePath", null)
                            return@setMethodCallHandler
                        }

                        val apkUri = androidx.core.content.FileProvider.getUriForFile(
                            applicationContext,
                            "${applicationContext.packageName}.fileprovider",
                            file
                        )

                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(apkUri, "application/vnd.android.package-archive")
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("INSTALL_ERROR", e.message, null)
                    }
                }
                "canRequestPackageInstalls" -> {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        result.success(packageManager.canRequestPackageInstalls())
                    } else {
                        result.success(true)
                    }
                }
                "openInstallPermissionSettings" -> {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        try {
                            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                                data = Uri.parse("package:$packageName")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("INTENT_ERROR", e.message, null)
                        }
                    } else {
                        result.success(true)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onDestroy() {
        if (channelInstance == channelInstance) {
            channelInstance = null
        }
        super.onDestroy()
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        return flat != null && flat.contains(packageName)
    }

    private fun readInboxSms(limit: Int): List<Map<String, Any>> {
        val smsList = mutableListOf<Map<String, Any>>()
        try {
            val cursor: Cursor? = contentResolver.query(
                Uri.parse("content://sms/inbox"),
                arrayOf("_id", "address", "body", "date", "date_sent"),
                null,
                null,
                "date DESC LIMIT $limit"
            )

            cursor?.use {
                val idCol = it.getColumnIndexOrThrow("_id")
                val addressCol = it.getColumnIndexOrThrow("address")
                val bodyCol = it.getColumnIndexOrThrow("body")
                val dateCol = it.getColumnIndexOrThrow("date")

                while (it.moveToNext()) {
                    val map = HashMap<String, Any>()
                    map["id"] = it.getString(idCol) ?: ""
                    map["address"] = it.getString(addressCol) ?: ""
                    map["body"] = it.getString(bodyCol) ?: ""
                    map["date"] = it.getLong(dateCol)
                    smsList.add(map)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return smsList
    }
}
