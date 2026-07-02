import React, { useEffect, useState, useCallback } from 'react';
import { api, API_BASE_URL } from '../api/client';
import { Test, User } from '../types';
import { formatNaira, formatDateString } from '../utils/formatters';
import { ChatPage } from './ChatPage';
import { ProfilePage } from './ProfilePage';

interface LabPortalPageProps {
  user: User;
  onLogout: () => void;
  onBackToCatalog: () => void;
  onUpdateUser: (user: User) => void;
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

export const LabPortalPage: React.FC<LabPortalPageProps> = ({ user, onLogout, onBackToCatalog, onUpdateUser }) => {
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [catalog, setCatalog] = useState<Test[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'catalog' | 'analytics' | 'chats' | 'profile'>('bookings');
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

  // Active chat context inside portal
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const fetchPortalData = useCallback(async () => {
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
  }, [user.lab_id]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Handle PDF upload
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
          return { ...b, result_ready: true, result_file_url: `/uploads/${bookingId}` };
        }
        return b;
      }));
      
      // Clean selected file state
      setSelectedFiles(prev => {
        const copy = { ...prev };
        delete copy[bookingId];
        return copy;
      });
      
      await fetchPortalData();
    } catch (err) {
      console.error(err);
      alert('Failed to upload report PDF file.');
    } finally {
      setUploadingBookingId(null);
    }
  };

  const handleRemoveResult = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to remove this diagnostic result PDF report?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.removeResult(bookingId);
      
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

  // Active page title
  const pageTitles = {
    bookings: 'Appointments Console',
    catalog: 'Catalog Parameters',
    analytics: 'Analytics Overview',
    chats: 'Patient Messages',
    profile: 'Lab Profile Settings'
  };

  const handleOpenPatientChat = (patientId: string) => {
    setActiveChatPatientId(patientId);
    setActiveTab('chats');
  };

  return (
    <div className="min-h-screen flex bg-[#FAF6F0] text-brand-dark-text font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#1A3026]/40 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* 1. Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#EAE3D5] flex flex-col justify-between shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          {/* Logo Mark */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#1F3A2B] flex items-center justify-center text-brand-cream font-black text-lg">
              M
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-brand-dark-text block">MedBook</span>
              <span className="text-[10px] text-brand-muted-text font-semibold tracking-wider uppercase block -mt-1">Diagnostics</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('bookings');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-[#1F3A2B]/10 text-[#1F3A2B]'
                  : 'text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text'
              }`}
            >
              <svg className={`w-5.5 h-5.5 ${activeTab === 'bookings' ? 'text-[#1F3A2B]' : 'text-brand-muted-text'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2-h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Bookings & Orders
            </button>

            <button
              onClick={() => {
                setActiveTab('catalog');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#1F3A2B]/10 text-[#1F3A2B]'
                  : 'text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text'
              }`}
            >
              <svg className={`w-5.5 h-5.5 ${activeTab === 'catalog' ? 'text-[#1F3A2B]' : 'text-brand-muted-text'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Test Catalog
            </button>

            <button
              onClick={() => {
                setActiveChatPatientId(undefined);
                setActiveTab('chats');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'chats'
                  ? 'bg-[#1F3A2B]/10 text-[#1F3A2B]'
                  : 'text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text'
              }`}
            >
              <svg className={`w-5.5 h-5.5 ${activeTab === 'chats' ? 'text-[#1F3A2B]' : 'text-brand-muted-text'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chats & Messages
            </button>

            <button
              onClick={() => {
                setActiveTab('analytics');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#1F3A2B]/10 text-[#1F3A2B]'
                  : 'text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text'
              }`}
            >
              <svg className={`w-5.5 h-5.5 ${activeTab === 'analytics' ? 'text-[#1F3A2B]' : 'text-brand-muted-text'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Analytics Board
            </button>

            <button
              onClick={() => {
                setActiveTab('profile');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#1F3A2B]/10 text-[#1F3A2B]'
                  : 'text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text'
              }`}
            >
              <svg className={`w-5.5 h-5.5 ${activeTab === 'profile' ? 'text-[#1F3A2B]' : 'text-brand-muted-text'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Settings
            </button>
          </nav>
        </div>

        {/* Sidebar User profile box & Sign out */}
        <div className="p-4 border-t border-[#EAE3D5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#1F3A2B] text-brand-cream flex items-center justify-center font-bold text-sm shrink-0">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-brand-dark-text block truncate leading-tight">{user.name}</span>
              <span className="text-[10px] text-brand-muted-text block capitalize">Partner Admin</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Top Header bar */}
        <header className="h-20 bg-white border-b border-[#EAE3D5] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl border border-[#EAE3D5] text-[#1F3A2B] hover:bg-brand-sage/20 lg:hidden cursor-pointer shrink-0"
              aria-label="Toggle Sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#1F3A2B] tracking-tight truncate">
              {pageTitles[activeTab]}
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 select-none uppercase tracking-wide truncate max-w-[120px] sm:max-w-none">
              {user.lab_name || 'Verified Lab Partner'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onBackToCatalog}
              className="px-4 py-2 border border-[#EAE3D5] hover:bg-brand-sage/20 text-[#1F3A2B] font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Public Catalog
            </button>
          </div>
        </header>

        {/* Content Panel Scroll Area */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-8">
          
          {error && activeTab !== 'chats' && activeTab !== 'profile' && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {loading && bookings.length === 0 && activeTab !== 'chats' && activeTab !== 'profile' ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-3 border-[#EAE3D5] border-t-[#D26E4F] rounded-full animate-spin"></div>
              <p className="text-brand-muted-text text-xs font-semibold">Retrieving laboratory records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: BOOKINGS */}
              {activeTab === 'bookings' && (
                <div className="space-y-6">
                  {bookings.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-[#EAE3D5] rounded-3xl shadow-sm">
                      <p className="text-brand-muted-text text-sm">No bookings scheduled for your laboratory yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-[#EAE3D5] bg-white shadow-sm">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-[#FAF6F0] text-brand-muted-text border-b border-[#EAE3D5] uppercase text-[10px] tracking-wider font-bold">
                              <th className="p-4">Patient Details</th>
                              <th className="p-4">Diagnostic Test</th>
                              <th className="p-4">Appointment Schedule</th>
                              <th className="p-4">Billing Status</th>
                              <th className="p-4">Result Report PDF</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#FAF6F0] text-xs">
                            {bookings.map((booking) => (
                              <tr key={booking.booking_id} className="hover:bg-brand-sage/5 transition-colors">
                                {/* Patient */}
                                <td className="p-4 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-extrabold text-sm text-[#1F3A2B]">{booking.patient_name}</div>
                                    {booking.user_id && (
                                      <button
                                        onClick={() => handleOpenPatientChat(booking.user_id!)}
                                        title="Chat with Patient"
                                        className="p-1 rounded bg-[#1F3A2B]/10 hover:bg-[#1F3A2B]/20 text-[#1F3A2B] border border-[#1F3A2B]/10 transition-colors cursor-pointer"
                                      >
                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-brand-muted-text block">{booking.patient_email}</div>
                                  <div className="text-[10px] text-brand-muted-text/80 block">{booking.patient_phone}</div>
                                </td>
                                
                                {/* Test */}
                                <td className="p-4 space-y-1">
                                  <span className="font-bold text-brand-dark-text block">{booking.test_name}</span>
                                  <span className="text-[10px] text-brand-muted-text block">{formatNaira(booking.total_price_naira)}</span>
                                </td>
                                
                                {/* Schedule */}
                                <td className="p-4 space-y-1">
                                  <div className="text-brand-dark-text font-bold">{formatDateString(booking.appointment_date)}</div>
                                  <div className="text-[#D26E4F] font-bold mt-0.5">{booking.appointment_time}</div>
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold mt-1.5 uppercase ${
                                    booking.home_collection 
                                      ? 'bg-[#D26E4F]/10 text-[#D26E4F] border border-[#D26E4F]/20' 
                                      : 'bg-[#1F3A2B]/10 text-[#1F3A2B] border border-[#1F3A2B]/20'
                                  }`}>
                                    {booking.home_collection ? 'Home collection' : 'Clinic Visit'}
                                  </span>
                                  {booking.home_collection && booking.collection_address && (
                                    <div className="text-[10px] text-brand-muted-text max-w-[200px] truncate block font-medium mt-1" title={booking.collection_address}>
                                      {booking.collection_address}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Status */}
                                <td className="p-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    booking.payment_status === 'paid'
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                      : 'bg-rose-50 border border-rose-100 text-rose-700'
                                  }`}>
                                    {booking.payment_status}
                                  </span>
                                </td>
                                
                                {/* Upload / PDF Actions */}
                                <td className="p-4">
                                  {booking.result_ready ? (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <a
                                        href={booking.result_file_url ? (booking.result_file_url.startsWith('http') ? booking.result_file_url : API_BASE_URL + booking.result_file_url) : '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1.5 bg-[#FAF6F0] hover:bg-brand-sage/20 text-[#1F3A2B] border border-[#EAE3D5] rounded-xl text-[10px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        View report
                                      </a>
                                      
                                      <input
                                        type="file"
                                        accept=".pdf"
                                        id={`file-desktop-${booking.booking_id}`}
                                        onChange={(e) => handleFileChange(booking.booking_id, e)}
                                        className="hidden"
                                      />
                                      <label
                                        htmlFor={`file-desktop-${booking.booking_id}`}
                                        className="px-2.5 py-1.5 bg-[#FAF6F0] hover:bg-brand-sage/20 text-[#1F3A2B] border border-[#EAE3D5] rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                                      >
                                        Replace
                                      </label>

                                      <button
                                        onClick={() => handleRemoveResult(booking.booking_id)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Report File"
                                      >
                                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>

                                      {selectedFiles[booking.booking_id] && (
                                        <button
                                          onClick={() => handleUploadSubmit(booking.booking_id)}
                                          disabled={uploadingBookingId === booking.booking_id}
                                          className="px-2.5 py-1.5 bg-[#D26E4F] hover:bg-[#B85C3F] text-white rounded-xl text-[10px] font-bold disabled:opacity-50 cursor-pointer shadow-sm animate-pulse"
                                        >
                                          {uploadingBookingId === booking.booking_id ? 'Uploading...' : 'Save PDF'}
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="file"
                                        accept=".pdf"
                                        id={`file-desktop-${booking.booking_id}`}
                                        onChange={(e) => handleFileChange(booking.booking_id, e)}
                                        className="hidden"
                                      />
                                      <label
                                        htmlFor={`file-desktop-${booking.booking_id}`}
                                        className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-brand-sage/20 text-[#1F3A2B] border border-[#EAE3D5] rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                                      >
                                        {selectedFiles[booking.booking_id] ? 'Change file' : 'Select report PDF'}
                                      </label>
                                      {selectedFiles[booking.booking_id] && (
                                        <button
                                          onClick={() => handleUploadSubmit(booking.booking_id)}
                                          disabled={uploadingBookingId === booking.booking_id}
                                          className="px-3 py-1.5 bg-[#1F3A2B] hover:bg-[#15271D] text-white rounded-xl text-[10px] font-bold disabled:opacity-50 cursor-pointer shadow-sm"
                                        >
                                          {uploadingBookingId === booking.booking_id ? 'Saving...' : 'Upload'}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {selectedFiles[booking.booking_id] && (
                                    <span className="text-[9px] text-brand-muted-text truncate max-w-[150px] block mt-1">
                                      📎 {selectedFiles[booking.booking_id].name}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards List */}
                      <div className="lg:hidden space-y-4">
                        {bookings.map((booking) => (
                          <div key={booking.booking_id} className="bg-white border border-[#EAE3D5] rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#FAF6F0] pb-3">
                              <div>
                                <span className="text-[10px] text-brand-muted-text font-bold uppercase tracking-wider block">Patient</span>
                                <h4 className="font-extrabold text-base text-[#1F3A2B] mt-0.5">{booking.patient_name}</h4>
                                <span className="text-[10px] text-brand-muted-text block">{booking.patient_email} • {booking.patient_phone}</span>
                              </div>
                              {booking.user_id && (
                                <button
                                  onClick={() => handleOpenPatientChat(booking.user_id!)}
                                  className="p-2 rounded-xl bg-[#1F3A2B]/10 hover:bg-[#1F3A2B]/20 text-[#1F3A2B] border border-[#1F3A2B]/10 cursor-pointer"
                                >
                                  <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-[10px] text-brand-muted-text font-bold block uppercase tracking-wide">Test Ordered</span>
                                <strong className="text-brand-dark-text block mt-0.5">{booking.test_name}</strong>
                                <span className="text-brand-muted-text mt-0.5 block">{formatNaira(booking.total_price_naira)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-brand-muted-text font-bold block uppercase tracking-wide">Scheduled for</span>
                                <strong className="text-brand-dark-text block mt-0.5">{formatDateString(booking.appointment_date)}</strong>
                                <span className="text-[#D26E4F] font-bold block">{booking.appointment_time}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-[#FAF6F0]">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                                booking.home_collection 
                                  ? 'bg-[#D26E4F]/10 text-[#D26E4F] border border-[#D26E4F]/20' 
                                  : 'bg-[#1F3A2B]/10 text-[#1F3A2B] border border-[#1F3A2B]/20'
                              }`}>
                                {booking.home_collection ? 'Home collection' : 'Clinic Visit'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${
                                booking.payment_status === 'paid'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                  : 'bg-rose-50 border border-rose-100 text-rose-700'
                              }`}>
                                {booking.payment_status}
                              </span>
                            </div>

                            {booking.home_collection && booking.collection_address && (
                              <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#EAE3D5] text-[10px] text-brand-muted-text">
                                <span className="font-bold text-[8px] uppercase tracking-wider block text-brand-muted-text/80 mb-0.5">Collection Address</span>
                                {booking.collection_address}
                              </div>
                            )}

                            {/* Mobile PDF operations */}
                            <div className="pt-3 border-t border-[#FAF6F0] space-y-2">
                              <span className="text-[9px] text-brand-muted-text font-bold uppercase block tracking-wider">Diagnostic Report Sheet</span>
                              
                              <input
                                type="file"
                                accept=".pdf"
                                id={`file-mobile-${booking.booking_id}`}
                                onChange={(e) => handleFileChange(booking.booking_id, e)}
                                className="hidden"
                              />

                              <div className="flex gap-2">
                                <label
                                  htmlFor={`file-mobile-${booking.booking_id}`}
                                  className="flex-1 text-center py-2 bg-[#FAF6F0] hover:bg-brand-sage/20 border border-[#EAE3D5] text-[#1F3A2B] rounded-xl text-xs font-bold cursor-pointer transition-all"
                                >
                                  {booking.result_ready ? 'Change Report' : 'Select Report'}
                                </label>

                                {booking.result_ready && (
                                  <a
                                    href={booking.result_file_url ? (booking.result_file_url.startsWith('http') ? booking.result_file_url : API_BASE_URL + booking.result_file_url) : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-center py-2 bg-brand-sage hover:bg-brand-border/40 text-brand-forest border border-brand-border rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    View PDF
                                  </a>
                                )}
                              </div>

                              {selectedFiles[booking.booking_id] && (
                                <button
                                  onClick={() => handleUploadSubmit(booking.booking_id)}
                                  disabled={uploadingBookingId === booking.booking_id}
                                  className="w-full py-2 bg-[#1F3A2B] hover:bg-[#15271D] text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                                >
                                  {uploadingBookingId === booking.booking_id ? 'Saving Report...' : 'Save Selected Report'}
                                </button>
                              )}
                              {selectedFiles[booking.booking_id] && (
                                <span className="text-[9px] text-brand-muted-text block truncate">
                                  📎 {selectedFiles[booking.booking_id].name}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: TEST CATALOG */}
              {activeTab === 'catalog' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catalog.map((test) => (
                      <div key={test.id} className="bg-white border border-[#EAE3D5] rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-lg font-extrabold text-[#1F3A2B]">{test.test_name}</h4>
                            <span className="bg-[#FAF6F0] text-brand-muted-text border border-[#EAE3D5] text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                              {test.sample_type}
                            </span>
                          </div>
                          <p className="text-xs text-brand-muted-text leading-relaxed line-clamp-3">{test.description}</p>
                        </div>
                        
                        <div className="space-y-4 mt-6">
                          <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-[#FAF6F0] text-brand-muted-text">
                            <div>
                              <span className="text-[9px] text-brand-muted-text/80 font-bold block uppercase tracking-wider">Test Price</span>
                              <strong className="text-base font-black text-[#D26E4F] block mt-0.5">{formatNaira(test.price_naira)}</strong>
                            </div>
                            <div>
                              <span className="text-[9px] text-brand-muted-text/80 font-bold block uppercase tracking-wider">Turnaround</span>
                              <strong className="text-brand-dark-text font-extrabold block mt-0.5">{test.turnaround_hours} hours</strong>
                            </div>
                          </div>

                          <button
                            onClick={() => handleEditTestClick(test)}
                            className="w-full bg-[#1F3A2B] hover:bg-[#15271D] text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
                          >
                            Configure Parameters
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Editing Overlay Panel Modal */}
                  {editingTest && (
                    <div className="fixed inset-0 z-50 bg-[#1F3A2B]/40 backdrop-blur-md flex items-center justify-center p-4">
                      <div className="w-full max-w-md bg-white border border-[#EAE3D5] rounded-3xl p-6 md:p-8 space-y-6 shadow-xl animate-scaleIn">
                        <div>
                          <h3 className="text-xl font-extrabold text-[#1F3A2B]">Configure Test</h3>
                          <p className="text-xs text-brand-muted-text mt-0.5">{editingTest.test_name}</p>
                        </div>
                        
                        <form onSubmit={handleCatalogUpdateSubmit} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Price in Naira (₦)</label>
                            <input
                              type="number"
                              required
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs font-bold"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Turnaround hours</label>
                            <input
                              type="number"
                              required
                              value={editTurnaround}
                              onChange={(e) => setEditTurnaround(e.target.value)}
                              className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs font-bold"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Catalog Description</label>
                            <textarea
                              rows={4}
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs leading-relaxed"
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingTest(null)}
                              className="flex-1 py-2.5 bg-white border border-[#EAE3D5] hover:bg-[#FAF6F0] text-[#1F3A2B] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-2.5 bg-[#D26E4F] hover:bg-[#B85C3F] text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-md"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CHATS & MESSAGES */}
              {activeTab === 'chats' && (
                <div className="bg-white border border-[#EAE3D5] rounded-3xl overflow-hidden shadow-sm h-[calc(100vh-14rem)] min-h-[450px]">
                  <ChatPage 
                    onBack={() => setActiveTab('bookings')} 
                    initialLabId={user.lab_id}
                    initialPatientId={activeChatPatientId}
                  />
                </div>
              )}

              {/* TAB 4: ANALYTICS BOARD */}
              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* earnings */}
                    <div className="bg-white border border-[#EAE3D5] p-6 rounded-2xl shadow-sm space-y-2 text-left">
                      <span className="text-[10px] font-bold text-brand-muted-text uppercase tracking-wider block">Gross Earnings</span>
                      <div className="text-2xl font-black text-[#1F3A2B]">{formatNaira(totalEarnings)}</div>
                      <span className="text-[10px] text-brand-muted-text block">From paid orders</span>
                    </div>

                    {/* bookings */}
                    <div className="bg-white border border-[#EAE3D5] p-6 rounded-2xl shadow-sm space-y-2 text-left">
                      <span className="text-[10px] font-bold text-brand-muted-text uppercase tracking-wider block">Total Bookings</span>
                      <div className="text-2xl font-black text-[#1F3A2B]">{totalBookings}</div>
                      <span className="text-[10px] text-brand-muted-text block">Registered tests orders</span>
                    </div>

                    {/* splits */}
                    <div className="bg-white border border-[#EAE3D5] p-6 rounded-2xl shadow-sm space-y-2 text-left">
                      <span className="text-[10px] font-bold text-brand-muted-text uppercase tracking-wider block">Home Collections</span>
                      <div className="text-2xl font-black text-[#D26E4F]">{homeCollectionCount}</div>
                      <span className="text-[10px] text-brand-muted-text block">
                        ({totalBookings > 0 ? Math.round((homeCollectionCount / totalBookings) * 100) : 0}% split ratio)
                      </span>
                    </div>

                    {/* completions */}
                    <div className="bg-white border border-[#EAE3D5] p-6 rounded-2xl shadow-sm space-y-2 text-left">
                      <span className="text-[10px] font-bold text-brand-muted-text uppercase tracking-wider block">Reports Uploaded</span>
                      <div className="text-2xl font-black text-[#1F3A2B]">{resultsUploadedCount}</div>
                      <span className="text-[10px] text-brand-muted-text block">({pendingResultsCount} pending reports)</span>
                    </div>
                  </div>

                  {/* Splits Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Collection split */}
                    <div className="bg-white border border-[#EAE3D5] p-6 rounded-3xl shadow-sm space-y-5 text-left">
                      <h4 className="text-base font-extrabold text-[#1F3A2B]">Extraction Method Split</h4>
                      
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-brand-dark-text font-bold">
                            <span>Home Collection Appointments</span>
                            <span>{homeCollectionCount}</span>
                          </div>
                          <div className="w-full bg-[#FAF6F0] border border-[#EAE3D5] h-3 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#D26E4F] h-full"
                              style={{ width: `${totalBookings > 0 ? (homeCollectionCount / totalBookings) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-brand-dark-text font-bold">
                            <span>Clinic Walk-in Extractions</span>
                            <span>{clinicVisitCount}</span>
                          </div>
                          <div className="w-full bg-[#FAF6F0] border border-[#EAE3D5] h-3 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#1F3A2B] h-full"
                              style={{ width: `${totalBookings > 0 ? (clinicVisitCount / totalBookings) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Revenue splits */}
                    <div className="bg-white border border-[#EAE3D5] p-6 rounded-3xl shadow-sm space-y-4 text-left">
                      <h4 className="text-base font-extrabold text-[#1F3A2B]">Catalog Revenue Split Contribution</h4>
                      
                      <div className="space-y-3 pt-2 text-xs">
                        {catalog.map(test => {
                          const bookingsForTest = bookings.filter(b => b.test_name === test.test_name && b.payment_status === 'paid');
                          const testEarnings = bookingsForTest.reduce((sum, b) => sum + b.total_price_naira, 0);
                          const percent = totalEarnings > 0 ? Math.round((testEarnings / totalEarnings) * 100) : 0;

                          return (
                            <div key={test.id} className="flex items-center justify-between border-b border-[#FAF6F0] pb-2.5">
                              <span className="text-brand-dark-text font-bold">{test.test_name}</span>
                              <div className="text-right">
                                <span className="text-[#1F3A2B] font-black block">{formatNaira(testEarnings)}</span>
                                <span className="text-[9px] text-brand-muted-text block">{percent}% contribution</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PROFILE SETTINGS */}
              {activeTab === 'profile' && (
                <ProfilePage 
                  user={user} 
                  onUpdateUser={onUpdateUser} 
                  onBack={() => setActiveTab('bookings')}
                />
              )}
            </>
          )}

        </main>
      </div>

    </div>
  );
};
