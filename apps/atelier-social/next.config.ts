import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // pour images base64
    },
  },
  async redirects() {
    // Séparation Production ↔ DA (16/05/2026) : fils/palettes uniquement.
    // Le redirect /atelier-da/motifs → /atelier-production/motifs a été RETIRÉ
    // le 20/05 : /atelier-da/motifs est désormais la vue catalogue créative
    // (Motifs / Variantes / Catalogue) et /atelier-production/motifs reste la
    // vue technique pour Adriana.
    // ⚠️ Si tu vois encore le redirect : vider le cache navigateur (308 est cached agressivement).
    return [
      { source: "/atelier-da/fils", destination: "/atelier-production/fils", permanent: false },
      { source: "/atelier-da/fils/:path*", destination: "/atelier-production/fils/:path*", permanent: false },
      { source: "/atelier-da/palettes", destination: "/atelier-production/palettes", permanent: false },
      { source: "/atelier-da/palettes/:path*", destination: "/atelier-production/palettes/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
