import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silences Turbopack's workspace-root inference — it walks up from this
  // directory looking for lockfiles and picks up an unrelated
  // package-lock.json in the home directory otherwise.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
