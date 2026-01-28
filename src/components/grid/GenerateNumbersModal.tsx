'use client';

import { useState, useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface GenerateNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  gridId: string;
  participantCount: number;
  isRegenerate?: boolean;
}

export default function GenerateNumbersModal({
  isOpen,
  onClose,
  onGenerate,
  gridId,
  participantCount,
  isRegenerate = false,
}: GenerateNumbersModalProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (generating) {
      // Simulate slot machine progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setShowSuccess(true);

            // Track number generation
            analytics.numbersGenerated(gridId, participantCount);

            // Auto-close after showing success
            setTimeout(() => {
              onClose();
              setGenerating(false);
              setProgress(0);
              setShowSuccess(false);
            }, 2000);

            return 100;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [generating, gridId, participantCount, onClose]);

  const handleGenerate = () => {
    setGenerating(true);
    onGenerate();
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-6 animate-bounce">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Numbers Generated! 🎲
          </h2>
          <p className="text-gray-600">Your grid is ready to go</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={!generating ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {!generating && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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
        )}

        {generating ? (
          // Generating State
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                <svg
                  className="w-10 h-10 text-blue-600 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Generating Numbers...
              </h2>
              <p className="text-gray-600">
                Creating your random number assignments
              </p>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-mono text-lg font-bold text-gray-400 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  ?
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-500">
              Using cryptographically secure randomization
            </p>
          </div>
        ) : (
          // Confirmation State
          <div className="text-center">
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
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isRegenerate ? 'Regenerate Numbers?' : 'Generate Numbers?'}
            </h2>

            <p className="text-gray-600 mb-6">
              {isRegenerate
                ? 'This will replace your current numbers with new random assignments.'
                : 'Random numbers will be assigned to each row and column.'}
            </p>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start mb-3">
                <svg
                  className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 mb-1">What happens:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Each row gets a random number (0-9)</li>
                    <li>• Each column gets a random number (0-9)</li>
                    <li>• All numbers are unique (no duplicates)</li>
                    <li>• {participantCount} participants ready to play</li>
                  </ul>
                </div>
              </div>

              {isRegenerate && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-orange-600 font-medium flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Warning: This cannot be undone
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isRegenerate ? '🔄 Regenerate Numbers' : '🎲 Generate Numbers'}
              </button>
              <button
                onClick={onClose}
                className="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
              >
                Cancel
              </button>
            </div>

            {/* Share Prompt */}
            {!isRegenerate && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  💡 After generating, you can share your grid with participants
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
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

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
