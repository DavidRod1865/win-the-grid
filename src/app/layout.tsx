import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Win The Grid - Super Bowl Squares Made Easy",
  description: "The easiest way to create and manage Super Bowl squares. Free grid generator with customizable payouts, sharing, and export features.",
  keywords: "super bowl squares, football squares calculator, squares payout calculator, super bowl party, football pool, win the grid",
  openGraph: {
    title: "Win The Grid - Super Bowl Squares Made Easy",
    description: "Create, manage, and share your Super Bowl squares pool in minutes",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
