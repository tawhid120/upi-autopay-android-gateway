// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Printer, Copy, Check, X, Phone, Mail, MapPin, Building,
  Calendar, CreditCard, CheckCircle, AlertCircle, Search, MessageSquare,
  DollarSign, ArrowUpRight, Share2, Layers, Briefcase, Users, User,
  Edit3, Plus, Trash2, RotateCcw, Eye, Filter, CheckSquare, Square,
  SlidersHorizontal, ChevronLeft, ChevronRight, Sparkles, BookOpen
} from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../utils/clipboard';

export interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string | null;
  initialCustomerIds?: string[];
}

// Default spec template matching the Google Drive reference image
const DEFAULT_SPECS_TEMPLATE = [
  {
    title: 'For LMS -',
    technologies: 'WordPress',
    themePlugin: 'Tutor LMS, Elementor',
    featuresTitle: 'Features:',
    bullets: [
      'LMS all features (Course, Assignment, Certificate, etc)',
      'Responsive & Mobile-Friendly Layout',
      'Contact Forms & Lead Capture Integration',
      'Fast & SEO-Friendly Structure'
    ]
  },
  {
    title: 'For Automation -',
    technologies: 'n8n Workflow Automation',
    featuresTitle: 'Features:',
    bullets: [
      'Auto post to social media & webhooks.',
      'Trading View Snapshot to pro user.',
      'Custom alert notifications.',
      'Data export (CSV / Excel).'
    ]
  },
  {
    title: 'Others - Details',
    technologies: '',
    themePlugin: '',
    featuresTitle: '',
    bullets: [
      'API: Trading View, LinkedIn, Twitter',
      'Full setup and configuration.'
    ]
  },
  {
    title: 'Others - guides and documentation.',
    technologies: '',
    themePlugin: '',
    featuresTitle: '',
    bullets: [
      'Total Revisions - 5 Times',
      'Delivery Timeline - 20 Working Days',
      'Customer Support - WhatsApp / Phone'
    ]
  }
];

const DEFAULT_NOTES_TEMPLATE = [
  'Full access control (Admin Dashboard)',
  '1-Year Warranty & Technical Support Included',
  'Website Maintenance Training Video Provided'
];

