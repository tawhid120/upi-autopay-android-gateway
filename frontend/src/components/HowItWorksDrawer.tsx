import React, { useState } from 'react';
import {
  X, HelpCircle, Zap, FileText, Link2, Clock, Users, Smartphone,
  CheckCircle2, ArrowRight, ShieldCheck, ChevronDown, ChevronUp, AlertCircle, MessageSquare
} from 'lucide-react';

interface HowItWorksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: any) => void;
}

export const HowItWorksDrawer: React.FC<HowItWorksDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [activeGuide, setActiveGuide] = useState<string>('auto-verify');

  if (!isOpen) return null;

  const guides = [
    {
      id: 'auto-verify',
      title: 'How 0% Fee Auto-Verification Works',
      subtitle: 'Instantly verify bKash & Nagad payments without checking SMS manually',
      icon: Zap,
      badge: 'Core Feature',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      steps: [
        {
          num: '1',
          title: 'Customer Sends Money to Your bKash or Nagad',
          desc: 'Your customer pays directly to your personal or merchant account. Money stays 100% in your own wallet with zero intermediary fees.',
        },
        {
          num: '2',
          title: 'Your Android Phone Receives the Official SMS',
          desc: 'When bKash (16247) or Nagad (16167) sends the payment confirmation SMS to your phone, the lightweight Payviro Relay app safely reads the TrxID and amount.',
        },
        {
          num: '3',
          title: 'Instant 0.1s Verification & Order Completion',
          desc: 'Payviro matches the transaction, marks the customer invoice or checkout order as PAID, and generates an official receipt automatically.',
        },
      ],
      actionLabel: 'Connect Android Phone',
      actionTab: 'devices',
      tip: 'You do not need a costly merchant gateway account. Any personal or merchant SIM in an Android phone works 24/7.',
    },
    {
      id: 'invoicing',
      title: 'How to Bill Clients with Digital Invoices',
      subtitle: 'Send professional invoices with hosted payment links and automated receipts',
      icon: FileText,
      badge: 'Billing',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      steps: [
        {
          num: '1',
          title: 'Fill in Client & Line Items',
          desc: 'Enter customer name, phone number, and items/services with quantities and prices. Set an optional due date (e.g., 7 or 14 days).',
        },
        {
          num: '2',
          title: 'Share the Invoice Link',
          desc: 'Copy the private invoice link and send it via WhatsApp, Email, or SMS. Your client sees a clean, branded bill with a "Pay with bKash" button.',
        },
        {
          num: '3',
          title: 'Auto-Receipt & Khata Update',
          desc: 'When the client enters their payment TrxID or pays online, Payviro verifies the payment and issues an official verified receipt.',
        },
      ],
      actionLabel: 'Create New Invoice',
      actionTab: 'invoices',
      tip: 'You can also delete or edit draft and unnecessary invoices anytime using the red delete icon.',
    },
    {
      id: 'payment-links',
      title: 'How to Collect Fast via Payment Links',
      subtitle: 'Create reusable checkout links to sell products or take service deposits',
      icon: Link2,
      badge: 'Social Commerce',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      steps: [
        {
          num: '1',
          title: 'Set an Amount or Leave It Open',
          desc: 'Choose a fixed price (e.g., ৳1,500) for a product or course, or choose "Variable Amount" so customers can enter custom amounts.',
        },
        {
          num: '2',
          title: 'Paste into WhatsApp, Facebook, or Bio',
          desc: 'Share the link everywhere. Customers open a fast mobile checkout page showing your bKash/Nagad payment instructions.',
        },
        {
          num: '3',
          title: 'Instant Confirmation',
          desc: 'The customer enters their bKash TrxID. The moment your phone detects the SMS, the checkout screen turns green with a checkmark.',
        },
      ],
      actionLabel: 'Create Payment Link',
      actionTab: 'links',
      tip: 'Payment links never expire unless you toggle them inactive in your dashboard.',
    },
    {
      id: 'dues-recovery',
      title: 'How to Track Dues & Send WhatsApp Reminders',
      subtitle: 'Never lose track of who owes you money; recover balances with 1 click',
      icon: Clock,
      badge: 'Cash Flow',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      steps: [
        {
          num: '1',
          title: 'Automatic Dues Ledger',
          desc: 'Whenever an invoice is unpaid or partially paid, Payviro automatically logs the remaining balance in your Unpaid Dues ledger.',
        },
        {
          num: '2',
          title: '1-Click WhatsApp Reminder',
          desc: 'Click "WhatsApp Reminder" next to any customer. Payviro drafts a polite message with the exact due balance and direct payment link.',
        },
        {
          num: '3',
          title: 'Automatic Balance Clearance',
          desc: 'Once the customer pays their pending balance, their due amount automatically reduces to ৳0 and transitions to Fully Paid.',
        },
      ],
      actionLabel: 'View Unpaid Dues',
      actionTab: 'dues',
      tip: 'Customers appreciate clear reminders. Payviro includes polite, professional message templates by default.',
    },
    {
      id: 'khata',
      title: 'How Customer Khata Works',
      subtitle: 'Your digital address book and transaction history for every client',
      icon: Users,
      badge: 'CRM',
      badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      steps: [
        {
          num: '1',
          title: 'Automatic Client Enrollment',
          desc: 'Whenever you create an invoice or a client pays you, they are automatically added to your Customer Khata.',
        },
        {
          num: '2',
          title: '360° Financial History',
          desc: 'Click any customer to see their total lifetime purchases, pending dues, verified receipts, and phone number.',
        },
        {
          num: '3',
          title: 'Record Offline Cash or Manual Credits',
          desc: 'If a client pays you in cash or direct bank deposit, record it with 1 click to update their balance immediately.',
        },
      ],
      actionLabel: 'Open Customer Khata',
      actionTab: 'customers',
      tip: 'Search any customer in 1 second using the Omnichannel Search bar or pressing Ctrl + K.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Content Drawer */}
      <aside className="relative w-full max-w-lg bg-white dark:bg-[#0c1210] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Pinned Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/95 dark:bg-[#0c1210]/95 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">How Payviro Works</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Step-by-step guides for new merchants</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Friendly Welcome Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Beginner-First Quick Reference</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Payviro is designed to make collecting payments in Bangladesh completely effortless. No expensive merchant gateway accounts, no complex paperwork, and 0% gateway commission fees.
            </p>
          </div>

          {/* Expandable Accordion Guides */}
          <div className="space-y-3">
            {guides.map((g) => {
              const Icon = g.icon;
              const isExpanded = activeGuide === g.id;

              return (
                <div
                  key={g.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'bg-slate-50/80 dark:bg-white/[0.02] border-emerald-500/30 shadow-sm'
                      : 'bg-white dark:bg-slate-900/40 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {/* Accordion Trigger */}
                  <button
                    type="button"
                    onClick={() => setActiveGuide(isExpanded ? '' : g.id)}
                    className="w-full p-4 flex items-start justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isExpanded
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {g.title}
                          </h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${g.badgeColor}`}>
                            {g.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {g.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-slate-400 shrink-0 mt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-white/5 space-y-3.5">
                      {/* Steps List */}
                      <div className="space-y-3 pt-2">
                        {g.steps.map((step) => (
                          <div key={step.num} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                              {step.num}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {step.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pro Tip Box */}
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2 text-[11px]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                        <span><strong>Pro-Tip:</strong> {g.tip}</span>
                      </div>

                      {/* Direct Jump Button */}
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab(g.actionTab);
                            onClose();
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <span>{g.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Need Further Support Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Still have questions?</h4>
                <p className="text-[11px] text-slate-400">Our team in Dhaka is here to help 7 days a week.</p>
              </div>
            </div>
            <a
              href="https://wa.me/8801915575697"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-semibold text-xs transition-colors shrink-0"
            >
              WhatsApp Us
            </a>
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0c1210]/95 backdrop-blur flex justify-between items-center text-xs">
          <span className="text-slate-400">Press Esc or click outside to dismiss</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </aside>
    </div>
  );
};
