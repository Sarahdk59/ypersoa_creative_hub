import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ypersoa — Atelier Lookbook",
  description: "Studio de production de lookbooks IA Ypersoa (briefs poétiques → ambiances saisonnières)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
