import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  generateBuildId: () => {
    return `build-${Date.now()}`;
  },
  experimental: {
  },
};

export default nextConfig;
