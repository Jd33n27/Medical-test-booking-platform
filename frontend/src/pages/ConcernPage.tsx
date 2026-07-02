import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Lab, Test, HealthConcern } from '../types';
import { formatNaira } from '../utils/formatters';
import { getCachedLocation } from '../utils/geolocation';

interface ConcernPageProps {
  concernId: string;
  onSelectTest: (test: Test) => void;
  onGoBack: () => void;
}

// Concern Icon SVG Helper
export const ConcernIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-6 h-6' }) => {
  const iconName = name.toLowerCase();
  if (iconName.includes('diabetes') || iconName.includes('activity')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
      </svg>
    );
  }
  if (iconName.includes('heart') && !iconName.includes('handshake')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    );
  }
  if (iconName.includes('kidney') || iconName.includes('filter')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    );
  }
  if (iconName.includes('liver') || iconName.includes('shield')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  if (iconName.includes('infectious') || iconName.includes('bug')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (iconName.includes('sexual') || iconName.includes('handshake')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  if (iconName.includes('pregnancy') || iconName.includes('sparkles')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    );
  }
  if (iconName.includes('thyroid') || iconName.includes('flame')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    );
  }
  if (iconName.includes('bone')) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

export const ConcernPage: React.FC<ConcernPageProps> = ({ concernId, onSelectTest, onGoBack }) => {
  const [concern, setConcern] = useState<HealthConcern | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Monitor viewport scroll level to toggle Back to Top visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'proximity' | 'price_asc' | 'price_desc'>('proximity');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get user coordinates on mount (cached)
  useEffect(() => {
    getCachedLocation().then((coords) => {
      if (coords) setUserCoords(coords);
    });
  }, []);

  // Distance calculator helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  // Fetch initial concern info & labs
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [concernsData, labsData] = await Promise.all([
          api.getHealthConcerns(),
          api.getLabs()
        ]);
        const found = concernsData.find(c => c.id === concernId);
        if (found) {
          setConcern(found);
        } else {
          setError('Health concern details could not be found.');
        }
        setLabs(labsData);
      } catch (err) {
        console.error(err);
        setError('Failed to load page parameters.');
      }
    };
    fetchMetadata();
  }, [concernId]);

  // Clean and parse search query for smart price matches
  const cleanQuery = searchQuery.trim().replace(/₦/g, '').replace(/,/g, '').trim();
  const isNumericQuery = /^\d+(\.\d+)?$/.test(cleanQuery);
  const parsedPrice = isNumericQuery ? parseFloat(cleanQuery) : null;

  // Fetch tests based on filters
  useEffect(() => {
    if (!concernId) return;

    const fetchFiltered = async () => {
      try {
        setLoading(true);
        // If it's a numeric search query, don't pass search to backend so we can filter close prices locally
        const searchParam = isNumericQuery ? undefined : (searchQuery || undefined);
        const filteredTests = await api.getTests(selectedLabId || undefined, searchParam, concernId);
        setTests(filteredTests);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch tests.');
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchFiltered();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [concernId, selectedLabId, searchQuery, isNumericQuery]);

  // Apply frontend processing (smart price filter and sorting)
  let processedTests = [...tests];

  // 1. If smart price query is active, filter tests that are close to the target price (+/- 30%)
  if (parsedPrice !== null) {
    processedTests = processedTests.filter(test => {
      const differencePercent = Math.abs(test.price_naira - parsedPrice) / parsedPrice;
      return differencePercent <= 0.3; // Within 30% threshold
    });
  }

  // 2. Apply sorting
  processedTests.sort((a, b) => {
    // If smart price query is active, sort by closeness to the searched price first
    if (parsedPrice !== null) {
      const distA = Math.abs(a.price_naira - parsedPrice);
      const distB = Math.abs(b.price_naira - parsedPrice);
      if (distA !== distB) {
        return distA - distB;
      }
    }

    if (sortBy === 'price_asc') {
      return a.price_naira - b.price_naira;
    }
    if (sortBy === 'price_desc') {
      return b.price_naira - a.price_naira;
    }
    
    // Default proximity sorting
    if (userCoords) {
      const labA = labs.find(l => l.id === a.lab_id);
      const labB = labs.find(l => l.id === b.lab_id);
      if (labA && labB) {
        const distA = calculateDistance(userCoords.latitude, userCoords.longitude, labA.latitude, labA.longitude);
        const distB = calculateDistance(userCoords.latitude, userCoords.longitude, labB.latitude, labB.longitude);
        return distA - distB;
      }
    }

    return a.test_name.localeCompare(b.test_name);
  });

  // Filter sorted labs based on search queries
  const filteredSortedLabs = [...labs]
    .sort((a, b) => {
      if (!userCoords) return a.name.localeCompare(b.name);
      const distA = calculateDistance(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude);
      const distB = calculateDistance(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude);
      return distA - distB;
    })
    .filter(lab => {
      if (!searchQuery || isNumericQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (lab.name || '').toLowerCase().includes(query) ||
        (lab.city || '').toLowerCase().includes(query) ||
        (lab.state || '').toLowerCase().includes(query) ||
        (lab.address || '').toLowerCase().includes(query)
      );
    });

  return (
    <div className="space-y-10">
      {/* Header Banner & Back Button */}
      <section className="py-2 sm:py-4 space-y-4">
        <button 
          onClick={onGoBack}
          className="inline-flex items-center gap-2 text-brand-forest hover:text-brand-terracotta font-bold transition-colors text-sm cursor-pointer"
        >
          {/* Back Arrow */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Directory
        </button>

        {concern && (
          <div className="flex flex-col md:flex-row md:items-center gap-4 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-forest text-brand-sage flex items-center justify-center shrink-0">
              <ConcernIcon name={concern.name} className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-dark-text tracking-tight">
                {concern.name}
              </h1>
              <p className="text-brand-muted-text text-sm sm:text-base max-w-2xl">
                {concern.description}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Main Catalog View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-24 h-fit space-y-6">
          <div className="p-4 sm:p-6 rounded-2xl bento-panel-dark space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-brand-light-text flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Filter Concern
            </h3>
            
            {/* Search Box */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search test name or price (e.g. 5000)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-border-dark/30 text-brand-light-text border border-brand-border-dark rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-brand-terracotta transition-colors text-xs sm:text-sm"
                />
                <svg className="w-4.5 h-4.5 absolute left-3 top-3 text-brand-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {isNumericQuery && parsedPrice !== null && (
                <div className="text-[10px] text-brand-terracotta font-medium mt-1">
                  Filtering tests priced around ₦{parsedPrice.toLocaleString()} (within 30%)
                </div>
              )}
            </div>

            {/* Sorting Toggles */}
            <div className="space-y-2 relative">
              <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Sort Order</label>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full flex items-center justify-between bg-brand-border-dark/20 text-brand-light-text border border-brand-border-dark rounded-xl px-4 py-2.5 text-xs sm:text-sm text-left hover:bg-brand-border-dark/35 transition-colors cursor-pointer"
              >
                <span>
                  {sortBy === 'proximity' && 'Nearest Laboratories'}
                  {sortBy === 'price_asc' && 'Price: Low to High'}
                  {sortBy === 'price_desc' && 'Price: High to Low'}
                </span>
                <svg className={`w-4 h-4 transition-transform duration-200 ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showSortDropdown && (
                <div className="absolute left-0 right-0 mt-1.5 bg-brand-dark border border-brand-border-dark rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-brand-border-dark/40">
                  <button
                    onClick={() => { setSortBy('proximity'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-brand-border-dark/30 transition-colors block cursor-pointer ${sortBy === 'proximity' ? 'text-brand-terracotta font-bold' : 'text-brand-light-text/90'}`}
                  >
                    Nearest Laboratories
                  </button>
                  <button
                    onClick={() => { setSortBy('price_asc'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-brand-border-dark/30 transition-colors block cursor-pointer ${sortBy === 'price_asc' ? 'text-brand-terracotta font-bold' : 'text-brand-light-text/90'}`}
                  >
                    Price: Low to High
                  </button>
                  <button
                    onClick={() => { setSortBy('price_desc'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-brand-border-dark/30 transition-colors block cursor-pointer ${sortBy === 'price_desc' ? 'text-brand-terracotta font-bold' : 'text-brand-light-text/90'}`}
                  >
                    Price: High to Low
                  </button>
                </div>
              )}
            </div>

            {/* Labs Select List */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Laboratory</label>
              <div className="flex flex-row overflow-x-auto gap-2 pb-2 lg:flex-col lg:space-y-2 lg:pb-0 scrollbar-none w-full min-w-0">
                <button
                  onClick={() => setSelectedLabId('')}
                  className={`shrink-0 min-w-max lg:min-w-0 lg:w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 whitespace-nowrap lg:whitespace-normal cursor-pointer ${
                    selectedLabId === ''
                      ? 'bg-brand-terracotta/20 border-brand-terracotta text-brand-terracotta font-semibold'
                      : 'bg-brand-border-dark/25 border-brand-border-dark/60 text-brand-light-text/80 hover:bg-brand-border-dark/40'
                  }`}
                >
                  All Labs (Global)
                </button>
                {filteredSortedLabs.map((lab) => (
                  <button
                    key={lab.id}
                    onClick={() => setSelectedLabId(lab.id)}
                    className={`shrink-0 min-w-max lg:min-w-0 lg:w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 whitespace-nowrap lg:whitespace-normal cursor-pointer ${
                      selectedLabId === lab.id
                        ? 'bg-brand-terracotta/20 border-brand-terracotta text-brand-terracotta font-semibold'
                        : 'bg-brand-border-dark/25 border-brand-border-dark/60 text-brand-light-text/80 hover:bg-brand-border-dark/40'
                    }`}
                  >
                    <div className="font-semibold text-left">{lab.name}</div>
                    <div className="text-[10px] text-brand-muted-text mt-0.5 text-left">{lab.address}, {lab.city}</div>
                    {userCoords && (
                      <div className="text-[10px] text-brand-terracotta font-semibold mt-0.5 text-left">
                        {calculateDistance(userCoords.latitude, userCoords.longitude, lab.latitude, lab.longitude).toFixed(1)} km away
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Tests Grid */}
        <main className="lg:col-span-3">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex gap-3">
              <svg className="w-5 h-5 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-brand-border border-t-brand-terracotta rounded-full animate-spin"></div>
              <p className="text-brand-muted-text text-sm">Searching test inventory...</p>
            </div>
          ) : processedTests.length === 0 ? (
            <div className="text-center py-20 bento-panel-light rounded-2xl p-6">
              <svg className="w-16 h-16 text-brand-muted-text mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-bold text-brand-dark-text">No tests found</h3>
              <p className="text-brand-muted-text text-sm mt-1 max-w-sm mx-auto">
                No diagnostic test matches your current filter or price query. Try resetting your search or laboratory filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-stretch sm:justify-items-center">
              {processedTests.map((test) => (
                <div 
                  key={test.id} 
                  className="group relative flex flex-col justify-between p-4 rounded-[16px] border-2 border-brand-border-dark/30 bento-panel-light transition-all duration-200 w-full sm:w-[286px] min-h-[266px] sm:h-[266px] shrink-0"
                >
                  <div className="flex flex-col justify-between h-full space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-forest/10 text-brand-forest border border-brand-forest/20">
                        {test.sample_type}
                      </span>
                      <span className="text-base font-extrabold text-brand-terracotta">
                        {formatNaira(test.price_naira)}
                      </span>
                    </div>

                    {/* Test Info */}
                    <div>
                      <h4 className="text-sm font-extrabold text-brand-dark-text group-hover:text-brand-terracotta transition-colors line-clamp-1" title={test.test_name}>
                        {test.test_name}
                      </h4>
                      <p className="text-brand-muted-text text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                        {test.description}
                      </p>
                    </div>

                    {/* Lab & Turnaround Info */}
                    <div className="pt-2 border-t border-brand-border/60 text-[11px] text-brand-muted-text space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <span className="font-extrabold text-brand-dark-text block truncate">{test.lab_name}</span>
                          {(() => {
                            const lab = labs.find(l => l.id === test.lab_id);
                            if (!lab) return null;
                            return (
                              <span className="text-[10px] text-brand-muted-text/80 block truncate">
                                {lab.address}, {lab.city}
                              </span>
                            );
                          })()}
                        </div>
                        {(() => {
                          const lab = labs.find(l => l.id === test.lab_id);
                          if (!lab || !userCoords) return null;
                          const dist = calculateDistance(userCoords.latitude, userCoords.longitude, lab.latitude, lab.longitude);
                          return (
                            <span className="text-[10px] text-brand-terracotta font-bold shrink-0">
                              {dist.toFixed(1)} km
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-[10px] flex items-center justify-between pt-1 text-brand-muted-text">
                        <span>Turnaround:</span>
                        <strong className="text-brand-dark-text">{test.turnaround_hours} hours</strong>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-brand-border/60 flex gap-2">
                      <button
                        onClick={() => onSelectTest(test)}
                        className="flex-grow flex items-center justify-center gap-1.5 bg-brand-terracotta hover:bg-brand-terracotta-hover text-brand-light-text font-bold py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer text-xs"
                      >
                        Book Appointment
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => (window as any).navigateToChat?.(test.lab_id)}
                        title="Chat with Lab"
                        className="p-2 bg-brand-sage/40 hover:bg-brand-sage text-brand-forest border border-brand-border rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 p-3 bg-brand-terracotta hover:bg-brand-terracotta-hover text-brand-light-text rounded-full shadow-2xl transition-all duration-300 transform scale-100 hover:scale-110 cursor-pointer flex items-center justify-center border border-white/10"
          title="Back to Top"
        >
          <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
};
