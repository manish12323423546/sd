import type { NextConfig } from "next";
import { legacyPostRedirects } from "./lib/posts";

const allowIndexing = process.env.ALLOW_INDEXING === "true";

const nextConfig: NextConfig = {
  // The replica lives inside another repo: keep Turbopack and file tracing scoped to this folder.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1440, 1920],
  },
  async redirects() {
    return Object.entries(legacyPostRedirects).map(([from, to]) => ({
      source: `/blog/${from.replace(/\.$/, "")}{.}?`,
      destination: `/blog/${to}`,
      permanent: true,
    }));
  },
  async headers() {
    return allowIndexing
      ? []
      : [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
