import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: false,
    formats: ["image/webp", "image/avif"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    loader: "default",
  },
  
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'd3',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
    cssChunking: true,
    scrollRestoration: true,
    optimizeCss: true,
    inlineCss: true,
    turbopackRemoveUnusedExports: true,
    turbopackMinify: true,
    optimisticClientCache: true,
  },
};

export default nextConfig;
