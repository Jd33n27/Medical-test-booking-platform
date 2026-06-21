import React, { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../api/client';
import { BookingHistoryItem } from '../types';
import { formatNaira, formatDateString } from '../utils/formatters';

interface HistoryPageProps {
  onBack: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack }) => {
  const [history, setHistory] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await api.getBookingHistory();
        setHistory(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve your booking history. Check if the database connection is active.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleViewReceipt = (bookingId: string) => {
    window.history.pushState({}, '', `/payment-success?booking_id=${bookingId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-brand-muted-text hover:text-brand-dark-text transition-colors group text-sm font-semibold cursor-pointer"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </button>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-brand-dark-text flex items-center gap-3">
          {/* Medical book icon */}
          <svg className="w-8 h-8 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          My Diagnostic Vault
        </h2>
        <p className="text-brand-muted-text text-sm">Access your historical orders, appointment times, and download ready lab test report sheets</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-12 h-12 border-4 border-brand-border border-t-brand-terracotta rounded-full animate-spin"></div>
          <p className="text-brand-muted-text text-sm">Retrieving diagnostic records...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 bento-panel-light rounded-2xl p-6">
          <svg className="w-16 h-16 text-brand-muted-text/60 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-brand-dark-text">No bookings found</h3>
          <p className="text-brand-muted-text text-sm mt-1 max-w-sm mx-auto">
            You haven't scheduled any diagnostic appointments yet. Book a test from the homepage to start your health records folder.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((booking) => {
            const isPaid = booking.status === 'paid';
            const isPending = booking.status === 'pending';
            
            return (
              <div 
                key={booking.booking_id} 
                className="p-5 rounded-2xl bento-panel-light hover:border-brand-muted-text transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Test details */}
                <div className="space-y-3 flex-grow">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-brand-dark-text">{booking.test_name}</h3>
                    <span className="font-mono text-[10px] sm:text-[11px] bg-brand-sage text-brand-forest border border-brand-border px-2 py-0.5 rounded-md select-all uppercase">
                      REF: {booking.booking_id}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase border ${
                      isPaid 
                        ? 'bg-brand-forest/10 border-brand-forest/20 text-brand-forest' 
                        : isPending 
                          ? 'bg-brand-terracotta/10 border-brand-terracotta/20 text-brand-terracotta'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-brand-muted-text">
                    <div>
                      <span className="text-brand-muted-text/80">Laboratory:</span> <strong className="text-brand-dark-text">{booking.lab_name}</strong>
                    </div>
                    <div>
                      <span className="text-brand-muted-text/80">Appointment:</span> <strong className="text-brand-dark-text">{formatDateString(booking.appointment_date)} @ {booking.appointment_time}</strong>
                    </div>
                    <div>
                      <span className="text-brand-muted-text/80">Charged Amount:</span> <strong className="text-brand-dark-text">{formatNaira(booking.total_price_naira)}</strong>
                    </div>
                  </div>
                </div>

                {/* Download / Actions */}
                <div className="shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 pt-2 md:pt-0 w-full md:w-auto">
                  <button
                    onClick={() => handleViewReceipt(booking.booking_id)}
                    className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-2 bg-brand-sage hover:bg-brand-border/40 border border-brand-border text-brand-forest font-bold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Receipt
                  </button>

                  <button
                    onClick={() => (window as any).navigateToChat?.(booking.lab_id)}
                    className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-2 bg-brand-sage hover:bg-brand-border/40 border border-brand-border text-brand-forest font-bold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat with Lab
                  </button>

                  {booking.result_ready && booking.result_file_url ? (
                    <a
                      href={`${API_BASE_URL}${booking.result_file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-forest/90 text-brand-light-text font-bold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      {/* Download icon */}
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Results
                    </a>
                  ) : (
                    <div className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 text-brand-muted-text text-xs sm:text-sm bg-brand-sage/50 py-2 px-3 sm:px-4 rounded-xl border border-brand-border">
                      {/* Spinner or clock icon */}
                      <svg className="w-4 h-4 text-brand-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Processing...
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
