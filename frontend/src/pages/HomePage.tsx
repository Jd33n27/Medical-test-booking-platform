import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Lab, Test } from '../types';
import { formatNaira } from '../utils/formatters';

interface HomePageProps {
  onSelectTest: (test: Test) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectTest }) => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get user coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (err) => {
          console.log('Error getting geolocation in HomePage:', err);
        }
      );
    }
  }, []);

  // Distance calculator helper (Haversine formula in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  // Sort labs dynamically based on proximity
  const sortedLabs = [...labs].sort((a, b) => {
    if (!userCoords) return a.name.localeCompare(b.name);
    const distA = calculateDistance(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude);
    const distB = calculateDistance(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude);
    return distA - distB;
  });

  // Sort tests dynamically based on proximity of their offering labs
  const sortedTests = [...tests].sort((a, b) => {
    if (!userCoords) return a.test_name.localeCompare(b.test_name);
    const labA = labs.find(l => l.id === a.lab_id);
    const labB = labs.find(l => l.id === b.lab_id);
    if (!labA || !labB) return 0;
    const distA = calculateDistance(userCoords.latitude, userCoords.longitude, labA.latitude, labA.longitude);
    const distB = calculateDistance(userCoords.latitude, userCoords.longitude, labB.latitude, labB.longitude);
    return distA - distB;
  });

  // Filter sorted labs dynamically based on search queries
  const filteredSortedLabs = sortedLabs.filter(lab => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    const matchesLab = 
      (lab.name || '').toLowerCase().includes(query) ||
      (lab.city || '').toLowerCase().includes(query) ||
      (lab.state || '').toLowerCase().includes(query) ||
      (lab.address || '').toLowerCase().includes(query);

    const hasMatchingTest = tests.some(t => t.lab_id === lab.id);

    return matchesLab || hasMatchingTest;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [labsData, testsData] = await Promise.all([
          api.getLabs(),
          api.getTests()
        ]);
        setLabs(labsData);
        setTests(testsData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Unable to load tests and laboratories. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch tests again when filter or search query changes
  useEffect(() => {
    // Skip initial fetch on mount since it's handled above
    if (labs.length === 0) return;

    const fetchFiltered = async () => {
      try {
        setLoading(true);
        const filteredTests = await api.getTests(selectedLabId || undefined, searchQuery || undefined);
        setTests(filteredTests);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to filter tests.');
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchFiltered();
    }, 300); // 300ms debounce for search inputs

    return () => clearTimeout(delayDebounce);
  }, [selectedLabId, searchQuery]);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-forest border border-brand-border-dark p-6 sm:p-8 md:p-12">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-sage/10 rounded-full blur-2xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-terracotta/10 rounded-full blur-2xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 max-w-2xl space-y-4 sm:space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-brand-sage/20 text-brand-sage border border-brand-border-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-terracotta animate-pulse"></span>
            Nigeria's Smartest Lab Booking Platform
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-brand-light-text leading-tight">
            Book medical tests <br />
            <span className="text-brand-terracotta">
              online in seconds.
            </span>
          </h1>
          <p className="text-brand-muted-text text-sm sm:text-base md:text-lg">
            Compare prices across top certified laboratories. Schedule clinic visits or home sample collection instantly with zero hassle.
          </p>
        </div>
      </section>

      {/* Main Filter and Test Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        
        {/* Filters Panel */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="p-4 sm:p-6 rounded-2xl bento-panel-dark space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-brand-light-text flex items-center gap-2">
              {/* Filter Icon */}
              <svg className="w-5 h-5 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Filter Catalog
            </h3>
            
            {/* Search Box */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Search Tests & Labs</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tests & labs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-brand-border-dark/30 text-brand-light-text border border-brand-border-dark rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-brand-terracotta transition-colors text-xs sm:text-sm"
                />
                <svg className="w-4.5 h-4.5 absolute left-3 top-3 text-brand-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Labs Select List */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">Laboratory</label>
              <div className="flex flex-row overflow-x-auto gap-2 pb-2 lg:flex-col lg:space-y-2 lg:pb-0 scrollbar-none w-full min-w-0">
                <button
                  onClick={() => setSelectedLabId('')}
                  className={`shrink-0 min-w-max lg:min-w-0 lg:w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 whitespace-nowrap lg:whitespace-normal ${
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
                    className={`shrink-0 min-w-max lg:min-w-0 lg:w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 whitespace-nowrap lg:whitespace-normal ${
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
          ) : tests.length === 0 ? (
            <div className="text-center py-20 bento-panel-light rounded-2xl p-6">
              <svg className="w-16 h-16 text-brand-muted-text mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-bold text-brand-dark-text">No tests found</h3>
              <p className="text-brand-muted-text text-sm mt-1 max-w-sm mx-auto">
                No diagnostic test matches your current filter or keyword. Try resetting your search or laboratory filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedTests.map((test) => (
                <div 
                  key={test.id} 
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bento-panel-light transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-forest/10 text-brand-forest border border-brand-forest/20">
                        {test.sample_type}
                      </span>
                      <span className="text-lg font-extrabold text-brand-terracotta">
                        {formatNaira(test.price_naira)}
                      </span>
                    </div>

                    {/* Test Info */}
                    <div>
                      <h4 className="text-xl font-bold text-brand-dark-text group-hover:text-brand-terracotta transition-colors">
                        {test.test_name}
                      </h4>
                      <p className="text-brand-muted-text text-sm mt-1 line-clamp-2">
                        {test.description}
                      </p>
                    </div>

                    {/* Lab & Turnaround Info */}
                    <div className="pt-4 border-t border-brand-border grid grid-cols-2 gap-4 text-xs text-brand-muted-text">
                      <div>
                        <span className="block text-brand-muted-text uppercase tracking-wider font-semibold text-[10px]">Laboratory</span>
                        <span className="font-semibold text-brand-dark-text mt-0.5 block">{test.lab_name}</span>
                        {(() => {
                          const lab = labs.find(l => l.id === test.lab_id);
                          if (!lab) return null;
                          return (
                            <span className="text-[10px] text-brand-muted-text mt-0.5 block">
                              {lab.address}, {lab.city}
                              {userCoords && (
                                <span className="text-brand-terracotta font-semibold block mt-0.5">
                                  {calculateDistance(userCoords.latitude, userCoords.longitude, lab.latitude, lab.longitude).toFixed(1)} km away
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="block text-brand-muted-text uppercase tracking-wider font-semibold text-[10px]">Turnaround Time</span>
                        <span className="font-semibold text-brand-dark-text mt-0.5 block">{test.turnaround_hours} hours</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-brand-border flex gap-3">
                    <button
                      onClick={() => onSelectTest(test)}
                      className="flex-grow flex items-center justify-center gap-2 bg-brand-terracotta hover:bg-brand-terracotta-hover text-brand-light-text font-bold py-2.5 px-4 rounded-xl transition-all duration-200"
                    >
                      Book Appointment
                      {/* Arrow Icon */}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => (window as any).navigateToChat?.(test.lab_id)}
                      title="Chat with Lab"
                      className="px-3.5 py-2.5 bg-brand-sage/40 hover:bg-brand-sage text-brand-forest border border-brand-border rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
