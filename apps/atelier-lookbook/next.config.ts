import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb", // pour images base64 (12-20 images de 1-2 MB chacune)
    },
  },
};

export default nextConfig;
