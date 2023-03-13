/** @type {import('next').NextConfig} */ 
require("dotenv").config 
const nextConfig = { 
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  env:{
    NEXT_PUBLIC_IPFS_SECRET: process.env.NEXT_PUBLIC_IPFS_SECRET || "",
    NEXT_PUBLIC_IPFS_KEY: process.env.NEXT_PUBLIC_IPFS_KEY || "",
    LK_API: process.env.LK_API || "",
    HUGGING_FACE_TOKEN: process.env.HUGGING_FACE_TOKEN || "",
    HUGGING_FACE_URL: process.env.HUGGING_FACE_URL || "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || ""
  },
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false
    }
    config.resolve.mainFields = ['browser', 'main', 'module']
    return config
  }
}

module.exports = nextConfig
