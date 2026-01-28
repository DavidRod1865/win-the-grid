import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window !== 'undefined' && !posthog.__loaded) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!key) {
      console.warn('PostHog key not configured');
      return;
    }

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug();
        }
      },
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // We'll manually track events for better control
      persistence: 'localStorage',
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-private]',
      },
    });
  }
};

export { posthog };
