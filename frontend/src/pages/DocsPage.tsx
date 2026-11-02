// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Copy, Check, Terminal, Code2, Lock, Webhook, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { copyToClipboard } from '../utils/clipboard';

export const DocsPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const createOrderRequestJson = `{
  "orderId": "INV-10293",
  "amount": 1250.00,
  "customerPhone": "01712345678",
  "customerName": "Rahim Ahmed",
  "redirectUrl": "https://yourshop.com/checkout/success",
  "cancelUrl": "https://yourshop.com/checkout/cancel",
  "expiryMinutes": 20
}`;

  const createOrderResponseJson = `{
  "success": true,
  "data": {
    "paymentId": "550e8400-e29b-41d4-a716-446655440000",
    "orderId": "INV-10293",
    "amount": 1250,
    "checkoutUrl": "http://localhost:5173/pay/550e8400-e29b-41d4-a716-446655440000",
    "expiresAt": "2026-09-03T13:45:00.000Z"
  }
}`;

  const webhookCodeSnippet = `const crypto = require('crypto');

app.post('/api/payviro-webhook', (req, res) => {
  const secret = process.env.PAYVIRO_WEBHOOK_SECRET;
  const timestamp = req.headers['x-payviro-timestamp'];
  const sigHeader = req.headers['x-payviro-signature']; // format: t=...,v1=...

  const signature = sigHeader.split('v1=')[1];
  const payloadString = JSON.stringify(req.body);

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${payloadString}\`)
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(400).send('Invalid HMAC Signature');
  }

  // Signature valid! Mark order as paid:
  const { trxId, amount, orderId } = req.body.data;
  console.log(\`Order \${orderId} paid with TrxID \${trxId}\`);

  res.status(200).send('OK');
});`;

  return (
    <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-white/10 py-3.5 px-6 sm:px-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#37e58a] via-[#12b56a] to-[#0a8f52] flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4.5 h-4.5 text-white stroke-[2.4]" />
              </span>
              <span className="jak font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                Payviro<span className="text-[#37e58a]">.</span> Docs
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="dropdown" />
            <Link
              to="/dashboard"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-white flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 sm:py-14 space-y-10">
        {/* Section 1: Intro */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
            <Code2 className="w-3.5 h-3.5" />
            <span>Developer Reference v1.2</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
            Payviro <span className="hl-green">REST API</span> & Webhook Specifications
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            Integrate seamless bKash, Nagad, and Rocket automated payment verification with hosted checkout sessions and <span className="hl-underline">cryptographically signed webhooks</span>.
          </p>
        </div>

        {/* API Authentication */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 space-y-4">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">API Authentication</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Include your merchant API key in the <code className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">X-API-Key</code> request header with every API call.
          </p>
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-emerald-300 flex items-center justify-between border border-slate-800">
            <span>X-API-Key: pv_live_a89d7f4e92b1c8...</span>
            <button
              type="button"
              onClick={() => handleCopy('X-API-Key: pv_live_a89d7f4e92b1c8...', 'api-header')}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copy header format"
            >
              {copiedId === 'api-header' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Endpoint 1: Create Order */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              POST
            </span>
            <code className="text-sm font-mono font-bold text-slate-900 dark:text-white">/api/v1/payments/create-order</code>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Creates a hosted checkout session and returns a secure payment redirect URL.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-400">Request Body (JSON):</span>
              <button
                type="button"
                onClick={() => handleCopy(createOrderRequestJson, 'req-json')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                {copiedId === 'req-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'req-json' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl font-mono text-xs text-emerald-200 overflow-x-auto border border-slate-800">
              {createOrderRequestJson}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-400">Response (201 Created):</span>
              <button
                type="button"
                onClick={() => handleCopy(createOrderResponseJson, 'res-json')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                {copiedId === 'res-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'res-json' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
              {createOrderResponseJson}
            </pre>
          </div>
        </div>

        {/* Webhook Signature Verification Guide */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 space-y-6">
          <div className="flex items-center space-x-2">
            <Webhook className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Webhook <span className="hl-green">HMAC-SHA256</span> Verification
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Validate incoming notifications against replay and tampering attacks using the <code className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">X-Payviro-Signature</code> header:
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-400">Node.js (Express) Webhook Receiver:</span>
              <button
                type="button"
                onClick={() => handleCopy(webhookCodeSnippet, 'webhook-code')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                {copiedId === 'webhook-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'webhook-code' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto border border-slate-800">
              {webhookCodeSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
