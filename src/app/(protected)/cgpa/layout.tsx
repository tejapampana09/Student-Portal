import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CGPA & SGPA Calculator",
  description: "Calculate your SGPA and CGPA accurately for SRM University AP courses. Auto-fill grades or calculate manually.",
  alternates: {
    canonical: "https://13.233.246.195.sslip.io/cgpa",
  },
  openGraph: {
    title: "CGPA & SGPA Calculator | SRMAP API",
    description: "Calculate your SGPA and CGPA accurately for SRM University AP courses. Auto-fill grades or calculate manually.",
    url: "https://13.233.246.195.sslip.io/cgpa",
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
      name: "CGPA Calculator",
      item: "https://13.233.246.195.sslip.io/cgpa",
    },
  ],
};

export default function CGPALayout({ children }: { children: React.ReactNode }) {
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