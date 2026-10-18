import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Produces .next/standalone for the Docker image.
  output: "standalone",
};

export default nextConfig;
