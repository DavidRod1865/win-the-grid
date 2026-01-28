'use client';

import { useState } from 'react';

interface FloatingAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FloatingAction[];
  mainIcon?: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export default function FloatingActionButton({
  actions,
  mainIcon,
  position = 'bottom-right',
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40`}>
      {/* Action Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Actions */}
          <div className="absolute bottom-20 right-0 space-y-3 mb-2">
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-end gap-3 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <button
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={`w-12 h-12 ${
                    action.color || 'bg-white'
                  } text-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-gray-200`}
                >
                  {action.icon}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 ${
          isOpen
            ? 'bg-gray-900 rotate-45'
            : 'bg-gradient-to-r from-blue-600 to-blue-700'
        } text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center`}
      >
        {mainIcon || (
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        )}
      </button>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
