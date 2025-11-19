import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cards.scryfall.io",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    const appRewrites = [];

    if (process.env.NODE_ENV === "development") {
      // during dev, proxy to local `wrangler dev` for /api/list/*
      appRewrites.push({
        source: "/api/:path*",
        destination: "http://localhost:8787/api/:path*",
      });
    }
    return appRewrites;
  },
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
