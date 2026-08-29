const withSerwistInit = require("@serwist/next").default;

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://student.srmap.edu.in https://*.googleusercontent.com https://lh3.googleusercontent.com https://drive.google.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://student.srmap.edu.in https://*.googleapis.com https://www.google-analytics.com https://generativelanguage.googleapis.com https://leetcode.com https://discord.com",
      "frame-src 'self' https://classroom.google.com https://drive.google.com https://youtube.com https://www.youtube.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; "),
  },
];

const config = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: !isDev,
  trailingSlash: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "student.srmap.edu.in",
      },
    ],
  },
  serverExternalPackages: ["sharp", "tfjs-tflite-node", "@tensorflow/tfjs"],
};

if (isDev) {
  module.exports = config;
} else {
  const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    exclude: [
      /.*/,
    ],
  });

  module.exports = withSerwist(config);
}
