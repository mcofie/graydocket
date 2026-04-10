import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GrayDocket — Business Formation Made Simple | Ghana",
    template: "%s | GrayDocket",
  },
  description:
    "Automate your company incorporation, tax registration, and business bank account setup in Ghana. Start your business in 15 minutes with GrayDocket.",
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
    title: "GrayDocket — Business Formation Made Simple",
    description:
      "Automate your company incorporation, tax registration, and business bank account setup in Ghana.",
    type: "website",
    locale: "en_GH",
    siteName: "GrayDocket",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrayDocket — Business Formation Made Simple",
    description:
      "Start your business in Ghana in 15 minutes. Company incorporation, tax registration, and bank account setup — all automated.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
};

import { Suspense } from "react";
import ReferralTracker from "@/components/affiliate/ReferralTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <ReferralTracker />
          {children}
        </Suspense>
      </body>
    </html>
  );
}
