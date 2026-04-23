import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
    ],
  },
};

export default config;
