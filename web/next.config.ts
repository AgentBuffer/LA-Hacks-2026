import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project so Next 16 doesn't pick
  // up a stray lockfile from $HOME.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
