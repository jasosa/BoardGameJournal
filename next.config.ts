import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stops `next dev` writing AGENTS.md when it detects an AI coding agent. CLAUDE.md is our rulebook.
  agentRules: false,
  experimental: {
    // The proxy buffers request bodies. Keep this at least as large as the server action limit,
    // otherwise larger uploads are cut off and fail with a server error, not a clear message.
    proxyClientMaxBodySize: "11mb",
    serverActions: {
      // Cover uploads are limited to 10 MB in the app. The extra room is for multipart overhead.
      bodySizeLimit: "11mb",
    },
  },
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
