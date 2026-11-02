import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';
import { useTheme, type ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'dropdown' | 'segmented' | 'icon-cycle';
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'dropdown',
  className = '',
  showLabels = false,
}) => {
  const { themeMode, resolvedTheme, setThemeMode, cycleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Options configuration
  const options: { mode: ThemeMode; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: 'system', label: 'System', sub: 'Default (Matches OS)', icon: Monitor },
    { mode: 'light', label: 'Light', sub: 'Clean & Crisp', icon: Sun },
    { mode: 'dark', label: 'Dark', sub: 'Carbon & Neon Green', icon: Moon },
  ];

  // If segmented variant
  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 ${className}`}
        role="group"
        aria-label="Theme selection"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = themeMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setThemeMode(opt.mode)}
              title={`${opt.label} Mode (${opt.sub})`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {showLabels && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // If simple cycle icon variant
  if (variant === 'icon-cycle') {
    const CurrentIcon = themeMode === 'system' ? Monitor : themeMode === 'light' ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={cycleTheme}
        className={`p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-sm ${className}`}
        title={`Current mode: ${themeMode} (${resolvedTheme}). Click to cycle.`}
        aria-label="Toggle theme mode"
      >
        <CurrentIcon className="w-4 h-4" />
      </button>
    );
  }

  // Default: Dropdown variant with sleek floating menu
  const ActiveIcon = themeMode === 'system' ? Monitor : themeMode === 'light' ? Sun : Moon;
  const activeLabel = themeMode === 'system' ? 'System' : themeMode === 'light' ? 'Light' : 'Dark';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <ActiveIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">{activeLabel}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#0e1512] border border-slate-200 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/60 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-white/5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Appearance Mode
            </span>
          </div>

          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setThemeMode(opt.mode);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`p-1 rounded-md ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <div className="leading-tight">{opt.label}</div>
                    <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500 leading-tight">
                      {opt.sub}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
