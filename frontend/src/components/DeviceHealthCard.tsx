// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.
import React, { useState } from 'react';
import { Smartphone, Battery, Wifi, WifiOff, AlertTriangle, RefreshCw, HelpCircle, CheckCircle, ShieldAlert, Trash2, X } from 'lucide-react';
import { api } from '../services/api';

interface DeviceHealthProps {
  device: any;
  onRefresh: () => void;
}

export const DeviceHealthCard: React.FC<DeviceHealthProps> = ({ device, onRefresh }) => {
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [unpairing, setUnpairing] = useState(false);

  if (!device) {
    return (
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
        <Smartphone className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
        <h4 className="text-slate-900 dark:text-white font-semibold text-base mb-1">No Active Relay Device</h4>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          Install the Payviro app on your Android device and pair using your merchant license key.
        </p>
      </div>
    );
  }

  // Heartbeat freshness calculation
  const now = Date.now();
  let secondsAgo = 999999;
  if (device.last_heartbeat) {
    const iso = device.last_heartbeat.endsWith('Z') || device.last_heartbeat.includes('+')
      ? device.last_heartbeat
      : device.last_heartbeat.replace(' ', 'T') + 'Z';
    secondsAgo = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  }

  const isOnline = Boolean(device.is_online) && secondsAgo <= 25;
  const missedCount = Math.max(1, Math.floor(secondsAgo / 15));
  const isCriticalOffline = missedCount >= 2;

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-emerald-500 dark:text-emerald-400';
    if (level > 20) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-500 dark:text-rose-400';
  };

  const handleUnpair = async () => {
    if (!window.confirm(`Unpair device '${device.device_name}'?`)) return;
    try {
      setUnpairing(true);
      await api.delete(`/devices/${device.id}`);
      onRefresh();
    } catch (err) {
      alert('Failed to unpair device.');
    } finally {
      setUnpairing(false);
    }
  };

  const formatLastSeen = (sec: number) => {
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
      isOnline
        ? 'bg-white dark:bg-slate-900/90 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
        : isCriticalOffline
        ? 'bg-rose-50/50 dark:bg-slate-950/90 border-rose-500/40 shadow-lg shadow-rose-500/5'
        : 'bg-amber-50/50 dark:bg-slate-950/90 border-amber-500/30 shadow-lg shadow-amber-500/5'
    } p-5 sm:p-6`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${
            isOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
          }`}>
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-wide truncate max-w-[180px] sm:max-w-none">
                {device.device_name}
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : isCriticalOffline
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 animate-pulse'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
              }`}>
                {isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    Offline ({missedCount}x missed)
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Model: <span className="text-slate-700 dark:text-slate-300 font-medium">{device.model || 'Android Phone'}</span> • OS: <span className="text-slate-700 dark:text-slate-300 font-medium">{device.android_version || 'Android'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setShowTroubleshoot(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Troubleshoot
          </button>
          <button
            onClick={handleUnpair}
            disabled={unpairing}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-xs transition-colors"
            title="Unpair device"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Offline Warning Banner */}
      {!isOnline && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-700 dark:text-rose-200 leading-relaxed">
            <span className="font-semibold text-rose-800 dark:text-rose-100">Alert:</span> No heartbeat received for <span className="font-bold">{formatLastSeen(secondsAgo)}</span>. Ensure phone has active internet and background permissions enabled.
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800/80">
          <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mb-1.5 font-medium">
            <Battery className={`w-4 h-4 ${getBatteryColor(device.battery_level ?? 100)}`} />
            Battery
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            {device.battery_level ?? 100}%
            <span className="text-[10px] text-slate-400 font-normal">
              {device.is_charging ? '(Charging)' : ''}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800/80">
          <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mb-1.5 font-medium">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Network
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white truncate">
            {device.network_type || 'Wi-Fi / 4G'}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800/80">
          <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mb-1.5 font-medium">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Permission
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {device.notification_access ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm font-semibold">
                <CheckCircle className="w-4 h-4" /> Granted
              </span>
            ) : (
              <span className="text-rose-500 flex items-center gap-1 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" /> Required
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800/80">
          <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mb-1.5 font-medium">
            <RefreshCw className="w-4 h-4 text-slate-400" />
            Last Seen
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
            {formatLastSeen(secondsAgo)}
          </div>
        </div>
      </div>

      {/* Troubleshoot Modal */}
      {showTroubleshoot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Relay Phone Checklist</h3>
              <button
                onClick={() => setShowTroubleshoot(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto px-5 py-4 flex-1 space-y-3 text-xs text-slate-600 dark:text-slate-300 overscroll-contain">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-white block mb-1">1. Battery Optimization Disabled</strong>
                Make sure battery optimization is set to "Unrestricted" so Android does not put the app to sleep.
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-white block mb-1">2. Notification Listener Permission</strong>
                Verify Notification Listener permission is active in phone Settings.
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-white block mb-1">3. Keep Phone Plugged In</strong>
                Keep the relay phone connected to a charger with always-on Wi-Fi or mobile data.
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setShowTroubleshoot(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
