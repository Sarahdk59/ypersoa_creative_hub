import type { Metadata } from "next";
import "./globals.css";
import { HubShell } from "@/components/HubShell";

export const metadata: Metadata = {
  title: "Ypersoa Hub",
  description: "Studio textile premium — chrome unifiée pour les ateliers Ypersoa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/jam4mtl.css" />
      </head>
      <body>
        <HubShell>{children}</HubShell>
      </body>
    </html>
  );
}
