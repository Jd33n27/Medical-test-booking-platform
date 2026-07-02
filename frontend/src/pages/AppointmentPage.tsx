import React, { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../api/client';
import { BookingHistoryItem, TimeSlot } from '../types';
import { formatNaira, formatDateString } from '../utils/formatters';

interface AppointmentPageProps {
  onBack: () => void;
}

export const AppointmentPage: React.FC<AppointmentPageProps> = ({ onBack }) => {
  const [appointments, setAppointments] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Cancel Appointment States
  const [cancellingBooking, setCancellingBooking] = useState<BookingHistoryItem | null>(null);
  const [cancellingLoading, setCancellingLoading] = useState<boolean>(false);

  // Reschedule Appointment States
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingHistoryItem | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [rescheduleLoading, setRescheduleLoading] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Prepare Modal States
  const [preparingBooking, setPreparingBooking] = useState<BookingHistoryItem | null>(null);

  // Toast alert status
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getBookingHistory();
      setAppointments(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch scheduled appointments. Please verify server status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch slots when reschedule is clicked
  useEffect(() => {
    if (!reschedulingBooking) {
      setAvailableSlots([]);
      setSelectedSlotId('');
      setRescheduleError(null);
      return;
    }

    const fetchSlots = async () => {
      setSlotsLoading(true);
      setRescheduleError(null);
      try {
        const data = await api.getTestSlots(reschedulingBooking.test_id);
        // filter out slots that have no capacity left
        setAvailableSlots(data.slots.filter(s => s.available > 0));
      } catch (err: any) {
        console.error(err);
        setRescheduleError('Failed to load available time slots for this laboratory.');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [reschedulingBooking]);

  const handleCancelClick = (booking: BookingHistoryItem) => {
    setCancellingBooking(booking);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setCancellingLoading(true);
    try {
      await api.cancelAppointment(cancellingBooking.booking_id);
      triggerToast('Appointment cancelled successfully.', 'success');
      setCancellingBooking(null);
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Failed to cancel appointment. Please try again.', 'error');
    } finally {
      setCancellingLoading(false);
    }
  };

  const handleRescheduleClick = (booking: BookingHistoryItem) => {
    setReschedulingBooking(booking);
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !selectedSlotId) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      await api.rescheduleAppointment(reschedulingBooking.booking_id, selectedSlotId);
      triggerToast('Appointment rescheduled successfully.', 'success');
      setReschedulingBooking(null);
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      setRescheduleError(err.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Filter based on activeTab
  // Upcoming is paid/pending and NOT result_ready and status != cancelled
  const upcoming = appointments.filter(
    (b) => (b.status === 'paid' || b.status === 'pending') && !b.result_ready
  );

  // Past is result_ready or status cancelled/failed
  const past = appointments.filter(
    (b) => b.result_ready || b.status === 'cancelled' || b.status === 'failed'
  );

  const displayedList = activeTab === 'upcoming' ? upcoming : past;

  // Helper to determine preparation instructions
  const getPrepGuide = (testName: string) => {
    const lower = testName.toLowerCase();
    if (lower.includes('glucose') || lower.includes('sugar') || lower.includes('lipid') || lower.includes('cholesterol') || lower.includes('metabolic') || lower.includes('fasting')) {
      return {
        fasting: '8 to 12 hours strict fasting is required before sample collection. You may drink plain water.',
        hydration: 'Drink plenty of water prior to collection to make blood extraction easier.',
        medication: 'Consult your doctor regarding whether to take your morning prescription before or after the test.'
      };
    }
    if (lower.includes('urine') || lower.includes('urinalysis')) {
      return {
        fasting: 'No fasting required.',
        hydration: 'Drink 2-3 glasses of water about 1 hour prior to slot to facilitate clean urine collection.',
        medication: 'Ensure private hygiene. Provide mid-stream sample collection.'
      };
    }
    return {
      fasting: 'Fasting is generally not required for this test unless otherwise advised by your physician.',
      hydration: 'Ensure you are well-hydrated to optimize sample quality.',
      medication: 'Continue taking regular medications unless specifically instructed to withhold by your doctor.'
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-24 right-4 sm:right-8 max-w-[calc(100vw-2rem)] z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 transition-all animate-bounce ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-brand-muted-text hover:text-brand-dark-text transition-colors group text-sm font-semibold cursor-pointer"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-[#1F3A2B] flex items-center gap-3">
            <svg className="w-8 h-8 text-[#D26E4F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Scheduled Appointments
          </h2>
          <p className="text-brand-muted-text text-sm mt-1">Manage and track your active, upcoming sample collections and previous visits.</p>
        </div>

        {/* Sub-tabs toggler */}
        <div className="bg-[#FAF6F0] border border-[#EAE3D5] p-1.5 rounded-xl flex gap-1 self-start sm:self-auto shrink-0 shadow-sm">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-[#1F3A2B] text-white shadow-sm'
                : 'text-brand-muted-text hover:text-brand-dark-text'
            }`}
          >
            Upcoming Visits ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'past'
                ? 'bg-[#1F3A2B] text-white shadow-sm'
                : 'text-brand-muted-text hover:text-brand-dark-text'
            }`}
          >
            Past Records ({past.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-12 h-12 border-4 border-[#EAE3D5] border-t-[#D26E4F] rounded-full animate-spin"></div>
          <p className="text-brand-muted-text text-sm">Loading your appointments details...</p>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#EAE3D5] rounded-2xl p-6 shadow-sm">
          <svg className="w-16 h-16 text-brand-muted-text/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-brand-dark-text">
            {activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments found'}
          </h3>
          <p className="text-brand-muted-text text-sm mt-1 max-w-sm mx-auto">
            {activeTab === 'upcoming' 
              ? "You don't have any diagnostic appointments scheduled right now. Book a test to start."
              : 'You have no historical entries or cancelled diagnostics recorded.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedList.map((booking) => {
            const isPaid = booking.status === 'paid';
            const isPending = booking.status === 'pending';
            const isCancelled = booking.status === 'cancelled';
            const isFailed = booking.status === 'failed';
            const showReschedule = !isCancelled && !isFailed && !booking.result_ready;
            const showCancel = (isPaid || isPending) && !booking.result_ready;

            return (
              <div 
                key={booking.booking_id} 
                className="bg-white border border-[#EAE3D5] hover:border-brand-muted-text rounded-2xl p-6 transition-all shadow-sm flex flex-col lg:flex-row justify-between gap-6"
              >
                {/* Details Section */}
                <div className="space-y-4 flex-grow">
                  {/* Title & Status Badge */}
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-brand-dark-text">{booking.test_name}</h3>
                    
                    <span className="font-mono text-[10px] bg-[#FAF6F0] border border-[#EAE3D5] px-2 py-0.5 rounded text-brand-muted-text font-bold select-all uppercase">
                      REF: {booking.booking_id.substring(0, 8)}...
                    </span>

                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase border ${
                      isPaid 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                        : isPending 
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : isCancelled
                            ? 'bg-gray-50 border-gray-200 text-gray-500'
                            : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                      {isPaid ? 'Confirmed' : isPending ? 'Awaiting Payment' : isCancelled ? 'Cancelled' : 'Failed'}
                    </span>

                    {booking.home_collection && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase bg-[#D26E4F]/10 border border-[#D26E4F]/20 text-[#D26E4F]">
                        Home Sample
                      </span>
                    )}
                  </div>

                  {/* Booking Specifics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs text-brand-muted-text border-t border-[#FAF6F0] pt-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted-text/80 block">Accredited Laboratory</span>
                      <strong className="text-brand-dark-text text-sm font-extrabold block">{booking.lab_name}</strong>
                      <span className="text-[11px] text-brand-muted-text/90 block leading-tight">{booking.lab_address}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted-text/80 block">Schedule Date & Time</span>
                      <strong className="text-brand-dark-text text-sm font-extrabold block">
                        {formatDateString(booking.appointment_date)}
                      </strong>
                      <span className="text-[11px] text-brand-muted-text/90 block">
                        at {booking.appointment_time}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted-text/80 block">Invoice Total</span>
                      <strong className="text-brand-dark-text text-sm font-extrabold block">
                        {formatNaira(booking.total_price_naira)}
                      </strong>
                      <span className="text-[11px] text-brand-muted-text/90 block">
                        Paid via Flutterwave
                      </span>
                    </div>
                  </div>

                  {/* Home collection address */}
                  {booking.home_collection && booking.collection_address && (
                    <div className="bg-[#FAF6F0] rounded-xl p-3.5 border border-[#EAE3D5]/60 text-xs text-brand-dark-text flex gap-2">
                      <svg className="w-4 h-4 text-[#D26E4F] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <span className="font-bold text-[10px] uppercase tracking-wider text-brand-muted-text block mb-0.5">Sample Collection Address</span>
                        <p className="font-semibold text-brand-dark-text/95">{booking.collection_address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Panel */}
                <div className="lg:w-48 shrink-0 flex flex-row lg:flex-col justify-end lg:justify-start gap-2.5 pt-4 lg:pt-0 lg:border-l border-[#FAF6F0] lg:pl-6 flex-wrap">
                  {/* Preparation CTA */}
                  {showReschedule && (
                    <button
                      onClick={() => setPreparingBooking(booking)}
                      className="grow lg:grow-0 text-center bg-white border border-[#EAE3D5] hover:bg-[#FAF6F0] text-brand-dark-text font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 text-[#D26E4F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Preparation
                    </button>
                  )}

                  {/* Reschedule button */}
                  {showReschedule && (
                    <button
                      onClick={() => handleRescheduleClick(booking)}
                      className="grow lg:grow-0 text-center bg-white border border-[#EAE3D5] hover:bg-[#FAF6F0] text-brand-dark-text font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 text-[#1F3A2B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Reschedule
                    </button>
                  )}

                  {/* Chat button */}
                  {!isCancelled && (
                    <button
                      onClick={() => (window as any).navigateToChat?.(booking.lab_id)}
                      className="grow lg:grow-0 text-center bg-white border border-[#EAE3D5] hover:bg-[#FAF6F0] text-brand-dark-text font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 text-[#1F3A2B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Chat with Lab
                    </button>
                  )}

                  {/* Cancel button */}
                  {showCancel && (
                    <button
                      onClick={() => handleCancelClick(booking)}
                      className="grow lg:grow-0 text-center bg-rose-50 hover:bg-rose-100/80 text-rose-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Cancel Appointment
                    </button>
                  )}

                  {/* Download Result Link */}
                  {booking.result_ready && booking.result_file_url && (
                    <a
                      href={`${API_BASE_URL}${booking.result_file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grow lg:grow-0 text-center bg-[#1F3A2B] hover:bg-[#15271D] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Results
                    </a>
                  )}

                  {/* Completed placeholder */}
                  {booking.result_ready && !booking.result_file_url && (
                    <span className="w-full text-center inline-flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-xs">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preparation Instructions Modal */}
      {preparingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A3026]/35 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#EAE3D5] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-slideUp space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-[#FAF6F0]">
              <div>
                <h4 className="text-lg font-black text-[#1F3A2B]">Test Preparation</h4>
                <p className="text-xs text-brand-muted-text font-semibold">{preparingBooking.test_name}</p>
              </div>
              <button
                onClick={() => setPreparingBooking(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] hover:bg-brand-sage/40 flex items-center justify-center text-brand-muted-text transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs text-brand-dark-text leading-relaxed">
              <div className="bg-[#D26E4F]/5 border border-[#D26E4F]/10 rounded-xl p-3.5 flex items-start gap-3">
                <svg className="w-5 h-5 text-[#D26E4F] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-semibold text-brand-dark-text/90">Following preparation guidelines strictly ensures optimal sample quality and prevents false registry reports.</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F3A2B]/10 text-[#1F3A2B] flex items-center justify-center font-bold text-xs shrink-0">1</div>
                  <div>
                    <span className="font-extrabold text-[#1F3A2B] block">Fasting Requirement</span>
                    <span className="text-brand-muted-text">{getPrepGuide(preparingBooking.test_name).fasting}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F3A2B]/10 text-[#1F3A2B] flex items-center justify-center font-bold text-xs shrink-0">2</div>
                  <div>
                    <span className="font-extrabold text-[#1F3A2B] block">Hydration</span>
                    <span className="text-brand-muted-text">{getPrepGuide(preparingBooking.test_name).hydration}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F3A2B]/10 text-[#1F3A2B] flex items-center justify-center font-bold text-xs shrink-0">3</div>
                  <div>
                    <span className="font-extrabold text-[#1F3A2B] block">Regular Medication & Guidelines</span>
                    <span className="text-brand-muted-text">{getPrepGuide(preparingBooking.test_name).medication}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPreparingBooking(null)}
              className="w-full py-3 bg-[#1F3A2B] hover:bg-[#15271D] text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A3026]/35 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#EAE3D5] rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-slideUp space-y-6">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                </svg>
              </div>
              <h4 className="text-lg font-black text-[#1F3A2B]">Cancel Appointment?</h4>
              <p className="text-xs text-brand-muted-text leading-relaxed">
                Are you sure you want to cancel your appointment for <span className="font-bold text-brand-dark-text">{cancellingBooking.test_name}</span>? This will release the selected time slot.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancellingBooking(null)}
                disabled={cancellingLoading}
                className="flex-1 py-3 border border-[#EAE3D5] hover:bg-[#FAF6F0] rounded-xl text-xs font-extrabold text-brand-dark-text cursor-pointer transition-colors"
              >
                No, Keep it
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancellingLoading}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors disabled:opacity-50"
              >
                {cancellingLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A3026]/35 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#EAE3D5] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-slideUp flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[#FAF6F0] shrink-0">
              <div>
                <h4 className="text-lg font-black text-[#1F3A2B]">Reschedule Appointment</h4>
                <p className="text-xs text-brand-muted-text font-semibold">{reschedulingBooking.test_name}</p>
              </div>
              <button
                onClick={() => setReschedulingBooking(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] hover:bg-brand-sage/40 flex items-center justify-center text-brand-muted-text transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error badge */}
            {rescheduleError && (
              <div className="p-3 my-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-xs shrink-0">
                {rescheduleError}
              </div>
            )}

            {/* Scrollable Slots */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-[200px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted-text block">Available Slots for {reschedulingBooking.lab_name}</span>

              {slotsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <div className="w-8 h-8 border-3 border-[#EAE3D5] border-t-[#D26E4F] rounded-full animate-spin"></div>
                  <span className="text-[11px] text-brand-muted-text">Finding time slots...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-10 bg-[#FAF6F0]/40 rounded-xl">
                  <span className="text-xs text-brand-muted-text block">No available slots found for the next 7 days.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`text-left p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1F3A2B] border-[#1F3A2B] text-white shadow-md scale-[1.02]'
                            : 'bg-white border-[#EAE3D5] hover:bg-[#FAF6F0] text-brand-dark-text'
                        }`}
                      >
                        <span className="block text-[11px] opacity-90">{slot.date}</span>
                        <span className="block text-sm font-extrabold mt-0.5">{slot.time}</span>
                        <span className={`text-[10px] block mt-1 ${isSelected ? 'text-white/80' : 'text-brand-muted-text'}`}>
                          {slot.available} slots left
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#FAF6F0] flex gap-3 shrink-0">
              <button
                onClick={() => setReschedulingBooking(null)}
                className="flex-1 py-3 border border-[#EAE3D5] hover:bg-[#FAF6F0] rounded-xl text-xs font-extrabold text-brand-dark-text cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={rescheduleLoading || !selectedSlotId}
                className="flex-1 py-3 bg-[#D26E4F] hover:bg-[#B85C3F] disabled:opacity-50 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors text-center"
              >
                {rescheduleLoading ? 'Confirming...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
