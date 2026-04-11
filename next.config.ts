import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 31536000,
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '*.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  },
};
export default nextConfig;
