import { redirect } from "next/navigation";

/** Déplacé vers /bibliotheque/motifs/[destinataire] le 21/08/2026. */
export default async function ReferentielMotifsDestinataireRedirect({
  params,
}: {
  params: Promise<{ destinataire: string }>;
}) {
  const { destinataire } = await params;
  redirect(`/bibliotheque/motifs/${destinataire}`);
}
