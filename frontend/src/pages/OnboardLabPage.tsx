import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

interface OnboardLabPageProps {
  onSuccess: (labId: string, token?: string) => void;
  onBack: () => void;
}

export const OnboardLabPage: React.FC<OnboardLabPageProps> = ({ onSuccess, onBack }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Lagos');
  const [phone, setPhone] = useState('');
  const [acceptsHomeCollection, setAcceptsHomeCollection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for coordinates geocoded in the background
  const [detectedCoords, setDetectedCoords] = useState<{lat: number, lng: number} | null>(null);

  // Autocomplete search states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const searchTimeoutRef = useRef<any>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

  const handleNextStep1 = () => {
    if (!name.trim()) {
      setError("Laboratory Name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Official Phone Number is required.");
      return;
    }
    setError(null);
    setStep(2);
  };

  // Helper to parse address details returned by Nominatim API
  const parseNominatimAddress = (addressDetails: any) => {
    const road = addressDetails.road || addressDetails.suburb || addressDetails.neighbourhood || addressDetails.pedestrian || '';
    const houseNumber = addressDetails.house_number || '';
    const streetAddress = houseNumber ? `${houseNumber} ${road}` : road;

    const cityVal = addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.city_district || '';
    
    let stateVal = 'Lagos';
    const stateStr = addressDetails.state || '';
    if (stateStr.toLowerCase().includes('abuja') || stateStr.toLowerCase().includes('federal capital territory')) {
      stateVal = 'Abuja';
    } else if (stateStr.toLowerCase().includes('oyo')) {
      stateVal = 'Oyo';
    } else if (stateStr.toLowerCase().includes('rivers')) {
      stateVal = 'Rivers';
    } else if (stateStr.toLowerCase().includes('kano')) {
      stateVal = 'Kano';
    } else if (stateStr.toLowerCase().includes('enugu')) {
      stateVal = 'Enugu';
    }

    return { streetAddress, city: cityVal, state: stateVal };
  };

  // Click outside autocomplete suggestions handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteContainerRef.current &&
        !autocompleteContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search autocomplete typing search suggestion queries
  const handleSearchInputChange = (val: string) => {
    setAddress(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setAutocompleteLoading(true);
    setShowSuggestions(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await api.geocode(val);
        setSuggestions(data || []);
      } catch (err) {
        console.error("Autocomplete search failed:", err);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 400);
  };

  // Handle selecting a suggestion location item
  const handleSelectSuggestion = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    setDetectedCoords({ lat, lng });
    setShowSuggestions(false);

    if (suggestion.address) {
      const { streetAddress, city: parsedCity, state: parsedState } = parseNominatimAddress(suggestion.address);
      setAddress(streetAddress || suggestion.display_name.split(',')[0]);
      if (parsedCity) setCity(parsedCity);
      if (parsedState) setState(parsedState);
    } else {
      setAddress(suggestion.display_name.split(',')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Laboratory Name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Official Phone Number is required.");
      return;
    }
    if (!city.trim()) {
      setError("City is required.");
      return;
    }
    if (!address.trim()) {
      setError("Street Address is required.");
      return;
    }

    setLoading(true);

    let latVal = 6.4532;
    let lngVal = 3.3959;

    if (detectedCoords) {
      latVal = detectedCoords.lat;
      lngVal = detectedCoords.lng;
    } else {
      // Run quick search in submit if no lookup was run manually
      try {
        const data = await api.geocode(`${address}, ${city}, ${state}, Nigeria`);
        if (data && data.length > 0) {
          latVal = parseFloat(data[0].lat);
          lngVal = parseFloat(data[0].lon);
        }
      } catch (err) {
        console.log("Inline geocoding failed, falling back to Lagos coordinates:", err);
      }
    }

    try {
      const response = await api.onboardLab({
        name,
        address,
        city,
        state,
        phone,
        latitude: latVal,
        longitude: lngVal,
        accepts_home_collection: acceptsHomeCollection,
        commission_rate: 20.00, // Default 20%
      });

      if (response && response.lab_id) {
        onSuccess(response.lab_id, response.token);
      } else {
        throw new Error('Onboarding did not return a valid laboratory profile ID.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Onboarding failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 my-8 animate-fade-in relative overflow-hidden">
      {/* Background glow highlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-forest/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/3 w-60 h-60 bg-brand-terracotta/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="relative space-y-6 py-2 px-1">

        <div className="space-y-4 mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-muted-text hover:text-brand-dark-text transition-colors uppercase tracking-wider cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to search
          </button>
          <div className="space-y-2">
            <span className="text-xs font-bold text-brand-terracotta uppercase tracking-widest block">Partner Portal Enrollment</span>
            <h2 className="text-3xl md:text-4xl font-black text-brand-dark-text tracking-tight">Onboard Your Lab</h2>
            <p className="text-sm text-brand-muted-text leading-relaxed">
              Register your laboratory profile to begin listing diagnostic tests, managing scheduling, and delivering PDF report results to patients across Nigeria.
            </p>
          </div>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-2 max-w-sm mx-auto">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border ${
                  step === s 
                    ? "bg-brand-forest text-brand-cream border-brand-forest shadow-sm" 
                    : step > s 
                      ? "bg-brand-sage text-brand-forest border-brand-border" 
                      : "bg-brand-cream text-brand-muted-text/50 border-brand-border"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-[10px] font-bold tracking-wider uppercase ml-2 hidden sm:inline ${
                  step === s ? "text-brand-forest" : "text-brand-muted-text/60"
                }`}>
                  {s === 1 ? "Profile" : "Location"}
                </span>
              </div>
              {s < 2 && (
                <div className={`flex-1 h-[2px] mx-2 ${
                  step > s ? "bg-brand-forest/50" : "bg-brand-border"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: Profile Info */}
          <div className={step === 1 ? "space-y-5 animate-fade-in" : "hidden"}>
            {/* Lab Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Laboratory Name *</label>
              <input
                type="text"
                placeholder="e.g. Lancet Medical Diagnostics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/40 border border-brand-border focus:border-brand-terracotta rounded-xl px-4 py-3 focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Official Phone Number *</label>
              <input
                type="tel"
                placeholder="e.g. +2348012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/40 border border-brand-border focus:border-brand-terracotta rounded-xl px-4 py-3 focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Accepts Home Collection Switch */}
            <div className="flex items-center justify-between p-4 bg-brand-cream border border-brand-border rounded-2xl h-12 mt-1">
              <span className="text-xs font-bold text-brand-dark-text">Home sample collection</span>
              <button
                type="button"
                onClick={() => setAcceptsHomeCollection(!acceptsHomeCollection)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  acceptsHomeCollection ? 'bg-brand-forest' : 'bg-brand-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-brand-cream shadow ring-0 transition duration-200 ease-in-out ${
                    acceptsHomeCollection ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* STEP 2: Address Info */}
          <div className={step === 2 ? "space-y-5 animate-fade-in" : "hidden"}>
            {/* Street Address & Autocomplete Search */}
            <div ref={autocompleteContainerRef} className="space-y-1.5 relative">
              <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Street Address *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 15 Kingsway Road, Ikoyi"
                  value={address}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/40 border border-brand-border focus:border-brand-terracotta rounded-xl px-4 py-3 focus:outline-none transition-all text-sm pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {autocompleteLoading ? (
                    <div className="w-4 h-4 border-2 border-brand-terracotta border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-brand-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && showSuggestions && (
                <div className="absolute z-55 w-full mt-1.5 rounded-xl bg-brand-cream border border-brand-border shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-brand-sage text-xs text-brand-dark-text hover:text-brand-forest border-b border-brand-border/40 last:border-b-0 transition-colors block leading-relaxed cursor-pointer"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* State Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">State *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-brand-cream text-brand-dark-text border border-brand-border focus:border-brand-terracotta rounded-xl px-4 py-3 focus:outline-none transition-all text-sm"
              >
                <option value="Lagos">Lagos</option>
                <option value="Abuja">FCT (Abuja)</option>
                <option value="Oyo">Oyo</option>
                <option value="Rivers">Rivers</option>
                <option value="Kano">Kano</option>
                <option value="Enugu">Enugu</option>
              </select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">City *</label>
              <input
                type="text"
                placeholder="e.g. Lagos Island"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/40 border border-brand-border focus:border-brand-terracotta rounded-xl px-4 py-3 focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="pt-4 border-t border-brand-border flex gap-4">
            {step === 1 && (
              <>
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 py-3 px-4 bg-brand-sage hover:bg-brand-border/40 text-brand-forest font-bold rounded-xl border border-brand-border text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="flex-1 py-3 px-4 bg-brand-forest hover:bg-brand-forest/90 text-brand-cream font-black rounded-xl text-xs transition-all cursor-pointer"
                >
                  Next Step
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 bg-brand-sage hover:bg-brand-border/40 text-brand-forest font-bold rounded-xl border border-brand-border text-xs transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 relative overflow-hidden py-3 px-4 bg-brand-terracotta hover:bg-brand-terracotta-hover disabled:opacity-55 text-brand-cream font-black rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-cream border-t-transparent rounded-full animate-spin" />
                      Registering...
                    </div>
                  ) : (
                    'Onboard Lab Partner'
                  )}
                </button>
              </>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
