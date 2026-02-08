'use client';

import { useState, useEffect, useRef } from 'react';
import { SquareBox } from '@/types';
import { getParticipantList } from '@/lib/utils/participant-helpers';

interface ParticipantNumberViewerProps {
  boxes: SquareBox[];
  onParticipantSelect: (name: string, boxIndices: number[]) => void;
  onClear: () => void;
  currentlySelected: string | null;
}

export default function ParticipantNumberViewer({
  boxes,
  onParticipantSelect,
  onClear,
  currentlySelected,
}: ParticipantNumberViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const participants = getParticipantList(boxes);

  // Filter participants based on search query
  const filteredParticipants = searchQuery
    ? participants.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : participants;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (name: string, boxNumbers: number[]) => {
    // Convert from 1-indexed display to 0-indexed array
    const boxIndices = boxNumbers.map((num) => num - 1);
    onParticipantSelect(name, boxIndices);
    setIsOpen(false);
    setSearchQuery('');
  };

  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Desktop & Mobile Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currentlySelected || 'Find My Numbers'}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {currentlySelected && (
          <button
            onClick={onClear}
            className="px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            aria-label="Clear selection"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
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
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participants..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Participant List */}
          <div className="overflow-y-auto max-h-80">
            {filteredParticipants.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No participants found
              </div>
            ) : (
              filteredParticipants.map((participant) => (
                <button
                  key={participant.name}
                  onClick={() => handleSelect(participant.name, participant.boxNumbers)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                    currentlySelected === participant.name
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {participant.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {participant.count} {participant.count === 1 ? 'box' : 'boxes'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
