import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  
  // Configure caching to avoid permission issues
  generateEtags: false,
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Exclude problematic Node.js modules from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        assert: false,
        http: false,
        https: false,
        url: false,
        zlib: false,
      };
    }

    // Ignore canvas and other native modules
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('canvas');
    }

    return config;
  },
  
  // Remove experimental.esmExternals as it's not recommended
}

export default nextConfig