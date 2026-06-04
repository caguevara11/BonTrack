import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root,
  },
};

export default nextConfig;
