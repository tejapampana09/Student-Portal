const withSerwistInit = require("@serwist/next").default;

const isDev = process.env.NODE_ENV === "development";

const config = {
  reactStrictMode: !isDev,
  trailingSlash: false,
  devIndicators: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "student.srmap.edu.in",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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