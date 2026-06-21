import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BookingStatus } from '../types';
import { formatDateString } from '../utils/formatters';

interface PaymentSuccessPageProps {
  onGoHome: () => void;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ onGoHome }) => {
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const bookingId = queryParams.get('booking_id');

        if (!bookingId) {
          setError('No booking ID was found in the redirect URL.');
          setLoading(false);
          return;
        }

        // Call status endpoint
        const data = await api.getBookingStatus(bookingId);
        setBooking(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Could not fetch booking confirmation details. Check your email for confirmation.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 space-y-8 py-4">
      <div className="p-6 md:p-8 rounded-2xl glass-panel text-center space-y-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Verifying secure payment receipt...</p>
          </div>
        ) : error ? (
          <div className="space-y-6 py-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Payment Status Warning</h2>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
            <button
              onClick={onGoHome}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl font-bold transition-all text-sm"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <>
            {/* Checked animation mark */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5 animate-bounce">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white">Booking Confirmed!</h2>
              <p className="text-slate-400 text-sm">
                Your payment was processed successfully. A confirmation email has been dispatched.
              </p>
            </div>

            {/* Status breakdown card */}
            <div className="bg-slate-800/20 border border-slate-800/80 p-5 rounded-xl text-left text-sm space-y-3.5">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-500">Booking Reference</span>
                <span className="font-mono text-slate-300 font-bold text-xs uppercase">{booking?.booking_id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-500">Diagnostic Test</span>
                <span className="text-white font-bold">{booking?.test_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-500">Laboratory</span>
                <span className="text-white font-bold">{booking?.lab_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-500">Appointment Date</span>
                <span className="text-white font-bold">{booking ? formatDateString(booking.appointment_date) : ''}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-500">Appointment Time</span>
                <span className="text-white font-bold">{booking?.appointment_time}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Address / Location</span>
                <span className="text-slate-300 font-medium text-right max-w-[200px] line-clamp-2">{booking?.lab_address}</span>
              </div>
            </div>

            {/* Note info bubble */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-left flex gap-3 text-xs text-blue-400">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span className="font-semibold block">Important Reminder</span>
                Please prepare any sample requirements (e.g. fasting for lipid profiles) as advised. Contact {booking?.lab_name} directly for questions.
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                onClick={onGoHome}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl transition-all duration-200"
              >
                Book Another Diagnostic Test
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
