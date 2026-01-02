import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import rehypePrettyCode from "rehype-pretty-code";

const nextConfig: NextConfig = {
  output: "standalone",
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  webpack: (config, { isServer }) => {
    // Handle canvas module for react-pdf
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("canvas");
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
      // MinIO/Self-hosted storage (configurable)
      ...(process.env.NEXT_PUBLIC_STORAGE_HOSTNAME
        ? [
            {
              protocol: (process.env.NODE_ENV === "production" ? "https" : "http") as
                | "http"
                | "https",
              hostname: process.env.NEXT_PUBLIC_STORAGE_HOSTNAME,
              port: process.env.NODE_ENV === "production" ? "" : "9000",
              pathname: "/**",
            },
          ]
        : []),
      // Localhost for development
      {
        protocol: "http" as const,
        hostname: "localhost",
        port: "9000",
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
      {
        protocol: "https",
        hostname: "api.microlink.io",
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
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: {
            dark: "github-dark-dimmed",
            light: "github-light",
          },
          keepBackground: false,
          defaultLang: {
            block: "plaintext",
            inline: "plaintext",
          },
          grid: true,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
