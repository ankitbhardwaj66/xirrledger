import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enable static export for Hostinger
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // Better for static hosting
};

export default nextConfig;
