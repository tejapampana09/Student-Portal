import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://3.87.134.201.sslip.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/profile/", "/settings/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}