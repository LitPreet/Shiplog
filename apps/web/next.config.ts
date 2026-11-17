import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The demo customer site lives in public/demo/index.html; serve it at /demo.
  async rewrites() {
    return [{ source: "/demo", destination: "/demo/index.html" }];
  },
};

export default nextConfig;
