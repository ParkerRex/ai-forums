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
    ],
  },
};

export default nextConfig;
