import type { NextConfig } from "next";
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  webpack: (config, { isServer }) => {
    // Handle canvas module for react-pdf
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('canvas');
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    
    return config;
  },
  images: {
    remotePatterns: [
      // Primary public bucket hostname (configurable)
      ...(process.env.NEXT_PUBLIC_R2_HOSTNAME ? [{
        protocol: "https" as const,
        hostname: process.env.NEXT_PUBLIC_R2_HOSTNAME,
        pathname: "/**",
      }] : []),
      // Legacy Cloudflare R2 S3-style endpoint for existing objects
      {
        protocol: "https",
        hostname: "14d1d4528aaefcc1f32912faf86ca612.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      // Public R2 bucket hostname
      {
        protocol: "https",
        hostname: "pub-118afec7cb16482aa1157fc863f4911a.r2.dev",
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

// Configure MDX
const withMDX = createMDX({
  // Optionally provide remark and rehype plugins
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
