// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Lock, Mail, Building, Phone, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';

export const AuthPage: React.FC<{ initialMode?: 'login' | 'register' }> = ({ initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        if (res.data.success) {
          localStorage.setItem('payviro_token', res.data.data.token);
          localStorage.setItem('payviro_user', JSON.stringify(res.data.data.merchant));
          localStorage.setItem('payverify_token', res.data.data.token);
          localStorage.setItem('payverify_user', JSON.stringify(res.data.data.merchant));
          if (res.data.data.merchant.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        const res = await api.post('/auth/register', { email, password, businessName, phone });
        if (res.data.success) {
          localStorage.setItem('payviro_token', res.data.data.token);
          localStorage.setItem('payviro_user', JSON.stringify(res.data.data.merchant));
          localStorage.setItem('payverify_token', res.data.data.token);
          localStorage.setItem('payverify_user', JSON.stringify(res.data.data.merchant));
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9f7] dark:bg-[#080d0b] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 relative transition-colors duration-200">
      {/* Top Header bar with Home and Theme Switcher */}
      <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-md text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-white text-xs font-semibold transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-emerald-500/20 shadow-2xl relative z-10 mt-12 sm:mt-0">
        {/* Logo & Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-block group mb-3">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#37e58a] via-[#12b56a] to-[#0a8f52] flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform mx-auto">
              <ShieldCheck className="w-6 h-6 text-white stroke-[2.4]" />
            </span>
          </Link>
          <div className="flex items-center justify-center gap-1 mb-2">
            <span className="jak font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">Payviro</span>
            <span className="text-[#37e58a] font-black text-lg">.</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isLogin ? (
              <>
                Merchant <span className="hl-green">Sign In</span>
              </>
            ) : (
              <>
                Start <span className="hl-green">14-Day Free</span> Trial
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {isLogin ? (
              'Access real-time payment telemetry and accounts'
            ) : (
              <>
                Zero setup fee. <span className="hl-underline">No credit card</span> required.
              </>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Business Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Payments BD"
                    className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@example.com"
                className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-3"
          >
            <span>{loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Free Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
          {isLogin ? (
            <span>
              New merchant?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null); }}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Start 14-Day Free Trial
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); }}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
