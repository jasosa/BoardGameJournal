import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stops `next dev` writing AGENTS.md when it detects an AI coding agent. CLAUDE.md is our rulebook.
  agentRules: false,
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
