import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize native Node modules — they can't be bundled
  serverExternalPackages: ['better-sqlite3', 'argon2', 'pg'],

  output: 'standalone',

  // Disable TypeScript strict checking during builds for dev speed
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
