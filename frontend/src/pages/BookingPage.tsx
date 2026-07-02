import React, { useEffect, useState, useRef } from "react";
import { api } from "../api/client";
import { Test, TimeSlot, BookingRequest, Review, Lab } from "../types";
import { formatNaira } from "../utils/formatters";

interface BookingPageProps {
  test: Test;
  onReviewBooking: (
    bookingData: BookingRequest,
    selectedSlot: TimeSlot,
  ) => void;
  onBack: () => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({
  test: initialTest,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedTest, setSelectedTest] = useState<Test>(initialTest);
  const [comparativeTests, setComparativeTests] = useState<Test[]>([]);
  const [labSearchQuery, setLabSearchQuery] = useState<string>("");

  // Slots & schedule state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Visit type state
  const [visitType, setVisitType] = useState<"clinic" | "home">("clinic");
  const [collectionAddress, setCollectionAddress] = useState<string>("");
  const [labs, setLabs] = useState<Lab[]>([]);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const data = await api.getLabs();
        setLabs(data);
      } catch (err) {
        console.error("Failed to load labs", err);
      }
    };
    fetchLabs();
  }, []);

  const selectedLab = labs.find((l) => l.id === selectedTest.lab_id);
  const acceptsHomeCollection = selectedLab ? selectedLab.accepts_home_collection : true;

  useEffect(() => {
    if (!acceptsHomeCollection && visitType === "home") {
      setVisitType("clinic");
    }
  }, [acceptsHomeCollection, visitType]);

  // Autocomplete suggestions states for home collection address
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const searchTimeoutRef = useRef<any>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search autocomplete typing search suggestion queries
  const handleSearchInputChange = (val: string) => {
    setCollectionAddress(val);
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

  const handleSelectSuggestion = (suggestion: any) => {
    setCollectionAddress(suggestion.display_name);
    setShowSuggestions(false);
  };

  // Patient details state
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] = useState<string>("Male");

  // Promo code states (not used on booking page, handled in confirmation page)

  // General loading & errors
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Reviews state variables
  const [showReviewsLabId, setShowReviewsLabId] = useState<string | null>(null);
  const [showReviewsLabName, setShowReviewsLabName] = useState<string>("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Review submission state variables
  const [newRating, setNewRating] = useState<number>(5);
  const [newReviewerName, setNewReviewerName] = useState<string>("");
  const [newComment, setNewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Pre-fill user data on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem("medbook_user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const nameParts = user.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        setEmail(user.email || "");
        // Fetch or default phone number if available
        setPhone(user.phone || "");
      } catch (e) {
        console.error("Failed to prefill user details", e);
      }
    }
  }, []);

  // Fetch comparative tests (other labs offering the same test name)
  useEffect(() => {
    const fetchComparativeTests = async () => {
      try {
        setLoading(true);
        const allTests = await api.getTests();
        const matches = allTests.filter(
          (t) =>
            t.test_name.toLowerCase() === initialTest.test_name.toLowerCase(),
        );
        setComparativeTests(matches);

        // Ensure the initial test is part of selections
        const currentMatch = matches.find((m) => m.id === initialTest.id);
        if (currentMatch) {
          setSelectedTest(currentMatch);
        }
      } catch (err) {
        console.error("Failed to load comparative tests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComparativeTests();
  }, [initialTest.id, initialTest.test_name]);

  // Fetch slots whenever the selected test (which contains the lab ID) changes
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setSlots([]);
        setSelectedSlot(null);
        const data = await api.getTestSlots(selectedTest.id);
        setSlots(data.slots);

        // Auto-select the first date with at least one available slot
        if (data.slots.length > 0) {
          const uniqueDates = Array.from(
            new Set(data.slots.map((s) => s.date)),
          ).sort();

          const dateWithAvailableSlots = uniqueDates.find((date) => {
            const dateSlots = data.slots.filter((s) => s.date === date);
            return dateSlots.some((s) => s.available > 0);
          });

          setSelectedDate(dateWithAvailableSlots || uniqueDates[0]);
        }
      } catch (err) {
        console.error("Failed to load slots", err);
      }
    };
    fetchSlots();
  }, [selectedTest.id]);

  // Group slots by date
  const uniqueDates = Array.from(new Set(slots.map((s) => s.date))).sort();
  const slotsForSelectedDate = slots.filter((s) => s.date === selectedDate);

  // Promo operations are handled in the confirmation page.

  // Pricing calculations
  const testSubtotal = selectedTest.price_naira;
  const homeFee = visitType === "home" ? 5000 : 0;

  const discountAmount = 0;
  const totalAmount = Math.max(0, testSubtotal + homeFee - discountAmount);

  // Checkout submission
  const handlePay = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const savedUser = sessionStorage.getItem("medbook_user");
      let userId: string | null = null;
      if (savedUser) {
        try {
          userId = JSON.parse(savedUser).id;
        } catch {
          // Ignore JSON parse errors
        }
      }

      const bookingData: BookingRequest = {
        test_id: selectedTest.id,
        time_slot_id: selectedSlot?.id || "",
        patient_name: `${firstName} ${lastName}`.trim(),
        patient_email: email,
        patient_phone: phone,
        home_collection: visitType === "home",
        collection_address: visitType === "home" ? collectionAddress : null,
        user_id: userId,
        promo_code: null,
      };

      const response = await api.createBooking(bookingData);

      if (response.flutterwave_link) {
        // Redirect to checkout/mock checkout page
        window.location.href = response.flutterwave_link;
      } else {
        throw new Error("Payment URL not received.");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.error ||
          err.message ||
          "An error occurred while initiating payment.",
      );
      setSubmitting(false);
    }
  };

  // Verification helper for button enabling
  const isStepValid = () => {
    if (currentStep === 1) return true;
    if (currentStep === 2) return !!selectedTest;
    if (currentStep === 3)
      return (
        visitType === "clinic" ||
        (visitType === "home" && collectionAddress.trim() !== "")
      );
    if (currentStep === 4) return !!selectedSlot;
    if (currentStep === 5)
      return (
        firstName.trim() !== "" &&
        lastName.trim() !== "" &&
        email.trim() !== "" &&
        phone.trim() !== ""
      );
    return true;
  };

  // What it measures tags
  const getMeasuresTags = (name: string) => {
    const list: Record<string, string[]> = {
      "full blood count": [
        "Red Blood Cells",
        "White Blood Cells",
        "Platelets",
        "Hemoglobin",
        "Hematocrit",
        "MCV",
        "MCH",
      ],
      "lipid profile": [
        "Total Cholesterol",
        "HDL (Good) Cholesterol",
        "LDL (Bad) Cholesterol",
        "Triglycerides",
      ],
      typhoid: [
        "Salmonella typhi O antigen",
        "Salmonella typhi H antigen",
        "Antibody detection",
      ],
      sugar: ["Fasting Blood Glucose", "Hba1c", "Glucose Tolerance"],
      malaria: [
        "Plasmodium falciparum",
        "Parasite density",
        "Blood smear screen",
      ],
    };
    const key = Object.keys(list).find((k) => name.toLowerCase().includes(k));
    return key
      ? list[key]
      : ["Diagnostic blood markers", "Quantitative screen"];
  };

  // Navigation handlers
  const handleNext = () => {
    if (isStepValid()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  // Reviews handlers
  const handleViewReviews = async (labId: string, labName: string) => {
    setShowReviewsLabId(labId);
    setShowReviewsLabName(labName);
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await api.getLabReviews(labId);
      setReviews(data);
    } catch (err: any) {
      console.error("Failed to fetch lab reviews", err);
      setReviewsError(err.message || "Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReviewsLabId) return;
    setSubmittingReview(true);
    try {
      const newReview = await api.submitLabReview(
        showReviewsLabId,
        newRating,
        newReviewerName,
        newComment,
      );
      // Append the new review to the list
      setReviews((prev) => [newReview, ...prev]);
      // Clear form
      setNewComment("");
      setNewReviewerName("");
      setNewRating(5);

      // Update the rating/reviews count in comparativeTests list so it refreshes immediately in the UI!
      setComparativeTests((prev) =>
        prev.map((t) => {
          if (t.lab_id === showReviewsLabId) {
            const currentCount = t.num_ratings || 0;
            const currentAvg = t.average_rating || 0;
            const newCount = currentCount + 1;
            const newAvg = (currentAvg * currentCount + newRating) / newCount;
            return {
              ...t,
              num_ratings: newCount,
              average_rating: newAvg,
            };
          }
          return t;
        }),
      );
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Test" },
    { num: 2, label: "Lab" },
    { num: 3, label: "Type" },
    { num: 4, label: "Schedule" },
    { num: 5, label: "Details" },
    { num: 6, label: "Review" },
  ];

  return (
    <div className="max-w-180 mx-auto space-y-6">
      {/* 1. Header controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="flex items-center gap-2 text-brand-muted-text hover:text-brand-forest transition-colors group text-sm font-semibold cursor-pointer"
        >
          <svg
            className="w-5 h-5 transition-transform group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {currentStep === 1 ? "Cancel Booking" : "Back"}
        </button>

        {currentStep < 7 && (
          <button
            onClick={onBack}
            className="text-xs font-bold text-brand-muted-text hover:text-rose-600 transition-colors cursor-pointer"
          >
            Cancel Booking
          </button>
        )}
      </div>

      {/* Step Progress Bar */}
      <div className="flex max-w-180 w-full items-center justify-between border-b border-[#FAF6F0] pb-6">
        {stepsList.map((step) => {
          const isCompleted = currentStep > step.num;
          const isActive = currentStep === step.num;
          return (
            <div key={step.num} className="flex items-end gap-1 sm:gap-2 grow last:grow-0">
              <div className="flex flex-col items-center gap-1.5 py-2 text-center min-w-[32px] sm:min-w-[48px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                    isCompleted
                      ? "bg-brand-forest border-brand-forest text-white"
                      : isActive
                        ? "bg-[#D26E4F] border-[#D26E4F] text-white shadow-sm shadow-[#D26E4F]/20"
                        : "bg-brand-panel-light border-brand-sage border-1.5 text-brand-forest/40"
                  }`}
                >
                  {isCompleted ? (
                    <img
                      src={"/icons/BOOKING_COMPLETED_STEP_CHECKMARK.svg"}
                      alt="check"
                    />
                  ) : (
                    step.num
                  )}
                </div>
                <div
                  className={`text-[10px] sm:text-xs font-bold ${
                    isCompleted
                      ? "text-brand-forest"
                      : isActive
                        ? "text-[#D26E4F]"
                        : "text-brand-forest/40"
                  }`}
                >
                  {step.label}
                </div>
              </div>

              {step.num < 6 && (
                <div className="grow h-0.5 sm:h-1 bg-brand-sage mx-0.5 sm:mx-1 mb-7 min-w-[6px] max-w-[68px]"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Wizard Container Card */}
      <div className="bg-white border border-[#EAE3D5] rounded-3xl p-6 md:p-10 shadow-sm space-y-8">
        {/* Wizard step render switch */}
        <div className="min-h-75">
          {/* STEP 1: Test Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-brand-forest">
                  {selectedTest.test_name}
                </h3>
              </div>

              <p className="text-brand-muted-text text-sm leading-relaxed">
                {selectedTest.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-xs">
                <div className="space-y-1 bg-brand-panel-light rounded-xl p-4">
                  <div className="flex size-full justify-start space-x-2 items-start">
                    <img src={"/icons/brown_clock.svg"} alt="clock" />
                    <div className="flex flex-col">
                      <span className="text-sm text-brand-dark-text font-bold block">
                        Sample Type
                      </span>
                      <strong className="text-brand-muted-text text-sm font-light block">
                        {selectedTest.sample_type}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 bg-brand-panel-light rounded-xl p-4">
                  <div className="flex size-full justify-start space-x-2 items-start">
                    <img src={"/icons/brown_analytics_line.svg"} alt="clock" />
                    <div className="flex flex-col">
                      <span className="text-sm text-brand-dark-text font-bold block">
                        Turnaround Time
                      </span>
                      <strong className="text-brand-muted-text text-sm font-light block">
                        {selectedTest.turnaround_hours} hours
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 bg-brand-panel-light rounded-xl p-4 sm:col-span-2">
                  <div className="flex size-full justify-start space-x-2 items-start">
                    <img src={"/icons/brown_info.svg"} alt="clock" />
                    <div className="flex flex-col">
                      <span className="text-sm text-brand-dark-text font-bold block">
                        Preparation
                      </span>
                      <strong className="text-brand-muted-text text-sm font-light block">
                        {selectedTest.test_name
                          .toLowerCase()
                          .includes("lipid") ||
                        selectedTest.test_name.toLowerCase().includes("sugar")
                          ? "Requires fasting for 8-12 hours prior to sample collection. Water is permitted."
                          : "No special preparation needed. Remain hydrated."}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#FAF6F0]">
                <span className="text-sm text-brand-dark-text font-bold block">
                  What it measures (
                  {getMeasuresTags(selectedTest.test_name).length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {getMeasuresTags(selectedTest.test_name).map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-2 bg-transparent border border-brand-sage rounded-lg text-xs text-brand-forest/80 font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Laboratory */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-brand-forest">
                  Choose a Laboratory
                </h3>
                <p className="text-[16px] text-brand-muted-text">
                  Select a certified lab for your test.
                </p>
              </div>

              {/* Lab Filter Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter laboratories by name..."
                  value={labSearchQuery}
                  onChange={(e) => setLabSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs sm:text-sm"
                />
                <svg className="w-4.5 h-4.5 absolute left-3 top-3.5 text-brand-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <div className="w-8 h-8 border-3 border-[#EAE3D5] border-t-[#D26E4F] rounded-full animate-spin"></div>
                  <span className="text-xs text-brand-muted-text">
                    Loading labs...
                  </span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] sm:max-h-80 overflow-y-auto pr-1.5 scrollbar-none">
                  {comparativeTests
                    .filter((t) => (t.lab_name || "").toLowerCase().includes(labSearchQuery.toLowerCase()))
                    .map((t) => {
                      const isSelected = selectedTest.id === t.id;
                      // Generate mock reviews/distance
                      const mockDistance = t.lab_name?.includes("Genesis")
                        ? "2.1 km"
                        : t.lab_name?.includes("Pathology")
                          ? "5.4 km"
                          : "6.8 km";

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTest(t)}
                          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                            isSelected
                              ? "bg-brand-terracotta/5 border-brand-terracotta"
                              : "bg-white border-[#EAE3D5] hover:border-brand-forest/40"
                          }`}
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-brand-forest truncate">
                                {t.lab_name}
                              </span>
                            </div>
                            <div className="flex gap-2.5 items-center">
                              <span
                                className="text-xs text-brand-muted-text flex items-center gap-1 leading-none hover:text-brand-forest hover:underline cursor-pointer select-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReviews(
                                    t.lab_id,
                                    t.lab_name || "Laboratory",
                                  );
                                }}
                              >
                                <img
                                  src="/icons/Gold_star.svg"
                                  alt="star"
                                  className="w-3.5 h-3.5"
                                />
                                <strong className="font-extrabold text-brand-muted-text">
                                  {t.average_rating && t.average_rating > 0
                                    ? t.average_rating.toFixed(1)
                                    : "N/A"}
                                </strong>
                                <span>({t.num_ratings})</span>
                              </span>
                              <span className="text-sm text-brand-muted-text flex items-center gap-1 leading-none">
                                <img
                                  src="/icons/little_gray_location.svg"
                                  alt="distance"
                                />
                                {mockDistance}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-black text-brand-forest block">
                              {formatNaira(t.price_naira)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Visit Type */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-brand-forest">
                  How would you like to be tested?
                </h3>
                <p className="text-sm text-brand-muted-text">
                  Choose between visiting the lab or having a professional come
                  to you.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clinic Visit */}
                <div
                  onClick={() => setVisitType("clinic")}
                  className={`p-5 flex flex-col items-center justify-between text-center rounded-2xl border transition-all duration-200 cursor-pointer space-y-3 ${
                    visitType === "clinic"
                      ? "bg-brand-terracotta/5 border-brand-terracotta"
                      : "bg-white border-[#EAE3D5] hover:border-brand-forest/40"
                  }`}
                >
                  <span
                    className={`rounded-full p-4 ${visitType === "clinic" ? "bg-brand-terracotta" : "bg-brand-panel-light"}`}
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={visitType === "clinic" ? "text-white" : "text-[#1A3026]"}>
                      <path d="M13.3301 16H18.6601" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.3301 10.67H18.6601" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.6601 28V23.998C18.6601 22.5245 17.4669 21.33 15.9951 21.33C14.5232 21.33 13.3301 22.5245 13.3301 23.998V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.00392 13.3307H5.33692C3.86398 13.3307 2.66992 14.5248 2.66992 15.9978V25.3328C2.66992 26.8059 3.86398 28 5.33692 28H26.6729C28.1459 28 29.3399 26.8059 29.3399 25.3328V11.9971C29.3399 10.5241 28.1459 9.32999 26.6729 9.32999H24.0059" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 28V6.66667C8 5.19391 9.19391 4 10.6667 4H21.3333C22.8061 4 24 5.19391 24 6.66667V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="font-extrabold text-xl text-brand-forest">
                    Lab Visit
                  </span>
                  <p className="text-sm text-brand-muted-text leading-relaxed">
                    Visit the laboratory at your scheduled time.
                  </p>
                  <span className="text-sm text-[#2E7D32] font-bold">
                    No extra cost
                  </span>
                </div>

                {/* Home Collection */}
                <div
                  onClick={() => {
                    if (acceptsHomeCollection) {
                      setVisitType("home");
                    }
                  }}
                  className={`p-5 flex flex-col items-center justify-between text-center rounded-2xl border transition-all duration-200 space-y-3 ${
                    !acceptsHomeCollection
                      ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                      : visitType === "home"
                        ? "bg-brand-terracotta/5 border-brand-terracotta cursor-pointer"
                        : "bg-white border-[#EAE3D5] hover:border-brand-forest/40 cursor-pointer"
                  }`}
                >
                  <span
                    className={`rounded-full p-4 ${
                      !acceptsHomeCollection
                        ? "bg-gray-200 text-gray-400"
                        : visitType === "home"
                          ? "bg-brand-terracotta"
                          : "bg-brand-panel-light"
                    }`}
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={!acceptsHomeCollection ? "text-gray-400" : visitType === "home" ? "text-white" : "text-[#1A3026]"}>
                      <path d="M20 28V17.3333C20 16.597 19.403 16 18.6667 16H13.3333C12.597 16 12 16.597 12 17.3333V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 12.9617C3.99981 12.1566 4.34566 11.3924 4.94533 10.8727L14.2787 2.67001C15.2725 1.80877 16.7275 1.80877 17.7213 2.67001L27.0547 10.8727C27.6543 11.3924 28.0002 12.1566 28 12.9617V25.2658C28 26.7759 26.8061 28 25.3333 28H6.66667C5.19391 28 4 26.7759 4 25.2658V12.9617Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="font-extrabold text-xl text-brand-forest">
                    Home Collection
                  </span>
                  <p className="text-sm text-brand-muted-text leading-relaxed">
                    {!acceptsHomeCollection
                      ? "This laboratory does not offer home sample collections."
                      : "A certified professional comes to your location."}
                  </p>
                  <span className={`text-sm font-bold ${!acceptsHomeCollection ? "text-rose-600" : "text-brand-forest"}`}>
                    {!acceptsHomeCollection ? "Not Available" : "+ ₦5,000 fee"}
                  </span>
                </div>
              </div>

              {visitType === "home" && (
                <div className="space-y-2 pt-4 border-t border-[#FAF6F0] animate-fadeIn">
                  <div
                    ref={autocompleteContainerRef}
                    className="space-y-1.5 relative"
                  >
                    <label
                      htmlFor="address"
                      className="text-xs font-bold text-brand-muted-text uppercase tracking-wider block"
                    >
                      Collection Address
                    </label>
                    <div className="relative">
                      <input
                        id="address"
                        type="text"
                        required
                        placeholder="Enter your full home or office address details..."
                        value={collectionAddress}
                        onChange={(e) =>
                          handleSearchInputChange(e.target.value)
                        }
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D26E4F] transition-all text-sm pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        {autocompleteLoading ? (
                          <div className="w-4 h-4 border-2 border-[#D26E4F] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg
                            className="w-4 h-4 text-brand-muted-text"
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
                        )}
                      </div>
                    </div>

                    {/* Suggestions Dropdown */}
                    {suggestions.length > 0 && showSuggestions && (
                      <div className="absolute z-50 w-full mt-1.5 rounded-xl bg-white border border-[#EAE3D5] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                        {suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-4 py-3 hover:bg-brand-sage/20 text-xs text-brand-dark-text border-b border-[#EAE3D5]/40 last:border-b-0 transition-colors block leading-relaxed cursor-pointer"
                          >
                            {s.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Select Schedule */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-brand-forest">
                  Select Date & Time
                </h3>
                <p className="text-xs text-brand-muted-text">
                  When should we schedule your lab visit?
                </p>
              </div>

              {uniqueDates.length === 0 ? (
                <div className="p-8 text-center border border-[#EAE3D5] rounded-2xl">
                  <p className="text-brand-muted-text text-sm">
                    No slots are currently available for this lab. Please pick
                    another lab.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 flex flex-col">
                  <span className="flex gap-2">
                    <img src="/icons/dark_green_calendar.svg" alt="" />
                    <p className="text-xl text-brand-forest font-medium">
                      Date
                    </p>
                  </span>
                  {/* Date Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {uniqueDates.map((date) => {
                      const parsed = new Date(date);
                      const isSelected = selectedDate === date;
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className={`shrink-0 px-4 py-3 rounded-2xl border text-center transition-all duration-200 ${
                            isSelected
                              ? "bg-brand-forest text-white border-brand-forest font-bold"
                              : "bg-white border-[#EAE3D5] text-brand-dark-text hover:bg-brand-sage/20"
                          }`}
                        >
                          <div className="text-[9px] uppercase font-bold tracking-wider opacity-85">
                            {parsed.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </div>
                          <div className="text-base font-black mt-0.5">
                            {parsed.toLocaleDateString("en-US", {
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-[9px] opacity-85">
                            {parsed.toLocaleDateString("en-US", {
                              month: "short",
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time Grid */}
                  <div className="space-y-2 flex flex-col">
                    <span className="flex gap-2">
                      <img src="/icons/dark_green_clock.svg" alt="" />
                      <p className="text-xl text-brand-forest font-medium">
                        Time
                      </p>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {slotsForSelectedDate.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        const isExhausted = slot.available === 0;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={isExhausted}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 text-center ${
                              isSelected
                                ? "bg-[#D26E4F] border-[#D26E4F] text-white"
                                : isExhausted
                                  ? "bg-[#F2F1ED] border-[#E2DCD0] text-[#A09A8F] cursor-not-allowed opacity-60"
                                  : "bg-white border-[#EAE3D5] text-brand-dark-text hover:border-brand-forest cursor-pointer"
                            }`}
                          >
                            <div>{slot.time}</div>
                            <div
                              className={`text-[9px] font-normal mt-0.5 ${
                                isSelected
                                  ? "text-white/80"
                                  : isExhausted
                                    ? "text-[#A09A8F]"
                                    : "text-brand-muted-text"
                              }`}
                            >
                              {isExhausted
                                ? "0 available"
                                : `${slot.available} left`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Patient Details */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-brand-forest">
                  Patient Details
                </h3>
                <p className="text-xs text-brand-muted-text">
                  Who is this diagnostic appointment for?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="fname"
                    className="text-xs font-bold text-brand-muted-text uppercase tracking-wider"
                  >
                    First Name
                  </label>
                  <input
                    id="fname"
                    type="text"
                    required
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="lname"
                    className="text-xs font-bold text-brand-muted-text uppercase tracking-wider"
                  >
                    Last Name
                  </label>
                  <input
                    id="lname"
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-bold text-brand-muted-text uppercase tracking-wider"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="text-xs font-bold text-brand-muted-text uppercase tracking-wider"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    placeholder="+234 800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="dob"
                    className="text-xs font-bold text-brand-muted-text uppercase tracking-wider"
                  >
                    Date of Birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="gender"
                    className="text-xs font-bold text-brand-muted-text uppercase tracking-wider"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-[#FAF6F0] text-brand-dark-text border border-[#EAE3D5] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#D26E4F] transition-colors text-xs cursor-pointer"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Pay */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-brand-forest">
                  Review & Pay
                </h3>
                <p className="text-xs text-brand-muted-text">
                  Please confirm your booking details before making payment.
                </p>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                  {error}
                </div>
              )}

              {/* Review Card */}
              <div className="bg-[#FAF6F0] border border-[#EAE3D5] p-6 rounded-2xl text-left text-sm space-y-4">
                <div className="flex flex-wrap gap-2 justify-between items-start border-b border-[#EAE3D5]/40 pb-3">
                  <div>
                    <h4 className="font-extrabold text-base text-brand-forest">
                      {selectedTest.test_name}
                    </h4>
                    <span className="text-xs text-brand-muted-text block mt-0.5">
                      {selectedTest.lab_name}
                    </span>
                  </div>
                  <span className="text-base font-black text-brand-forest">
                    {formatNaira(testSubtotal)}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-brand-muted-text border-b border-[#EAE3D5]/40 pb-3">
                  <div className="flex">
                    <span>{visitType} Visit</span>
                  </div>
                  {visitType === "home" && (
                    <div className="flex justify-between">
                      <span>Home collection fee</span>
                      <strong className="text-brand-dark-text">
                        {formatNaira(5000)}
                      </strong>
                    </div>
                  )}
                  <div className="flex">
                    <span>
                      Date: {selectedDate} at {selectedSlot?.time}
                    </span>
                  </div>
                </div>



                <div className="flex justify-between items-center pt-2 text-base font-extrabold text-brand-dark-text">
                  <span>Total</span>
                  <span className="text-lg font-black text-[#D26E4F]">
                    {formatNaira(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Secure payment message box */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-left flex gap-3 text-xs text-blue-700">
                <img src="/icons/little_blue_shield.svg" alt="" />
                <div className="leading-relaxed">
                  Payments are secure and encrypted. You can cancel and get a
                  full refund up to 24 hours before your appointment.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Wizard Footer Actions */}
        <div className="flex flex-wrap items-center justify-between border-t border-[#FAF6F0] pt-6 gap-3">
          <span className="py-3 px-6 text-xs font-bold text-brand-forest/60 hover:text-brand-forest transition-colors disabled:opacity-50 cursor-pointer">
            Step {stepsList[currentStep - 1].num} of {stepsList.length}
          </span>

          {currentStep < 6 ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className={`py-3 px-8 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                isStepValid()
                  ? "bg-[#D26E4F] hover:bg-[#B85C3F] text-white shadow-md"
                  : "bg-[#EAE3D5] text-brand-muted-text cursor-not-allowed"
              }`}
            >
              Continue
              <svg
                className="w-4 h-4"
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
          ) : (
            <button
              onClick={handlePay}
              disabled={submitting}
              className="py-3 px-8 bg-[#D26E4F] hover:bg-[#B85C3F] text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <img
                    src="/icons/white_card.svg"
                    alt="pay card"
                    className="w-4 h-4"
                  />
                  Pay Now
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reviews Modal */}
      {showReviewsLabId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-forest/35 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#EAE3D5] rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[#FAF6F0]">
              <div>
                <h4 className="text-lg font-black text-brand-forest">
                  Reviews & Ratings
                </h4>
                <p className="text-xs text-brand-muted-text font-semibold">
                  For {showReviewsLabName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewsLabId(null);
                  setReviews([]);
                }}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] hover:bg-brand-sage/40 flex items-center justify-center text-brand-muted-text transition-colors cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content (Scrollable reviews list + Form) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
              {/* Form to submit review */}
              <form
                onSubmit={handleSubmitReview}
                className="bg-[#FAF6F0]/60 border border-[#EAE3D5] rounded-2xl p-4 space-y-4"
              >
                <h5 className="text-xs font-bold text-brand-forest uppercase tracking-wider">
                  Write a Review
                </h5>

                {/* Star rating selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-muted-text">
                    Rating:
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-0.5 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                      >
                        {newRating >= star ? (
                          <svg
                            className="w-6 h-6 fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-6 h-6 fill-none stroke-current"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.977-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.837-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-brand-muted-text uppercase tracking-wider block">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe (Leave blank to use account name)"
                    value={newReviewerName}
                    onChange={(e) => setNewReviewerName(e.target.value)}
                    className="w-full bg-white text-brand-dark-text border border-[#EAE3D5] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D26E4F] transition-colors"
                  />
                </div>

                {/* Comment */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-brand-muted-text uppercase tracking-wider block">
                    Review Comment
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Share your experience with this laboratory facility..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-white text-brand-dark-text border border-[#EAE3D5] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D26E4F] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2 bg-brand-forest hover:bg-brand-forest/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>

              {/* Reviews List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-brand-forest uppercase tracking-wider">
                  Patient Reviews ({reviews.length})
                </h5>

                {reviewsLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-1">
                    <div className="w-6 h-6 border-2 border-[#EAE3D5] border-t-brand-forest rounded-full animate-spin"></div>
                    <span className="text-[10px] text-brand-muted-text">
                      Loading reviews...
                    </span>
                  </div>
                ) : reviewsError ? (
                  <p className="text-xs text-rose-600 text-center">
                    {reviewsError}
                  </p>
                ) : reviews.length === 0 ? (
                  <p className="text-xs text-brand-muted-text text-center py-4 bg-[#FAF6F0]/20 rounded-xl">
                    No reviews yet. Be the first to review this laboratory!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 bg-white border border-[#EAE3D5]/60 rounded-xl space-y-1.5 shadow-sm text-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-brand-forest block">
                              {rev.reviewer_name}
                            </span>
                            <span className="text-[10px] text-brand-muted-text/80">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex text-amber-500 gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-current" : "stroke-current fill-none"}`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-brand-muted-text leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
