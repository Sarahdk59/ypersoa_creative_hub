/**
 * Fiche prod imprimable d'une palette — usage Adriana en atelier.
 * Page autonome (sans HubShell) optimisée pour l'impression A4 / export PDF
 * via Cmd+P / "Enregistrer sous PDF".
 */
import { notFound } from "next/navigation";
import { getPalettes, getFils } from "@/lib/atelier-da/referentiels-loader";
import { FicheProdClient } from "./FicheProdClient";

export const dynamic = "force-dynamic";

export default async function FicheProdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const palettesRef = getPalettes();
  const palette = palettesRef.palettes.find((p) => p.id === id);
  if (!palette) notFound();

  const filsRef = getFils();
  const filsByid = new Map(filsRef.couleurs.map((c) => [c.id, c]));
  const fils = palette.fils
    .map((fid) => filsByid.get(fid))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  return <FicheProdClient palette={palette} fils={fils} generatedAt={new Date().toISOString().slice(0, 10)} />;
}
