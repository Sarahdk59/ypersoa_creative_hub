import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ypersoa - Atelier Social Hub",
  description: "Génération de contenus IG/Pinterest brand-safe pour Ypersoa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
