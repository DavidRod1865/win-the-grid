'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStripe } from '@/lib/stripe';
import { analytics } from '@/lib/analytics';
import { GridState } from '@/types';

interface UnlockSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gridState: GridState;
  userId: string;
}

export default function UnlockSharingModal({
  isOpen,
  onClose,
  gridState,
  userId,
}: UnlockSharingModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count filled participants
  const participantCount = gridState.boxes.filter((box) => box.name.trim() !== '').length;
  const potentialRevenue = participantCount * gridState.pricePerBox;

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);

    try {
      // Track checkout initiation
      analytics.checkoutInitiated(
        gridState.id!,
        'per-grid',
        parseFloat(process.env.NEXT_PUBLIC_PER_GRID_PRICE || '4.99')
      );

      // Create checkout session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gridId: gridState.id,
          userId: userId,
          productType: 'per-grid',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Track redirect to Stripe
      analytics.checkoutRedirected(gridState.id!, data.sessionId);

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      analytics.errorOccurred('checkout_error', err.message, {
        grid_id: gridState.id,
        product_type: 'per-grid',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    analytics.unlockModalDismissed(gridState.id!, 'close');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={loading}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Unlock Sharing
            </h2>
            <p className="text-gray-600 mb-6">
              Share your grid with participants and enable real-time updates
            </p>
          </div>

          {/* Participant info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Ready to share with</p>
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {participantCount} participants
            </p>
            {potentialRevenue > 0 && (
              <p className="text-sm text-gray-600">
                ${potentialRevenue.toFixed(2)} pool ready to go!
              </p>
            )}
          </div>

          {/* Features */}
          <div className="text-left mb-6 space-y-3">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Unique Share Code</p>
                <p className="text-sm text-gray-600">
                  Easy 6-character code for participants
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Real-Time Updates</p>
                <p className="text-sm text-gray-600">
                  Everyone sees score changes instantly
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Winner Notifications</p>
                <p className="text-sm text-gray-600">
                  Automatic alerts when winners are announced
                </p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">One-time unlock</span>
              <span className="text-3xl font-bold text-gray-900">
                ${process.env.NEXT_PUBLIC_PER_GRID_PRICE || '4.99'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Unlock this grid forever • No subscription needed
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Processing...' : 'Unlock Sharing Now'}
            </button>
            <button
              onClick={handleClose}
              disabled={loading}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
            >
              Maybe Later
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Secure payment powered by Stripe 🔒
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
