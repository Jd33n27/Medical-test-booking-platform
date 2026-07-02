import React, { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../api/client';
import { BookingHistoryItem, Review } from '../types';
import { formatNaira, formatDateString } from '../utils/formatters';

interface HistoryPageProps {
  onBack: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack }) => {
  const [history, setHistory] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleReviewLab = async (labId: string, labName: string) => {
    setShowReviewsLabId(labId);
    setShowReviewsLabName(labName);
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await api.getLabReviews(labId);
      setReviews(data);
    } catch (err: any) {
      console.error(err);
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
        newComment
      );
      setReviews((prev) => [newReview, ...prev]);
      setNewComment("");
      setNewReviewerName("");
      setNewRating(5);
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await api.getBookingHistory();
        setHistory(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve your booking history. Check if the database connection is active.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleViewReceipt = (bookingId: string) => {
    window.history.pushState({}, '', `/payment-success?booking_id=${bookingId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-brand-muted-text hover:text-brand-dark-text transition-colors group text-sm font-semibold cursor-pointer"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </button>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-brand-dark-text flex items-center gap-3">
          {/* Medical book icon */}
          <svg className="w-8 h-8 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          My Diagnostic Vault
        </h2>
        <p className="text-brand-muted-text text-sm">Access your historical orders, appointment times, and download ready lab test report sheets</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-12 h-12 border-4 border-brand-border border-t-brand-terracotta rounded-full animate-spin"></div>
          <p className="text-brand-muted-text text-sm">Retrieving diagnostic records...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 bento-panel-light rounded-2xl p-6">
          <svg className="w-16 h-16 text-brand-muted-text/60 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-brand-dark-text">No bookings found</h3>
          <p className="text-brand-muted-text text-sm mt-1 max-w-sm mx-auto">
            You haven't scheduled any diagnostic appointments yet. Book a test from the homepage to start your health records folder.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((booking) => {
            const isPaid = booking.status === 'paid';
            const isPending = booking.status === 'pending';
            
            return (
              <div 
                key={booking.booking_id} 
                className="p-5 rounded-2xl bento-panel-light hover:border-brand-muted-text transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Test details */}
                <div className="space-y-3 flex-grow">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-brand-dark-text">{booking.test_name}</h3>
                    <span 
                      className="font-mono text-[10px] sm:text-[11px] bg-brand-sage text-brand-forest border border-brand-border px-2 py-0.5 rounded-md select-all uppercase truncate max-w-[140px] inline-block"
                      title={booking.booking_id}
                    >
                      REF: {booking.booking_id.substring(0, 8)}...
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase border ${
                      isPaid 
                        ? 'bg-brand-forest/10 border-brand-forest/20 text-brand-forest' 
                        : isPending 
                          ? 'bg-brand-terracotta/10 border-brand-terracotta/20 text-brand-terracotta'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-brand-muted-text">
                    <div>
                      <span className="text-brand-muted-text/80">Laboratory:</span> <strong className="text-brand-dark-text">{booking.lab_name}</strong>
                    </div>
                    <div>
                      <span className="text-brand-muted-text/80">Appointment:</span> <strong className="text-brand-dark-text">{formatDateString(booking.appointment_date)} @ {booking.appointment_time}</strong>
                    </div>
                    <div>
                      <span className="text-brand-muted-text/80">Charged Amount:</span> <strong className="text-brand-dark-text">{formatNaira(booking.total_price_naira)}</strong>
                    </div>
                  </div>
                </div>

                {/* Download / Actions */}
                <div className="shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 pt-2 md:pt-0 w-full md:w-auto">
                  <button
                    onClick={() => handleViewReceipt(booking.booking_id)}
                    className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-2 bg-brand-sage hover:bg-brand-border/40 border border-brand-border text-brand-forest font-bold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Receipt
                  </button>

                  <button
                    onClick={() => (window as any).navigateToChat?.(booking.lab_id)}
                    className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-2 bg-brand-sage hover:bg-brand-border/40 border border-brand-border text-brand-forest font-bold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat with Lab
                  </button>

                  <button
                    onClick={() => handleReviewLab(booking.lab_id, booking.lab_name)}
                    className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-2 bg-brand-sage hover:bg-brand-border/40 border border-brand-border text-brand-forest font-bold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Review Lab
                  </button>

                  {booking.result_ready && booking.result_file_url ? (
                    <a
                      href={`${API_BASE_URL}${booking.result_file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-forest/90 text-brand-light-text font-bold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      {/* Download icon */}
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Results
                    </a>
                  ) : (
                    <div className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 text-brand-muted-text text-xs sm:text-sm bg-brand-sage/50 py-2 px-3 sm:px-4 rounded-xl border border-brand-border">
                      {/* Spinner or clock icon */}
                      <svg className="w-4 h-4 text-brand-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Processing...
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content (Scrollable reviews list + Form) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
              {/* Form to submit review */}
              <form onSubmit={handleSubmitReview} className="bg-[#FAF6F0]/60 border border-[#EAE3D5] rounded-2xl p-4 space-y-4">
                <h5 className="text-xs font-bold text-brand-forest uppercase tracking-wider">
                  Write a Review
                </h5>
                
                {/* Star rating selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-muted-text">Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-0.5 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                      >
                        {newRating >= star ? (
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.977-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.837-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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
                    <span className="text-[10px] text-brand-muted-text">Loading reviews...</span>
                  </div>
                ) : reviewsError ? (
                  <p className="text-xs text-rose-600 text-center">{reviewsError}</p>
                ) : reviews.length === 0 ? (
                  <p className="text-xs text-brand-muted-text text-center py-4 bg-[#FAF6F0]/20 rounded-xl">
                    No reviews yet. Be the first to review this laboratory!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="p-3 bg-white border border-[#EAE3D5]/60 rounded-xl space-y-1.5 shadow-sm text-xs">
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
                              <svg key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-current" : "stroke-current fill-none"}`} viewBox="0 0 20 20">
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
