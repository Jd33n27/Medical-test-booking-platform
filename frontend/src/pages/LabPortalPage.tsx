import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Test, User } from '../types';
import { formatNaira, formatDateString } from '../utils/formatters';

interface LabPortalPageProps {
  user: User;
  onBack: () => void;
}

interface LabBooking {
  booking_id: string;
  user_id?: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  home_collection: boolean;
  collection_address?: string;
  payment_status: string;
  total_price_naira: number;
  result_ready: boolean;
  result_file_url?: string;
  test_name: string;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
}

export const LabPortalPage: React.FC<LabPortalPageProps> = ({ user, onBack }) => {
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [catalog, setCatalog] = useState<Test[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'catalog' | 'analytics'>('bookings');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // File upload state
  const [uploadingBookingId, setUploadingBookingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  
  // Catalog editor state
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editTurnaround, setEditTurnaround] = useState<string>('');

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const bookingsData = await api.getLabBookings();
      setBookings(bookingsData);
      
      if (user.lab_id) {
        const catalogData = await api.getTests(user.lab_id);
        setCatalog(catalogData);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load lab data. Verify that the server connection is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [user.lab_id]);

  // Handle local PDF upload
  const handleFileChange = (bookingId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are supported for diagnostic result sheets.');
        return;
      }
      setSelectedFiles(prev => ({ ...prev, [bookingId]: file }));
    }
  };

  const handleUploadSubmit = async (bookingId: string) => {
    const file = selectedFiles[bookingId];
    if (!file) return;

    try {
      setUploadingBookingId(bookingId);
      await api.uploadResult(bookingId, file);
      
      // Update local state list
      setBookings(prev => prev.map(b => {
        if (b.booking_id === bookingId) {
          return { ...b, result_ready: true, result_file_url: `/uploads/${bookingId}` }; // Mock display url
        }
        return b;
      }));
      
      // Clean selected file state
      setSelectedFiles(prev => {
        const copy = { ...prev };
        delete copy[bookingId];
        return copy;
      });
      
      // Reload details to get actual file URL
      await fetchPortalData();
    } catch (err) {
      console.error(err);
      alert('Failed to upload report PDF file.');
    } finally {
      setUploadingBookingId(null);
    }
  };

  const handleRemoveResult = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to remove this diagnostic result PDF report? This will un-upload the file.')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.removeResult(bookingId);
      
      // Update local state list
      setBookings(prev => prev.map(b => {
        if (b.booking_id === bookingId) {
          return { ...b, result_ready: false, result_file_url: undefined };
        }
        return b;
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to remove report PDF file.');
    } finally {
      setLoading(false);
    }
  };

  // Catalog update
  const handleEditTestClick = (test: Test) => {
    setEditingTest(test);
    setEditPrice(test.price_naira.toString());
    setEditDescription(test.description);
    setEditTurnaround(test.turnaround_hours.toString());
  };

  const handleCatalogUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;

    try {
      setLoading(true);
      await api.updateLabTest(editingTest.id, {
        price_naira: parseFloat(editPrice),
        description: editDescription,
        turnaround_hours: parseInt(editTurnaround),
      });
      setEditingTest(null);
      await fetchPortalData();
    } catch (err) {
      console.error(err);
      alert('Failed to update catalog entry details.');
    } finally {
      setLoading(false);
    }
  };

  // Local analytics calculations
  const totalBookings = bookings.length;
  const paidBookings = bookings.filter(b => b.payment_status === 'paid');
  const totalEarnings = paidBookings.reduce((sum, b) => sum + b.total_price_naira, 0);
  const homeCollectionCount = bookings.filter(b => b.home_collection).length;
  const clinicVisitCount = totalBookings - homeCollectionCount;
  const resultsUploadedCount = bookings.filter(b => b.result_ready).length;
  const pendingResultsCount = totalBookings - resultsUploadedCount;

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div className="space-y-1">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Lab Partner Dashboard</span>
          <h2 className="text-3xl font-black text-white">Console Board</h2>
        </div>
        <button 
          onClick={onBack}
          className="self-start px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 transition-colors"
        >
          View Public Search Catalog
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Tabs selector */}
      <div className="flex border-b border-slate-800 gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
        {(['bookings', 'catalog', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 sm:pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all capitalize whitespace-nowrap ${
              activeTab === tab 
                ? 'border-emerald-500 text-emerald-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Synchronizing data vault...</p>
        </div>
      ) : (
        <>
          {/* Tab Content: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              {bookings.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/40 border border-slate-950 rounded-2xl">
                  <p className="text-slate-400">No appointments scheduled for your laboratory yet.</p>
                </div>
              ) : (
                <>
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-850">
                  <table className="w-full text-left text-sm border-collapse bg-slate-900/60">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-850 uppercase text-[10px] tracking-wider font-bold">
                        <th className="p-4">Patient Details</th>
                        <th className="p-4">Diagnostic Test</th>
                        <th className="p-4">Appointment Schedule</th>
                        <th className="p-4">Billing Status</th>
                        <th className="p-4">Result Upload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/80">
                      {bookings.map((booking) => (
                        <tr key={booking.booking_id} className="hover:bg-slate-850/40 transition-colors">
                          {/* Patient */}
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-white text-base">{booking.patient_name}</div>
                              {booking.user_id && (
                                <button
                                  onClick={() => (window as any).navigateToChat?.(undefined, booking.user_id)}
                                  title="Chat with Patient"
                                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-750 text-emerald-400 border border-slate-755/80 transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-semibold">{booking.patient_email}</div>
                            <div className="text-xs text-slate-500 font-medium">{booking.patient_phone}</div>
                          </td>
                          {/* Test */}
                          <td className="p-4 space-y-1">
                            <span className="font-semibold text-slate-200 block">{booking.test_name}</span>
                            <span className="text-xs text-slate-400 font-semibold block">{formatNaira(booking.total_price_naira)}</span>
                          </td>
                          {/* Schedule */}
                          <td className="p-4 space-y-1">
                            <div className="text-white font-medium text-xs">{formatDateString(booking.appointment_date)}</div>
                            <div className="text-emerald-400 font-bold text-xs mt-0.5">{booking.appointment_time}</div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 uppercase ${
                              booking.home_collection 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {booking.home_collection ? 'Home collection' : 'Clinic Extraction'}
                            </span>
                            {booking.home_collection && booking.collection_address && (
                              <div className="text-[10px] text-slate-500 line-clamp-1 mt-1 max-w-[200px] font-medium" title={booking.collection_address}>
                                {booking.collection_address}
                              </div>
                            )}
                          </td>
                          {/* Payment */}
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              booking.payment_status === 'paid'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                              {booking.payment_status}
                            </span>
                          </td>
                           <td className="p-4">
                            {booking.result_ready ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <a
                                    href={
                                      booking.result_file_url
                                        ? booking.result_file_url.startsWith('http')
                                          ? booking.result_file_url
                                          : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + booking.result_file_url
                                        : '#'
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View PDF
                                  </a>

                                  <input
                                    type="file"
                                    accept=".pdf"
                                    id={`file-${booking.booking_id}`}
                                    onChange={(e) => handleFileChange(booking.booking_id, e)}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`file-${booking.booking_id}`}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                                  >
                                    {selectedFiles[booking.booking_id] ? 'Change PDF' : 'Replace PDF'}
                                  </label>

                                  <button
                                    onClick={() => handleRemoveResult(booking.booking_id)}
                                    className="px-3 py-1.5 bg-red-955/40 hover:bg-red-950 text-red-500 border border-red-900/50 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove
                                  </button>

                                  {selectedFiles[booking.booking_id] && (
                                    <button
                                      onClick={() => handleUploadSubmit(booking.booking_id)}
                                      disabled={uploadingBookingId === booking.booking_id}
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-55 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer"
                                    >
                                      {uploadingBookingId === booking.booking_id ? 'Uploading...' : 'Submit Report'}
                                    </button>
                                  )}
                                </div>
                                {selectedFiles[booking.booking_id] && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[200px] inline-flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    {selectedFiles[booking.booking_id].name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    id={`file-${booking.booking_id}`}
                                    onChange={(e) => handleFileChange(booking.booking_id, e)}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`file-${booking.booking_id}`}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                  >
                                    {selectedFiles[booking.booking_id] ? 'Change PDF' : 'Select PDF'}
                                  </label>
                                  {selectedFiles[booking.booking_id] && (
                                    <button
                                      onClick={() => handleUploadSubmit(booking.booking_id)}
                                      disabled={uploadingBookingId === booking.booking_id}
                                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-55 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer"
                                    >
                                      {uploadingBookingId === booking.booking_id ? 'Uploading...' : 'Submit Report'}
                                    </button>
                                  )}
                                </div>
                                {selectedFiles[booking.booking_id] && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[150px] inline-flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    {selectedFiles[booking.booking_id].name}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Booking Card List */}
                <div className="md:hidden space-y-4">
                  {bookings.map((booking) => {
                    const isPaid = booking.payment_status === 'paid';
                    return (
                      <div key={booking.booking_id} className="p-4 rounded-2xl bg-slate-900 border border-slate-850 space-y-4 shadow-md">
                        {/* Patient Name & Chat Action */}
                        <div className="flex items-center justify-between border-b border-slate-850/60 pb-2.5">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Patient</span>
                            <div className="font-bold text-white text-base">{booking.patient_name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{booking.patient_email} • {booking.patient_phone}</div>
                          </div>
                          {booking.user_id && (
                            <button
                              onClick={() => (window as any).navigateToChat?.(undefined, booking.user_id)}
                              title="Chat with Patient"
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Test details & Price */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 uppercase font-semibold tracking-wider text-[9px] block">Diagnostic Test</span>
                            <span className="font-semibold text-slate-200 block mt-0.5">{booking.test_name}</span>
                            <span className="text-xs text-slate-400 font-semibold block">{formatNaira(booking.total_price_naira)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 uppercase font-semibold tracking-wider text-[9px] block">Appointment Schedule</span>
                            <span className="text-white font-semibold block mt-0.5">{formatDateString(booking.appointment_date)}</span>
                            <span className="text-emerald-400 font-bold block">{booking.appointment_time}</span>
                          </div>
                        </div>

                        {/* Extraction Type & Payment Status */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850/50">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            booking.home_collection 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {booking.home_collection ? 'Home collection' : 'Clinic Extraction'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            isPaid
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {booking.payment_status}
                          </span>
                        </div>

                        {/* Collection Address if home extraction */}
                        {booking.home_collection && booking.collection_address && (
                          <div className="p-2.5 rounded-lg bg-slate-950/40 text-[10px] border border-slate-850 text-slate-400">
                            <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block mb-0.5">Extraction Address</span>
                            {booking.collection_address}
                          </div>
                        )}

                        {/* Upload Action */}
                        <div className="pt-2 border-t border-slate-850/50 flex flex-col gap-2">
                          <span className="text-slate-500 uppercase font-bold tracking-wider text-[8px] block">Diagnostic Report</span>
                          {booking.result_ready ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={
                                  booking.result_file_url
                                    ? booking.result_file_url.startsWith('http')
                                      ? booking.result_file_url
                                      : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + booking.result_file_url
                                    : '#'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-grow inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View PDF
                              </a>

                              <input
                                type="file"
                                accept=".pdf"
                                id={`file-mobile-${booking.booking_id}`}
                                onChange={(e) => handleFileChange(booking.booking_id, e)}
                                className="hidden"
                              />
                              <label
                                htmlFor={`file-mobile-${booking.booking_id}`}
                                className="flex-grow inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                              >
                                {selectedFiles[booking.booking_id] ? 'Change' : 'Replace'}
                              </label>

                              <button
                                onClick={() => handleRemoveResult(booking.booking_id)}
                                className="flex-grow inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-955/20 hover:bg-red-955/40 text-red-500 border border-red-900/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                              </button>

                              {selectedFiles[booking.booking_id] && (
                                <button
                                  onClick={() => handleUploadSubmit(booking.booking_id)}
                                  disabled={uploadingBookingId === booking.booking_id}
                                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-55 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer"
                                >
                                  {uploadingBookingId === booking.booking_id ? 'Uploading...' : 'Submit Report'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  id={`file-mobile-${booking.booking_id}`}
                                  onChange={(e) => handleFileChange(booking.booking_id, e)}
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`file-mobile-${booking.booking_id}`}
                                  className="flex-grow inline-flex items-center justify-center px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                >
                                  {selectedFiles[booking.booking_id] ? 'Change PDF' : 'Select PDF'}
                                </label>
                                {selectedFiles[booking.booking_id] && (
                                  <button
                                    onClick={() => handleUploadSubmit(booking.booking_id)}
                                    disabled={uploadingBookingId === booking.booking_id}
                                    className="flex-grow inline-flex items-center justify-center px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-55 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer"
                                  >
                                    {uploadingBookingId === booking.booking_id ? 'Uploading...' : 'Submit Report'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          {selectedFiles[booking.booking_id] && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[250px] inline-flex items-center gap-1 mt-1">
                              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {selectedFiles[booking.booking_id].name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          )}

          {/* Tab Content: CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              {/* Product grid catalog */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {catalog.map((test) => (
                  <div key={test.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-white">{test.test_name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-3">{test.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-850 text-slate-400">
                      <div>
                        <span className="text-slate-500 block">Catalog Price</span>
                        <strong className="text-emerald-400 font-extrabold text-base block mt-0.5">{formatNaira(test.price_naira)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Turnaround</span>
                        <strong className="text-slate-200 block mt-0.5">{test.turnaround_hours} hours</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEditTestClick(test)}
                      className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700/80"
                    >
                      Configure Test Parameters
                    </button>
                  </div>
                ))}
              </div>

              {/* Editing Form Overlay Panel */}
              {editingTest && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
                    <div>
                      <h3 className="text-2xl font-black text-white">Configure Test</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{editingTest.test_name}</p>
                    </div>
                    
                    <form onSubmit={handleCatalogUpdateSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase block">Price in Naira (₦)</label>
                        <input
                          type="number"
                          required
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase block">Turnaround hours</label>
                        <input
                          type="number"
                          required
                          value={editTurnaround}
                          onChange={(e) => setEditTurnaround(e.target.value)}
                          className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase block">Catalog Description</label>
                        <textarea
                          rows={4}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-sm text-slate-300"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingTest(null)}
                          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition-all"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              
              {/* Analytics summary row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                
                {/* Gross revenue */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross earnings</span>
                  <div className="text-3xl font-black text-emerald-400">{formatNaira(totalEarnings)}</div>
                  <span className="text-[10px] text-slate-500 block">From paid orders</span>
                </div>

                {/* Total Bookings */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bookings</span>
                  <div className="text-3xl font-black text-white">{totalBookings}</div>
                  <span className="text-[10px] text-slate-500 block">Scheduled orders catalog</span>
                </div>

                {/* Home extractions */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Home Collections</span>
                  <div className="text-3xl font-black text-amber-400">{homeCollectionCount}</div>
                  <span className="text-[10px] text-slate-500 block">({totalBookings > 0 ? Math.round((homeCollectionCount / totalBookings) * 100) : 0}% split ratio)</span>
                </div>

                {/* Completed results */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reports Uploaded</span>
                  <div className="text-3xl font-black text-blue-400">{resultsUploadedCount}</div>
                  <span className="text-[10px] text-slate-500 block">({pendingResultsCount} pending diagnostic checks)</span>
                </div>

              </div>

              {/* Data break charts card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Bookings split list */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-4">
                  <h4 className="text-lg font-bold text-white">Extraction Split</h4>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold">
                        <span>Home Extraction Appointments</span>
                        <span>{homeCollectionCount}</span>
                      </div>
                      <div className="w-full bg-slate-850 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full"
                          style={{ width: `${totalBookings > 0 ? (homeCollectionCount / totalBookings) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold">
                        <span>Clinic Visit Extraction</span>
                        <span>{clinicVisitCount}</span>
                      </div>
                      <div className="w-full bg-slate-850 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-400 h-full"
                          style={{ width: `${totalBookings > 0 ? (clinicVisitCount / totalBookings) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial summaries */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-4">
                  <h4 className="text-lg font-bold text-white">Diagnostic Catalog Revenue Split</h4>
                  <div className="space-y-3 pt-2 text-xs">
                    {catalog.map(test => {
                      const bookingsForTest = bookings.filter(b => b.test_name === test.test_name && b.payment_status === 'paid');
                      const testEarnings = bookingsForTest.reduce((sum, b) => sum + b.total_price_naira, 0);
                      const percent = totalEarnings > 0 ? Math.round((testEarnings / totalEarnings) * 100) : 0;

                      return (
                        <div key={test.id} className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                          <span className="text-slate-300 font-semibold">{test.test_name}</span>
                          <div className="text-right">
                            <span className="text-emerald-400 font-black block">{formatNaira(testEarnings)}</span>
                            <span className="text-[10px] text-slate-500 block">{percent}% contribution</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
};
