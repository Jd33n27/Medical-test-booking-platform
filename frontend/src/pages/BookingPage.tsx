import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Test, TimeSlot, BookingRequest } from '../types';
import { formatNaira } from '../utils/formatters';

interface BookingPageProps {
  test: Test;
  onReviewBooking: (bookingData: BookingRequest, selectedSlot: TimeSlot) => void;
  onBack: () => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({ test, onReviewBooking, onBack }) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  // Form state
  const [patientName, setPatientName] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [homeCollection, setHomeCollection] = useState<boolean>(false);
  const [collectionAddress, setCollectionAddress] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Date Tabs Selection
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoading(true);
        const data = await api.getTestSlots(test.id);
        setSlots(data.slots);
        
        // Auto-select the first date
        if (data.slots.length > 0) {
          const uniqueDates = Array.from(new Set(data.slots.map(s => s.date)));
          setSelectedDate(uniqueDates[0]);
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load available appointments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, [test.id]);

  // Group slots by date
  const uniqueDates = Array.from(new Set(slots.map(s => s.date))).sort();
  const slotsForSelectedDate = slots.filter(s => s.date === selectedDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Please select an appointment time slot.');
      return;
    }

    const bookingRequestData: BookingRequest = {
      test_id: test.id,
      time_slot_id: selectedSlot.id,
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      home_collection: homeCollection,
      collection_address: homeCollection ? collectionAddress : null,
    };

    onReviewBooking(bookingRequestData, selectedSlot);
  };

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-sm font-semibold"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </button>

      {/* Details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Summary & Test Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {test.sample_type}
            </span>
            <h2 className="text-2xl font-extrabold text-white">{test.test_name}</h2>
            <p className="text-slate-400 text-sm">{test.description}</p>
            
            <div className="pt-6 border-t border-slate-850 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Laboratory:</span>
                <span className="text-white font-semibold">{test.lab_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turnaround time:</span>
                <span className="text-white font-semibold">{test.turnaround_hours} hours</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-850">
                <span className="text-slate-300 font-bold">Total price:</span>
                <span className="text-xl font-black text-emerald-400">{formatNaira(test.price_naira)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Appointment & Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 md:p-8 rounded-2xl glass-panel space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-500/20">1</span>
              Select Appointment Slot
            </h3>

            {error && !selectedSlot && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-10 h-10 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 text-xs">Fetching time availability...</p>
              </div>
            ) : uniqueDates.length === 0 ? (
              <div className="p-6 text-center border border-slate-800 rounded-xl">
                <p className="text-slate-400 text-sm">No available slots in the next 7 days. Please check another laboratory/test.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Date Selection Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {uniqueDates.map((date) => {
                    const parsed = new Date(date);
                    const isSelected = selectedDate === date;
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`shrink-0 px-4 py-3 rounded-xl border text-center transition-all duration-200 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                          {parsed.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-black mt-0.5">
                          {parsed.toLocaleDateString('en-US', { day: 'numeric' })}
                        </div>
                        <div className="text-[10px] opacity-85">
                          {parsed.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Time Slot Picker for the active date */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Available Times</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slotsForSelectedDate.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 text-center ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/5'
                              : 'bg-slate-800/20 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>{slot.time}</div>
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">{slot.available} slots left</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 Form */}
            {selectedSlot && (
              <form onSubmit={handleSubmit} className="pt-6 border-t border-slate-880 space-y-6">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-500/20">2</span>
                  Patient Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      required
                      placeholder="e.g. Adeyemi Okafor"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-slate-800/80 text-white border border-slate-700/80 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="e.g. adeyemi@example.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full bg-slate-800/80 text-white border border-slate-700/80 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      placeholder="e.g. +234 801 234 5678"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full bg-slate-800/80 text-white border border-slate-700/80 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* Home collection section */}
                {test.lab_name && test.lab_name.includes('Genesis') || test.lab_name?.includes('Trusted') || test.lab_name?.includes('Central') ? (
                  <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        id="home_collection"
                        type="checkbox"
                        checked={homeCollection}
                        onChange={(e) => setHomeCollection(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800 cursor-pointer"
                      />
                      <label htmlFor="home_collection" className="text-sm font-semibold text-slate-200 cursor-pointer">
                        Request Home Sample Collection
                      </label>
                    </div>
                    <p className="text-xs text-slate-400">
                      This laboratory offers sample extraction services directly from your home or office. Extra service fee may apply.
                    </p>

                    {homeCollection && (
                      <div className="space-y-2 pt-2">
                        <label htmlFor="address" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Extraction Address</label>
                        <textarea
                          id="address"
                          required={homeCollection}
                          placeholder="Please provide your full address, landmarks and city details..."
                          value={collectionAddress}
                          onChange={(e) => setCollectionAddress(e.target.value)}
                          rows={3}
                          className="w-full bg-slate-800/80 text-white border border-slate-700/80 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                        />
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    Review Booking & Pay
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
