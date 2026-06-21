import React, { useState } from 'react';
import { api } from '../api/client';
import { User } from '../types';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateUser, onBack }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Verification states
  const [idNumber, setIdNumber] = useState(user.id_number || '');
  const [licenseNumber, setLicenseNumber] = useState(user.license_number || '');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setEditLoading(true);
      setEditError(null);
      setEditSuccess(false);

      const response = await api.updateProfile({ name, email });
      onUpdateUser(response);
      setIsEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setEditError(err.response?.data?.error || err.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleVerifyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerifyLoading(true);
      setVerifyError(null);
      setVerifySuccess(false);

      const payload: any = {};
      if (user.role === 'patient') {
        if (!idNumber.trim()) {
          setVerifyError('Please enter your National Identification Number (NIN).');
          setVerifyLoading(false);
          return;
        }
        payload.id_number = idNumber;
      } else if (user.role === 'lab_admin') {
        if (!licenseNumber.trim()) {
          setVerifyError('Please enter your Medical Practice License Number.');
          setVerifyLoading(false);
          return;
        }
        payload.license_number = licenseNumber;
      }

      const response = await api.verifyProfile(payload);
      onUpdateUser(response);
      setVerifySuccess(true);
      setTimeout(() => setVerifySuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setVerifyError(err.response?.data?.error || err.message || 'Failed to verify profile.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const isVerified = user.verification_status === 'verified';

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 animate-fadeIn">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </button>

      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-extrabold text-xl relative shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
              {isVerified && (
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-955 p-0.5 rounded-full border-2 border-slate-900" title="Verified Account">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-white leading-none">{user.name}</h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 select-none">
                    Verified Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 select-none animate-pulse">
                    Verification Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ')} Profile</p>
            </div>
          </div>
          <div className="text-left sm:text-right text-[10px] text-slate-500">
            <div>Member since: {new Date(user.created_at).toLocaleDateString()}</div>
            <div>Account ID: {user.id}</div>
          </div>
        </div>

        {/* Profile Settings form */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">Basic Information</h2>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Edit details
              </button>
            )}
          </div>

          {editSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
              Profile details updated successfully!
            </div>
          )}

          {editError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {editError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-slate-950 text-white placeholder:text-slate-750 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm disabled:opacity-50 disabled:bg-slate-900/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-slate-950 text-white placeholder:text-slate-755 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm disabled:opacity-50 disabled:bg-slate-900/30"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setName(user.name);
                    setEmail(user.email);
                    setIsEditing(false);
                    setEditError(null);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Laboratory Details section */}
        {user.role === 'lab_admin' && user.lab_id && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">Onboarded Laboratory Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Clinic Name</span>
                <span className="text-sm font-bold text-slate-200 block">{user.lab_name || 'Loading clinic name...'}</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Official Phone</span>
                <span className="text-sm font-bold text-slate-200 block">{user.lab_phone || 'N/A'}</span>
              </div>
              
              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Registered Address</span>
                <span className="text-sm text-slate-350 block leading-relaxed font-medium">
                  {user.lab_address && `${user.lab_address}, `}
                  {user.lab_city && `${user.lab_city}, `}
                  {user.lab_state && `${user.lab_state}`}
                  {!user.lab_address && 'No address configured'}
                </span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Geocoded Coordinates</span>
                <span className="text-xs font-mono text-slate-400 block font-bold">
                  {user.lab_latitude && user.lab_longitude ? (
                    `${user.lab_latitude.toFixed(6)}° N, ${user.lab_longitude.toFixed(6)}° E`
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Sample Collection</span>
                <span className={`inline-flex items-center gap-1.5 font-bold mt-1 text-[11px] ${user.lab_accepts_home_collection ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.lab_accepts_home_collection ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  {user.lab_accepts_home_collection ? 'Accepts Home Sample Collection' : 'Walk-in Only'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Verification section */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">Identity & Verification</h2>
          </div>

          {verifySuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
              Verification details approved successfully! Your account is now verified.
            </div>
          )}

          {verifyError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {verifyError}
            </div>
          )}

          {isVerified ? (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
              <span className="bg-emerald-500/10 p-1.5 rounded-xl border border-emerald-500/20 text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white">Your Account is Verified</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Thank you for verifying your profile. 
                  {user.role === 'patient' && ` Your NIN (${user.id_number}) is linked to your medical diagnostics logs.`}
                  {user.role === 'lab_admin' && ` Your laboratory license verification (${user.license_number}) has been approved.`}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifyProfile} className="space-y-4">
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-[11px] text-slate-400 leading-relaxed">
                {user.role === 'patient' ? (
                  <span>
                    Please complete your identity verification by linking your National Identification Number (NIN). Linking your identity ensures that diagnostic test results are correctly aggregated in your secure vault.
                  </span>
                ) : (
                  <span>
                    Medical laboratory administrators are required to provide their medical practice license key to list slots and issue verified diagnostic result documents.
                  </span>
                )}
              </div>

              {user.role === 'patient' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">National ID / NIN Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. NIN-10293847"
                    className="w-full bg-slate-950 text-white placeholder:text-slate-700 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Medical Practice License Key</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. MLSCN-87654"
                    className="w-full bg-slate-950 text-white placeholder:text-slate-700 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-800/60">
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-955 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  {verifyLoading ? 'Approving...' : 'Submit Verification'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
