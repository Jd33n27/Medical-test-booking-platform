import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { Lab, Test, HealthConcern } from "../types";
import { formatNaira } from "../utils/formatters";
import { ConcernIcon } from "./ConcernPage";

interface HomePageProps {
  onSelectTest: (test: Test) => void;
  onSelectConcern: (concernId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectTest,
  onSelectConcern,
}) => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [concerns, setConcerns] = useState<HealthConcern[]>([]);
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
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [selectedLabId, setSelectedLabId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [heroSearch, setHeroSearch] = useState<string>("");
  const [heroLocation, setHeroLocation] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "proximity" | "price_asc" | "price_desc"
  >("proximity");
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get user coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          console.log("Error getting geolocation in HomePage:", err);
        },
      );
    }
  }, []);

  // Distance calculator helper (Haversine formula in km)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371; // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Clean and parse search query for smart price searches
  const cleanQuery = searchQuery
    .trim()
    .replace(/₦/g, "")
    .replace(/,/g, "")
    .trim();
  const isNumericQuery = /^\d+(\.\d+)?$/.test(cleanQuery) && cleanQuery !== "";
  const parsedPrice = isNumericQuery ? parseFloat(cleanQuery) : null;

  // Sort labs dynamically based on proximity
  const sortedLabs = [...labs].sort((a, b) => {
    if (!userCoords) return a.name.localeCompare(b.name);
    const distA = calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      a.latitude,
      a.longitude,
    );
    const distB = calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      b.latitude,
      b.longitude,
    );
    return distA - distB;
  });

  // Apply frontend processing (smart price filter and sorting)
  let processedTests = [...tests];

  // 1. If smart price query is active, filter tests that are close to the target price (+/- 30%)
  if (parsedPrice !== null) {
    processedTests = processedTests.filter((test) => {
      const differencePercent =
        Math.abs(test.price_naira - parsedPrice) / parsedPrice;
      return differencePercent <= 0.3; // Within 30% threshold
    });
  }

  // 2. Sort processed tests dynamically
  processedTests.sort((a, b) => {
    // If smart price query is active, sort by closeness to the searched price first
    if (parsedPrice !== null) {
      const distA = Math.abs(a.price_naira - parsedPrice);
      const distB = Math.abs(b.price_naira - parsedPrice);
      if (distA !== distB) {
        return distA - distB;
      }
    }

    if (sortBy === "price_asc") {
      return a.price_naira - b.price_naira;
    }
    if (sortBy === "price_desc") {
      return b.price_naira - a.price_naira;
    }

    // Default proximity sorting
    if (userCoords) {
      const labA = labs.find((l) => l.id === a.lab_id);
      const labB = labs.find((l) => l.id === b.lab_id);
      if (labA && labB) {
        const distA = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          labA.latitude,
          labA.longitude,
        );
        const distB = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          labB.latitude,
          labB.longitude,
        );
        return distA - distB;
      }
    }

    return a.test_name.localeCompare(b.test_name);
  });

  // Filter sorted labs dynamically based on search queries
  const filteredSortedLabs = sortedLabs.filter((lab) => {
    if (!searchQuery || isNumericQuery) return true;
    const query = searchQuery.toLowerCase();

    const matchesLab =
      (lab.name || "").toLowerCase().includes(query) ||
      (lab.city || "").toLowerCase().includes(query) ||
      (lab.state || "").toLowerCase().includes(query) ||
      (lab.address || "").toLowerCase().includes(query);

    const hasMatchingTest = tests.some((t) => t.lab_id === lab.id);

    return matchesLab || hasMatchingTest;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [labsData, testsData, concernsData] = await Promise.all([
          api.getLabs(),
          api.getTests(),
          api.getHealthConcerns(),
        ]);
        setLabs(labsData);
        setTests(testsData);
        setConcerns(concernsData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load tests and laboratories. Please check if the backend is running.",
        );
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
        // If it's a numeric search query, don't pass search to backend
        const searchParam = isNumericQuery
          ? undefined
          : searchQuery || undefined;
        const filteredTests = await api.getTests(
          selectedLabId || undefined,
          searchParam,
        );
        setTests(filteredTests);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to filter tests.");
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchFiltered();
    }, 300); // 300ms debounce for search inputs

    return () => clearTimeout(delayDebounce);
  }, [selectedLabId, searchQuery, isNumericQuery, labs.length]);

  return (
    <div className="w-full flex flex-col">
      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-brand-sage px-6 sm:px-8 md:px-10 lg:px-12 pb-6 sm:pb-8 md:pb-10 lg:pb-12 pt-20 sm:pt-24 md:pt-28 relative overflow-hidden border-b border-[#EAE3D5] w-full">
        {/* Left Content Column */}
        <div className="md:col-span-6 space-y-6 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5]/60">
            <span className="w-2 h-2 rounded-full bg-[#D26E4F] animate-pulse"></span>
            Nigeria's Smartest Lab Booking Platform
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1F3A2B] leading-[1.1] tracking-tight">
            Book medical tests <br />
            <span className="text-[#D26E4F]">online in seconds.</span>
          </h1>

          <p className="text-[#5C6B61] text-xs sm:text-sm md:text-base max-w-lg leading-relaxed">
            Compare prices across top certified laboratories. Schedule clinic
            visits or home sample collection instantly with zero hassle.
          </p>

          {/* Form Filter Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchQuery(heroSearch || heroLocation);
            }}
            className="bg-[#FAF6F0] sm:bg-white border border-[#EAE3D5] rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row gap-2 max-w-lg"
          >
            <div className="relative grow">
              <input
                type="text"
                placeholder="Search for tests, labs..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="w-full bg-[#FAF6F0] border-none text-[#1F3A2B] rounded-xl px-4 py-3 text-xs focus:outline-none placeholder:text-[#8E9B92] font-semibold"
              />
            </div>
            <div className="relative grow">
              <input
                type="text"
                placeholder="Location (e.g. Lagos)"
                value={heroLocation}
                onChange={(e) => setHeroLocation(e.target.value)}
                className="w-full bg-[#FAF6F0] border-none text-[#1F3A2B] rounded-xl px-4 py-3 text-xs focus:outline-none placeholder:text-[#8E9B92] font-semibold"
              />
            </div>
            <button
              type="submit"
              className="bg-[#1F3A2B] hover:bg-[#15271D] text-white font-extrabold text-xs px-6 py-3 rounded-xl cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              Find Tests
            </button>
          </form>

          {/* Checkmarks Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-[#1F3A2B]/80 pt-2">
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-[#1F3A2B]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Verified Labs
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-[#1F3A2B]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Best Prices
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-[#1F3A2B]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Fast Results
            </span>
          </div>
        </div>

        {/* Right Photo Column */}
        <div className="md:col-span-6 relative flex justify-center items-center py-2">
          <div className="relative w-full max-w-xl mx-auto">
            <img
              src="/hero_img.png"
              alt="Medical team diagnostics mockup"
              className="object-cover w-full max-w-full rounded-2xl"
            />
          </div>
        </div>
      </section>

      {/* Boxed Content Area */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-8 sm:py-10 space-y-10">
        {/* Browse by Health Concern */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold text-brand-light-text tracking-tight">
              Browse by Health Concern
            </h2>
            <span className="text-sm sm:text-base text-brand-terracotta font-bold">
              Filter tests by conditions
            </span>
          </div>

          {loading && concerns.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-brand-border-dark/15 border border-transparent rounded-2xl p-4 h-16"
                ></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {concerns.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectConcern(c.id)}
                  className="group bg-brand-forest hover:bg-brand-border-dark border border-transparent rounded-2xl p-2.5 sm:p-4 flex items-center gap-3.5 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-sage/10 text-brand-sage flex items-center justify-center group-hover:bg-brand-sage/25 transition-colors">
                    <ConcernIcon name={c.name} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-brand-light-text transition-colors">
                      {c.name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Main Filter and Test Catalog */}
        <div
          id="tests-catalog-section"
          className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 border-t border-[#EAE3D5] pt-10"
        >
          {/* Filters Panel */}
          <aside className="lg:col-span-1 lg:sticky lg:top-24 h-fit space-y-6">
            <div className="p-4 sm:p-6 rounded-2xl bento-panel-dark space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-bold text-brand-light-text flex items-center gap-2">
                {/* Filter Icon */}
                <svg
                  className="w-5 h-5 text-brand-terracotta"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                Filter Catalog
              </h3>

              {/* Search Box */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                  Search Tests & Labs
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search test name or price (e.g. 5000)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-brand-border-dark/30 text-brand-light-text border border-brand-border-dark rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-brand-terracotta transition-colors text-xs sm:text-sm"
                  />
                  <svg
                    className="w-4.5 h-4.5 absolute left-3 top-3 text-brand-muted-text"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                {isNumericQuery && parsedPrice !== null && (
                  <div className="text-[10px] text-brand-terracotta font-medium mt-1">
                    Filtering tests priced around ₦
                    {parsedPrice.toLocaleString()} (within 30%)
                  </div>
                )}
              </div>

              {/* Sorting Toggles */}
              <div className="space-y-2 relative">
                <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                  Sort Order
                </label>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="w-full flex items-center justify-between bg-brand-border-dark/20 text-brand-light-text border border-brand-border-dark rounded-xl px-4 py-2.5 text-xs sm:text-sm text-left hover:bg-brand-border-dark/35 transition-colors cursor-pointer"
                >
                  <span>
                    {sortBy === "proximity" && "Nearest Laboratories"}
                    {sortBy === "price_asc" && "Price: Low to High"}
                    {sortBy === "price_desc" && "Price: High to Low"}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showSortDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showSortDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-brand-sage border border-brand-border-dark rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-brand-border-dark/40">
                    <button
                      onClick={() => {
                        setSortBy("proximity");
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-brand-border-dark/30 transition-colors block cursor-pointer ${sortBy === "proximity" ? "text-brand-forest font-bold" : "text-brand-dark-text/90"}`}
                    >
                      Nearest Laboratories
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("price_asc");
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-brand-border-dark/30 transition-colors block cursor-pointer ${sortBy === "price_asc" ? "text-brand-forest font-bold" : "text-brand-dark-text/90"}`}
                    >
                      Price: Low to High
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("price_desc");
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-brand-border-dark/30 transition-colors block cursor-pointer ${sortBy === "price_desc" ? "text-brand-forest font-bold" : "text-brand-dark-text/90"}`}
                    >
                      Price: High to Low
                    </button>
                  </div>
                )}
              </div>

              {/* Labs Select List */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-semibold text-brand-muted-text uppercase tracking-wider block">
                  Laboratory
                </label>
                <div className="flex flex-row overflow-x-auto gap-2 pb-2 lg:flex-col lg:space-y-2 lg:pb-0 scrollbar-none w-full min-w-0">
                  <button
                    onClick={() => setSelectedLabId("")}
                    className={`shrink-0 min-w-max lg:min-w-0 lg:w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 whitespace-nowrap lg:whitespace-normal ${
                      selectedLabId === ""
                        ? "bg-brand-terracotta/20 border-brand-terracotta text-brand-terracotta font-semibold"
                        : "bg-brand-border-dark/25 border-brand-border-dark/60 text-brand-light-text/80 hover:bg-brand-border-dark/40"
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
                          ? "bg-brand-terracotta/20 border-brand-terracotta text-brand-terracotta font-semibold"
                          : "bg-brand-border-dark/25 border-brand-border-dark/60 text-brand-light-text/80 hover:bg-brand-border-dark/40"
                      }`}
                    >
                      <div className="font-semibold text-left">{lab.name}</div>
                      <div className="text-[10px] text-brand-muted-text mt-0.5 text-left">
                        {lab.address}, {lab.city}
                      </div>
                      {userCoords && (
                        <div className="text-[10px] text-brand-terracotta font-semibold mt-0.5 text-left">
                          {calculateDistance(
                            userCoords.latitude,
                            userCoords.longitude,
                            lab.latitude,
                            lab.longitude,
                          ).toFixed(1)}{" "}
                          km away
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
                <svg
                  className="w-5 h-5 shrink-0 text-rose-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-brand-border border-t-brand-terracotta rounded-full animate-spin"></div>
                <p className="text-brand-muted-text text-sm">
                  Searching test inventory...
                </p>
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-20 bento-panel-light rounded-2xl p-6">
                <svg
                  className="w-16 h-16 text-brand-muted-text mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-lg font-bold text-brand-dark-text">
                  No tests found
                </h3>
                <p className="text-brand-muted-text text-sm mt-1 max-w-sm mx-auto">
                  No diagnostic test matches your current filter or keyword. Try
                  resetting your search or laboratory filter.
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
                        <h4
                          className="text-sm font-extrabold text-brand-dark-text group-hover:text-brand-terracotta transition-colors line-clamp-1"
                          title={test.test_name}
                        >
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
                            <span className="font-extrabold text-brand-dark-text block truncate">
                              {test.lab_name}
                            </span>
                            {(() => {
                              const lab = labs.find(
                                (l) => l.id === test.lab_id,
                              );
                              if (!lab) return null;
                              return (
                                <span className="text-[10px] text-brand-muted-text/80 block truncate">
                                  {lab.address}, {lab.city}
                                </span>
                              );
                            })()}
                          </div>
                          {(() => {
                            const lab = labs.find((l) => l.id === test.lab_id);
                            if (!lab || !userCoords) return null;
                            const dist = calculateDistance(
                              userCoords.latitude,
                              userCoords.longitude,
                              lab.latitude,
                              lab.longitude,
                            );
                            return (
                              <span className="text-[10px] text-brand-terracotta font-bold shrink-0">
                                {dist.toFixed(1)} km
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-[10px] flex items-center justify-between pt-1 text-brand-muted-text">
                          <span>Turnaround:</span>
                          <strong className="text-brand-dark-text">
                            {test.turnaround_hours} hours
                          </strong>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-brand-border/60 flex gap-2">
                        <button
                          onClick={() => onSelectTest(test)}
                          className="flex-grow flex items-center justify-center gap-1.5 bg-brand-terracotta hover:bg-brand-terracotta-hover text-brand-light-text font-bold py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer text-xs"
                        >
                          Book Appointment
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            (window as any).navigateToChat?.(test.lab_id)
                          }
                          title="Chat with Lab"
                          className="p-2 bg-brand-sage/40 hover:bg-brand-sage text-brand-forest border border-brand-border rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
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

        {/* Close Boxed Content Area */}
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 p-3 bg-brand-terracotta hover:bg-brand-terracotta-hover text-brand-light-text rounded-full shadow-2xl transition-all duration-300 transform scale-100 hover:scale-110 cursor-pointer flex items-center justify-center border border-white/10"
          title="Back to Top"
        >
          <svg
            className="w-5.5 h-5.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
