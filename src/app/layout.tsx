import "@/app/globals.css";
import "@/css/pages/feedback/RadioButton.css";

import { Suspense } from "react";
import ErrorFallBack from "./error";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ErrorBoundary from "@/components/utils/ErrorBoundary";
import { StudentDataProvider } from "@/context/StudentContext";
import ProgressBar from "@/components/client/utils/PageProgress";
import SplashScreen from "@/components/client/loading/SplashScreen";
import { LocalStorageProvider } from "@/context/LocalStorageContext";
import GoogleAnalytics from "@/components/client/analytics/GoogleAnalytics";
import AuroraBackground from "@/components/ui/AuroraBackground";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  referrer: "origin-when-cross-origin",
  title: {
    default: "Student Corner - SRM AP",
    template: "%s | Student Corner - SRM AP",
  },
  description: "Student portal for SRM University AP students to track attendance, calculate CGPA, view timetable, and access resources.",
  keywords: [
    "Student Corner",
    "SRM AP Student Corner",
    "SRMAP student portal",
    "SRM University AP",
    "CGPA Calculator",
    "Attendance Tracker",
    "SRMAP Timetable",
    "SRMAP Resources",
  ],
  authors: [{ name: "Student Corner Team" }],
  metadataBase: new URL("https://srmapi.in"),
  alternates: {
    canonical: "./",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Student Corner - SRM AP",
    description: "Student portal for SRM University AP students.",
    url: "https://srmapi.in",
    siteName: "Student Corner - SRM AP",
    images: [
      {
        url: "/icons/portal_logo.png",
        width: 1024,
        height: 1024,
        alt: "SRMAP API Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  verification: {
    google: "7jojaX5OVabW3qlu",
  },
  icons: {
    icon: [
      { url: "/icons/portal_logo.png?v=2", sizes: "any" },
      { url: "/icons/192x192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icons/512x512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/portal_logo.png?v=2",
    apple: "/icons/apple-touch-icon.png?v=2",
  },
};

const sitelinksJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SRMAP API",
    alternateName: ["SRMAP Portal", "Srmapi"],
    url: "https://srmapi.in",
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "SRMAP API Key Features",
    itemListElement: [
      {
        "@type": "SiteNavigationElement",
        position: 1,
        name: "CGPA Calculator",
        description: "Calculate SGPA and CGPA for SRM AP courses easily.",
        url: "https://srmapi.in/cgpa",
      },
      {
        "@type": "SiteNavigationElement",
        position: 2,
        name: "Attendance Tracker",
        description: "Track your class attendance percentage and margin.",
        url: "https://srmapi.in/attendance",
      },
      {
        "@type": "SiteNavigationElement",
        position: 3,
        name: "Timetable",
        description: "View your daily schedule and upcoming classes.",
        url: "https://srmapi.in/timetable",
      },
      {
        "@type": "SiteNavigationElement",
        position: 4,
        name: "Exams & Results",
        description: "Check internal exam marks and semester results.",
        url: "https://srmapi.in/exams",
      },
      {
        "@type": "SiteNavigationElement",
        position: 5,
        name: "Resources & Notes",
        description: "Access study materials, previous papers, and notes.",
        url: "https://srmapi.in/resources",
      },
      {
        "@type": "SiteNavigationElement",
        position: 6,
        name: "About Us",
        description: "Learn more about SRMAP API portal.",
        url: "https://srmapi.in/aboutus",
      },
    ],
  },
];

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/icons/portal_logo.png?v=2" />
        <link rel="shortcut icon" type="image/png" href="/icons/portal_logo.png?v=2" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sitelinksJsonLd) }}
        />
      </head>
      <body className={`${poppins.variable} font-sans relative min-h-screen overflow-x-hidden`}>
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        <AuroraBackground />
        <GoogleAnalytics />
        <LocalStorageProvider>
          <AuthProvider>
            <StudentDataProvider>
              <ThemeProvider>
                <ErrorBoundary fallback={<ErrorFallBack />}>
                  <Suspense fallback={null}>
                    <ProgressBar />
                    {children}
                  </Suspense>
                  <Toaster />
                </ErrorBoundary>
              </ThemeProvider>
            </StudentDataProvider>
          </AuthProvider>
        </LocalStorageProvider>
      </body>
    </html>
  );
}