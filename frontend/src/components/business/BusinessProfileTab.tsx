// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Upload, Globe, Mail, Phone, MapPin, FileText,
  DollarSign, CheckCircle2, AlertCircle, RefreshCw, Eye,
  ShieldCheck, Sparkles, Image as ImageIcon, Trash2
} from 'lucide-react';
import { api } from '../../services/api';

interface BusinessProfile {
  id: string;
  merchant_id: string;
  business_name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  business_type?: string;
  tax_vat_number?: string;
  invoice_prefix?: string;
  receipt_prefix?: string;
  currency?: string;
  currency_symbol?: string;
  terms_and_conditions?: string;
}

const BUSINESS_TYPES = [
  'Freelancer / Independent Contractor',
  'Software & IT Agency',
  'Digital Marketing & Creative Studio',
  'E-Commerce & Retail Brand',
  'Wholesale & Distribution',
  'Consulting & Professional Services',
  'Education & Coaching',
  'General Trading / Other'
];

export const BusinessProfileTab: React.FC = () => {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'Software & IT Agency',
    logoUrl: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    taxVatNumber: '',
    invoicePrefix: 'INV-',
    receiptPrefix: 'REC-',
    currency: 'BDT',
    currencySymbol: '৳',
    termsAndConditions: 'Thank you for your business. Please verify all bKash/Nagad transactions using the automatic verification link or provide TrxID.'
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/business/profile');
      if (res.data.success && res.data.data) {
        const p = res.data.data;
        setProfile(p);
        setFormData({
          businessName: p.business_name || '',
          businessType: p.business_type || 'Software & IT Agency',
          logoUrl: p.logo_url || '',
          phone: p.phone || '',
          email: p.email || '',
          website: p.website || '',
          address: p.address || '',
          taxVatNumber: p.tax_vat_number || '',
          invoicePrefix: p.invoice_prefix || 'INV-',
          receiptPrefix: p.receipt_prefix || 'REC-',
          currency: p.currency || 'BDT',
          currencySymbol: p.currency_symbol || '৳',
          termsAndConditions: p.terms_and_conditions || 'Thank you for your business. Please verify all bKash/Nagad transactions using the automatic verification link.'
        });
      }
    } catch (err: any) {
      console.error('Failed to load business profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Image size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.businessName.trim()) {
      setErrorMessage('Business name is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/business/profile', {
        businessName: formData.businessName.trim(),
        businessType: formData.businessType,
        logoUrl: formData.logoUrl || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        address: formData.address.trim() || undefined,
        taxVatNumber: formData.taxVatNumber.trim() || undefined,
        invoicePrefix: formData.invoicePrefix.trim() || 'INV-',
        receiptPrefix: formData.receiptPrefix.trim() || 'REC-',
        currency: formData.currency || 'BDT',
        currencySymbol: formData.currencySymbol || '৳',
        termsAndConditions: formData.termsAndConditions.trim() || undefined
      });

      if (res.data.success) {
        setSuccessMessage('Business profile and invoice branding saved successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
        setProfile(res.data.data);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update business profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <p className="text-sm text-slate-500">Loading business branding profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Building2 className="w-7 h-7 text-blue-600" />
          Business Profile & Invoice Branding
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your business identity, legal details, logo, invoice prefixes, and payment instructions.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Logo Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Brand Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Image
                  </button>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                  <span className="text-xs text-slate-400 w-full sm:w-auto">PNG, JPG, SVG up to 2MB</span>
                </div>
              </div>
            </div>

            {/* Business Name & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Business / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. Acme Agency BD"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Industry / Business Type
                </label>
                <select
                  value={formData.businessType}
                  onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BUSINESS_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Official Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+880 17..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Official Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="billing@company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://acme.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Address & Tax ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Office Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Level 5, Dhanmondi 27, Dhaka"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  BIN / TIN / Trade License No
                </label>
                <input
                  type="text"
                  value={formData.taxVatNumber}
                  onChange={e => setFormData({ ...formData, taxVatNumber: e.target.value })}
                  placeholder="e.g. BIN-00281923"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Numbering & Currency Prefixes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  placeholder="INV-"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Preview: {formData.invoicePrefix}2026-0001</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Receipt Prefix
                </label>
                <input
                  type="text"
                  value={formData.receiptPrefix}
                  onChange={e => setFormData({ ...formData, receiptPrefix: e.target.value })}
                  placeholder="REC-"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Preview: {formData.receiptPrefix}2026-0001</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                  placeholder="৳"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Standard Terms & Payment Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Default Terms & Payment Instructions
              </label>
              <textarea
                rows={3}
                value={formData.termsAndConditions}
                onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                placeholder="Instructions displayed at bottom of customer invoices and receipts..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Clients see this text at the bottom of generated PDF invoices and public payment links.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                Save Business Profile
              </button>
            </div>
          </form>
        </div>

        {/* Live Invoice Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600" />
              Live Invoice Header Preview
            </h2>
            <span className="text-xs text-slate-400 font-medium">Real-time preview</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-6 space-y-6">
            {/* Header branding preview */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Brand"
                    className="w-12 h-12 rounded-lg object-contain border border-slate-100 dark:border-slate-800 bg-slate-50"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-600 text-white font-black text-lg flex items-center justify-center">
                    {(formData.businessName || 'PV').substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {formData.businessName || 'Your Business Name'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{formData.businessType}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs tracking-wider">
                  INVOICE
                </span>
                <div className="text-xs font-mono text-slate-500 mt-1">
                  {formData.invoicePrefix}2026-0001
                </div>
              </div>
            </div>

            {/* Address & contact details preview */}
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {formData.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{formData.address}</span>
                </div>
              )}
              {formData.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{formData.phone}</span>
                </div>
              )}
              {formData.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{formData.email}</span>
                </div>
              )}
              {formData.taxVatNumber && (
                <div className="pt-1 font-mono text-[11px] text-slate-500">
                  Tax / VAT ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{formData.taxVatNumber}</span>
                </div>
              )}
            </div>

            {/* Dummy Line Item & Total */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
                <span>Web Application Architecture & Development</span>
                <span>{formData.currencySymbol}50,000.00</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Total Amount Due</span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold">{formData.currencySymbol}50,000.00</span>
              </div>
            </div>

            {/* Terms footer preview */}
            {formData.termsAndConditions && (
              <div className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800">
                "{formData.termsAndConditions}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
