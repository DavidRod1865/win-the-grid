'use client';

import { useState } from 'react';
import { formatShareCode, getShareUrl } from '@/lib/utils/share-code';
import { analytics } from '@/lib/analytics';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareCode: string;
  gridId: string;
  gridTitle?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  shareCode,
  gridId,
  gridTitle = 'Super Bowl Squares',
}: ShareModalProps) {
  const [copied, setCopied] = useState<'code' | 'url' | null>(null);

  const shareUrl = getShareUrl(shareCode);
  const formattedCode = formatShareCode(shareCode);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(shareCode);
    analytics.shareLinkCopied(gridId, shareCode);
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    analytics.shareLinkCopied(gridId, shareCode);
    setCopied('url');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShareText = async () => {
    const message = `Join my ${gridTitle} pool! Use code: ${shareCode}\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${gridTitle}`,
          text: message,
        });
        analytics.gridShared(gridId, shareCode, 'text');
      } catch (error) {
        // User cancelled or share failed, fall back to copy
        await navigator.clipboard.writeText(message);
        setCopied('code');
        setTimeout(() => setCopied(null), 2000);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(message);
      setCopied('code');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Join my ${gridTitle} pool!`);
    const body = encodeURIComponent(
      `I'm running a ${gridTitle} pool and would love for you to join!\n\nUse this code to view the grid: ${shareCode}\n\nOr click this link: ${shareUrl}\n\nSee you on game day!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    analytics.gridShared(gridId, shareCode, 'email');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative"
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

        {/* Content */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Share Your Grid</h3>
          <p className="text-gray-600">
            Share this code with participants to let them view the grid
          </p>
        </div>

        {/* Share Code */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-4">
          <p className="text-sm text-gray-600 mb-2 text-center">Share Code</p>
          <div className="flex items-center justify-between bg-white rounded-lg p-4 border-2 border-blue-200 mb-3">
            <span className="text-3xl font-bold text-blue-600 tracking-wider mx-auto">
              {formattedCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {copied === 'code' ? (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied!
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Share Code
              </>
            )}
          </button>
        </div>

        {/* Share Link */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Share Link</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm text-gray-700 break-all flex-1">
              {shareUrl}
            </code>
            <button
              onClick={handleCopyUrl}
              className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded shrink-0"
            >
              {copied === 'url' ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Preview as Participant
          </a>
        </div>

        {/* Share Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleShareText}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Share
          </button>
          <button
            onClick={handleEmailShare}
            className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Email
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>How it works:</strong> Participants can enter this code on the
            homepage or click the direct link to view your grid in real-time. They'll
            see updates instantly when you add scores or announce winners.
          </p>
        </div>
      </div>
    </div>
  );
}
