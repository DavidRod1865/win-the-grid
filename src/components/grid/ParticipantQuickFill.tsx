'use client';

import { useState, useRef, useEffect } from 'react';
import { SquareBox } from '@/types';

interface ParticipantQuickFillProps {
  isOpen: boolean;
  onClose: () => void;
  boxes: SquareBox[];
  onUpdateBoxes: (boxes: SquareBox[]) => void;
}

export default function ParticipantQuickFill({
  isOpen,
  onClose,
  boxes,
  onUpdateBoxes,
}: ParticipantQuickFillProps) {
  const [currentInput, setCurrentInput] = useState('');
  const [addedNames, setAddedNames] = useState<string[]>([]);
  const [emptyBoxIndices, setEmptyBoxIndices] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Get all empty box indices
      const emptyIndices = boxes
        .map((box, index) => ({ box, index }))
        .filter(({ box }) => !box.name.trim())
        .map(({ index }) => index);

      setEmptyBoxIndices(emptyIndices);
      setAddedNames([]);
      setCurrentInput('');

      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, boxes]);

  const handleAddName = () => {
    const name = currentInput.trim();

    if (!name) return;

    // Check for duplicates
    const isDuplicate = boxes.some(
      (box) => box.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
      alert(`"${name}" is already in the grid!`);
      return;
    }

    // Get next empty box
    const currentEmptyIndex = emptyBoxIndices[addedNames.length];

    if (currentEmptyIndex === undefined) {
      alert('No more empty boxes!');
      return;
    }

    // Update boxes
    const updatedBoxes = [...boxes];
    updatedBoxes[currentEmptyIndex] = {
      ...updatedBoxes[currentEmptyIndex],
      name: name,
    };

    onUpdateBoxes(updatedBoxes);
    setAddedNames([...addedNames, name]);
    setCurrentInput('');

    // Keep focus on input
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddName();
    }
  };

  const handleUndo = () => {
    if (addedNames.length === 0) return;

    const lastAddedName = addedNames[addedNames.length - 1];
    const boxIndex = boxes.findIndex((box) => box.name === lastAddedName);

    if (boxIndex !== -1) {
      const updatedBoxes = [...boxes];
      updatedBoxes[boxIndex] = {
        ...updatedBoxes[boxIndex],
        name: '',
      };

      onUpdateBoxes(updatedBoxes);
      setAddedNames(addedNames.slice(0, -1));
    }
  };

  const handlePasteCsv = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');

    // Split by common delimiters: newlines, commas, tabs
    const names = text
      .split(/[\n,\t]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    let added = 0;
    const updatedBoxes = [...boxes];

    for (const name of names) {
      const currentIndex = emptyBoxIndices[addedNames.length + added];

      if (currentIndex === undefined) break;

      // Check for duplicates
      const isDuplicate = updatedBoxes.some(
        (box) => box.name.toLowerCase() === name.toLowerCase()
      );

      if (!isDuplicate) {
        updatedBoxes[currentIndex] = {
          ...updatedBoxes[currentIndex],
          name: name,
        };
        added++;
      }
    }

    if (added > 0) {
      onUpdateBoxes(updatedBoxes);
      setAddedNames([
        ...addedNames,
        ...names.slice(0, added),
      ]);
    }
  };

  if (!isOpen) return null;

  const remainingBoxes = emptyBoxIndices.length - addedNames.length;
  const progress = ((addedNames.length / emptyBoxIndices.length) * 100).toFixed(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
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

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Fill Mode</h2>
          <p className="text-gray-600 text-sm">
            Type a name and hit Enter to fill the next empty box
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Added: <strong>{addedNames.length}</strong>
            </span>
            <span>
              Remaining: <strong>{remainingBoxes}</strong>
            </span>
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Participant Name
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePasteCsv}
              placeholder="Type name and press Enter..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={remainingBoxes === 0}
            />
            <button
              onClick={handleAddName}
              disabled={!currentInput.trim() || remainingBoxes === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Paste a list of names separated by commas or newlines
          </p>
        </div>

        {/* Recently Added */}
        {addedNames.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recently Added ({addedNames.length})
            </label>
            <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-1">
              {addedNames.slice().reverse().slice(0, 5).map((name, i) => (
                <div
                  key={i}
                  className="flex items-center text-sm text-gray-700"
                >
                  <svg
                    className="w-4 h-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleUndo}
            disabled={addedNames.length === 0}
            className="flex-1 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 border-2 border-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ↩️ Undo Last
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {remainingBoxes === 0 ? '✓ All Filled!' : 'Done'}
          </button>
        </div>

        {/* Complete Message */}
        {remainingBoxes === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              🎉 All boxes filled! You're ready to generate numbers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
