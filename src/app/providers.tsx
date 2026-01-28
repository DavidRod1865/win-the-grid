"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PostHogProvider>
        {children}
      </PostHogProvider>
    </AuthProvider>
  );
}
