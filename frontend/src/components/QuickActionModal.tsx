import React from 'react';
import {
  X, FileText, Link2, Users, TrendingDown, Smartphone,
  Zap, ArrowRight, Sparkles
} from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionId: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'new-invoice',
      title: 'Create & Send Invoice',
      desc: 'Bill a client with itemized services, due dates, and instant bKash payment verification.',
      icon: FileText,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500',
      iconBg: 'bg-emerald-500 text-white',
      badge: 'Most Popular',
    },
    {
      id: 'new-link',
      title: 'Create Payment Link',
      desc: 'Generate a shareable checkout URL to collect payments fast on WhatsApp, Facebook, or SMS.',
      icon: Link2,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:border-purple-500',
      iconBg: 'bg-purple-500 text-white',
      badge: 'Fastest',
    },
    {
      id: 'new-customer',
      title: 'Add Customer to Khata',
      desc: 'Save client contact details to track their purchases, dues, and payment history.',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:border-blue-500',
      iconBg: 'bg-blue-500 text-white',
    },
    {
      id: 'new-expense',
      title: 'Record Business Expense',
      desc: 'Log operational spending (software, rent, salaries) to calculate your true net profit.',
      icon: TrendingDown,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:border-rose-500',
      iconBg: 'bg-rose-500 text-white',
    },
    {
      id: 'connect-relay',
      title: 'Connect Android Phone',
      desc: 'Pair your phone to auto-verify bKash & Nagad SMS 24/7 with zero merchant fees.',
      icon: Smartphone,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:border-amber-500',
      iconBg: 'bg-amber-500 text-white',
    },
    {
      id: 'test-checkout',
      title: 'Simulate Test Checkout',
      desc: 'Test what your customers will see during payment checkout without spending real money.',
      icon: Zap,
      color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-400',
      iconBg: 'bg-slate-700 text-white',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0c1210] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Actions</h3>
              <p className="text-xs text-slate-400">Choose a common task to get started immediately</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[75vh] overflow-y-auto">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  onSelectAction(act.id);
                  onClose();
                }}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.06] hover:border-emerald-500/40 hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl ${act.iconBg} shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {act.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {act.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {act.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {act.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100">
                  <span>Start action</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Need help deciding?</span>
          <button
            type="button"
            onClick={() => {
              onSelectAction('open-guide');
              onClose();
            }}
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
          >
            Open Step-by-Step Guide →
          </button>
        </div>
      </div>
    </div>
  );
};
