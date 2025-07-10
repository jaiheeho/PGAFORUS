import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // Ensure the `@/` alias always points to the `src` directory
    config.resolve.alias['@'] = require('path').resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;
