import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about SRMAP API, an independent alternative student portal built by students for SRM University AP.",
  alternates: {
    canonical: "https://13.233.246.195.sslip.io/aboutus",
  },
  openGraph: {
    title: "About Us | SRMAP API",
    description: "Learn more about SRMAP API, an independent alternative student portal built by students for SRM University AP.",
    url: "https://13.233.246.195.sslip.io/aboutus",
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
      name: "About Us",
      item: "https://13.233.246.195.sslip.io/aboutus",
    },
  ],
};

export default function AboutUsLayout({ children }: { children: React.ReactNode }) {
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