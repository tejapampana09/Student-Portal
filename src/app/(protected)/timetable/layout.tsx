import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timetable & Class Schedule",
  description: "View your daily class schedule, timetable slots, classroom numbers, and faculty details for SRM University AP.",
  alternates: {
    canonical: "https://13.233.246.195.sslip.io/timetable",
  },
  openGraph: {
    title: "Timetable & Class Schedule | SRMAP API",
    description: "View your daily class schedule, timetable slots, classroom numbers, and faculty details for SRM University AP.",
    url: "https://13.233.246.195.sslip.io/timetable",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://13.233.246.195.sslip.io",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Timetable",
      item: "https://13.233.246.195.sslip.io/timetable",
    },
  ],
};

export default function TimetableLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}