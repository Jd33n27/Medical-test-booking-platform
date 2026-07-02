import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { BookingStatus } from "../types";
import { formatDateString } from "../utils/formatters";

interface PaymentSuccessPageProps {
  onGoHome: () => void;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({
  onGoHome,
}) => {
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const bookingId = queryParams.get("booking_id");

        if (!bookingId) {
          setError("No booking ID was found in the URL.");
          setLoading(false);
          return;
        }

        const data = await api.getBookingStatus(bookingId);
        setBooking(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Could not fetch booking confirmation details.");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  // Format reference ID like MB-8472-XYZ
  const formatReference = (id?: string) => {
    if (!id) return "MB-8472-XYZ";
    const cleanId = id.replace(/-/g, "").toUpperCase();
    if (cleanId.length < 7) return `MB-${cleanId}`;
    return `MB-${cleanId.substring(0, 4)}-${cleanId.substring(4, 7)}`;
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF6F0] p-4 font-sans">
      <div className="max-w-180 w-full bg-white border border-[#EAE3D5] rounded-3xl p-8 text-center space-y-6 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-10 h-10 border-3 border-[#EAE3D5] border-t-[#D26E4F] rounded-full animate-spin"></div>
            <p className="text-brand-muted-text text-xs font-semibold">
              Confirming appointment...
            </p>
          </div>
        ) : error ? (
          <div className="space-y-6 py-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-[#1F3A2B]">
                Booking Status Check
              </h2>
              <p className="text-brand-muted-text text-xs leading-relaxed">
                {error}
              </p>
            </div>
            <button
              onClick={onGoHome}
              className="w-full py-3 bg-[#1F3A2B] hover:bg-[#15271D] text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Checked Green Mark */}
            <div className="w-14 h-14 rounded-full bg-[#1F3A2B]/10 text-[#1F3A2B] flex items-center justify-center mx-auto">
              <img
                src="/icons/confirmation_checkmark.svg"
                alt="payment successful"
                className="w-6 h-6"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#1F3A2B]">
                Booking Confirmed!
              </h2>
              <p className="text-brand-muted-text text-xs leading-relaxed max-w-sm mx-auto">
                Your appointment has been successfully scheduled. We've sent the
                details and preparation instructions to your email.
              </p>
            </div>

            {/* Reference & Time Card */}
            <div className="w-full max-w-[87%] mx-auto bg-[#FAF6F0] border border-[#EAE3D5] p-5 rounded-2xl text-left space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-brand-forest/60 font-bold block">
                  Booking Reference
                </span>
                <span className="font-extrabold text-base text-brand-forest block uppercase tracking-wide">
                  {formatReference(booking?.booking_id)}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-brand-forest/60 border-t border-[#EAE3D5]/40 pt-3">
                <img src="/icons/dark_green_calendar.svg" alt="" />
                <span>
                  {booking ? formatDateString(booking.appointment_date) : ""} at{" "}
                  {booking?.appointment_time}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                onClick={onGoHome}
                className="w-[40%] py-3 bg-[#1F3A2B] hover:bg-[#15271D] text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
