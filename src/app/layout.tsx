import type { Metadata, Viewport } from "next";
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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://graydocket.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "GrayDocket — Start your business in Ghana. We handle the paperwork.",
    template: "%s | GrayDocket",
  },
  description:
    "GrayDocket makes it easy for anyone to start a business in Ghana. We register it with the ORC and keep it compliant, so you can focus on running your business and getting it off the ground.",
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
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "GrayDocket — Start your business in Ghana. We handle the paperwork.",
    description:
      "Anyone can start a business in Ghana with GrayDocket. We handle ORC registration, corporate banking, and compliance paperwork.",
    url: appUrl,
    siteName: "GrayDocket",
    locale: "en_GH",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "GrayDocket — Start your business in Ghana. We handle the paperwork.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GrayDocket — Start your business in Ghana. We handle the paperwork.",
    description:
      "Start your business in Ghana in about 15 minutes. We handle the registration and keep you compliant after.",
    site: "@graydocket",
    creator: "@graydocket",
    images: ["/twitter-image.png"],
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
