import type { NextConfig } from "next";

const config: NextConfig = {
  // Browser tests must not compete with the clinician's running development server.
  distDir: process.env.ASTERIA_E2E === "1" ? ".next-e2e" : ".next",
};

export default config;
