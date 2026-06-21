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
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 md:p-12">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 max-w-2xl space-y-4 sm:space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Nigeria's Smartest Lab Booking Platform
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Book medical tests <br />
            <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              online in seconds.
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base md:text-lg">
            Compare prices across top certified laboratories. Schedule clinic visits or home sample collection instantly with zero hassle.
          </p>
        </div>
      </section>

      {/* Main Filter and Test Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        
        {/* Filters Panel */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="p-4 sm:p-6 rounded-2xl glass-panel space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {/* Filter Icon */}
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Filter Catalog
            </h3>
            
            {/* Search Box */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Search Tests & Labs</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tests & labs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/80 text-white border border-slate-700/80 rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-emerald-500 transition-colors text-xs sm:text-sm"
                />
                <svg className="w-4.5 h-4.5 absolute left-3 top-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Labs Select List */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">Laboratory</label>
              <div className="flex flex-row overflow-x-auto gap-2 pb-2 lg:flex-col lg:space-y-2 lg:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedLabId('')}
                  className={`shrink-0 w-max lg:w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 ${
                    selectedLabId === ''
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  All Labs (Global)
                </button>
                {labs.map((lab) => (
                  <button
                    key={lab.id}
                    onClick={() => setSelectedLabId(lab.id)}
                    className={`shrink-0 w-max lg:w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 ${
                      selectedLabId === lab.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="font-semibold text-left">{lab.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 text-left">{lab.city}, {lab.state}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Tests Grid */}
        <main className="lg:col-span-3">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm">Searching test inventory...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/20 border border-slate-800 rounded-2xl p-6">
              <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-bold text-white">No tests found</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                No diagnostic test matches your current filter or keyword. Try resetting your search or laboratory filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tests.map((test) => (
                <div 
                  key={test.id} 
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/2"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {test.sample_type}
                      </span>
                      <span className="text-lg font-extrabold text-emerald-400">
                        {formatNaira(test.price_naira)}
                      </span>
                    </div>

                    {/* Test Info */}
                    <div>
                      <h4 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {test.test_name}
                      </h4>
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                        {test.description}
                      </p>
                    </div>

                    {/* Lab & Turnaround Info */}
                    <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs text-slate-400">
                      <div>
                        <span className="block text-slate-500 uppercase tracking-wider font-semibold text-[10px]">Laboratory</span>
                        <span className="font-medium text-slate-200 mt-0.5 block">{test.lab_name}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 uppercase tracking-wider font-semibold text-[10px]">Turnaround Time</span>
                        <span className="font-medium text-slate-200 mt-0.5 block">{test.turnaround_hours} hours</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-800/50 flex gap-3">
                    <button
                      onClick={() => onSelectTest(test)}
                      className="flex-grow flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
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
                      className="px-3.5 py-2.5 bg-slate-850 hover:bg-slate-800 text-emerald-450 border border-slate-800 rounded-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center"
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
