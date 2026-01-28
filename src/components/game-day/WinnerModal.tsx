'use client';

import { useEffect, useState } from 'react';
import { Winner } from '@/types';
import { analytics } from '@/lib/analytics';

interface WinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: Winner;
  gridId: string;
  canNotify?: boolean;
}

export default function WinnerModal({
  isOpen,
  onClose,
  winner,
  gridId,
  canNotify = false,
}: WinnerModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      setShowConfetti(true);

      // Track winner announcement
      analytics.winnerAnnounced(
        gridId,
        winner.quarter,
        winner.amount,
        winner.participantName
      );

      // Stop confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, gridId, winner]);

  const handleNotifyWinner = async () => {
    setNotifying(true);
    try {
      const response = await fetch('/api/notify-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gridId,
          winner,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      alert('Winner notified successfully!');
    } catch (error) {
      console.error('Failed to notify winner:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setNotifying(false);
    }
  };

  const handleShareWinner = () => {
    const message = `🎉 ${winner.participantName} won $${winner.amount.toFixed(2)} for ${winner.quarter}!`;

    if (navigator.share) {
      navigator.share({
        title: 'Winner Announcement',
        text: message,
      }).catch(() => {
        // User cancelled, do nothing
      });
    } else {
      navigator.clipboard.writeText(message);
      alert('Winner announcement copied to clipboard!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][
                  Math.floor(Math.random() * 5)
                ],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
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
          {/* Trophy Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mb-6 animate-bounce-slow">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 00-1.5 1.5v.5h-6v-.5a1.5 1.5 0 00-1.5-1.5H4a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path d="M9 14a1 1 0 00-1 1v3h4v-3a1 1 0 00-1-1H9z" />
            </svg>
          </div>

          {/* Winner Info */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            We Have a Winner! 🎉
          </h2>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-1">{winner.quarter}</p>
            <p className="text-4xl font-bold text-green-600 mb-2">
              {winner.participantName}
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              ${winner.amount.toFixed(2)}
            </p>
          </div>

          {/* Winning Numbers */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Winning Numbers</p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Away</p>
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                  {winner.awayLastDigit}
                </div>
              </div>
              <span className="text-2xl text-gray-400">×</span>
              <div className="text-center">
                <p className="text-xs text-gray-500">Home</p>
                <div className="w-12 h-12 bg-red-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                  {winner.homeLastDigit}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleShareWinner}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <svg
                className="w-5 h-5 mr-2"
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
              Share Winner
            </button>

            {canNotify && (
              <button
                onClick={handleNotifyWinner}
                disabled={notifying}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {notifying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    Notify Winner
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
