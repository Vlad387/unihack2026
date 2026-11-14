import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev only: lets a phone on the same Wi-Fi load the dev server's JS (otherwise the page renders but nothing is clickable).
  // shortcut: this Mac's current Wi-Fi IP, update it if the router hands out a new one
  allowedDevOrigins: ["192.168.1.105"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
