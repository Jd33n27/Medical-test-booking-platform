import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');

  // Autocomplete search states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const searchTimeoutRef = useRef<any>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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

  const handleNextStep2 = () => {
    if (!city.trim()) {
      setError("City is required.");
      return;
    }
    if (!address.trim()) {
      setError("Street Address is required.");
      return;
    }
    setError(null);
    setStep(3);
    // Trigger auto-geocoding in background so the map is positioned correctly when reaching Step 3
    setTimeout(() => {
      handleGeocodeAddress();
    }, 150);
  };

  // Initialize Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Check if map is already initialized or has _leaflet_id
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        console.warn("Cleanup map removal error:", e);
      }
      mapRef.current = null;
    }

    // Clean up container DOM properties and leftovers
    if ((container as any)._leaflet_id) {
      try {
        delete (container as any)._leaflet_id;
      } catch (e) {
        (container as any)._leaflet_id = undefined;
      }
    }
    container.innerHTML = '';

    // Create map instance safely
    let map: L.Map;
    try {
      const initialLat = detectedCoords?.lat ?? 6.4532;
      const initialLng = detectedCoords?.lng ?? 3.3959;

      map = L.map(container, {
        center: [initialLat, initialLng],
        zoom: detectedCoords ? 15 : 12,
        zoomControl: true,
      });

      // Premium Dark Theme tiles (CartoDB Dark Matter) - standard format without `{r}`
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
      }).addTo(map);

      // Custom glowing pulse marker icon
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-emerald-500/30 rounded-full animate-ping"></div>
            <div class="relative w-5 h-5 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center shadow-lg">
              <div class="w-1.5 h-1.5 bg-slate-950 rounded-full"></div>
            </div>
          </div>
        `,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      // Add draggable marker
      const marker = L.marker([initialLat, initialLng], {
        icon: customIcon,
        draggable: true
      }).addTo(map);

      // Event listener: Drag marker
      marker.on('dragend', async () => {
        const position = marker.getLatLng();
        setDetectedCoords({ lat: position.lat, lng: position.lng });
        await reverseGeocodeRef.current(position.lat, position.lng);
      });

      // Event listener: Click map to place marker
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setDetectedCoords({ lat, lng });
        await reverseGeocodeRef.current(lat, lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Force recalculation of map container dimensions after rendering
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);

    } catch (err) {
      console.error("Failed to initialize Leaflet map:", err);
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn("Cleanup map removal error on unmount:", e);
        }
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Recalibrate Leaflet size when Step 3 becomes active
  useEffect(() => {
    if (mapRef.current && step === 3) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 200);
    }
  }, [step]);

  // Sync map center and marker position when detectedCoords state is updated externally (GPS / Address Lookup)
  useEffect(() => {
    if (mapRef.current && markerRef.current && detectedCoords) {
      const { lat, lng } = detectedCoords;
      const currentLatLng = markerRef.current.getLatLng();
      
      // Update marker and pan map if coordinates changed significantly
      if (Math.abs(currentLatLng.lat - lat) > 0.00001 || Math.abs(currentLatLng.lng - lng) > 0.00001) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 15);
      }
    }
  }, [detectedCoords]);

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

  // Reverse geocode to find address name from coordinates
  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      setGeocodingStatus('loading');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const { streetAddress, city: parsedCity, state: parsedState } = parseNominatimAddress(data.address);
          
          if (streetAddress) setAddress(streetAddress);
          if (parsedCity) setCity(parsedCity);
          if (parsedState) setState(parsedState);
          
          setSearchQuery(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setGeocodingStatus('success');
        }
      } else {
        setGeocodingStatus('failed');
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      setGeocodingStatus('failed');
    }
  };

  const reverseGeocodeRef = useRef(handleReverseGeocode);
  useEffect(() => {
    reverseGeocodeRef.current = handleReverseGeocode;
  });

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
    setSearchQuery(val);
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
        const query = encodeURIComponent(val);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&countrycodes=ng&limit=5`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data || []);
        }
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
    setGeocodingStatus('success');
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);

    if (suggestion.address) {
      const { streetAddress, city: parsedCity, state: parsedState } = parseNominatimAddress(suggestion.address);
      setAddress(streetAddress || suggestion.display_name.split(',')[0]);
      if (parsedCity) setCity(parsedCity);
      if (parsedState) setState(parsedState);
    }
  };

  // GPS coordinates fetch with reverse geocoding
  const handleDetectGPS = () => {
    if (navigator.geolocation) {
      setGeocodingStatus('loading');
      setError(null);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setDetectedCoords({ lat, lng });
          await handleReverseGeocode(lat, lng);
        },
        (error) => {
          console.error("GPS detection error:", error);
          setGeocodingStatus('failed');
          setError("Failed to acquire GPS location. Please ensure location permissions are enabled.");
        }
      );
    } else {
      setError("Browser geolocation not supported.");
    }
  };

  // Address search geocoding lookup
  const handleGeocodeAddress = async () => {
    if (!address.trim() || !city.trim()) {
      setError('Please fill in Street Address and City first to search location coordinates.');
      return;
    }
    
    try {
      setGeocodingStatus('loading');
      setError(null);
      
      const query = encodeURIComponent(`${address}, ${city}, ${state}, Nigeria`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=1`);
      
      if (!response.ok) throw new Error('Geocoding server error');
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setDetectedCoords({ lat, lng });
        setGeocodingStatus('success');
        setSearchQuery(data[0].display_name);
      } else {
        // Fallback to city/state level query
        const fallbackQuery = encodeURIComponent(`${city}, ${state}, Nigeria`);
        const fbResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${fallbackQuery}&addressdetails=1&limit=1`);
        const fbData = await fbResponse.json();
        
        if (fbData && fbData.length > 0) {
          const lat = parseFloat(fbData[0].lat);
          const lng = parseFloat(fbData[0].lon);
          setDetectedCoords({ lat, lng });
          setGeocodingStatus('success');
          setSearchQuery(fbData[0].display_name);
        } else {
          setGeocodingStatus('failed');
        }
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
      setGeocodingStatus('failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let latVal = 6.4532;
    let lngVal = 3.3959;

    if (detectedCoords) {
      latVal = detectedCoords.lat;
      lngVal = detectedCoords.lng;
    } else if (mapRef.current) {
      const center = mapRef.current.getCenter();
      latVal = center.lat;
      lngVal = center.lng;
    } else {
      // Run quick synchronous search in submit if no lookup was run manually
      try {
        const query = encodeURIComponent(`${address}, ${city}, ${state}, Nigeria`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            latVal = parseFloat(data[0].lat);
            lngVal = parseFloat(data[0].lon);
          }
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
    <div className="max-w-2xl mx-auto px-4 my-8 animate-fade-in">
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
          {[1, 2, 3].map((s) => (
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
                  {s === 1 ? "Profile" : s === 2 ? "Address" : "Map Pin"}
                </span>
              </div>
              {s < 3 && (
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

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Street Address *</label>
              <input
                type="text"
                placeholder="e.g. 15 Kingsway Road, Ikoyi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-brand-cream text-brand-dark-text placeholder:text-brand-muted-text/40 border border-brand-border focus:border-brand-terracotta rounded-xl px-4 py-3 focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* STEP 3: Map Pinpoint */}
          <div className={step === 3 ? "space-y-5 animate-fade-in" : "hidden"}>
            <div className="space-y-4 p-4 bg-brand-cream border border-brand-border rounded-2xl">
              
              {/* Autocomplete Input Search */}
              <div ref={autocompleteContainerRef} className="space-y-1.5 relative">
                <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Search & Auto-fill Location</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type address, street name, or clinic area in Nigeria..."
                    value={searchQuery}
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

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pt-2 border-t border-brand-border/40">
                <div>
                  <label className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block">Adjust Location Pin</label>
                  <span className="text-[10.5px] text-brand-muted-text/80 block mt-0.5">
                    Click the map or drag the pin to adjust your entrance; inputs will sync.
                  </span>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleGeocodeAddress}
                    className="px-3 py-1.5 bg-brand-sage hover:bg-brand-border/40 border border-brand-border text-brand-forest font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Locate Address
                  </button>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    className="px-3 py-1.5 bg-brand-sage hover:bg-brand-border/40 border border-brand-border text-brand-forest font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Use GPS
                  </button>
                </div>
              </div>

              {/* Map Container */}
              <div className="relative rounded-xl overflow-hidden border border-brand-border bg-brand-cream shadow-inner">
                <div ref={mapContainerRef} style={{ height: '288px', width: '100%' }} className="w-full z-10" />
                
                {/* Geocoding / loading spinner overlay */}
                {geocodingStatus === 'loading' && (
                  <div className="absolute inset-0 z-30 bg-brand-cream/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-brand-terracotta border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-brand-dark-text uppercase tracking-widest">Pinpointing Coordinates...</span>
                  </div>
                )}
              </div>

              {/* Mapped coords display badge */}
              <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-brand-sage/40 rounded-xl border border-brand-border">
                <span className="text-brand-muted-text font-semibold">Coordinates:</span>
                <span className="font-mono text-brand-dark-text">
                  {detectedCoords ? (
                    <span className="text-brand-forest font-bold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-brand-forest shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {detectedCoords.lat.toFixed(6)}° N, {detectedCoords.lng.toFixed(6)}° E
                    </span>
                  ) : (
                    <span className="text-brand-muted-text/60 italic">No coordinates set (Lagos fallbacks)</span>
                  )}
                </span>
              </div>

              {/* Custom Leaflet style overrides for warm bio-organic theme */}
              <style dangerouslySetInnerHTML={{__html: `
                .leaflet-bar {
                  border: 1px solid #DCD5CB !important;
                  box-shadow: none !important;
                  border-radius: 8px !important;
                  overflow: hidden;
                }
                .leaflet-bar a {
                  background-color: #F3EFE7 !important;
                  color: #1A3026 !important;
                  border-bottom: 1px solid #DCD5CB !important;
                  transition: all 0.2s;
                }
                .leaflet-bar a:hover {
                  background-color: #E8EFE9 !important;
                  color: #C86A51 !important;
                }
                .leaflet-container {
                  background: #FAF7F2 !important;
                  font-family: inherit;
                }
                .leaflet-control-attribution {
                  background: rgba(243, 239, 231, 0.85) !important;
                  color: #4A5F56 !important;
                  font-size: 9px !important;
                  border-top-left-radius: 8px;
                  border-left: 1px solid #DCD5CB;
                  border-top: 1px solid #DCD5CB;
                }
                .leaflet-control-attribution a {
                  color: #C86A51 !important;
                }
              `}} />
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
                  type="button"
                  onClick={handleNextStep2}
                  className="flex-1 py-3 px-4 bg-brand-forest hover:bg-brand-forest/90 text-brand-cream font-black rounded-xl text-xs transition-all cursor-pointer"
                >
                  Next Step
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(2)}
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