interface EditableStatementDoc {
  documentType: string;
  documentNumber: string;
  issueDate: string;
  validUntilDate: string;
  companyNameLine1: string;
  companyNameLine2: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  customerName: string;
  companyName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  specs: Array<{
    title: string;
    technologies?: string;
    themePlugin?: string;
    featuresTitle?: string;
    bullets: string[];
  }>;
  notes: string[];
  subtotal: number;
  totalPaid: number;
  totalDue: number;
  paymentRecord?: {
    method: string;
    receiverPhone: string;
    senderPhone: string;
    trxId: string;
    paidAmount: number;
    paymentDate: string;
    paymentStatus: string;
    channelNote?: string;
  };
  paymentMethods?: {
    bkash: string;
    nagad: string;
    rocket: string;
    instructions?: string;
  };
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
  initialCustomerIds = [],
}) => {
  // Mode: 'single' | 'batch'
  const [mode, setMode] = useState<'single' | 'batch'>(initialCustomerIds.length > 1 ? 'batch' : 'single');
  const [batchView, setBatchView] = useState<'individual_pages' | 'master_ledger'>('individual_pages');

  // Customer selection list
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(initialCustomerIds);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | 'due' | 'settled'>('all');

  // Statement data cache
  const [statementData, setStatementData] = useState<any | null>(null);
  const [batchStatements, setBatchStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Active page index for batch individual preview
  const [batchActiveIndex, setBatchActiveIndex] = useState(0);

  // Edit / Customizer mode
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editableDoc, setEditableDoc] = useState<EditableStatementDoc | null>(null);

  // Utilities
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // 1. Fetch all customers list
  useEffect(() => {
    if (!isOpen) return;
    const fetchCustomersList = async () => {
      try {
        const res = await api.get('/business/customers');
        const list = res.data.data || [];
        setCustomers(list);

        // Set initial single customer if none
        if (!selectedCustomerId && list.length > 0) {
          const firstId = initialCustomerId || list[0].id;
          setSelectedCustomerId(firstId);
        }

        // Set initial selected customer ids for batch
        if (selectedCustomerIds.length === 0 && list.length > 0) {
          if (initialCustomerIds && initialCustomerIds.length > 0) {
            setSelectedCustomerIds(initialCustomerIds);
          } else {
            // Default select first 5 or all
            setSelectedCustomerIds(list.slice(0, Math.min(5, list.length)).map((c: any) => c.id));
          }
        }
      } catch (err) {
        console.error('Failed to load customers for statement modal', err);
      }
    };
    fetchCustomersList();
  }, [isOpen]);

  // Handle external prop changes
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      setMode('single');
    }
  }, [initialCustomerId]);

  useEffect(() => {
    if (initialCustomerIds && initialCustomerIds.length > 1) {
      setSelectedCustomerIds(initialCustomerIds);
      setMode('batch');
    }
  }, [initialCustomerIds]);

  // 2. Fetch single customer statement data
  useEffect(() => {
    if (!isOpen || !selectedCustomerId) return;
    const fetchStatement = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/business/customers/${selectedCustomerId}`);
        const data = res.data.data;
        setStatementData(data);
        initEditableDocFromData(data);
      } catch (err) {
        console.error('Failed to load customer statement', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatement();
  }, [isOpen, selectedCustomerId]);

  // 3. Fetch batch customer statements when entering batch mode or selectedCustomerIds change
  useEffect(() => {
    if (!isOpen || mode !== 'batch' || selectedCustomerIds.length === 0) return;
    const fetchBatchData = async () => {
      try {
        setBatchLoading(true);
        const res = await api.post('/business/customers/batch-statement', {
          customerIds: selectedCustomerIds,
        });
        setBatchStatements(res.data.data || []);
      } catch (err) {
        console.error('Failed to load batch statements', err);
      } finally {
        setBatchLoading(false);
      }
    };
    fetchBatchData();
  }, [isOpen, mode, selectedCustomerIds]);

  // Helper to initialize editable doc state from raw statement data
  const initEditableDocFromData = (data: any, customDocType: string = 'Invoice') => {
    if (!data || !data.customer) return;
    const customer = data.customer;
    const allServices = data.allServices || [];
    const summary = data.statementSummary || {};
    const business = data.businessProfile || {};
    let rawBusinessName = business?.business_name || 'Payviro';
    if (rawBusinessName.toLowerCase().includes('tawhid') || rawBusinessName.toLowerCase().includes('hablu')) {
      rawBusinessName = 'Payviro';
    }
    const primaryName = rawBusinessName.trim();
    const secondaryName = '';

    const defaultItems =
      allServices.length > 0
        ? allServices.map((s: any) => ({
            description: s.description || 'Service Deliverable',
            quantity: Number(s.quantity) || 1,
            unitPrice: Number(s.unitPrice) || 0,
            amount: Number(s.amount) || (Number(s.quantity) || 1) * (Number(s.unitPrice) || 0),
          }))
        : [
            {
              description: 'LMS Website Development',
              quantity: 1,
              unitPrice: 150000,
              amount: 150000,
            },
            {
              description: 'Automation Agent Development',
              quantity: 1,
              unitPrice: 100000,
              amount: 100000,
            },
          ];

    const calculatedSubtotal = defaultItems.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);

    const docNumber = `#260625002`;
    const issueDateStr = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const validUntilStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    setEditableDoc({
      documentType: customDocType,
      documentNumber: docNumber,
      issueDate: issueDateStr,
      validUntilDate: validUntilStr,
      companyNameLine1: primaryName,
      companyNameLine2: secondaryName,
      companyAddress: business?.address || 'Dhaka, Bangladesh',
      companyPhone: business?.phone || '01915575697',
      companyEmail: business?.email || 'support@payviro.duckdns.org',
      companyWebsite: business?.website || 'payviro.duckdns.org',
      customerName: customer.name || 'Valued Customer',
      companyName: customer.company_name || '',
      customerAddress: customer.address || 'Dhaka, Bangladesh',
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      currency: business?.currency_symbol || '৳',
      lineItems: defaultItems,
      specs: JSON.parse(JSON.stringify(DEFAULT_SPECS_TEMPLATE)),
      notes: [...DEFAULT_NOTES_TEMPLATE],
      subtotal: calculatedSubtotal,
      totalPaid: Number(summary.totalPaid || customer.total_paid || 0),
      totalDue: Number(summary.totalDue || customer.total_due || 0),
      paymentRecord: {
        method: (data.receipts && data.receipts[0]?.payment_method) || 'bKash',
        receiverPhone: business?.phone || '01915575697',
        senderPhone: customer.phone || '01838234459',
        trxId: (data.receipts && data.receipts[0]?.trx_id) || 'DHP1S0LOD5',
        paidAmount: Number(
          (data.receipts && (data.receipts[0]?.paid_amount || data.receipts[0]?.amount_received)) ||
            summary.totalPaid ||
            customer.total_paid ||
            calculatedSubtotal ||
            150000
        ),
        paymentDate:
          (data.receipts && data.receipts[0]?.payment_date)
            ? new Date(data.receipts[0].payment_date).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : customer.last_payment_date
            ? new Date(customer.last_payment_date).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '25 Aug 2026, 05:40 PM',
        paymentStatus: (data.receipts && data.receipts[0]?.payment_status) || 'PAID & VERIFIED',
        channelNote: 'Instant Verification via Payviro Gateway (Clean TrxID)',
      },
      paymentMethods: {
        bkash: '01915575697',
        nagad: '01915575697',
        rocket: '01915575697',
        instructions: 'Payment already received & verified via Payviro Gateway.',
      },
    });
  };

  // Re-calculate subtotal whenever line items change
  const handleItemChange = (index: number, field: string, val: any) => {
    if (!editableDoc) return;
    const updatedItems = [...editableDoc.lineItems];
    const item = { ...updatedItems[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(val) : Number(item.quantity);
      const p = field === 'unitPrice' ? Number(val) : Number(item.unitPrice);
      item.amount = (q || 0) * (p || 0);
    }
    updatedItems[index] = item;
    const newSubtotal = updatedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    setEditableDoc({
      ...editableDoc,
      lineItems: updatedItems,
      subtotal: newSubtotal,
    });
  };

  const handleAddItem = () => {
    if (!editableDoc) return;
    const newItem = {
      description: 'Custom Service / Deliverable',
      quantity: 1,
      unitPrice: 10000,
      amount: 10000,
    };
    const updatedItems = [...editableDoc.lineItems, newItem];
    const newSubtotal = updatedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    setEditableDoc({
      ...editableDoc,
      lineItems: updatedItems,
      subtotal: newSubtotal,
    });
  };

  const handleDeleteItem = (index: number) => {
    if (!editableDoc || editableDoc.lineItems.length <= 1) return;
    const updatedItems = editableDoc.lineItems.filter((_, i) => i !== index);
    const newSubtotal = updatedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    setEditableDoc({
      ...editableDoc,
      lineItems: updatedItems,
      subtotal: newSubtotal,
    });
  };

  // Specifications editing handlers
  const handleSpecTitleChange = (specIndex: number, val: string) => {
    if (!editableDoc) return;
    const updatedSpecs = [...editableDoc.specs];
    updatedSpecs[specIndex] = { ...updatedSpecs[specIndex], title: val };
    setEditableDoc({ ...editableDoc, specs: updatedSpecs });
  };

  const handleSpecFieldChange = (specIndex: number, field: string, val: string) => {
    if (!editableDoc) return;
    const updatedSpecs = [...editableDoc.specs];
    updatedSpecs[specIndex] = { ...updatedSpecs[specIndex], [field]: val };
    setEditableDoc({ ...editableDoc, specs: updatedSpecs });
  };

  const handleSpecBulletChange = (specIndex: number, bulletIndex: number, val: string) => {
    if (!editableDoc) return;
    const updatedSpecs = [...editableDoc.specs];
    const updatedBullets = [...updatedSpecs[specIndex].bullets];
    updatedBullets[bulletIndex] = val;
    updatedSpecs[specIndex] = { ...updatedSpecs[specIndex], bullets: updatedBullets };
    setEditableDoc({ ...editableDoc, specs: updatedSpecs });
  };

  const handleAddSpecBullet = (specIndex: number) => {
    if (!editableDoc) return;
    const updatedSpecs = [...editableDoc.specs];
    updatedSpecs[specIndex] = {
      ...updatedSpecs[specIndex],
      bullets: [...updatedSpecs[specIndex].bullets, 'New deliverable specification item'],
    };
    setEditableDoc({ ...editableDoc, specs: updatedSpecs });
  };

  const handleDeleteSpecBullet = (specIndex: number, bulletIndex: number) => {
    if (!editableDoc) return;
    const updatedSpecs = [...editableDoc.specs];
    const updatedBullets = updatedSpecs[specIndex].bullets.filter((_, i) => i !== bulletIndex);
    updatedSpecs[specIndex] = { ...updatedSpecs[specIndex], bullets: updatedBullets };
    setEditableDoc({ ...editableDoc, specs: updatedSpecs });
  };

  const handleAddSpecSection = () => {
    if (!editableDoc) return;
    const newSection = {
      title: 'New Section - Scope & Requirements',
      technologies: '',
      themePlugin: '',
      featuresTitle: 'Deliverables:',
      bullets: ['High-performance system deployment', 'Full API integration & testing'],
    };
    setEditableDoc({
      ...editableDoc,
      specs: [...editableDoc.specs, newSection],
    });
  };

  const handleDeleteSpecSection = (specIndex: number) => {
    if (!editableDoc || editableDoc.specs.length <= 1) return;
    const updatedSpecs = editableDoc.specs.filter((_, i) => i !== specIndex);
    setEditableDoc({ ...editableDoc, specs: updatedSpecs });
  };

  // Notes editing handlers
  const handleNoteChange = (index: number, val: string) => {
    if (!editableDoc) return;
    const updated = [...editableDoc.notes];
    updated[index] = val;
    setEditableDoc({ ...editableDoc, notes: updated });
  };

  const handleAddNote = () => {
    if (!editableDoc) return;
    setEditableDoc({
      ...editableDoc,
      notes: [...editableDoc.notes, 'Official corporate warranty & maintenance clause.'],
    });
  };

  const handleDeleteNote = (index: number) => {
    if (!editableDoc || editableDoc.notes.length <= 1) return;
    setEditableDoc({
      ...editableDoc,
      notes: editableDoc.notes.filter((_, i) => i !== index),
    });
  };

  const handleResetToDatabase = () => {
    if (statementData) {
      initEditableDocFromData(statementData, editableDoc?.documentType || 'Invoice');
    }
  };

  // Filtered customer list for customer selection drawer
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery) ||
        (c.company_name && c.company_name.toLowerCase().includes(customerSearchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (customerStatusFilter === 'due') return (c.total_due || 0) > 0;
      if (customerStatusFilter === 'settled') return (c.total_due || 0) <= 0;
      return true;
    });
  }, [customers, customerSearchQuery, customerStatusFilter]);

  const handleToggleSelectCustomer = (id: string) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter((cid) => cid !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredCustomers.map((c) => c.id);
    const combined = Array.from(new Set([...selectedCustomerIds, ...allFilteredIds]));
    setSelectedCustomerIds(combined);
  };

  const handleDeselectAll = () => {
    setSelectedCustomerIds([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    if (!selectedCustomerId) return;
    const url = `${window.location.origin}/customer-statement/${selectedCustomerId}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!isOpen) return null;

  // Render active document (either editableDoc in single mode, or active batch customer)
  const activeDoc = editableDoc;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* ======================================================== */}
      {/* PRINT CSS STYLES FOR EXACT A4 PIXEL-PERFECT CORPORATE   */}
      {/* ======================================================== */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: white !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .statement-modal-wrapper {
                position: static !important;
                inset: auto !important;
                padding: 0 !important;
                background: white !important;
                overflow: visible !important;
                box-shadow: none !important;
                border: none !important;
                max-width: 100% !important;
                max-height: none !important;
                width: 100% !important;
              }
              .statement-sheet {
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: #000 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 10mm 12mm !important;
                margin: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .page-break {
                page-break-after: always !important;
                break-after: page !important;
              }
              .page-break:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .bg-\\[\\#c8501e\\] {
                background-color: #c8501e !important;
                color: white !important;
              }
              .border-\\[\\#c8501e\\] {
                border-color: #c8501e !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `,
        }}
      />

      <div className="statement-modal-wrapper relative w-full max-w-6xl h-full sm:h-[96vh] flex flex-col bg-white dark:bg-[#0c120f] border border-slate-200 dark:border-white/10 sm:rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* ======================================================== */}
        {/* TOP MAIN TOOLBAR (NO-PRINT)                              */}
        {/* ======================================================== */}
        <div className="no-print shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/95 dark:bg-black/60 backdrop-blur flex flex-wrap items-center justify-between gap-3 z-30">
          {/* Brand & Mode Switcher */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#c8501e]/10 text-[#c8501e]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Statement & Invoice Studio
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#c8501e]/15 text-[#c8501e] border border-[#c8501e]/30 font-semibold">
                  Hybrid A4 Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Single customer statement, multi-user batch print, and live content editor
              </p>
            </div>
          </div>

          {/* Center Tabs: Single vs Multi-User */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-white/10 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('single');
                setIsCustomizing(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'single'
                  ? 'bg-white dark:bg-[#0c120f] text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Single Customer</span>
            </button>

            <button
              onClick={() => {
                setMode('batch');
                setIsCustomizing(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'batch'
                  ? 'bg-white dark:bg-[#0c120f] text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Multi-Customer ({selectedCustomerIds.length})</span>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {mode === 'single' ? (
              <>
                {/* Document Type Switcher */}
                <select
                  value={editableDoc?.documentType || 'Invoice'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editableDoc) {
                      setEditableDoc({ ...editableDoc, documentType: val });
                    }
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#c8501e]"
                >
                  <option value="Invoice">Invoice</option>
                  <option value="Statement">Statement</option>
                  <option value="Quotation">Quotation</option>
                  <option value="Estimate">Estimate</option>
                  <option value="Account Summary">Account Summary</option>
                </select>

                {/* Single Customer Dropdown */}
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#c8501e] max-w-[140px] sm:max-w-[180px] truncate"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {c.name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                </select>

                {/* Edit / Customizer Toggle */}
                <button
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isCustomizing
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                  }`}
                  title="Edit PDF Content & Values"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isCustomizing ? 'Done Editing' : 'Edit PDF'}</span>
                </button>

                {/* Share Link */}
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy Public Link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Link'}</span>
                </button>
              </>
            ) : (
              <>
                {/* Batch View Toggle */}
                <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs">
                  <button
                    onClick={() => setBatchView('individual_pages')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      batchView === 'individual_pages'
                        ? 'bg-[#c8501e] text-white font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    All Pages ({selectedCustomerIds.length})
                  </button>
                  <button
                    onClick={() => setBatchView('master_ledger')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      batchView === 'master_ledger'
                        ? 'bg-[#c8501e] text-white font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Master Ledger
                  </button>
                </div>

                {/* Customer Picker Drawer Button */}
                <button
                  onClick={() => setShowCustomerPicker(true)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#c8501e]" />
                  <span>Select Users ({selectedCustomerIds.length})</span>
                </button>
              </>
            )}

            {/* Print / Save as PDF */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#c8501e] hover:bg-[#b04316] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#c8501e]/25 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN BODY: SPLIT VIEW (EDITOR DRAWER + PREVIEW CONTAINER) */}
        {/* ======================================================== */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* ======================================================== */}
          {/* LIVE CUSTOMIZER / EDITOR DRAWER (COLLAPSIBLE)             */}
          {/* ======================================================== */}
          {mode === 'single' && isCustomizing && editableDoc && (
            <div className="no-print w-full sm:w-[380px] lg:w-[420px] shrink-0 border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0e1613] overflow-y-auto p-4 sm:p-5 space-y-5 text-xs z-20 shadow-xl animate-fade-in">
              {/* Editor Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#c8501e]" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Customize Document
                  </span>
                </div>
                <button
                  onClick={handleResetToDatabase}
                  className="text-[11px] text-[#c8501e] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  title="Reset to customer database values"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Data</span>
                </button>
              </div>

              {/* 1. Document Metadata */}
              <div className="space-y-3 bg-white dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-[#c8501e]" />
                  <span>Document Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Doc Title
                    </label>
                    <input
                      type="text"
                      value={editableDoc.documentType}
                      onChange={(e) => setEditableDoc({ ...editableDoc, documentType: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#c8501e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Doc Number
                    </label>
                    <input
                      type="text"
                      value={editableDoc.documentNumber}
                      onChange={(e) => setEditableDoc({ ...editableDoc, documentNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#c8501e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Date
                    </label>
                    <input
                      type="text"
                      value={editableDoc.issueDate}
                      onChange={(e) => setEditableDoc({ ...editableDoc, issueDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#c8501e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Valid Until
                    </label>
                    <input
                      type="text"
                      value={editableDoc.validUntilDate}
                      onChange={(e) => setEditableDoc({ ...editableDoc, validUntilDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#c8501e]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Company Info */}
              <div className="space-y-3 bg-white dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Building className="w-3.5 h-3.5 text-[#c8501e]" />
                  <span>Company Branding</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Brand Word 1
                    </label>
                    <input
                      type="text"
                      value={editableDoc.companyNameLine1}
                      onChange={(e) => setEditableDoc({ ...editableDoc, companyNameLine1: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Brand Word 2
                    </label>
                    <input
                      type="text"
                      value={editableDoc.companyNameLine2}
                      onChange={(e) => setEditableDoc({ ...editableDoc, companyNameLine2: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-black uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editableDoc.companyAddress}
                    onChange={(e) => setEditableDoc({ ...editableDoc, companyAddress: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Phone Numbers
                    </label>
                    <input
                      type="text"
                      value={editableDoc.companyPhone}
                      onChange={(e) => setEditableDoc({ ...editableDoc, companyPhone: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Email
                    </label>
                    <input
                      type="text"
                      value={editableDoc.companyEmail}
                      onChange={(e) => setEditableDoc({ ...editableDoc, companyEmail: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={editableDoc.companyWebsite}
                    onChange={(e) => setEditableDoc({ ...editableDoc, companyWebsite: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* 3. Customer Info */}
              <div className="space-y-3 bg-white dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-[#c8501e]" />
                  <span>Customer (To:)</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={editableDoc.customerName}
                      onChange={(e) => setEditableDoc({ ...editableDoc, customerName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={editableDoc.companyName}
                      onChange={(e) => setEditableDoc({ ...editableDoc, companyName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Customer Address
                  </label>
                  <input
                    type="text"
                    value={editableDoc.customerAddress}
                    onChange={(e) => setEditableDoc({ ...editableDoc, customerAddress: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Customer Phone
                    </label>
                    <input
                      type="text"
                      value={editableDoc.customerPhone}
                      onChange={(e) => setEditableDoc({ ...editableDoc, customerPhone: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Customer Email
                    </label>
                    <input
                      type="text"
                      value={editableDoc.customerEmail}
                      onChange={(e) => setEditableDoc({ ...editableDoc, customerEmail: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Line Items Table Editor */}
              <div className="space-y-3 bg-white dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <DollarSign className="w-3.5 h-3.5 text-[#c8501e]" />
                    <span>Line Items & Pricing</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2 py-1 rounded-md bg-[#c8501e]/15 hover:bg-[#c8501e]/25 text-[#c8501e] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editableDoc.lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Item #{idx + 1}</span>
                        {editableDoc.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Delete line item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Description of service / product"
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-semibold"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] uppercase text-slate-400 font-semibold block">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-slate-400 font-semibold block">Price</label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-slate-400 font-semibold block">Total</label>
                          <div className="px-2 py-1 rounded bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-mono font-bold text-right truncate">
                            {editableDoc.currency} {Number(item.amount || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal override */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>Calculated Subtotal:</span>
                  <span className="font-mono text-sm text-[#c8501e]">
                    {editableDoc.currency} {Number(editableDoc.subtotal || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 5. Detailed Specifications Breakdown Editor */}
              <div className="space-y-3 bg-white dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#c8501e]" />
                    <span>Specifications Breakdown</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSpecSection}
                    className="px-2 py-1 rounded-md bg-[#c8501e]/15 hover:bg-[#c8501e]/25 text-[#c8501e] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Section</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {editableDoc.specs.map((sec, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => handleSpecTitleChange(sIdx, e.target.value)}
                          className="w-full px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs font-bold"
                          placeholder="Section Title (e.g. For LMS -)"
                        />
                        {editableDoc.specs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSpecSection(sIdx)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Delete section"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={sec.technologies || ''}
                          onChange={(e) => handleSpecFieldChange(sIdx, 'technologies', e.target.value)}
                          placeholder="Tech: WordPress, React..."
                          className="px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-[11px]"
                        />
                        <input
                          type="text"
                          value={sec.themePlugin || ''}
                          onChange={(e) => handleSpecFieldChange(sIdx, 'themePlugin', e.target.value)}
                          placeholder="Theme / Plugins / Tools"
                          className="px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-[11px]"
                        />
                      </div>

                      {/* Bullet Items */}
                      <div className="space-y-1.5 pl-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                          <span>Bulleted Features:</span>
                          <button
                            type="button"
                            onClick={() => handleAddSpecBullet(sIdx)}
                            className="text-[#c8501e] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Add Bullet</span>
                          </button>
                        </div>
                        {sec.bullets.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-1.5">
                            <span className="text-[#c8501e] font-black">•</span>
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => handleSpecBulletChange(sIdx, bIdx, e.target.value)}
                              className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-[11px]"
                            />
                            {sec.bullets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSpecBullet(sIdx, bIdx)}
                                className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Notes & Terms */}
              <div className="space-y-3 bg-white dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-[#c8501e]" />
                    <span>Important Notes & Terms</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="px-2 py-1 rounded-md bg-[#c8501e]/15 hover:bg-[#c8501e]/25 text-[#c8501e] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Note</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {editableDoc.notes.map((note, nIdx) => (
                    <div key={nIdx} className="flex items-center gap-1.5">
                      <span className="text-black font-black">•</span>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => handleNoteChange(nIdx, e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-[11px]"
                      />
                      {editableDoc.notes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(nIdx)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Payment & Settlement Verification Editor */}
              <div className="space-y-3 bg-white dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Payment Verification Record</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300/60">
                    {editableDoc.paymentRecord?.paymentStatus || 'PAID & VERIFIED'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#E2136E] block mb-0.5">
                        Payment Method
                      </label>
                      <input
                        type="text"
                        value={editableDoc.paymentRecord?.method || 'bKash'}
                        onChange={(e) =>
                          setEditableDoc({
                            ...editableDoc,
                            paymentRecord: {
                              ...editableDoc.paymentRecord!,
                              method: e.target.value,
                            },
                          })
                        }
                        placeholder="bKash / Nagad / Rocket"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                        Transaction ID (TrxID)
                      </label>
                      <input
                        type="text"
                        value={editableDoc.paymentRecord?.trxId || ''}
                        onChange={(e) =>
                          setEditableDoc({
                            ...editableDoc,
                            paymentRecord: {
                              ...editableDoc.paymentRecord!,
                              trxId: e.target.value,
                            },
                          })
                        }
                        placeholder="e.g. DHP1S0LOD5"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Paid To (Merchant No)
                      </label>
                      <input
                        type="text"
                        value={editableDoc.paymentRecord?.receiverPhone || ''}
                        onChange={(e) =>
                          setEditableDoc({
                            ...editableDoc,
                            paymentRecord: {
                              ...editableDoc.paymentRecord!,
                              receiverPhone: e.target.value,
                            },
                          })
                        }
                        placeholder="01915575697"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Paid From (Customer No)
                      </label>
                      <input
                        type="text"
                        value={editableDoc.paymentRecord?.senderPhone || ''}
                        onChange={(e) =>
                          setEditableDoc({
                            ...editableDoc,
                            paymentRecord: {
                              ...editableDoc.paymentRecord!,
                              senderPhone: e.target.value,
                            },
                          })
                        }
                        placeholder="01838234459"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Amount Paid (৳)
                      </label>
                      <input
                        type="number"
                        value={editableDoc.paymentRecord?.paidAmount || 0}
                        onChange={(e) =>
                          setEditableDoc({
                            ...editableDoc,
                            paymentRecord: {
                              ...editableDoc.paymentRecord!,
                              paidAmount: Number(e.target.value),
                            },
                          })
                        }
                        placeholder="150000"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Payment Date & Time
                      </label>
                      <input
                        type="text"
                        value={editableDoc.paymentRecord?.paymentDate || ''}
                        onChange={(e) =>
                          setEditableDoc({
                            ...editableDoc,
                            paymentRecord: {
                              ...editableDoc.paymentRecord!,
                              paymentDate: e.target.value,
                            },
                          })
                        }
                        placeholder="25 Aug 2026, 05:40 PM"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                      Verification Gateway Note
                    </label>
                    <input
                      type="text"
                      value={editableDoc.paymentRecord?.channelNote || ''}
                      onChange={(e) =>
                        setEditableDoc({
                          ...editableDoc,
                          paymentRecord: {
                            ...editableDoc.paymentRecord!,
                            channelNote: e.target.value,
                          },
                        })
                      }
                      placeholder="Instant Verification via Payviro Gateway (Clean TrxID)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Done editing button */}
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:bg-slate-800 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>View Full PDF Preview</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* CUSTOMER PICKER MODAL / DRAWER (FOR BATCH SELECTION)     */}
          {/* ======================================================== */}
          {showCustomerPicker && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
              <div className="w-full max-w-lg bg-white dark:bg-[#0c120f] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#c8501e]" />
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      Select Customers for Statement PDF
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCustomerPicker(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter and Search */}
                <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search customer by name, company, or phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs focus:outline-none focus:ring-1 focus:ring-[#c8501e]"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCustomerStatusFilter('all')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                          customerStatusFilter === 'all'
                            ? 'bg-[#c8501e] text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        All ({customers.length})
                      </button>
                      <button
                        onClick={() => setCustomerStatusFilter('due')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                          customerStatusFilter === 'due'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        With Due Balance
                      </button>
                      <button
                        onClick={() => setCustomerStatusFilter('settled')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                          customerStatusFilter === 'settled'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        Settled
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAllFiltered}
                        className="text-[11px] text-[#c8501e] hover:underline font-semibold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customer List Checkboxes */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-100 dark:divide-white/5">
                  {filteredCustomers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No matching customers found.
                    </div>
                  ) : (
                    filteredCustomers.map((c) => {
                      const isSelected = selectedCustomerIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleSelectCustomer(c.id)}
                          className={`pt-2 flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#c8501e]/10 border border-[#c8501e]/30'
                              : 'hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-[#c8501e]">
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {c.company_name && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    • {c.company_name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {c.phone}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              ৳{(c.total_invoiced || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] font-mono">
                              {(c.total_due || 0) > 0 ? (
                                <span className="text-rose-600 font-bold">Due: ৳{c.total_due.toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">Settled</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-3.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {selectedCustomerIds.length} customer(s) selected
                  </span>
                  <button
                    onClick={() => setShowCustomerPicker(false)}
                    className="px-4 py-1.5 rounded-xl bg-[#c8501e] hover:bg-[#b04316] text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* DOCUMENT PREVIEW CONTAINER                               */}
          {/* ======================================================== */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-8 overscroll-contain bg-slate-200/70 dark:bg-black/60 flex flex-col items-center">
            {/* If Single Customer Mode */}
            {mode === 'single' ? (
              loading ? (
                <div className="py-24 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#c8501e] border-t-transparent rounded-full animate-spin" />
                  <span>Loading corporate statement...</span>
                </div>
              ) : !activeDoc ? (
                <div className="py-24 text-center text-xs text-slate-400">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p>Please select a customer to render statement.</p>
                </div>
              ) : (
                /* SINGLE CUSTOMER CORPORATE SHEET */
                <SingleCustomerSheet doc={activeDoc} />
              )
            ) : (
              /* ======================================================== */
              /* BATCH MODE: MULTI-USER OUTPUT                            */
              /* ======================================================== */
              batchLoading ? (
                <div className="py-24 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#c8501e] border-t-transparent rounded-full animate-spin" />
                  <span>Compiling batch statements for {selectedCustomerIds.length} customers...</span>
                </div>
              ) : selectedCustomerIds.length === 0 ? (
                <div className="py-24 text-center text-xs text-slate-400 space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p>No customers selected. Please click "Select Users" to pick customers.</p>
                  <button
                    onClick={() => setShowCustomerPicker(true)}
                    className="px-4 py-2 rounded-xl bg-[#c8501e] text-white text-xs font-bold cursor-pointer"
                  >
                    Select Customers Now
                  </button>
                </div>
              ) : batchView === 'individual_pages' ? (
                /* MULTI-PAGE BATCH INDIVIDUAL STATEMENTS */
                <div className="w-full flex flex-col items-center space-y-8">
                  {batchStatements.map((bData, idx) => {
                    const cDoc = formatCustomerDataToDoc(bData, 'Invoice');
                    return (
                      <div key={idx} className="w-full flex justify-center page-break">
                        <SingleCustomerSheet doc={cDoc} pageNumber={idx + 1} totalPages={batchStatements.length} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* MASTER SUMMARY LEDGER STATEMENT */
                <MasterSummaryLedgerSheet
                  statements={batchStatements}
                  customers={customers}
                  selectedCustomerIds={selectedCustomerIds}
                  businessProfile={statementData?.businessProfile}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to convert backend customer details to EditableStatementDoc for batch printing
function formatCustomerDataToDoc(data: any, docType: string): EditableStatementDoc {
  const customer = data?.customer || {};
  const business = data?.businessProfile || {};
  const allServices = data?.allServices || [];
  const summary = data?.statementSummary || {};

  let rawBusinessName = business?.business_name || 'Payviro';
  if (rawBusinessName.toLowerCase().includes('tawhid') || rawBusinessName.toLowerCase().includes('hablu')) {
    rawBusinessName = 'Payviro';
  }
  const primaryName = rawBusinessName.trim();
  const secondaryName = '';

  const defaultItems =
    allServices.length > 0
      ? allServices.map((s: any) => ({
          description: s.description || 'Service Deliverable',
          quantity: Number(s.quantity) || 1,
          unitPrice: Number(s.unitPrice) || 0,
          amount: Number(s.amount) || (Number(s.quantity) || 1) * (Number(s.unitPrice) || 0),
        }))
      : [
          {
            description: 'LMS Website Development',
            quantity: 1,
            unitPrice: 150000,
            amount: 150000,
          },
          {
            description: 'Automation Agent Development',
            quantity: 1,
            unitPrice: 100000,
            amount: 100000,
          },
        ];

  const calculatedSubtotal = defaultItems.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
  const docNumber = `#260625002`;

  const issueDateStr = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  const validUntilStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  return {
    documentType: docType,
    documentNumber: docNumber,
    issueDate: issueDateStr,
    validUntilDate: validUntilStr,
    companyNameLine1: primaryName,
    companyNameLine2: secondaryName,
    companyAddress: business?.address || 'Dhaka, Bangladesh',
    companyPhone: business?.phone || '01915575697',
    companyEmail: business?.email || 'support@payviro.duckdns.org',
    companyWebsite: business?.website || 'payviro.duckdns.org',
    customerName: customer.name || 'Valued Customer',
    companyName: customer.company_name || '',
    customerAddress: customer.address || 'Dhaka, Bangladesh',
    customerPhone: customer.phone || '',
    customerEmail: customer.email || '',
    currency: business?.currency_symbol || '৳',
    lineItems: defaultItems,
    specs: JSON.parse(JSON.stringify(DEFAULT_SPECS_TEMPLATE)),
    notes: [...DEFAULT_NOTES_TEMPLATE],
    subtotal: calculatedSubtotal,
    totalPaid: Number(summary.totalPaid || customer.total_paid || 0),
    totalDue: Number(summary.totalDue || customer.total_due || 0),
    paymentRecord: {
      method: (data.receipts && data.receipts[0]?.payment_method) || 'bKash',
      receiverPhone: business?.phone || '01915575697',
      senderPhone: customer.phone || '01838234459',
      trxId: (data.receipts && data.receipts[0]?.trx_id) || 'DHP1S0LOD5',
      paidAmount: Number(
        (data.receipts && (data.receipts[0]?.paid_amount || data.receipts[0]?.amount_received)) ||
          summary.totalPaid ||
          customer.total_paid ||
          calculatedSubtotal ||
          150000
      ),
      paymentDate:
        (data.receipts && data.receipts[0]?.payment_date)
          ? new Date(data.receipts[0].payment_date).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : customer.last_payment_date
          ? new Date(customer.last_payment_date).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '25 Aug 2026, 05:40 PM',
      paymentStatus: (data.receipts && data.receipts[0]?.payment_status) || 'PAID & VERIFIED',
      channelNote: 'Instant Verification via Payviro Gateway (Clean TrxID)',
    },
    paymentMethods: {
      bkash: '01915575697',
      nagad: '01915575697',
      rocket: '01915575697',
      instructions: 'Payment already received & verified via Payviro Gateway.',
    },
  };
}

// ====================================================================
// COMPONENT: EXACT CORPORATE A4 SHEET MATCHING GOOGLE DRIVE PHOTO
// ====================================================================
interface SingleCustomerSheetProps {
  doc: EditableStatementDoc;
  pageNumber?: number;
  totalPages?: number;
}

export const SingleCustomerSheet: React.FC<SingleCustomerSheetProps> = ({
  doc,
  pageNumber,
  totalPages,
}) => {
  return (
    <div className="statement-sheet relative w-full max-w-[800px] bg-white text-slate-900 shadow-2xl rounded-none sm:rounded-sm p-8 sm:p-14 overflow-hidden select-text text-[13px] leading-relaxed">
      {/* TOP RIGHT GEOMETRIC ACCENT (EXACT SWOOSH + CIRCLES) */}
      <div className="absolute top-0 right-0 w-64 sm:w-80 h-44 sm:h-56 pointer-events-none overflow-hidden z-0">
        <svg viewBox="0 0 320 220" className="w-full h-full" fill="none" preserveAspectRatio="none">
          {/* Orange background wave */}
          <path d="M120 0 C 180 50, 240 100, 320 180 L 320 0 Z" fill="#ea580c" />
          {/* Black dark wave in front */}
          <path d="M165 0 C 220 40, 265 80, 320 135 L 320 0 Z" fill="#0f172a" />
          {/* Floating orange circle 1 */}
          <circle cx="230" cy="115" r="22" fill="#f59e0b" />
          {/* Floating orange circle 2 (partially cut on right edge) */}
          <circle cx="310" cy="90" r="34" fill="#f97316" />
        </svg>
      </div>

      {/* SHEET CONTENT CONTAINER */}
      <div className="relative z-10 space-y-6">
        {/* 1. HEADER SECTION (COMPANY INFO & TITLE) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-1.5 max-w-sm">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3.5 mb-2">
              <img
                src="/payviro-logo-transparent.png"
                alt="Payviro"
                className="w-10 h-12 object-contain shrink-0"
              />

              <div className="leading-tight">
                <div className="text-xl font-black tracking-tight text-black uppercase font-sans">
                  {doc.companyNameLine1 || 'PAYVIRO'}
                </div>
                {doc.companyNameLine2 ? (
                  <div className="text-xs font-bold tracking-tight text-slate-700 uppercase font-sans">
                    {doc.companyNameLine2}
                  </div>
                ) : (
                  <div className="text-[10px] font-bold tracking-widest text-[#c8501e] uppercase">
                    Enterprise Gateway
                  </div>
                )}
              </div>
            </div>

            {/* Company Address & Contacts */}
            <div className="text-[12px] text-slate-800 space-y-0.5 leading-normal">
              <p>{doc.companyAddress || 'Dhaka, Bangladesh'}</p>
              <p>Phone: {doc.companyPhone || '01915575697'}</p>
              <p>Email: {doc.companyEmail || 'support@payviro.duckdns.org'}</p>
              <p>Website: {doc.companyWebsite || 'payviro.duckdns.org'}</p>
            </div>
          </div>

          {/* Right: Document Title & Dates */}
          <div className="sm:text-right space-y-1 pt-2 sm:pt-14 sm:pr-4">
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              {doc.documentType} {doc.documentNumber}
            </h2>
            <div className="text-xs text-slate-800 space-y-0.5 font-medium">
              <div>
                Date: <span className="font-semibold text-black">{doc.issueDate}</span>
              </div>
              <div>
                Valid Until: <span className="font-semibold text-black">{doc.validUntilDate}</span>
              </div>
              {pageNumber && totalPages && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Page {pageNumber} of {totalPages}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. CUSTOMER BLOCK */}
        <div className="space-y-1.5 pt-1">
          <div className="font-bold text-black text-[13px]">Customer</div>
          {/* Shaded Rounded Box */}
          <div className="bg-[#e5e7eb]/80 border border-slate-300/60 rounded-sm p-3.5 max-w-sm text-slate-900 text-xs space-y-0.5 shadow-xs">
            <div className="font-bold">
              To: {doc.companyName ? `${doc.companyName},` : `${doc.customerName},`}
            </div>
            {doc.customerAddress && <div>{doc.customerAddress}</div>}
            {doc.customerPhone && (
              <div className="font-mono text-[11px] text-slate-700">Phone: {doc.customerPhone}</div>
            )}
            {doc.customerEmail && (
              <div className="text-[11px] text-slate-700">Email: {doc.customerEmail}</div>
            )}
          </div>
        </div>

        {/* 3. LINE ITEMS TABLE (TERRACOTTA / BURNT ORANGE HEADER) */}
        <div className="overflow-hidden pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#c8501e] text-white font-bold text-[13px]">
                <th className="py-2.5 px-4 font-semibold w-1/2">Description</th>
                <th className="py-2.5 px-4 font-semibold text-center w-24">Quantity</th>
                <th className="py-2.5 px-4 font-semibold text-right w-32">Price</th>
                <th className="py-2.5 px-4 font-semibold text-right w-36">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
              {doc.lineItems.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-3 px-4 font-bold text-slate-900 text-[13px]">
                    {item.description}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-medium">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                    {doc.currency} {Number(item.unitPrice || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                    {doc.currency} {Number(item.amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Distinctive Orange Underline below Table */}
          <div className="h-[1.5px] bg-[#c8501e] w-full" />
        </div>

        {/* 4. DETAILED SPECIFICATIONS / FEATURES BREAKDOWN (BULLET POINTS) */}
        <div className="space-y-4 pt-2 text-[12px] text-slate-900">
          {doc.specs.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="font-bold italic text-black">{sec.title}</div>
              {sec.technologies && (
                <div className="font-bold">
                  Technologies: <span className="font-normal">{sec.technologies}</span>
                </div>
              )}
              {sec.themePlugin && (
                <div className="font-bold">
                  Theme/Plug-In: <span className="font-normal">{sec.themePlugin}</span>
                </div>
              )}
              {sec.featuresTitle && <div className="font-bold">{sec.featuresTitle}</div>}
              <ul className="space-y-0.5 pl-4 text-slate-800">
                {sec.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-1.5">
                    <span className="text-black">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Divider Line under Specifications */}
          <div className="h-[1px] bg-slate-300 w-full pt-1" />
        </div>

        {/* 5. SUB TOTAL BAR */}
        <div className="flex justify-between items-center py-2 text-base sm:text-lg font-black text-black">
          <div>Sub Total:</div>
          <div className="font-mono text-right">
            {doc.currency} {Number(doc.subtotal || 0).toLocaleString()}
          </div>
        </div>

        {/* Ledger Balance Info if there are payments */}
        {doc.totalPaid > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
            <div className="font-bold text-slate-800">Payment Clearance Summary:</div>
            <div className="flex justify-between text-slate-600">
              <span>Paid to Date:</span>
              <span className="font-mono font-bold text-emerald-700">
                +{doc.currency} {Number(doc.totalPaid || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
              <span>Remaining Balance Due:</span>
              <span className="font-mono text-[#c8501e]">
                {doc.currency} {Number(doc.totalDue || 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* 5b. VERIFIED PAYMENT & SETTLEMENT RECORD */}
        <div className="p-3.5 bg-slate-50 border border-slate-300 rounded text-xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
              <div className="font-bold text-black text-[12px] uppercase tracking-wide">
                Payment Verification & Settlement Details
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
              <span>✓</span> {doc.paymentRecord?.paymentStatus || 'PAID & VERIFIED'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800">
            {/* Payment Method */}
            <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Payment Method
              </div>
              <div className="font-black text-[#E2136E] text-[12px] tracking-tight">
                {doc.paymentRecord?.method || 'bKash'} (Personal)
              </div>
            </div>

            {/* Paid To (Merchant) */}
            <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Paid To (Merchant)
              </div>
              <div className="font-mono font-black text-slate-900 text-[12px] tracking-tight">
                {doc.paymentRecord?.receiverPhone || doc.companyPhone || '01915575697'}
              </div>
            </div>

            {/* Paid From (Customer) */}
            <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Paid From (Customer)
              </div>
              <div className="font-mono font-black text-slate-900 text-[12px] tracking-tight">
                {doc.paymentRecord?.senderPhone || doc.customerPhone || '01838234459'}
              </div>
            </div>

            {/* Transaction ID */}
            <div className="p-2 rounded bg-white border border-slate-200 space-y-0.5 shadow-2xs">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Transaction ID (TrxID)
              </div>
              <div className="font-mono font-black text-emerald-700 text-[12px] tracking-wider">
                {doc.paymentRecord?.trxId || 'DHP1S0LOD5'}
              </div>
            </div>
          </div>

          {/* Amount Paid & Timestamp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-700 pt-1 border-t border-slate-200/80 gap-1.5">
            <div className="flex items-center gap-3">
              <div>
                <span className="font-bold text-slate-900">Amount Paid:</span>{' '}
                <span className="font-mono font-black text-emerald-700 text-xs">
                  {doc.currency} {Number(doc.paymentRecord?.paidAmount || doc.totalPaid || doc.subtotal || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="font-bold text-slate-900">Payment Time:</span>{' '}
                <span className="font-medium text-slate-900">{doc.paymentRecord?.paymentDate || '25 Aug 2026, 05:40 PM'}</span>
              </div>
            </div>
            <div className="text-[10px] font-medium text-emerald-700 italic">
              * {doc.paymentRecord?.channelNote || 'Instant Verification via Payviro Gateway (Clean TrxID)'}
            </div>
          </div>
        </div>

        {/* 6. NOTE SECTION */}
        <div className="space-y-1 pt-1 text-[12px] text-slate-900">
          <div className="font-bold text-black">Note:</div>
          <ul className="space-y-0.5 pl-4 text-slate-800">
            {doc.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-black">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 7. FOOTER SECTION (GEOMETRIC ACCENTS + COMPANY SIGNATURE) */}
        <div className="pt-8 relative">
          {/* Full-width Divider Line */}
          <div className="h-[1.5px] bg-slate-400 w-full mb-3" />

          <div className="flex items-center justify-between">
            {/* Bottom-left geometric mark (4-triangle emblem) */}
            <div className="flex items-center text-black">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 28 28">
                <polygon points="0,0 12,12 0,12" />
                <polygon points="0,16 12,28 0,28" />
              </svg>
            </div>

            {/* Centered Company Name & Year */}
            <div className="text-center font-bold text-black text-xs space-y-0.5">
              <div className="tracking-wide uppercase font-black">
                {doc.companyNameLine1} {doc.companyNameLine2}
              </div>
              <div className="text-[10px] text-slate-600 font-medium flex items-center justify-center gap-1">
                <span>© {new Date().getFullYear()}</span>
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 inline-block"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="7" y1="6" x2="7" y2="18" />
                  <line x1="17" y1="6" x2="17" y2="18" />
                  <path d="M7 12 C 10 17, 14 17, 17 12" />
                </svg>
              </div>
            </div>

            {/* Bottom-right overlapping warm circles (Exact Match) */}
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#ea580c] flex items-center justify-center text-white text-[9px] font-black shadow-xs">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 12 C 9 16, 15 16, 18 12" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#f59e0b] shadow-xs" />
              <div className="w-8 h-8 rounded-full bg-[#fbbf24] shadow-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// COMPONENT: MASTER SUMMARY LEDGER STATEMENT (FOR MULTI-USER)
// ====================================================================
interface MasterSummaryLedgerSheetProps {
  statements: any[];
  customers: any[];
  selectedCustomerIds: string[];
  businessProfile?: any;
}

export const MasterSummaryLedgerSheet: React.FC<MasterSummaryLedgerSheetProps> = ({
  statements,
  customers,
  selectedCustomerIds,
  businessProfile,
}) => {
  let rawBusinessName = businessProfile?.business_name || 'Payviro';
  if (rawBusinessName.toLowerCase().includes('tawhid') || rawBusinessName.toLowerCase().includes('hablu')) {
    rawBusinessName = 'Payviro';
  }
  const primaryName = rawBusinessName.trim();
  const currency = businessProfile?.currency_symbol || '৳';

  // Aggregate selected customers data
  const selectedList = customers.filter((c) => selectedCustomerIds.includes(c.id));

  const totalInvoiced = selectedList.reduce((sum, c) => sum + Number(c.total_invoiced || 0), 0);
  const totalPaid = selectedList.reduce((sum, c) => sum + Number(c.total_paid || 0), 0);
  const totalDue = selectedList.reduce((sum, c) => sum + Number(c.total_due || 0), 0);

  const issueDateStr = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="statement-sheet relative w-full max-w-[850px] bg-white text-slate-900 shadow-2xl rounded-none sm:rounded-sm p-8 sm:p-14 overflow-hidden select-text text-[13px] leading-relaxed">
      {/* Top Right Wave Accent */}
      <div className="absolute top-0 right-0 w-64 sm:w-80 h-44 sm:h-56 pointer-events-none overflow-hidden z-0">
        <svg viewBox="0 0 320 220" className="w-full h-full" fill="none" preserveAspectRatio="none">
          <path d="M120 0 C 180 50, 240 100, 320 180 L 320 0 Z" fill="#ea580c" />
          <path d="M165 0 C 220 40, 265 80, 320 135 L 320 0 Z" fill="#0f172a" />
          <circle cx="230" cy="115" r="22" fill="#f59e0b" />
          <circle cx="310" cy="90" r="34" fill="#f97316" />
        </svg>
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-1.5 max-w-sm">
            <div className="flex items-center gap-3.5 mb-2">
              <img
                src="/payviro-logo-transparent.png"
                alt="Payviro"
                className="w-10 h-12 object-contain shrink-0"
              />
              <div className="leading-tight">
                <div className="text-xl font-black tracking-tight text-black uppercase font-sans">
                  {primaryName}
                </div>
                <div className="text-[10px] font-bold tracking-widest text-[#c8501e] uppercase">
                  Enterprise Gateway
                </div>
              </div>
            </div>
            <div className="text-[12px] text-slate-800 space-y-0.5 leading-normal">
              <p>{businessProfile?.address || 'Dhaka, Bangladesh'}</p>
              <p>Phone: {businessProfile?.phone || '01915575697'}</p>
              <p>Email: {businessProfile?.email || 'support@payviro.duckdns.org'}</p>
              <p>Website: {businessProfile?.website || 'payviro.duckdns.org'}</p>
            </div>
          </div>

          <div className="sm:text-right space-y-1 pt-2 sm:pt-14 sm:pr-4">
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">
              Master Accounts Statement
            </h2>
            <div className="text-xs text-slate-800 space-y-0.5 font-medium">
              <div>
                Statement Date: <span className="font-semibold text-black">{issueDateStr}</span>
              </div>
              <div>
                Selected Accounts: <span className="font-semibold text-black">{selectedList.length} Customers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Table with Terracotta Header */}
        <div className="overflow-hidden pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#c8501e] text-white font-bold text-[12px]">
                <th className="py-2.5 px-3 font-semibold">Customer / Entity</th>
                <th className="py-2.5 px-3 font-semibold">Contact</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Billed</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Paid</th>
                <th className="py-2.5 px-3 font-semibold text-right">Due Balance</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
              {selectedList.map((c, idx) => {
                const hasDue = (c.total_due || 0) > 0;
                return (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.company_name && (
                        <div className="text-[11px] text-slate-600">{c.company_name}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      <div>{c.phone}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                      {currency} {Number(c.total_invoiced || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {currency} {Number(c.total_paid || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#c8501e] whitespace-nowrap">
                      {currency} {Number(c.total_due || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasDue ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                          Due
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="h-[1.5px] bg-[#c8501e] w-full" />
        </div>

        {/* Master Summary Box */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded bg-slate-50 border border-slate-300 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Invoiced</span>
            <span className="font-mono text-base font-black text-slate-900">
              {currency} {totalInvoiced.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Collected</span>
            <span className="font-mono text-base font-black text-emerald-700">
              {currency} {totalPaid.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Due Balance</span>
            <span className="font-mono text-base font-black text-[#c8501e]">
              {currency} {totalDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1 pt-1 text-[12px] text-slate-900">
          <div className="font-bold text-black">Statement Summary Note:</div>
          <ul className="space-y-0.5 pl-4 text-slate-800">
            <li className="flex items-start gap-1.5">
              <span className="text-black">•</span>
              <span>This official account statement reflects all verified invoice disbursements and payment receipts.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-black">•</span>
              <span>For immediate reconciliation or payment link inquiries, contact accounts management.</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="pt-8 relative">
          <div className="h-[1.5px] bg-slate-400 w-full mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center text-black">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 28 28">
                <polygon points="0,0 12,12 0,12" />
                <polygon points="0,16 12,28 0,28" />
              </svg>
            </div>
            <div className="text-center font-bold text-black text-xs space-y-0.5">
              <div className="tracking-wide uppercase font-black">{primaryName || 'PAYVIRO'}</div>
              <div className="text-[10px] text-slate-600 font-medium">
                © {new Date().getFullYear()} Payviro. All rights reserved.
              </div>
            </div>
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#ea580c] flex items-center justify-center text-white text-[9px] font-black">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 12 C 9 16, 15 16, 18 12" />
                </svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#f59e0b]" />
              <div className="w-8 h-8 rounded-full bg-[#fbbf24]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
