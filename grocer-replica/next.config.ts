import type { NextConfig } from "next";
import path from "node:path";

// This project can live inside a larger repository (it is deployed from a subfolder). Pin the
// workspace root to this folder so Next.js never picks up a parent lockfile, middleware or config.
const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
