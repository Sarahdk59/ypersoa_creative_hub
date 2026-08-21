/**
 * Onglet Studio · Shooting — option A (iframe), même pattern que Lookbook.
 *
 * Atelier-shooting est un projet Vite standalone (port 3001). Le merge dans
 * la stack Next.js reste possible plus tard si besoin de partage d'état.
 * Lancer les 3 apps ensemble : `pnpm dev:studio` depuis la racine.
 */
import { IframeApp } from "@/components/IframeApp";

const SHOOTING_URL = process.env.NEXT_PUBLIC_SHOOTING_URL || "http://localhost:3001";

export default function StudioShootingPage() {
  return <IframeApp url={SHOOTING_URL} title="Atelier Shooting" devCommand="pnpm dev:studio" />;
}
