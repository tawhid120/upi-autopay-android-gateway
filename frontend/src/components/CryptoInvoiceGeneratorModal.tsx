// NOTE: STRICT ENGLISH-ONLY UI. Clear, concise, and high-impact.
import React, { useState } from 'react';
import {
  FileText, Plus, Trash2, Check, Copy, ExternalLink, Printer,
  ShieldCheck, X, Sparkles, AlertCircle, ArrowRight, RefreshCw, Send,
  Wallet, Hash, Globe, CheckCircle2, Clock
} from 'lucide-react';
import { api } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';
import {
  CRYPTO_NETWORKS,
  CRYPTO_CURRENCIES,
  getExplorerUrl,
  getNetworkConfig
} from '../utils/cryptoExplorers';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface CryptoInvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceSaved?: (newInvoice: any) => void;
  initialData?: any;
}

export const CryptoInvoiceGeneratorModal: React.FC<CryptoInvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  onInvoiceSaved,
  initialData,
}) => {
  // Form State
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [telegramUsername, setTelegramUsername] = useState(initialData?.clientTelegramUsername || '');
  const [clientContact, setClientContact] = useState(initialData?.clientContact || '');
  const [serviceDurationOrType, setServiceDurationOrType] = useState(
    initialData?.serviceDurationOrType || 'Monthly Retainer'
  );

  const [cryptoCurrency, setCryptoCurrency] = useState(initialData?.cryptoCurrency || 'USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState(initialData?.cryptoNetwork || 'BEP20');
  const [receivingWalletAddress, setReceivingWalletAddress] = useState(
    initialData?.receivingWalletAddress || ''
  );
  const [txidHash, setTxidHash] = useState(initialData?.txidHash || '');
  const [paymentStatus, setPaymentStatus] = useState<'Draft' | 'Pending' | 'Paid' | 'Under Review'>(
    initialData?.paymentStatus || 'Pending'
  );

  const [dueDays, setDueDays] = useState('7');
  const [notes, setNotes] = useState(
    'Official freelance / digital service invoice for Binance AML compliance and on-chain verification.'
  );

  const [items, setItems] = useState<LineItem[]>([
    {
      description: 'Full-Stack Development & Smart Contract Integration',
      quantity: 1,
      unitPrice: 1500,
      amount: 1500,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(updated[index].quantity as any) || 0;
      const u = parseFloat(updated[index].unitPrice as any) || 0;
      updated[index].amount = q * u;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const total = subtotal;

  const handleSaveToDatabase = async () => {
    setErrorMsg(null);
    if (!customerName.trim()) {
      setErrorMsg('Client name is required.');
      return;
    }

    const sanitizedItems = items.map((it) => {
      const q = parseFloat(it.quantity as any) || 1;
      const u = parseFloat(it.unitPrice as any) || 0;
      return {
        description: it.description?.trim() || 'Service Item',
        quantity: q,
        unitPrice: u,
        amount: q * u,
      };
    });

    if (sanitizedItems.length === 0 || total <= 0) {
      setErrorMsg('Please specify at least one valid line item with an amount.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        customerName: customerName.trim(),
        customerPhone: clientContact.trim() || telegramUsername.trim() || 'N/A',
        customerEmail: clientContact.includes('@') && !clientContact.startsWith('@') ? clientContact.trim() : undefined,
        clientTelegramUsername: telegramUsername.trim(),
        clientContact: clientContact.trim() || telegramUsername.trim(),
        serviceDurationOrType: serviceDurationOrType.trim(),
        cryptoCurrency,
        cryptoNetwork,
        receivingWalletAddress: receivingWalletAddress.trim(),
        txidHash: txidHash.trim(),
        paymentStatus,
        dueDays: parseInt(dueDays, 10) || 7,
        notes: notes.trim(),
        items: sanitizedItems,
      };

      const res = await api.post('/invoices', payload);
      if (res.data?.success && res.data?.data) {
        setSavedInvoice(res.data.data);
        if (onInvoiceSaved) {
          onInvoiceSaved(res.data.data);
        }
      } else {
        throw new Error(res.data?.message || 'Failed to save invoice.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error saving invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPrintPdf = (invoiceId?: string) => {
    const id = invoiceId || savedInvoice?.id;
    if (id) {
      window.open(`/invoice/${id}`, '_blank');
    } else {
      // Prompt save first
      handleSaveToDatabase();
    }
  };

  const explorerUrl = txidHash ? getExplorerUrl(cryptoNetwork, txidHash) : null;
  const netConfig = getNetworkConfig(cryptoNetwork);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Crypto Audit Invoice Generator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                  AML/Binance Compliant
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate verifiable payment trail for digital services with blockchain TXID & client social handle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Notice if saved */}
        {savedInvoice && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Invoice #{savedInvoice.invoiceNumber} successfully saved to SQLite database!</span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Transaction recorded in persistent audit trail with status {savedInvoice.paymentStatus}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenPrintPdf(savedInvoice.id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Open / Print PDF</span>
              </button>
              <a
                href={savedInvoice.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/50 font-semibold text-xs flex items-center gap-1"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* BLOCK 1: Client Identifier */}
          <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Client Identifier (Social & Legal Handle)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Client / Company Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Telegram Username / Social Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono">@</span>
                  <input
                    type="text"
                    value={telegramUsername.replace(/^@/, '')}
                    onChange={(e) => setTelegramUsername(`@${e.target.value.replace(/^@/, '')}`)}
                    placeholder="satoshi_trader"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Client Email or Phone (Optional)
                </label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="alex@example.com or +1..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* BLOCK 2: Service & Scope Details */}
          <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Service Description & Billing Scope
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Duration / Type:</label>
                <input
                  type="text"
                  value={serviceDurationOrType}
                  onChange={(e) => setServiceDurationOrType(e.target.value)}
                  placeholder="e.g., Monthly Retainer (Oct 2026)"
                  className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 w-52"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Description of digital services rendered..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-16 px-2.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-center text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="relative w-28">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      placeholder="Price"
                      className="w-full pl-2.5 pr-8 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-right text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">
                      {cryptoCurrency}
                    </span>
                  </div>
                  <div className="w-24 text-right font-mono text-xs font-bold text-slate-900 dark:text-white px-2">
                    {item.amount.toLocaleString()} {cryptoCurrency}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">Grand Total:</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {total.toLocaleString()} {cryptoCurrency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCK 3: Cryptocurrency Settlement & Blockchain Compliance */}
          <div className="p-4.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>3. Cryptocurrency Settlement & Blockchain Audit Trail</span>
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Payment Status:</span>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="px-2.5 py-1 text-xs rounded-lg font-bold bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid (Verified)</option>
                  <option value="Under Review">Under Review</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Crypto Currency
                </label>
                <select
                  value={cryptoCurrency}
                  onChange={(e) => setCryptoCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {CRYPTO_CURRENCIES.map((cur) => (
                    <option key={cur} value={cur} className="dark:bg-slate-900">
                      {cur}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Crypto Network (Chain) *
                </label>
                <select
                  value={cryptoNetwork}
                  onChange={(e) => setCryptoNetwork(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {CRYPTO_NETWORKS.map((net) => (
                    <option key={net.id} value={net.id} className="dark:bg-slate-900">
                      {net.name} ({net.explorerName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Receiving Wallet Address */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Receiving Wallet Address (Your Binance / Deposit Address)</span>
                <span className="text-[10px] text-slate-400 font-mono">Format: {netConfig.samplePrefix ? `${netConfig.samplePrefix}...` : 'Address'}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={receivingWalletAddress}
                  onChange={(e) => setReceivingWalletAddress(e.target.value)}
                  placeholder="Paste your deposit address shown to client (e.g. 0x71C83d3e... or T...)"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* TXID (Transaction Hash) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Blockchain TXID / Transaction Hash (Irrefutable Proof)</span>
                </span>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <span>View on {netConfig.explorerName}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </label>
              <input
                type="text"
                value={txidHash}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setTxidHash(val);
                  if (val && paymentStatus === 'Pending') {
                    setPaymentStatus('Paid');
                  }
                }}
                placeholder="Paste the on-chain hash once client completes payment (e.g. 0x4a9d72c1c2438c8...)"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Pasting the TXID links this invoice to the immutable block explorer audit record.
              </p>
            </div>
          </div>

          {/* BLOCK 4: Compliance Memo & Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                AML Compliance Memo / Contract Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Due In (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Billable:</span>
            <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
              {total.toLocaleString()} {cryptoCurrency}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>

            {/* Explicit Save to History / Database Button */}
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={saving}
              className="px-4.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save to History / Database</span>
                </>
              )}
            </button>

            {/* PDF Download / Print Button */}
            <button
              type="button"
              onClick={() => handleOpenPrintPdf()}
              className="px-4.5 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Download / Print PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
