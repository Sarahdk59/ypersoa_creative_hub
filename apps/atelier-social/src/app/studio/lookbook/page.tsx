/**
 * Onglet Studio · Lookbook — option A (iframe).
 *
 * atelier-lookbook tourne en dev server séparé (port 3003). Lancer les 3
 * apps ensemble : `pnpm dev:studio` depuis la racine.
 */
import { IframeApp } from "@/components/IframeApp";

const LOOKBOOK_URL = process.env.NEXT_PUBLIC_LOOKBOOK_URL || "http://localhost:3003";

export default function StudioLookbookPage() {
  return <IframeApp url={LOOKBOOK_URL} title="Atelier Lookbook" devCommand="pnpm dev:studio" />;
}
