import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { HomePage } from "./pages/HomePage";
import { BookingPage } from "./pages/BookingPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { PaymentSuccessPage } from "./pages/PaymentSuccessPage";
import { PaymentFailedPage } from "./pages/PaymentFailedPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LabPortalPage } from "./pages/LabPortalPage";
import { OnboardLabPage } from "./pages/OnboardLabPage";
import { ChatPage } from "./pages/ChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ConcernPage } from "./pages/ConcernPage";
import { StyleGuidePage } from "./pages/StyleGuidePage";
import { DashboardPage } from "./pages/DashboardPage";
import { AppointmentPage } from "./pages/AppointmentPage";
import { api } from "./api/client";
import { Test, TimeSlot, BookingRequest, User } from "./types";

type PageType =
  | "home"
  | "booking"
  | "confirm"
  | "success"
  | "failed"
  | "login"
  | "register"
  | "history"
  | "lab-portal"
  | "onboard-lab"
  | "chat"
  | "profile"
  | "concern"
  | "styleguide"
  | "dashboard"
  | "appointment"
  | "results";

function App() {
  const [page, setPage] = useState<PageType>("home");
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(
    null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [chatLabId, setChatLabId] = useState<string | undefined>(undefined);
  const [chatPatientId, setChatPatientId] = useState<string | undefined>(
    undefined,
  );
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(
    null,
  );
  const [showCorporateModal, setShowCorporateModal] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState<boolean>(false);

  const handleScrollToCatalog = () => {
    if (page !== "home") {
      navigateTo("home");
      setTimeout(() => {
        document
          .getElementById("tests-catalog-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } else {
      document
        .getElementById("tests-catalog-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };
  // Authenticated user recovery on mount (each tab is independent)
  useEffect(() => {
    const savedUser = sessionStorage.getItem("medbook_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse logged-in user profile:", e);
      }
    }
  }, []);

  // Fetch active patient notifications from real booking logs
  useEffect(() => {
    if (user && user.role === "patient") {
      api
        .getBookingHistory()
        .then((data) => {
          const list: any[] = [];
          data.forEach((b) => {
            if (b.status === "paid") {
              list.push({
                id: `pay-${b.booking_id}`,
                title: "Appointment Confirmed",
                message: `Payment confirmed for ${b.test_name} at ${b.lab_name}. Date: ${new Date(b.appointment_date).toLocaleDateString()} @ ${b.appointment_time}.`,
                time: new Date(b.created_at).toLocaleDateString(),
                type: "payment",
                unread: true,
              });
            }
            if (b.result_ready) {
              list.push({
                id: `res-${b.booking_id}`,
                title: "Diagnostic Report Ready",
                message: `Your medical lab result for ${b.test_name} is ready for download in your Vault.`,
                time: new Date(b.created_at).toLocaleDateString(),
                type: "result",
                unread: true,
              });
            }
          });
          // Add a default welcome notification
          list.push({
            id: "welcome",
            title: "Welcome to MedBook",
            message:
              "Link your identity card/NIN in your Profile settings to start tracking verified results.",
            time: "General",
            type: "system",
            unread: false,
          });
          setNotifications(list);
        })
        .catch((err) => console.error("Failed to load notifications", err));
    } else {
      setNotifications([]);
    }
  }, [user, page]);

  // Router matching on initial mount and history updates
  useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      if (path.includes("/payment-success")) {
        setPage("success");
      } else if (path.includes("/payment-failed")) {
        setPage("failed");
      } else if (path.includes("/login")) {
        setPage("login");
      } else if (path.includes("/register")) {
        setPage("register");
      } else if (path.includes("/history")) {
        setPage("history");
      } else if (path.includes("/appointment")) {
        const savedUser = sessionStorage.getItem("medbook_user");
        try {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          if (parsedUser && parsedUser.role === "patient") {
            setPage("appointment");
          } else {
            window.history.replaceState({}, "", "/");
            setPage("home");
          }
        } catch {
          window.history.replaceState({}, "", "/");
          setPage("home");
        }
      } else if (path.includes("/dashboard")) {
        const savedUser = sessionStorage.getItem("medbook_user");
        try {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          if (parsedUser && parsedUser.role === "patient") {
            setPage("dashboard");
          } else {
            window.history.replaceState({}, "", "/");
            setPage("home");
          }
        } catch {
          window.history.replaceState({}, "", "/");
          setPage("home");
        }
      } else if (path.includes("/lab-portal")) {
        const savedUser = sessionStorage.getItem("medbook_user");
        try {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          if (parsedUser && parsedUser.role === "lab_admin") {
            setPage("lab-portal");
          } else {
            window.history.replaceState({}, "", "/");
            setPage("home");
          }
        } catch {
          window.history.replaceState({}, "", "/");
          setPage("home");
        }
      } else if (path.includes("/onboard-lab")) {
        setPage("onboard-lab");
      } else if (path.includes("/chat")) {
        const queryParams = new URLSearchParams(window.location.search);
        const labId = queryParams.get("lab_id") || undefined;
        let patientId = queryParams.get("patient_id") || undefined;

        const savedUser = sessionStorage.getItem("medbook_user");
        try {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          if (parsedUser && parsedUser.role === "patient") {
            // Patients can only chat with labs, so patient_id query parameter is invalid and stripped
            if (patientId) {
              patientId = undefined;
              const newUrl = "/chat" + (labId ? `?lab_id=${labId}` : "");
              window.history.replaceState({}, "", newUrl);
            }
          }
        } catch {
          // Ignore JSON parse errors
        }

        setChatLabId(labId);
        setChatPatientId(patientId);
        setPage("chat");
      } else if (path.includes("/profile")) {
        setPage("profile");
      } else if (path.includes("/concern/")) {
        const concernId = path.split("/concern/")[1] || "";
        setSelectedConcernId(concernId);
        setPage("concern");
      } else if (
        path.includes("/styleguide") ||
        path.includes("/design-system")
      ) {
        setPage("styleguide");
      } else {
        setPage("home");
      }
    };

    handleRouting();
    window.addEventListener("popstate", handleRouting);
    return () => window.removeEventListener("popstate", handleRouting);
  }, []);

  const navigateTo = useCallback((nextPage: PageType, param?: string) => {
    if (nextPage === "home") {
      setSelectedTest(null);
      setSelectedSlot(null);
      setBookingRequest(null);
      setChatLabId(undefined);
      setChatPatientId(undefined);
      setSelectedConcernId(null);
      window.history.pushState({}, "", "/");
    } else if (nextPage === "dashboard") {
      window.history.pushState({}, "", "/dashboard");
    } else if (nextPage === "concern" && param) {
      setSelectedConcernId(param);
      window.history.pushState({}, "", `/concern/${param}`);
    } else {
      window.history.pushState({}, "", `/${nextPage}`);
    }
    setPage(nextPage);
  }, []);

  const handleNavigateToChat = useCallback(
    (labId?: string, patientId?: string) => {
      if (!sessionStorage.getItem("medbook_token")) {
        navigateTo("login");
        return;
      }
      setChatLabId(labId);
      setChatPatientId(patientId);
      let url = "/chat";
      if (labId) url += `?lab_id=${labId}`;
      if (patientId) url += `?patient_id=${patientId}`;
      window.history.pushState({}, "", url);
      setPage("chat");
    },
    [navigateTo],
  );

  useEffect(() => {
    (window as any).navigateToChat = handleNavigateToChat;
    return () => {
      delete (window as any).navigateToChat;
    };
  }, [handleNavigateToChat]);

  const handleSelectTest = (test: Test) => {
    setSelectedTest(test);
    navigateTo("booking");
  };

  const handleReviewBooking = (bookingData: BookingRequest, slot: TimeSlot) => {
    // Dynamically inject the user ID if the client is authenticated
    if (user) {
      bookingData.user_id = user.id;
    }
    setBookingRequest(bookingData);
    setSelectedSlot(slot);
    navigateTo("confirm");
  };

  const startDefaultBooking = async () => {
    try {
      const allTests = await api.getTests();
      const target =
        allTests.find((t: Test) =>
          t.test_name.toLowerCase().includes("comprehensive"),
        ) || allTests[0];
      if (target) {
        setSelectedTest(target);
        navigateTo("booking");
      } else {
        navigateTo("home");
      }
    } catch {
      navigateTo("home");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("medbook_token");
    sessionStorage.removeItem("medbook_user");
    setUser(null);
    navigateTo("home");
  };

  if (page === "lab-portal" && user && user.role === "lab_admin") {
    return (
      <LabPortalPage
        user={user}
        onLogout={handleLogout}
        onBackToCatalog={() => navigateTo("home")}
        onUpdateUser={(updatedUser) => {
          setUser(updatedUser);
          sessionStorage.setItem("medbook_user", JSON.stringify(updatedUser));
        }}
      />
    );
  }

  const isDashboardView =
    user &&
    user.role === "patient" &&
    [
      "dashboard",
      "history",
      "profile",
      "chat",
      "results",
      "appointment",
    ].includes(page);

  if (isDashboardView) {
    let pageTitle = "Overview";
    if (page === "history") pageTitle = "Diagnostic Vault";
    if (page === "profile") pageTitle = "Profile Settings";
    if (page === "chat") pageTitle = "Messages";
    if (page === "results") pageTitle = "Results";
    if (page === "appointment") pageTitle = "Scheduled Appointments";

    return (
      <div className="h-screen overflow-hidden flex bg-[#FAF6F0] text-brand-dark-text font-sans relative">
        {/* Mobile Sidebar Overlay */}
        {dashboardSidebarOpen && (
          <div
            className="fixed inset-0 bg-brand-forest/40 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
            onClick={() => setDashboardSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#EAE3D5] flex flex-col justify-between shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
            dashboardSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-6">
            {/* Logo Mark */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-xl bg-[#1F3A2B] flex items-center justify-center text-brand-cream font-black text-lg">
                M
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-brand-dark-text block">
                  MedBook
                </span>
                <span className="text-[10px] text-brand-muted-text font-semibold tracking-wider uppercase block -mt-1">
                  Diagnostics
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              <button
                onClick={() => {
                  navigateTo("dashboard");
                  setDashboardSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  page === "dashboard"
                    ? "bg-[#1F3A2B]/10 text-[#1F3A2B]"
                    : "text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text"
                }`}
              >
                <svg
                  className={`w-5.5 h-5.5 ${page === "dashboard" ? "text-[#1F3A2B]" : "text-brand-muted-text"}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_14_1736)">
                    <path
                      d="M18.3399 10.0049H16.2728C15.5242 10.0033 14.8663 10.501 14.6642 11.2218L12.7055 18.1899C12.6795 18.2788 12.598 18.3399 12.5054 18.3399C12.4128 18.3399 12.3313 18.2788 12.3054 18.1899L7.70446 1.81995C7.67853 1.73105 7.59703 1.66992 7.50442 1.66992C7.41181 1.66992 7.33031 1.73105 7.30438 1.81995L5.34566 8.78801C5.14436 9.50587 4.49088 10.0028 3.74534 10.0049H1.66992"
                      stroke="currentColor"
                      strokeOpacity={page === "dashboard" ? undefined : 0.7}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_14_1736">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                Dashboard
              </button>

              <button
                onClick={() => {
                  navigateTo("appointment");
                  setDashboardSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  page === "appointment"
                    ? "bg-[#1F3A2B]/10 text-[#1F3A2B]"
                    : "text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text"
                }`}
              >
                <svg
                  className={`w-5.5 h-5.5 ${page === "appointment" ? "text-[#1F3A2B]" : "text-brand-muted-text"}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.66992 1.66992V4.99992"
                    stroke="currentColor"
                    strokeOpacity={page === "appointment" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.3301 1.66992V4.99992"
                    stroke="currentColor"
                    strokeOpacity={page === "appointment" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.16667 3.33008H15.8333C16.7538 3.33008 17.5 4.07627 17.5 4.99674V16.6634C17.5 17.5839 16.7538 18.3301 15.8333 18.3301H4.16667C3.24619 18.3301 2.5 17.5839 2.5 16.6634V4.99674C2.5 4.07627 3.24619 3.33008 4.16667 3.33008Z"
                    stroke="currentColor"
                    strokeOpacity={page === "appointment" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.5 8.33008H17.5"
                    stroke="currentColor"
                    strokeOpacity={page === "appointment" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Appointments
              </button>

              <button
                onClick={() => {
                  navigateTo("history");
                  setDashboardSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  page === "history"
                    ? "bg-[#1F3A2B]/10 text-[#1F3A2B]"
                    : "text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text"
                }`}
              >
                <svg
                  className={`w-5.5 h-5.5 ${page === "history" ? "text-[#1F3A2B]" : "text-brand-muted-text"}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.99633 18.3399C4.07608 18.3399 3.33008 17.5936 3.33008 16.6729V3.33692C3.33008 2.41626 4.07608 1.66992 4.99633 1.66992H11.6613C12.194 1.66906 12.705 1.88087 13.081 2.25837L16.0702 5.24897C16.4486 5.62525 16.6609 6.13719 16.6601 6.67092V16.6729C16.6601 17.5936 15.9141 18.3399 14.9938 18.3399H4.99633Z"
                    stroke="currentColor"
                    strokeOpacity={page === "history" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.6699 1.66992V5.83659C11.6699 6.29683 12.043 6.66992 12.5033 6.66992H16.6699"
                    stroke="currentColor"
                    strokeOpacity={page === "history" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.33992 7.5H6.66992"
                    stroke="currentColor"
                    strokeOpacity={page === "history" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.3399 10.8301H6.66992"
                    stroke="currentColor"
                    strokeOpacity={page === "history" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.3399 14.1699H6.66992"
                    stroke="currentColor"
                    strokeOpacity={page === "history" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Test Results
              </button>

              <button
                onClick={() => {
                  navigateTo("profile");
                  setDashboardSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  page === "profile"
                    ? "bg-[#1F3A2B]/10 text-[#1F3A2B]"
                    : "text-brand-muted-text hover:bg-brand-sage/20 hover:text-brand-dark-text"
                }`}
              >
                <svg
                  className={`w-5.5 h-5.5 ${page === "profile" ? "text-[#1F3A2B]" : "text-brand-muted-text"}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.8399 17.5V15.8333C15.8399 13.9924 14.3471 12.5 12.5056 12.5H7.50421C5.66273 12.5 4.16992 13.9924 4.16992 15.8333V17.5"
                    stroke="currentColor"
                    strokeOpacity={page === "profile" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.66992 5.835C6.66992 3.99313 8.16305 2.5 10.0049 2.5C11.8468 2.5 13.3399 3.99313 13.3399 5.835C13.3399 7.67687 11.8468 9.17 10.0049 9.17C8.16305 9.17 6.66992 7.67687 6.66992 5.835Z"
                    stroke="currentColor"
                    strokeOpacity={page === "profile" ? undefined : 0.7}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Profile
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[#EAE3D5] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#1F3A2B] text-brand-cream flex items-center justify-center font-bold text-sm shrink-0">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-brand-dark-text block truncate leading-tight">
                  {user.name}
                </span>
                <span className="text-sm text-brand-muted-text block capitalize">
                  Patient
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </aside>

        {/* Right Content Column */}
        <div className="grow flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-20 bg-white border-b border-[#EAE3D5] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setDashboardSidebarOpen(true)}
                className="p-2 rounded-xl border border-[#EAE3D5] text-[#1F3A2B] hover:bg-brand-sage/20 lg:hidden cursor-pointer shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-2xl font-extrabold text-[#1F3A2B] tracking-tight truncate">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Search Bar Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = (e.target as any).search.value;
                  if (q.trim()) {
                    navigateTo("home");
                    sessionStorage.setItem("catalog_search", q.trim());
                  }
                }}
                className="relative hidden sm:block"
              >
                <input
                  name="search"
                  type="text"
                  placeholder="Search tests..."
                  className="w-40 md:w-64 bg-[#FAF6F0] border border-[#EAE3D5] rounded-xl px-4 py-2 pl-9 text-xs focus:outline-none focus:border-[#D26E4F] transition-colors"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-2.5 text-brand-muted-text"
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
              </form>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl border border-[#EAE3D5] text-[#1F3A2B] hover:bg-brand-sage/20 transition-colors relative cursor-pointer"
                >
                  <img src="/icons/notification_bell.svg" alt="Notification" />
                  {notifications.some((n) => n.unread) && (
                    <span className="w-1.5 h-1.5 bg-[#D26E4F] rounded-full absolute top-2.5 right-2.5"></span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2.5 w-[calc(100vw-2rem)] sm:w-80 bg-white border border-[#EAE3D5] rounded-2xl shadow-xl z-50 py-3 text-xs divide-y divide-[#FAF6F0] animate-fadeIn">
                      <div className="px-4 pb-2.5 flex justify-between items-center">
                        <strong className="text-sm font-black text-[#1F3A2B]">
                          Inbox Notifications
                        </strong>
                        {notifications.some((n) => n.unread) && (
                          <button
                            onClick={() => {
                              setNotifications(
                                notifications.map((n) => ({
                                  ...n,
                                  unread: false,
                                })),
                              );
                            }}
                            className="text-[10px] text-[#D26E4F] font-bold hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-[#FAF6F0]">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-brand-muted-text">
                            No notifications at this time
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`px-4 py-3 hover:bg-[#FAF6F0] transition-colors cursor-pointer text-left ${n.unread ? "bg-[#D26E4F]/5" : ""}`}
                              onClick={() => {
                                setNotifications(
                                  notifications.map((item) =>
                                    item.id === n.id
                                      ? { ...item, unread: false }
                                      : item,
                                  ),
                                );
                                if (n.type === "payment")
                                  navigateTo("appointment");
                                if (n.type === "result") navigateTo("history");
                                if (n.type === "system") navigateTo("profile");
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex justify-between items-start gap-2 mb-0.5">
                                <span
                                  className={`font-extrabold ${n.unread ? "text-[#1F3A2B]" : "text-brand-dark-text"}`}
                                >
                                  {n.title}
                                </span>
                                <span className="text-[9px] text-brand-muted-text/80 shrink-0">
                                  {n.time}
                                </span>
                              </div>
                              <p className="text-brand-muted-text text-[11px] leading-relaxed">
                                {n.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Book New Test CTA */}
              <button
                onClick={startDefaultBooking}
                className="bg-[#D26E4F] hover:bg-[#B85C3F] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Book New Test
              </button>
            </div>
          </header>

          {/* Page Body Panel */}
          <main className="grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {page === "dashboard" && (
              <DashboardPage user={user} onNavigate={navigateTo} />
            )}
            {page === "history" && (
              <HistoryPage onBack={() => navigateTo("dashboard")} />
            )}
            {page === "appointment" && (
              <AppointmentPage onBack={() => navigateTo("dashboard")} />
            )}
            {page === "profile" && (
              <ProfilePage
                user={user}
                onUpdateUser={(updatedUser) => {
                  setUser(updatedUser);
                  sessionStorage.setItem(
                    "medbook_user",
                    JSON.stringify(updatedUser),
                  );
                }}
                onBack={() => navigateTo("dashboard")}
              />
            )}
            {page === "chat" && (
              <ChatPage
                onBack={() => navigateTo("dashboard")}
                initialLabId={chatLabId}
                initialPatientId={chatPatientId}
              />
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream text-brand-dark-text selection:bg-brand-terracotta selection:text-brand-light-text flex flex-col justify-between">
      {/* Floating Header Component */}
      <header className="sticky top-1 z-50 max-w-7xl w-full mx-auto px-4 -mb-18 pointer-events-none">
        <div className="w-full bg-[#FAF6F0]/90 backdrop-blur-md border border-[#EAE3D5]/60 rounded-[20px] flex items-center justify-between px-6 py-2.5 shadow-sm pointer-events-auto">
          {/* Logo Brand */}
          <button
            onClick={() => navigateTo("home")}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left cursor-pointer"
          >
            {/* Logo Mark */}
            <div className="w-9 h-9 rounded-xl bg-[#1F3A2B] text-brand-cream flex items-center justify-center font-black text-lg">
              M
            </div>
            <span className="font-extrabold text-xl md:text-2xl tracking-tight text-[#1F3A2B]">
              MedBook
            </span>
          </button>

          {/* Navigation Links (Center) */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-[#1F3A2B]/90">
            <button
              onClick={handleScrollToCatalog}
              className="hover:text-[#D26E4F] transition-colors cursor-pointer"
            >
              Tests & Packages
            </button>
            <button
              onClick={handleScrollToCatalog}
              className="hover:text-[#D26E4F] transition-colors cursor-pointer"
            >
              Laboratories
            </button>
            <button
              onClick={handleScrollToCatalog}
              className="hover:text-[#D26E4F] transition-colors cursor-pointer"
            >
              Home Collection
            </button>
            <button
              onClick={() => setShowCorporateModal(true)}
              className="hover:text-[#D26E4F] transition-colors cursor-pointer"
            >
              For Corporates
            </button>
          </nav>

          {/* User Profile / Auth Action (Right) + Hamburger */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() =>
                    navigateTo(
                      user.role === "lab_admin" ? "lab-portal" : "dashboard",
                    )
                  }
                  className="px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl bg-[#1F3A2B] text-white hover:bg-[#15271D] transition-all cursor-pointer shadow-sm"
                >
                  Portal
                </button>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("token");
                    sessionStorage.removeItem("medbook_user");
                    setUser(null);
                    navigateTo("home");
                  }}
                  className="text-xs sm:text-sm font-bold text-[#1F3A2B] hover:text-[#D26E4F] cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-4 sm:gap-6">
                <button
                  onClick={() => navigateTo("login")}
                  className="text-xs sm:text-sm font-bold text-[#1F3A2B] hover:text-[#D26E4F] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={handleScrollToCatalog}
                  className="px-5 py-2.5 bg-[#D26E4F] hover:bg-[#c56041] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Book a Test
                </button>
              </div>
            )}

            {/* Hamburger button (Mobile Only) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-[#EAE3D5] text-[#1F3A2B] hover:bg-brand-sage/20 transition-colors cursor-pointer shrink-0"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="w-full bg-[#FAF6F0] border border-[#EAE3D5]/60 rounded-2xl p-5 mt-3 shadow-lg flex flex-col gap-4 animate-slideDown pointer-events-auto lg:hidden">
            <nav className="flex flex-col gap-2.5 text-sm font-bold text-[#1F3A2B]/90">
              <button
                onClick={() => {
                  handleScrollToCatalog();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 hover:text-[#D26E4F] transition-colors cursor-pointer"
              >
                Tests & Packages
              </button>
              <button
                onClick={() => {
                  handleScrollToCatalog();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 hover:text-[#D26E4F] transition-colors cursor-pointer"
              >
                Laboratories
              </button>
              <button
                onClick={() => {
                  handleScrollToCatalog();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 hover:text-[#D26E4F] transition-colors cursor-pointer"
              >
                Home Collection
              </button>
              <button
                onClick={() => {
                  setShowCorporateModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 hover:text-[#D26E4F] transition-colors cursor-pointer"
              >
                For Corporates
              </button>
            </nav>
            <div className="border-t border-[#EAE3D5]/40 pt-4 flex flex-col gap-3">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      navigateTo(user.role === "lab_admin" ? "lab-portal" : "dashboard");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-3 bg-[#1F3A2B] text-white font-extrabold text-xs sm:text-sm rounded-xl text-center cursor-pointer shadow-sm"
                  >
                    Go to Portal
                  </button>
                  <button
                    onClick={() => {
                      sessionStorage.removeItem("token");
                      sessionStorage.removeItem("medbook_user");
                      setUser(null);
                      setMobileMenuOpen(false);
                      navigateTo("home");
                    }}
                    className="w-full py-3 border border-[#EAE3D5] text-[#1F3A2B] font-bold text-xs sm:text-sm rounded-xl text-center cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigateTo("login");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-3 border border-[#EAE3D5] text-[#1F3A2B] font-bold text-xs sm:text-sm rounded-xl text-center cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      handleScrollToCatalog();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-3 bg-[#D26E4F] text-white font-extrabold text-xs sm:text-sm rounded-xl text-center cursor-pointer shadow-sm"
                  >
                    Book a Test
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main page content area */}
      <main className="grow w-full flex flex-col">
        {page === "home" ? (
          <HomePage
            onSelectTest={handleSelectTest}
            onSelectConcern={(concernId) => navigateTo("concern", concernId)}
          />
        ) : (
          <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 pt-24 pb-6 md:pb-8">
            {page === "concern" && selectedConcernId && (
              <ConcernPage
                concernId={selectedConcernId}
                onSelectTest={handleSelectTest}
                onGoBack={() => navigateTo("home")}
              />
            )}

            {page === "booking" && selectedTest && (
              <BookingPage
                test={selectedTest}
                onReviewBooking={handleReviewBooking}
                onBack={() => navigateTo("home")}
              />
            )}

            {page === "confirm" &&
              selectedTest &&
              selectedSlot &&
              bookingRequest && (
                <ConfirmationPage
                  test={selectedTest}
                  slot={selectedSlot}
                  bookingData={bookingRequest}
                  onBack={() => navigateTo("booking")}
                />
              )}

            {page === "success" && (
              <PaymentSuccessPage onGoHome={() => navigateTo("home")} />
            )}

            {page === "failed" && (
              <PaymentFailedPage onGoHome={() => navigateTo("home")} />
            )}

            {page === "login" && (
              <LoginPage
                onSuccess={(auth) => {
                  setUser(auth.user);
                  if (auth.user.role === "lab_admin") {
                    navigateTo("lab-portal");
                  } else {
                    navigateTo("dashboard");
                  }
                }}
                onToggleRegister={() => navigateTo("register")}
                onBack={() => navigateTo("home")}
              />
            )}

            {page === "register" && (
              <RegisterPage
                onSuccess={(auth) => {
                  setUser(auth.user);
                  if (auth.user.role === "lab_admin") {
                    navigateTo("lab-portal");
                  } else {
                    navigateTo("dashboard");
                  }
                }}
                onToggleLogin={() => navigateTo("login")}
                onBack={() => navigateTo("home")}
                onOnboardLab={() => navigateTo("onboard-lab")}
              />
            )}

            {page === "history" && (
              <HistoryPage onBack={() => navigateTo("home")} />
            )}

            {page === "appointment" && (
              <AppointmentPage onBack={() => navigateTo("home")} />
            )}

            {page === "chat" && (
              <ChatPage
                onBack={() =>
                  navigateTo(user?.role === "lab_admin" ? "lab-portal" : "home")
                }
                initialLabId={chatLabId}
                initialPatientId={chatPatientId}
              />
            )}

            {page === "onboard-lab" && (
              <OnboardLabPage
                onSuccess={(labId, token) => {
                  if (user && token) {
                    const updatedUser = {
                      ...user,
                      lab_id: labId,
                      role: "lab_admin",
                    };
                    setUser(updatedUser);
                    sessionStorage.setItem("token", token);
                    sessionStorage.setItem(
                      "medbook_user",
                      JSON.stringify(updatedUser),
                    );
                    navigateTo("lab-portal");
                  } else {
                    window.history.pushState(
                      {},
                      "",
                      `/register?lab_id=${labId}&role=lab_admin`,
                    );
                    setPage("register");
                  }
                }}
                onBack={() => navigateTo("home")}
              />
            )}

            {page === "profile" && user && (
              <ProfilePage
                user={user}
                onUpdateUser={(updatedUser) => {
                  setUser(updatedUser);
                  sessionStorage.setItem(
                    "medbook_user",
                    JSON.stringify(updatedUser),
                  );
                }}
                onBack={() =>
                  navigateTo(user.role === "lab_admin" ? "lab-portal" : "home")
                }
              />
            )}

            {page === "styleguide" && (
              <StyleGuidePage onBack={() => navigateTo("home")} />
            )}
          </div>
        )}
      </main>

      {/* Footer component */}
      <footer className="border-t border-brand-border-dark bg-brand-forest py-8 px-6 text-center text-xs text-brand-light-text/60 space-y-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-brand-light-text">
              MedBook
            </span>
            <span>|</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-center">
            <a href="#" className="hover:text-brand-cream transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-brand-cream transition-colors">
              Privacy Policy
            </a>
            <button
              onClick={() => navigateTo("onboard-lab")}
              className="hover:text-brand-terracotta transition-colors cursor-pointer"
            >
              Lab Partners
            </button>
            <span className="text-brand-light-text/30">•</span>
            <button
              onClick={() => navigateTo("styleguide")}
              className="text-brand-cream/80 hover:text-brand-cream hover:underline transition-all cursor-pointer font-bold"
            >
              Style Guide
            </button>
          </div>
        </div>
        <p className="text-[10px] text-brand-muted-text/80 max-w-xl mx-auto">
          Disclaimer: MedBook is an independent booking intermediary. Diagnostic
          tests are conducted by third-party registered laboratories. We do not
          provide direct medical advice.
        </p>
      </footer>

      {/* Corporate Modal */}
      {showCorporateModal && (
        <div className="fixed inset-0 bg-[#1F3A2B]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FAF6F0] rounded-3xl border border-[#EAE3D5] p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative animate-slideUp">
            <button
              onClick={() => setShowCorporateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white border border-[#EAE3D5] text-brand-muted-text hover:text-brand-dark-text transition-colors cursor-pointer"
            >
              <svg
                className="w-4.5 h-4.5"
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

            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#1F3A2B] text-brand-cream flex items-center justify-center mx-auto shadow-sm">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-extrabold text-[#1F3A2B] tracking-tight">
                Corporate Health Solutions
              </h3>
              <p className="text-xs text-brand-muted-text">
                Premium employee diagnostics & annual wellness checkups
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="bg-white border border-[#EAE3D5]/60 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EAE3D5] flex items-center justify-center text-[#D26E4F] shrink-0 font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-dark-text">
                    On-Site Group Sampling
                  </h4>
                  <p className="text-[11px] text-brand-muted-text mt-0.5">
                    Our certified laboratory specialists visit your office
                    premises for zero-disruption sample collections.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#EAE3D5]/60 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EAE3D5] flex items-center justify-center text-[#D26E4F] shrink-0 font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-dark-text">
                    Volume Health Packages
                  </h4>
                  <p className="text-[11px] text-brand-muted-text mt-0.5">
                    Customized corporate discounts on comprehensive diagnostics,
                    lipid panels, and executive health profiles.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#EAE3D5]/60 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FAF6F0] border border-[#EAE3D5] flex items-center justify-center text-[#D26E4F] shrink-0 font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-dark-text">
                    Secure HR Portal
                  </h4>
                  <p className="text-[11px] text-brand-muted-text mt-0.5">
                    Encrypted, centralized dashboard for tracking wellness
                    trends, generating reports, and tracking status.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setShowCorporateModal(false)}
                className="flex-1 py-3 bg-[#1F3A2B] hover:bg-[#15271D] text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-sm text-xs text-center"
              >
                Contact Corporate Team
              </button>
              <button
                onClick={() => setShowCorporateModal(false)}
                className="px-4 py-3 border border-[#EAE3D5] hover:bg-white text-brand-dark-text font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
