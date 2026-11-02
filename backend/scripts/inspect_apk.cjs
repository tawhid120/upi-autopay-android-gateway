const fs = require('fs');
const path = require('path');

const TARGET_SIGNATURES = [
  { name: 'Google/Firebase API Key (AIzaSy...)', regex: /AIzaSy[A-Za-z0-9_\-]{33}/g },
  { name: 'Live Merchant API Secret (pv_live_...)', regex: /pv_live_[A-Za-z0-9]{16,}/g },
  { name: 'Webhook Signing Secret (whsec_...)', regex: /whsec_[A-Za-z0-9]{16,}/g },
  { name: 'Default Super Admin Password (Admin@...)', regex: /Admin@123456/g },
  { name: 'Firebase Service Account Marker', regex: /"type":\s*"service_account"/g },
  { name: 'RSA/Private Key Header', regex: /-----BEGIN (RSA )?PRIVATE KEY-----/g },
];

function inspectApk(apkPath) {
  if (!fs.existsSync(apkPath)) {
    console.error(`[ERROR] APK file not found at: ${apkPath}`);
    return;
  }

  console.log('====================================================');
  console.log(`🔍 Inspecting APK: ${path.basename(apkPath)}`);
  console.log(`📦 Size: ${(fs.statSync(apkPath).size / (1024 * 1024)).toFixed(2)} MB`);
  console.log('====================================================\n');

  const apkBuffer = fs.readFileSync(apkPath);
  const apkString = apkBuffer.toString('latin1');

  let leakDetected = false;

  for (const sig of TARGET_SIGNATURES) {
    const matches = apkString.match(sig.regex);
    if (matches && matches.length > 0) {
      console.log(`❌ VULNERABILITY FOUND: ${sig.name}`);
      console.log(`   ➜ Matches found: ${matches.length}`);
      console.log(`   ➜ Sample: ${matches[0].substring(0, 10)}...`);
      leakDetected = true;
    } else {
      console.log(`✅ CLEAN: ${sig.name} (0 occurrences)`);
    }
  }

  console.log('\n----------------------------------------------------');
  if (leakDetected) {
    console.log('🚨 AUDIT STATUS: FAILED (Sensitive credentials leaked into APK!)');
  } else {
    console.log('🛡️ AUDIT STATUS: PASSED (Zero hardcoded credentials found in compiled APK binary)');
  }
  console.log('----------------------------------------------------');
}

if (process.argv[2]) {
  inspectApk(process.argv[2]);
}

module.exports = { inspectApk };
