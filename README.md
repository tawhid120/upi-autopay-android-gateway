# 🇮🇳 Payviro UPI — Automated UPI & Banking Payment Gateway App

**Payviro UPI** is an Apple Liquid Glass-inspired Flutter Android application that runs in the background on your Android phone, automatically captures incoming UPI & Bank payment confirmations (via SMS and push notifications), extracts the 12-digit UTR and amount in ₹ (INR), and forwards them in real-time to your Telegram Bot / Cheapbot Webhook (`http://38.127.8.169:8888/api/upi/webhook`).

---

## 🌟 Key Features

1. **Comprehensive Indian UPI & Banking Support**:
   - **Supported Apps**: PhonePe, Google Pay (GPay), Paytm, FamPay, BHIM UPI, CRED, Amazon Pay.
   - **Supported Banks**: State Bank of India (SBI), HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra, Punjab National Bank (PNB), Bank of Baroda (BOB), Canara Bank, Union Bank, and all major Indian UPI-enabled institutions.

2. **Ultra-Fast 12-Digit UTR Extraction**:
   - Accurately captures:
     - **UTR / RRN / Transaction ID** (12-digit unique reference)
     - **Amount in INR (₹)**
     - **Sender Name / VPA** (e.g. `rahul@upi`, `ananya@okhdfcbank`)
     - **Provider Identification** (PhonePe, Paytm, GPay, FamPay, etc.)
     - **Timestamp & Raw Notification Payload**

3. **Instant Telegram Bot Webhook Auto-Sync**:
   - Immediately dispatches an HTTP POST request to your configured webhook endpoint upon payment receipt:
     - Default: `http://38.127.8.169:8888/api/upi/webhook`
     - Header: `X-Gateway-Secret: mvpay_secret_2026`
   - Telegram bot instantly verifies the UTR and credits user account balance within 1 second.

4. **Android 14, 15 & 16 Compatibility**:
   - Utilizes `NotificationListenerService` as the primary capture mechanism to avoid Google Play Protect permission blocks.
   - Built-in visual guide for bypassing Android's `FLAG_RESTRICTED_SETTINGS` on sideloaded APKs (**Allow restricted settings** via 3-dots menu).

5. **24/7 Background Service & Offline Resilience**:
   - Persistent foreground service with low battery impact.
   - Offline SQLite queue saves payments locally if cellular/Wi-Fi is disconnected and automatically syncs all pending records when connectivity returns.

6. **Apple Liquid Glass Design System**:
   - Apple Control Center-inspired frosted glass translucent surfaces.
   - Dark Mode (OLED Black), Light Mode (Pearl HIG), and System Adaptive Mode.
   - Live telemetry status chips and quick filter pills.

---

## 📡 Webhook Schema (HTTP POST)

### Request Headers
```http
POST /api/upi/webhook HTTP/1.1
Host: 38.127.8.169:8888
Content-Type: application/json
X-Gateway-Secret: mvpay_secret_2026
```

### JSON Body
```json
{
  "amount": 500.0,
  "utr": "430612345678",
  "trx_id": "430612345678",
  "package_name": "PhonePe",
  "provider": "PhonePe",
  "sender": "Rahul Sharma",
  "reference": "",
  "content": "Received ₹500.00 from Rahul Sharma via UPI. UTR: 430612345678",
  "raw_message": "Received ₹500.00 from Rahul Sharma via UPI. UTR: 430612345678",
  "payment_type": "received",
  "secret": "mvpay_secret_2026",
  "timestamp": "2026-11-02T10:00:00.000Z"
}
```

---

## 📲 How to Install & Configure

1. **Download APK**:
   - Download `Payviro-UPI-v2.3.0.apk` from GitHub Releases.
2. **Install on Android Device**:
   - Open APK and tap **Install**.
   - If Google Play Protect asks, tap **More details** ➔ **Install anyway**.
3. **Grant Permissions (Android 14 / 15 / 16)**:
   - If Notification Access or SMS is greyed out:
     1. Open phone **Settings** ➔ **Apps** ➔ **Payviro UPI**.
     2. Tap the **3 dots (⋮)** in the top-right corner.
     3. Select **Allow restricted settings** and enter your PIN/Fingerprint.
     4. Return to Payviro UPI and toggle **Notification Listener** and **SMS Reader**.
4. **Test Webhook**:
   - Open Payviro UPI ➔ Tap **Settings (⚙️)**.
   - Tap **Webhook সংযোগ পরীক্ষা করুন (Ping)**.
   - You should see: `Webhook সার্ভার সম্পূর্ণ অনলাইন ও সক্রিয়!`.

---

## 🛠️ Build from Source

```bash
# Clone repository
git clone https://github.com/tawhid120/upi-autopay-android-gateway.git
cd upi-autopay-android-gateway

# Run tests
flutter test

# Build signed release APK
flutter build apk --release
```

---

## 🔒 Security & Privacy

- All payments are handled directly between your Android device and your own webhook server.
- No third-party data analytics, tracking, or remote key logging.
- Signed with official Tawhid Release Keystore (`payverify-release.jks`).
