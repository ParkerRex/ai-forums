import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Primary public bucket hostname (configurable)
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_R2_HOSTNAME!,
        pathname: "/**",
      },
      // Legacy Cloudflare R2 S3-style endpoint for existing objects
      {
        protocol: "https",
        hostname: "14d1d4528aaefcc1f32912faf86ca612.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      // Giphy media domains
      {
        protocol: "https",
        hostname: "media0.giphy.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media1.giphy.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media2.giphy.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media3.giphy.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media4.giphy.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
