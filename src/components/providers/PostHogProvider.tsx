'use client';

import { useEffect, Suspense, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/posthog';
import { useUser } from '@/contexts/AuthContext';
import { identifyUser, resetUser } from '@/lib/analytics';

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views
  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString();
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const user = useUser();

  // Initialize PostHog on mount
  useEffect(() => {
    setIsClient(true);
    initPostHog();
  }, []);

  // Identify user when authenticated (only on client)
  useEffect(() => {
    if (!isClient) return;

    if (user) {
      identifyUser(user.id, {
        email: user.email,
        created_at: user.created_at,
      });
    } else {
      // Reset PostHog when user logs out
      resetUser();
    }
  }, [user, isClient]);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
