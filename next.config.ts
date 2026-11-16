import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.CS2_BUILD_DIR || ".next",
  /* config options here */
  reactStrictMode: false,
};

export default nextConfig;
