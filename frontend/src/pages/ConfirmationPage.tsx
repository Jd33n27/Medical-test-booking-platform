import React, { useState } from 'react';
import { api } from '../api/client';
import { Test, TimeSlot, BookingRequest } from '../types';
import { formatNaira, formatDateString } from '../utils/formatters';

interface ConfirmationPageProps {
  test: Test;
  slot: TimeSlot;
  bookingData: BookingRequest;
  onBack: () => void;
}

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ test, slot, bookingData, onBack }) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 3 Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount_percent: number; discount_amount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState<boolean>(false);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    try {
      setPromoLoading(true);
      setPromoError(null);
      const promoData = await api.validatePromo(promoCodeInput.trim().toUpperCase());
      setAppliedPromo(promoData);
      bookingData.promo_code = promoData.code;
    } catch (err: any) {
      console.error(err);
      setPromoError(err?.response?.data?.error || err.message || 'Promo code is invalid.');
      setAppliedPromo(null);
      bookingData.promo_code = null;
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError(null);
    bookingData.promo_code = null;
  };

  // Calculate discount and final amount
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_percent > 0) {
      discountAmount = test.price_naira * (appliedPromo.discount_percent / 100);
    } else if (appliedPromo.discount_amount > 0) {
      discountAmount = appliedPromo.discount_amount;
    }
  }
  const finalPrice = Math.max(0, test.price_naira - discountAmount);

  const handlePay = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await api.createBooking(bookingData);
      
      // Redirect to Flutterwave checkout
      if (response.flutterwave_link) {
        window.location.href = response.flutterwave_link;
      } else {
        throw new Error('Payment URL not received from booking service.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'An error occurred while creating your booking.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Back button */}
      <button 
        onClick={onBack}
        disabled={submitting}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50 text-sm font-semibold"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to form
      </button>

      <div className="p-4 sm:p-6 md:p-8 rounded-2xl glass-panel space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Review Booking</h2>
          <p className="text-slate-400 text-xs sm:text-sm">Please verify details below before proceeding to secure payment</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Appointment Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appointment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/20 border border-slate-800/80 p-5 rounded-xl text-sm">
            <div className="space-y-1">
              <span className="text-slate-500 block">Diagnostic Test</span>
              <span className="text-white font-bold block">{test.test_name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">Price</span>
              <span className="text-emerald-400 font-extrabold text-base block">{formatNaira(test.price_naira)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">Laboratory</span>
              <span className="text-white font-bold block">{test.lab_name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">Scheduled Time</span>
              <span className="text-white font-bold block">
                {formatDateString(slot.date)} @ {slot.time}
              </span>
            </div>
          </div>
        </div>

        {/* Patient Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/20 border border-slate-800/80 p-5 rounded-xl text-sm">
            <div className="space-y-1">
              <span className="text-slate-500 block">Full Name</span>
              <span className="text-white font-semibold block">{bookingData.patient_name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">Email Address</span>
              <span className="text-white font-semibold block">{bookingData.patient_email}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">Phone Number</span>
              <span className="text-white font-semibold block">{bookingData.patient_phone}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 block">Service Type</span>
              <span className="text-white font-semibold block">
                {bookingData.home_collection ? 'Home Extraction' : 'Clinic Visit'}
              </span>
            </div>

            {bookingData.home_collection && bookingData.collection_address && (
              <div className="md:col-span-2 space-y-1 pt-2 border-t border-slate-800">
                <span className="text-slate-500 block">Extraction Address</span>
                <span className="text-white font-medium block whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 mt-1">
                  {bookingData.collection_address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Promo Code Coupon Panel */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promotional Discount</h3>
          <form onSubmit={handleApplyPromo} className="flex gap-3">
            <input
              type="text"
              disabled={promoLoading || submitting}
              placeholder="ENTER COUPON CODE (e.g. HEALTH20)"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              className="flex-grow bg-slate-950/60 text-white placeholder:text-slate-600 border border-slate-850 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-4 py-2.5 focus:outline-none transition-all text-sm uppercase font-semibold"
            />
            {appliedPromo ? (
              <button
                type="button"
                onClick={handleRemovePromo}
                className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all border border-rose-500/20 cursor-pointer"
              >
                Remove
              </button>
            ) : (
              <button
                type="submit"
                disabled={promoLoading || submitting || !promoCodeInput.trim()}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
              >
                {promoLoading ? 'Checking...' : 'Apply'}
              </button>
            )}
          </form>
          {promoError && (
            <p className="text-xs text-rose-400 font-medium pl-1">{promoError}</p>
          )}
          {appliedPromo && (
            <p className="text-xs text-emerald-400 font-bold pl-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
              </svg>
              Coupon applied: {appliedPromo.code} ({appliedPromo.discount_percent > 0 ? `${appliedPromo.discount_percent}% discount` : `${formatNaira(appliedPromo.discount_amount)} off`})
            </p>
          )}
        </div>

        {/* Invoice Summary Details */}
        <div className="space-y-3 pt-4 border-t border-slate-850">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Breakdown</h3>
          <div className="space-y-2 bg-slate-950/30 border border-slate-850 p-4 rounded-xl text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Test Price Subtotal</span>
              <span>{formatNaira(test.price_naira)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-medium animate-fadeIn">
                <span>Coupon Discount</span>
                <span>-{formatNaira(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-850/60 pt-2 mt-2">
              <span>Total to Pay</span>
              <span className="text-emerald-450">{formatNaira(finalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <div className="pt-6 border-t border-slate-850">
          <button
            onClick={handlePay}
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-0.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                Generating Secure Link...
              </>
            ) : (
              <>
                {/* Shield icon */}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Pay {formatNaira(finalPrice)} via Flutterwave
              </>
            )}
          </button>
          <div className="text-center text-[10px] text-slate-500 mt-3 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured and encrypted by Flutterwave.
          </div>
        </div>
      </div>
    </div>
  );
};
