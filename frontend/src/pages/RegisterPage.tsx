import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Lab, AuthResponse } from '../types';

interface RegisterPageProps {
  onSuccess: (auth: AuthResponse) => void;
  onToggleLogin: () => void;
  onBack: () => void;
  onOnboardLab?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSuccess, onToggleLogin, onBack, onOnboardLab }) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [role, setRole] = useState<string>('patient');
  
  // Labs selection logic for lab_admin registration
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate role and select onboarding lab ID from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get('role');
    if (queryRole === 'lab_admin') {
      setRole('lab_admin');
    }
  }, []);

  // Fetch labs list on mount if role is changed to lab_admin
  useEffect(() => {
    if (role === 'lab_admin') {
      const fetchLabs = async () => {
        try {
          const data = await api.getLabs();
          setLabs(data);
          
          const params = new URLSearchParams(window.location.search);
          const queryLabId = params.get('lab_id');
          if (queryLabId && data.some(l => l.id === queryLabId)) {
            setSelectedLabId(queryLabId);
          } else if (data.length > 0) {
            setSelectedLabId(data[0].id);
          }
        } catch (err) {
          console.error(err);
          setError('Failed to fetch laboratory directory.');
        }
      };
      fetchLabs();
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const auth = await api.register({
        name,
        email,
        password,
        role,
        lab_id: role === 'lab_admin' ? selectedLabId : undefined,
      });

      // Save tokens
      sessionStorage.setItem('medbook_token', auth.token);
      sessionStorage.setItem('medbook_user', JSON.stringify(auth.user));

      onSuccess(auth);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-brand-muted-text hover:text-brand-dark-text transition-colors mb-6 text-sm font-semibold cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </button>

      <div className="p-6 md:p-8 rounded-2xl bento-panel-light space-y-6">
        <div className="text-center space-y-2">
          {/* Logo Mark */}
          <div className="w-12 h-12 rounded-2xl bg-brand-forest flex items-center justify-center text-brand-cream font-black text-2xl mx-auto shadow-sm">
            M
          </div>
          <h2 className="text-3xl font-extrabold text-brand-dark-text pt-2">Create Account</h2>
          <p className="text-brand-muted-text text-sm">Join MedBook to manage diagnostics and book tests</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  role === 'patient'
                    ? 'bg-brand-forest/10 border-brand-forest text-brand-forest font-bold'
                    : 'bg-brand-cream border-brand-border text-brand-muted-text hover:bg-brand-sage/50'
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole('lab_admin')}
                className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  role === 'lab_admin'
                    ? 'bg-brand-forest/10 border-brand-forest text-brand-forest font-bold'
                    : 'bg-brand-cream border-brand-border text-brand-muted-text hover:bg-brand-sage/50'
                }`}
              >
                Lab Partner
              </button>
            </div>
          </div>

          {/* Optional Laboratory Select dropdown for Lab Partner signup */}
          {role === 'lab_admin' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label htmlFor="lab" className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Laboratory Entity</label>
              <select
                id="lab"
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                className="w-full bg-brand-cream text-brand-dark-text border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm"
              >
                {labs.map(lab => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} ({lab.city})
                  </option>
                ))}
              </select>
              {onOnboardLab && (
                <button
                  type="button"
                  onClick={onOnboardLab}
                  className="text-xs text-brand-terracotta hover:text-brand-terracotta-hover font-bold block mt-1 hover:underline cursor-pointer text-left"
                >
                  Don't see your laboratory? Onboard your laboratory here
                </button>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Full Name</label>
            <input
              id="name"
              type="text"
              required
              placeholder="e.g. Adeyemi Okafor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-brand-cream text-brand-dark-text border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="e.g. adeyemi@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-cream text-brand-dark-text border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 6 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-cream text-brand-dark-text border border-brand-border rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none cursor-pointer text-brand-muted-text"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 01-2.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" />
                      <path d="M12.454 16.697L9.75 13.992a2.005 2.005 0 01-3.742-3.743L3.303 7.546A10.038 10.038 0 00.458 10c1.274 4.057 5.065 7 9.542 7a9.963 9.963 0 002.454-.303z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 6 chars"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-brand-cream text-brand-dark-text border border-brand-border rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none cursor-pointer text-brand-muted-text"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 01-2.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" />
                      <path d="M12.454 16.697L9.75 13.992a2.005 2.005 0 01-3.742-3.743L3.303 7.546A10.038 10.038 0 00.458 10c1.274 4.057 5.065 7 9.542 7a9.963 9.963 0 002.454-.303z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-forest hover:bg-brand-forest/90 text-brand-light-text font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-brand-light-text border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-sm text-brand-muted-text">
          Already have an account?{' '}
          <button 
            type="button" 
            onClick={onToggleLogin}
            className="text-brand-terracotta font-bold hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
