import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteDescription, siteTitle, siteUrl } from '@/lib/metadata';

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

const appUrl = siteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: siteTitle,
    template: "%s | GrayDocket",
  },
  description:
    siteDescription,
  applicationName: "GrayDocket",
  keywords: [
    "business registration Ghana",
    "company incorporation Ghana",
    "business formation Ghana",
    "sole proprietorship Ghana",
    "limited company Ghana",
    "ORC registration Ghana",
    "business bank account Ghana",
    "annual returns Ghana",
    "Ghana Revenue Authority tax clearance",
    "GrayDocket",
  ],
  authors: [{ name: "GrayDocket", url: "https://graydocket.com" }],
  creator: "GrayDocket",
  publisher: "GrayDocket",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: siteTitle,
    description:
      siteDescription,
    siteName: "GrayDocket",
    locale: "en_GH",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png?v=3",
        width: 1200,
        height: 630,
        alt: "GrayDocket: Start your business. We'll handle the paperwork. Colourful hero doodles surround the message.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description:
      siteDescription,
    images: ["/twitter-image.png?v=3"],
  },
  category: "Business & Legal Services",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
