import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Generate unique build IDs to force cache refresh
  generateBuildId: () => {
    return `build-${Date.now()}`;
  },
  // Disable caching during development
  experimental: {
  },
};

export default nextConfig;
