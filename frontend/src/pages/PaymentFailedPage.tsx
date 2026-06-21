import React from 'react';

interface PaymentFailedPageProps {
  onGoHome: () => void;
}

export const PaymentFailedPage: React.FC<PaymentFailedPageProps> = ({ onGoHome }) => {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="p-6 md:p-8 rounded-2xl glass-panel text-center space-y-6">
        
        {/* Error icon */}
        <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5 animate-pulse">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Payment Unsuccessful</h2>
          <p className="text-slate-400 text-sm">
            We couldn't process your payment transaction. The authorization request was cancelled or declined.
          </p>
        </div>

        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl text-left text-xs text-rose-400/90 leading-relaxed">
          <span className="font-semibold block mb-1">Common reasons for payment failure:</span>
          <ul className="list-disc pl-4 space-y-1">
            <li>Insufficient balance in the chosen bank account or card.</li>
            <li>Incorrect card details, CVV, or PIN supplied during checkout.</li>
            <li>Temporary timeout in processing server authentication.</li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onGoHome}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all duration-200"
          >
            Try Booking Again
          </button>
          <button
            onClick={onGoHome}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-sm font-semibold transition-all"
          >
            Cancel and Return Home
          </button>
        </div>
      </div>
    </div>
  );
};
