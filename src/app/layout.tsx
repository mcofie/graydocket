import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

const familyFont = localFont({
  // Only the display headings use this face, all at weight 500
  src: [
    {
      path: "../fonts/Family-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-family",
  display: "swap",
});

// Body text is Inter; the Family face is reserved for display headings (via --font-display)
const interFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GrayDocket — Start your business in Ghana. We handle the paperwork.",
    template: "%s | GrayDocket",
  },
  description:
    "GrayDocket makes it easy for anyone to start a business in Ghana. We register it with the ORC and keep it compliant, so you can focus on running your business and getting it off the ground.",
  keywords: [
    "business registration Ghana",
    "company incorporation Ghana",
    "business formation",
    "sole proprietorship Ghana",
    "ORC registration",
    "business bank account Ghana",
    "GrayDocket",
  ],
  authors: [{ name: "GrayDocket" }],
  openGraph: {
    title: "GrayDocket — Start your business. We handle the paperwork.",
    description:
      "Anyone can start a business in Ghana with GrayDocket. We handle registration and compliance, so you can focus on the business.",
    type: "website",
    locale: "en_GH",
    siteName: "GrayDocket",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrayDocket — Start your business. We handle the paperwork.",
    description:
      "Start your business in Ghana in about 15 minutes. We handle the registration and keep you compliant after.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
  // Mobile browser bar blends into the white header; the brand green lives in the page itself
  themeColor: "#ffffff",
};

import { Suspense } from "react";
import ReferralTracker from "@/components/affiliate/ReferralTracker";
import PageLoaderBar from "@/components/ui/PageLoaderBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${interFont.variable} ${familyFont.variable} ${interFont.className}`}>
      <body suppressHydrationWarning>
        {/* These read search params, so they get their own boundary; wrapping {children}
            would make every page skip server rendering in production. */}
        <Suspense fallback={null}>
          <PageLoaderBar />
          <ReferralTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
