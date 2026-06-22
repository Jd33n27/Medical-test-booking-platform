import { useEffect, useState } from 'react';
import './App.css';
import { HomePage } from './pages/HomePage';
import { BookingPage } from './pages/BookingPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentFailedPage } from './pages/PaymentFailedPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HistoryPage } from './pages/HistoryPage';
import { LabPortalPage } from './pages/LabPortalPage';
import { OnboardLabPage } from './pages/OnboardLabPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { ConcernPage } from './pages/ConcernPage';
import { StyleGuidePage } from './pages/StyleGuidePage';
import { Test, TimeSlot, BookingRequest, User } from './types';

type PageType = 'home' | 'booking' | 'confirm' | 'success' | 'failed' | 'login' | 'register' | 'history' | 'lab-portal' | 'onboard-lab' | 'chat' | 'profile' | 'concern' | 'styleguide';

function App() {
  const [page, setPage] = useState<PageType>('home');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [chatLabId, setChatLabId] = useState<string | undefined>(undefined);
  const [chatPatientId, setChatPatientId] = useState<string | undefined>(undefined);
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Geolocation coordinate tracking state
  const [locationText, setLocationText] = useState<string>('Lagos, NG');
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  useEffect(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`)
            .then(res => {
              if (!res.ok) throw new Error('Geocoding network error');
              return res.json();
            })
            .then(data => {
              const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Lagos';
              const country = data.address?.country || 'Nigeria';
              setLocationText(`${city}, ${country}`);
              setLocationLoading(false);
            })
            .catch(err => {
              console.log('Reverse geocoding failed, falling back:', err);
              setLocationText('Lagos, Nigeria');
              setLocationLoading(false);
            });
        },
        (error) => {
          console.log('Geolocation error:', error);
          setLocationText('Lagos, Nigeria');
          setLocationLoading(false);
        }
      );
    }
  }, []);

  // Sync location text badge with user laboratory details if logged in as a lab partner
  useEffect(() => {
    if (user && user.role === 'lab_admin' && user.lab_id) {
      if (user.lab_city && user.lab_state) {
        setLocationText(`${user.lab_city}, ${user.lab_state}`);
      }
    }
  }, [user]);

  // Authenticated user recovery on mount (each tab is independent)
  useEffect(() => {
    const savedUser = sessionStorage.getItem('medbook_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse logged-in user profile:', e);
      }
    }
  }, []);

  // Router matching on initial mount and history updates
  useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      if (path.includes('/payment-success')) {
        setPage('success');
      } else if (path.includes('/payment-failed')) {
        setPage('failed');
      } else if (path.includes('/login')) {
        setPage('login');
      } else if (path.includes('/register')) {
        setPage('register');
      } else if (path.includes('/history')) {
        setPage('history');
      } else if (path.includes('/lab-portal')) {
        const savedUser = sessionStorage.getItem('medbook_user');
        try {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          if (parsedUser && parsedUser.role === 'lab_admin') {
            setPage('lab-portal');
          } else {
            window.history.replaceState({}, '', '/');
            setPage('home');
          }
        } catch (e) {
          window.history.replaceState({}, '', '/');
          setPage('home');
        }
      } else if (path.includes('/onboard-lab')) {
        setPage('onboard-lab');
      } else if (path.includes('/chat')) {
        const queryParams = new URLSearchParams(window.location.search);
        const labId = queryParams.get('lab_id') || undefined;
        let patientId = queryParams.get('patient_id') || undefined;

        const savedUser = sessionStorage.getItem('medbook_user');
        try {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          if (parsedUser && parsedUser.role === 'patient') {
            // Patients can only chat with labs, so patient_id query parameter is invalid and stripped
            if (patientId) {
              patientId = undefined;
              const newUrl = '/chat' + (labId ? `?lab_id=${labId}` : '');
              window.history.replaceState({}, '', newUrl);
            }
          }
        } catch (e) {}

        setChatLabId(labId);
        setChatPatientId(patientId);
        setPage('chat');
      } else if (path.includes('/profile')) {
        setPage('profile');
      } else if (path.includes('/concern/')) {
        const concernId = path.split('/concern/')[1] || '';
        setSelectedConcernId(concernId);
        setPage('concern');
      } else if (path.includes('/styleguide') || path.includes('/design-system')) {
        setPage('styleguide');
      } else {
        setPage('home');
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  const navigateTo = (nextPage: PageType, param?: string) => {
    if (nextPage === 'home') {
      setSelectedTest(null);
      setSelectedSlot(null);
      setBookingRequest(null);
      setChatLabId(undefined);
      setChatPatientId(undefined);
      setSelectedConcernId(null);
      window.history.pushState({}, '', '/');
    } else if (nextPage === 'concern' && param) {
      setSelectedConcernId(param);
      window.history.pushState({}, '', `/concern/${param}`);
    } else {
      window.history.pushState({}, '', `/${nextPage}`);
    }
    setPage(nextPage);
  };

  const handleNavigateToChat = (labId?: string, patientId?: string) => {
    if (!sessionStorage.getItem('medbook_token')) {
      navigateTo('login');
      return;
    }
    setChatLabId(labId);
    setChatPatientId(patientId);
    let url = '/chat';
    if (labId) url += `?lab_id=${labId}`;
    if (patientId) url += `?patient_id=${patientId}`;
    window.history.pushState({}, '', url);
    setPage('chat');
  };

  useEffect(() => {
    (window as any).navigateToChat = handleNavigateToChat;
    return () => {
      delete (window as any).navigateToChat;
    };
  }, []);

  const handleSelectTest = (test: Test) => {
    setSelectedTest(test);
    navigateTo('booking');
  };

  const handleReviewBooking = (bookingData: BookingRequest, slot: TimeSlot) => {
    // Dynamically inject the user ID if the client is authenticated
    if (user) {
      bookingData.user_id = user.id;
    }
    setBookingRequest(bookingData);
    setSelectedSlot(slot);
    navigateTo('confirm');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('medbook_token');
    sessionStorage.removeItem('medbook_user');
    setUser(null);
    navigateTo('home');
  };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-dark-text selection:bg-brand-terracotta selection:text-brand-light-text flex flex-col justify-between">
      
      {/* Header component */}
      <header className="sticky top-0 z-50 bg-brand-cream/90 backdrop-blur-md border-b border-brand-border px-3 md:px-6 py-2.5 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigateTo('home')}
            className="flex items-center gap-1.5 md:gap-2 hover:opacity-90 transition-opacity text-left"
          >
            {/* Logo Mark */}
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-brand-forest flex items-center justify-center text-brand-cream font-black text-base md:text-lg">
              M
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-xl md:text-2xl tracking-tight text-brand-dark-text block">MedBook</span>
              <span className="text-[10px] md:text-xs text-brand-muted-text font-semibold tracking-wider uppercase block -mt-1">Diagnostics</span>
            </div>
          </button>

          {/* User Profile Navigation actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* User Session Info (Desktop Only) */}
                <div className="hidden md:flex flex-col items-end pr-2 text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-brand-dark-text">{user.name}</span>
                    {user.verification_status === 'verified' && (
                      <svg className="w-3.5 h-3.5 text-brand-terracotta shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <title>Verified Account</title>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-brand-muted-text uppercase tracking-widest leading-none">
                    <span>{user.role.replace('_', ' ')}</span>
                    {user.role === 'lab_admin' && user.lab_name && (
                      <>
                        <span className="text-brand-border font-extrabold">•</span>
                        <span className="text-brand-terracotta font-extrabold normal-case tracking-normal text-[11px] sm:text-xs">{user.lab_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleNavigateToChat(); }}
                  className={`px-2.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-all flex items-center gap-1.5 cursor-pointer`}
                  title="Chat Messages"
                >
                  <svg className={`text-brand-forest ${page === 'lab-portal' ? 'w-5 h-5 md:w-3.5 md:h-3.5' : 'w-4 h-4 md:w-3.5 md:h-3.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="inline">Chat</span>
                </button>
                {user.role === 'lab_admin' ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigateTo('lab-portal'); }}
                      className={`px-2.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-all flex items-center gap-1.5 cursor-pointer`}
                      title="Lab Portal"
                    >
                      <svg className={`text-brand-forest ${page === 'lab-portal' ? 'w-5 h-5 md:w-3.5 md:h-3.5' : 'w-4 h-4 md:w-3.5 md:h-3.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                      </svg>
                      <span className={page === 'lab-portal' ? 'inline' : 'hidden sm:inline'}>Portal</span>
                    </button>
                    {!user.lab_id && (
                      <button
                        onClick={() => { setMobileMenuOpen(false); navigateTo('onboard-lab'); }}
                        className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-all flex items-center gap-1.5 cursor-pointer`}
                        title="Onboard Lab"
                      >
                        <svg className={`w-4 h-4 md:w-3.5 md:h-3.5 text-brand-forest`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="hidden sm:inline">Onboard Lab</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigateTo('history'); }}
                    className={`px-2.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-all flex items-center gap-1.5 cursor-pointer`}
                    title="My Vault"
                  >
                    <svg className={`w-4 h-4 md:w-3.5 md:h-3.5 text-brand-forest`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="hidden sm:inline">Vault</span>
                  </button>
                )}
                
                {/* Desktop profile/signout controls */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => navigateTo('profile')}
                    className="px-4 py-2 text-sm font-bold rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Profile Settings"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-sm font-semibold rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Sign Out"
                  >
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Mobile hamburger menu container */}
                <div className="md:hidden relative">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className={`px-3 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-all flex items-center justify-center cursor-pointer`}
                    title="Menu"
                  >
                    <svg className={`text-brand-forest ${page === 'lab-portal' ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  
                  {mobileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-brand-cream border border-brand-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-brand-border/40 py-1">
                      <button
                        onClick={() => { setMobileMenuOpen(false); navigateTo('profile'); }}
                        className="w-full text-left px-4 py-3 text-xs sm:text-sm text-brand-forest hover:bg-brand-sage/40 transition-colors flex items-center gap-2.5 font-bold cursor-pointer"
                      >
                        <svg className={`text-brand-forest ${page === 'lab-portal' ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile Settings
                      </button>
                      <button
                        onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                        className="w-full text-left px-4 py-3 text-xs sm:text-sm text-rose-600 hover:bg-rose-500/5 transition-colors flex items-center gap-2.5 font-bold cursor-pointer"
                      >
                        <svg className={`text-rose-500 ${page === 'lab-portal' ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => navigateTo('onboard-lab')}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl bg-brand-panel-light border border-brand-border text-brand-forest hover:bg-brand-sage transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  title="Onboard Lab"
                >
                  <svg className="w-3.5 h-3.5 hidden sm:block text-brand-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="hidden sm:inline">Onboard Lab</span>
                  <span className="sm:hidden">Onboard</span>
                </button>
                <button
                  onClick={() => navigateTo('login')}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl bg-brand-terracotta hover:bg-brand-terracotta-hover text-brand-light-text transition-colors cursor-pointer flex items-center gap-1"
                  title="Sign In"
                >
                  <svg className="w-3.5 h-3.5 hidden sm:block text-brand-light-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l-4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign In</span>
                </button>
              </div>
            )}

            {/* Location Badge (Desktop Only) */}
            <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs sm:text-sm bg-brand-panel-light border border-brand-border text-brand-dark-text font-medium select-none">
              {locationLoading ? (
                <span className="w-1.5 h-1.5 bg-brand-terracotta rounded-full animate-ping mr-1"></span>
              ) : (
                <span className="w-1.5 h-1.5 bg-brand-terracotta rounded-full animate-pulse mr-1"></span>
              )}
              {locationText}
            </div>
          </div>
        </div>
      </header>

      {/* Main page content area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 md:py-8">
        {page === 'home' && (
          <HomePage 
            onSelectTest={handleSelectTest} 
            onSelectConcern={(concernId) => navigateTo('concern', concernId)} 
          />
        )}

        {page === 'concern' && selectedConcernId && (
          <ConcernPage 
            concernId={selectedConcernId} 
            onSelectTest={handleSelectTest} 
            onGoBack={() => navigateTo('home')} 
          />
        )}
        
        {page === 'booking' && selectedTest && (
          <BookingPage 
            test={selectedTest} 
            onReviewBooking={handleReviewBooking} 
            onBack={() => navigateTo('home')} 
          />
        )}
        
        {page === 'confirm' && selectedTest && selectedSlot && bookingRequest && (
          <ConfirmationPage 
            test={selectedTest} 
            slot={selectedSlot} 
            bookingData={bookingRequest} 
            onBack={() => navigateTo('booking')} 
          />
        )}

        {page === 'success' && (
          <PaymentSuccessPage onGoHome={() => navigateTo('home')} />
        )}

        {page === 'failed' && (
          <PaymentFailedPage onGoHome={() => navigateTo('home')} />
        )}

        {page === 'login' && (
          <LoginPage 
            onSuccess={(auth) => {
              setUser(auth.user);
              if (auth.user.role === 'lab_admin') {
                navigateTo('lab-portal');
              } else {
                navigateTo('home');
              }
            }}
            onToggleRegister={() => navigateTo('register')}
            onBack={() => navigateTo('home')}
          />
        )}

        {page === 'register' && (
          <RegisterPage 
            onSuccess={(auth) => {
              setUser(auth.user);
              if (auth.user.role === 'lab_admin') {
                navigateTo('lab-portal');
              } else {
                navigateTo('home');
              }
            }}
            onToggleLogin={() => navigateTo('login')}
            onBack={() => navigateTo('home')}
            onOnboardLab={() => navigateTo('onboard-lab')}
          />
        )}

        {page === 'history' && (
          <HistoryPage onBack={() => navigateTo('home')} />
        )}

        {page === 'lab-portal' && user && user.role === 'lab_admin' && (
          <LabPortalPage user={user} onBack={() => navigateTo('home')} />
        )}

        {page === 'chat' && (
          <ChatPage 
            onBack={() => navigateTo(user?.role === 'lab_admin' ? 'lab-portal' : 'home')}
            initialLabId={chatLabId}
            initialPatientId={chatPatientId}
          />
        )}

        {page === 'onboard-lab' && (
          <OnboardLabPage 
            onSuccess={(labId, token) => {
              if (user && token) {
                // If user is already authenticated, update session with the new role & lab_id
                const updatedUser = { ...user, lab_id: labId, role: 'lab_admin' };
                setUser(updatedUser);
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('medbook_user', JSON.stringify(updatedUser));
                navigateTo('lab-portal');
              } else {
                // Redirect to register with query parameters preset
                window.history.pushState({}, '', `/register?lab_id=${labId}&role=lab_admin`);
                setPage('register');
              }
            }} 
            onBack={() => navigateTo('home')} 
          />
        )}

        {page === 'profile' && user && (
          <ProfilePage 
            user={user}
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              sessionStorage.setItem('medbook_user', JSON.stringify(updatedUser));
            }}
            onBack={() => navigateTo(user.role === 'lab_admin' ? 'lab-portal' : 'home')}
          />
        )}

        {page === 'styleguide' && (
          <StyleGuidePage onBack={() => navigateTo('home')} />
        )}
      </main>

      {/* Footer component */}
      <footer className="border-t border-brand-border-dark bg-brand-forest py-8 px-6 text-center text-xs text-brand-light-text/60 space-y-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-brand-light-text">MedBook</span>
            <span>|</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          
          <div className="flex gap-4 items-center">
            <a href="#" className="hover:text-brand-cream transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-brand-cream transition-colors">Privacy Policy</a>
            <button 
              onClick={() => navigateTo('onboard-lab')} 
              className="hover:text-brand-terracotta transition-colors cursor-pointer"
            >
              Lab Partners
            </button>
            <span className="text-brand-light-text/30">•</span>
            <button 
              onClick={() => navigateTo('styleguide')} 
              className="text-brand-cream/80 hover:text-brand-cream hover:underline transition-all cursor-pointer font-bold"
            >
              Style Guide
            </button>
          </div>
        </div>
        <p className="text-[10px] text-brand-muted-text/80 max-w-xl mx-auto">
          Disclaimer: MedBook is an independent booking intermediary. Diagnostic tests are conducted by third-party registered laboratories. We do not provide direct medical advice.
        </p>
      </footer>

    </div>
  );
}

export default App;
