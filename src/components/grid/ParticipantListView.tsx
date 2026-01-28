'use client';

import { useState, useMemo } from 'react';
import { SquareBox } from '@/types';
import {
  getParticipantList,
  findDuplicateParticipants,
  getBoxStats,
  exportParticipantsToCSV,
} from '@/lib/utils/participant-helpers';

interface ParticipantListViewProps {
  isOpen: boolean;
  onClose: () => void;
  boxes: SquareBox[];
  onHighlightBoxes?: (indices: number[]) => void;
  onJumpToBox?: (index: number) => void;
}

export default function ParticipantListView({
  isOpen,
  onClose,
  boxes,
  onHighlightBoxes,
  onJumpToBox,
}: ParticipantListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const participants = useMemo(() => getParticipantList(boxes), [boxes]);
  const duplicates = useMemo(() => findDuplicateParticipants(boxes), [boxes]);
  const stats = useMemo(() => getBoxStats(boxes), [boxes]);

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;

    const query = searchQuery.toLowerCase();
    return participants.filter((p) => p.name.toLowerCase().includes(query));
  }, [participants, searchQuery]);

  const handleExportCSV = () => {
    const csv = exportParticipantsToCSV(boxes);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participants.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHighlight = (boxNumbers: number[]) => {
    // Convert 1-indexed to 0-indexed
    const indices = boxNumbers.map((n) => n - 1);
    onHighlightBoxes?.(indices);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
              <p className="text-sm text-gray-600 mt-1">
                {stats.filled} of {stats.total} boxes filled (
                {stats.percentage.toFixed(0)}%)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participants..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Duplicate Warning */}
          {duplicates.size > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <strong>{duplicates.size}</strong>&nbsp;participant(s) have multiple
                boxes
              </p>
            </div>
          )}
        </div>

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-gray-500">
                {searchQuery ? 'No participants found' : 'No participants yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParticipants.map((participant, index) => {
                const isDuplicate = participant.count > 1;
                const boxIndices = participant.boxNumbers.map((n) => n - 1);

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                      isDuplicate
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleHighlight(participant.boxNumbers)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {participant.name}
                          </p>
                          {isDuplicate && (
                            <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">
                              {participant.count} boxes
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Box{participant.count > 1 ? 'es' : ''}:{' '}
                          {participant.boxNumbers.join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJumpToBox?.(boxIndices[0]);
                        }}
                        className="ml-4 text-blue-600 hover:text-blue-700 p-2"
                        title="Jump to first box"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              disabled={participants.length === 0}
              className="flex-1 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 border-2 border-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
