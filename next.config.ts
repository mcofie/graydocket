import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF is noticeably smaller than WebP; browsers without it fall back to WebP
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
