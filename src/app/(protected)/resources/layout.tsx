import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Resources & Notes",
  description: "Access curated study material, lecture notes, syllabus guides, and previous question papers for SRM AP courses.",
  alternates: {
    canonical: "https://3.87.134.201.sslip.io/resources",
  },
  openGraph: {
    title: "Study Resources & Notes | SRMAP API",
    description: "Access curated study material, lecture notes, syllabus guides, and previous question papers for SRM AP courses.",
    url: "https://3.87.134.201.sslip.io/resources",
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
      item: "https://3.87.134.201.sslip.io",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Study Resources",
      item: "https://3.87.134.201.sslip.io/resources",
    },
  ],
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
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