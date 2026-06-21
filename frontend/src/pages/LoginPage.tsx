import React, { useState } from 'react';
import { api } from '../api/client';
import { AuthResponse } from '../types';

interface LoginPageProps {
  onSuccess: (auth: AuthResponse) => void;
  onToggleRegister: () => void;
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onToggleRegister, onBack }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError(null);
      
      const auth = await api.login({ email, password });
      
      // Save credentials in session storage
      sessionStorage.setItem('medbook_token', auth.token);
      sessionStorage.setItem('medbook_user', JSON.stringify(auth.user));
      
      onSuccess(auth);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-semibold"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </button>

      <div className="p-6 md:p-8 rounded-2xl glass-panel space-y-6">
        <div className="text-center space-y-2">
          {/* Logo Mark */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-slate-950 font-black text-2xl mx-auto shadow-lg shadow-emerald-500/10">
            M
          </div>
          <h2 className="text-3xl font-extrabold text-white pt-2">Welcome Back</h2>
          <p className="text-slate-400 text-sm">Sign in to manage your medical bookings and view diagnostic results</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="e.g. yourname@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/80 text-white border border-slate-700/80 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/80 text-white border border-slate-700/80 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none cursor-pointer"
                style={{ color: '#000000' }}
              >
                {showPassword ? (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20" style={{ fill: '#000000', color: '#000000' }}>
                    <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" />
                    <path d="M12.454 16.697L9.75 13.992a2.005 2.005 0 01-3.742-3.743L3.303 7.546A10.038 10.038 0 00.458 10c1.274 4.057 5.065 7 9.542 7a9.963 9.963 0 002.454-.303z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20" style={{ fill: '#000000', color: '#000000' }}>
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-sm text-slate-400">
          Don't have an account?{' '}
          <button 
            type="button" 
            onClick={onToggleRegister}
            className="text-emerald-400 font-bold hover:underline"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
};
