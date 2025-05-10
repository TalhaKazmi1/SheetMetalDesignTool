import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      three: require.resolve("three"),
    }
    return config
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
