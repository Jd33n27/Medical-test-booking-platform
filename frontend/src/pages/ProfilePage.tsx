import React, { useState } from "react";
import { api } from "../api/client";
import { User } from "../types";

interface ProfilePageProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUpdateUser,
  onBack,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Health Vitals states
  const [bloodPressure, setBloodPressure] = useState(user.blood_pressure || "");
  const [bloodSugar, setBloodSugar] = useState(
    user.blood_sugar ? String(user.blood_sugar) : "",
  );
  const [heightCm, setHeightCm] = useState(
    user.height_cm ? String(user.height_cm) : "",
  );
  const [weightKg, setWeightKg] = useState(
    user.weight_kg ? String(user.weight_kg) : "",
  );
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthSuccess, setHealthSuccess] = useState(false);

  // Verification states
  const [idNumber, setIdNumber] = useState(user.id_number || "");
  const [licenseNumber, setLicenseNumber] = useState(user.license_number || "");
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

      const response = await api.updateProfile({
        name,
        email,
        blood_pressure: bloodPressure || undefined,
        blood_sugar: bloodSugar ? parseInt(bloodSugar) : undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      });
      onUpdateUser(response);
      setIsEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setEditError(
        err.response?.data?.error || err.message || "Failed to update profile.",
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setHealthLoading(true);
      setHealthError(null);
      setHealthSuccess(false);

      const parsedSugar = bloodSugar ? parseInt(bloodSugar) : undefined;
      const parsedHeight = heightCm ? parseFloat(heightCm) : undefined;
      const parsedWeight = weightKg ? parseFloat(weightKg) : undefined;

      const response = await api.updateProfile({
        name: user.name,
        email: user.email,
        blood_pressure: bloodPressure || undefined,
        blood_sugar: parsedSugar,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
      });

      onUpdateUser(response);
      setIsEditingHealth(false);
      setHealthSuccess(true);
      setTimeout(() => setHealthSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setHealthError(
        err.response?.data?.error || err.message || "Failed to update vitals.",
      );
    } finally {
      setHealthLoading(false);
    }
  };

  const handleVerifyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerifyLoading(true);
      setVerifyError(null);
      setVerifySuccess(false);

      const payload: any = {};
      if (user.role === "patient") {
        if (!idNumber.trim()) {
          setVerifyError(
            "Please enter your National Identification Number (NIN).",
          );
          setVerifyLoading(false);
          return;
        }
        payload.id_number = idNumber;
      } else if (user.role === "lab_admin") {
        if (!licenseNumber.trim()) {
          setVerifyError("Please enter your Medical Practice License Number.");
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
      setVerifyError(
        err.response?.data?.error || err.message || "Failed to verify profile.",
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const isVerified = user.verification_status === "verified";

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-brand-muted-text hover:text-brand-dark-text transition-colors mb-6 cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Dashboard
      </button>

      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bento-panel-light shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-brand-sage flex items-center justify-center text-brand-forest font-extrabold text-xl relative shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
              {isVerified && (
                <span
                  className="absolute -bottom-1 -right-1 bg-brand-forest text-brand-cream p-0.5 rounded-full border-2 border-brand-panel-light"
                  title="Verified Account"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-brand-dark-text leading-none">
                  {user.name}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-brand-forest/10 text-brand-forest border border-brand-forest/20 select-none">
                    Verified Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-brand-terracotta/10 text-brand-terracotta border border-brand-terracotta/20 select-none animate-pulse">
                    Verification Required
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-muted-text capitalize">
                {user.role.replace("_", " ")} Profile
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-brand-dark-text">
            <div>
              Member since: {new Date(user.created_at).toLocaleDateString()}
            </div>
            <div>
              Account ID: <span className="font-mono">{user.id}</span>
            </div>
          </div>
        </div>

        {/* Profile Settings form */}
        <div className="p-6 rounded-2xl bento-panel-light shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-dark-text">
              Basic Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-brand-sage hover:bg-brand-border/40 text-brand-forest font-bold rounded-lg border border-brand-border text-xs cursor-pointer transition-colors"
              >
                Edit details
              </button>
            )}
          </div>

          {editSuccess && (
            <div className="p-3 bg-brand-forest/10 border border-brand-forest/20 text-brand-forest text-xs rounded-xl">
              Profile details updated successfully!
            </div>
          )}

          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {editError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-2 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setName(user.name);
                    setEmail(user.email);
                    setIsEditing(false);
                    setEditError(null);
                  }}
                  className="px-3 py-2 bg-brand-sage hover:bg-brand-border/40 text-brand-forest border border-brand-border font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-brand-forest hover:bg-brand-forest/90 text-brand-light-text font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Personal Health Summary Card (For Patients Only) */}
        {user.role === "patient" && (
          <div className="p-6 rounded-2xl bento-panel-light shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border/45 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-dark-text">
                Personal Health Summary
              </h2>
              {!isEditingHealth && (
                <button
                  onClick={() => setIsEditingHealth(true)}
                  className="px-3 py-1.5 bg-brand-sage hover:bg-brand-border/40 text-brand-forest font-bold rounded-lg border border-brand-border text-xs cursor-pointer transition-colors"
                >
                  Update Vitals
                </button>
              )}
            </div>

            {healthSuccess && (
              <div className="p-3 bg-brand-forest/10 border border-brand-forest/20 text-brand-forest text-xs rounded-xl">
                Health vital parameters saved successfully!
              </div>
            )}

            {healthError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {healthError}
              </div>
            )}

            <form onSubmit={handleUpdateHealth} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                    Blood Pressure (mmHg)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 120/80"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    disabled={!isEditingHealth}
                    className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                    Fasting Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 90"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    disabled={!isEditingHealth}
                    className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 175"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    disabled={!isEditingHealth}
                    className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 70"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    disabled={!isEditingHealth}
                    className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              {isEditingHealth && (
                <div className="flex justify-end gap-2 pt-2 border-t border-brand-border/40">
                  <button
                    type="button"
                    onClick={() => {
                      setBloodPressure(user.blood_pressure || "");
                      setBloodSugar(
                        user.blood_sugar ? String(user.blood_sugar) : "",
                      );
                      setHeightCm(user.height_cm ? String(user.height_cm) : "");
                      setWeightKg(user.weight_kg ? String(user.weight_kg) : "");
                      setIsEditingHealth(false);
                      setHealthError(null);
                    }}
                    className="px-3 py-2 bg-brand-sage hover:bg-brand-border/40 text-brand-forest border border-brand-border font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={healthLoading}
                    className="px-4 py-2 bg-brand-forest hover:bg-brand-forest/90 text-brand-light-text font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    {healthLoading ? "Saving..." : "Save Vitals"}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Laboratory Details section */}
        {user.role === "lab_admin" && user.lab_id && (
          <div className="p-6 rounded-2xl bento-panel-light shadow-sm space-y-4">
            <div className="border-b border-brand-border/40 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-dark-text">
                Onboarded Laboratory Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-brand-muted-text/80 uppercase tracking-wider block">
                  Clinic Name
                </span>
                <span className="text-sm font-bold text-brand-dark-text block">
                  {user.lab_name || "Loading clinic name..."}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-brand-muted-text/80 uppercase tracking-wider block">
                  Official Phone
                </span>
                <span className="text-sm font-bold text-brand-dark-text block">
                  {user.lab_phone || "N/A"}
                </span>
              </div>

              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] font-semibold text-brand-muted-text/80 uppercase tracking-wider block">
                  Registered Address
                </span>
                <span className="text-sm text-brand-muted-text block leading-relaxed font-medium">
                  {user.lab_address && `${user.lab_address}, `}
                  {user.lab_city && `${user.lab_city}, `}
                  {user.lab_state && `${user.lab_state}`}
                  {!user.lab_address && "No address configured"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-brand-muted-text/80 uppercase tracking-wider block">
                  Geocoded Coordinates
                </span>
                <span className="text-xs font-mono text-brand-muted-text block font-bold">
                  {user.lab_latitude && user.lab_longitude
                    ? `${user.lab_latitude.toFixed(6)}° N, ${user.lab_longitude.toFixed(6)}° E`
                    : "N/A"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-brand-muted-text/80 uppercase tracking-wider block">
                  Sample Collection
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 font-bold mt-1 text-[11px] ${user.lab_accepts_home_collection ? "text-brand-forest" : "text-brand-muted-text/70"}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${user.lab_accepts_home_collection ? "bg-brand-forest animate-pulse" : "bg-brand-border"}`}
                  />
                  {user.lab_accepts_home_collection
                    ? "Accepts Home Sample Collection"
                    : "Walk-in Only"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Verification section */}
        <div className="p-6 rounded-2xl bento-panel-light shadow-sm space-y-4">
          <div className="border-b border-brand-border/40 pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-dark-text">
              Identity & Verification
            </h2>
          </div>

          {verifySuccess && (
            <div className="p-3 bg-brand-forest/10 border border-brand-forest/20 text-brand-forest text-xs rounded-xl">
              Verification details approved successfully! Your account is now
              verified.
            </div>
          )}

          {verifyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {verifyError}
            </div>
          )}

          {isVerified ? (
            <div className="p-4 bg-brand-forest/5 border border-brand-forest/10 rounded-2xl flex items-start gap-3">
              <span className="bg-brand-forest/10 p-1.5 rounded-xl border border-brand-forest/20 text-brand-forest">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </span>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-brand-dark-text">
                  Your Account is Verified
                </h3>
                <p className="text-[11px] text-brand-muted-text leading-relaxed">
                  Thank you for verifying your profile.
                  {user.role === "patient" &&
                    ` Your NIN (${user.id_number}) is linked to your medical diagnostics logs.`}
                  {user.role === "lab_admin" &&
                    ` Your laboratory license verification (${user.license_number}) has been approved.`}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifyProfile} className="space-y-4">
              <div className="p-4 bg-brand-cream border border-brand-border rounded-2xl text-[11px] text-brand-muted-text leading-relaxed">
                {user.role === "patient" ? (
                  <span>
                    Please complete your identity verification by linking your
                    National Identification Number (NIN). Linking your identity
                    ensures that diagnostic test results are correctly
                    aggregated in your secure vault.
                  </span>
                ) : (
                  <span>
                    Medical laboratory administrators are required to provide
                    their medical practice license key to list slots and issue
                    verified diagnostic result documents.
                  </span>
                )}
              </div>

              {user.role === "patient" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                    National ID / NIN Number
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. NIN-10293847"
                    className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                    Medical Practice License Key
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. MLSCN-87654"
                    className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/30 border border-brand-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-terracotta transition-colors text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-brand-border/40">
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="px-4 py-2 bg-brand-forest hover:bg-brand-forest/90 disabled:opacity-50 text-brand-light-text font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  {verifyLoading ? "Approving..." : "Submit Verification"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
