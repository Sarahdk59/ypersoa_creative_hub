/**
 * HubSidebar — chrome latérale 64px, 3 icônes verticales.
 *
 * Détecte l'app active via usePathname (Next App Router).
 * Atelier-shooting est explicitement disabled aujourd'hui : tooltip
 * "À venir, prochaine session" + pas de href cliquable.
 */
"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, Camera, BookImage, Compass } from "lucide-react";
import { HubSidebarIcon } from "./HubSidebarIcon";

export function HubSidebar() {
  const pathname = usePathname() || "";

  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");

  return (
    <nav
      aria-label="Hub navigation"
      className="flex flex-col items-center"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--hub-bg)",
        borderRight: "0.5px solid var(--hub-border)",
        paddingTop: 12,
        gap: 6,
        height: "100%",
      }}
    >
      <HubSidebarIcon
        icon={<MessageCircle size={20} strokeWidth={1.6} />}
        label="Atelier Social"
        href="/social"
        active={isActive("/social")}
      />
      <HubSidebarIcon
        icon={<Camera size={20} strokeWidth={1.6} />}
        label="Atelier Shooting"
        href="/shooting"
        active={isActive("/shooting")}
      />
      <HubSidebarIcon
        icon={<BookImage size={20} strokeWidth={1.6} />}
        label="Atelier Lookbook"
        href="/lookbook"
        active={isActive("/lookbook")}
      />
      <HubSidebarIcon
        icon={<Compass size={20} strokeWidth={1.6} />}
        label="Atelier DA"
        href="/atelier-da"
        active={isActive("/atelier-da")}
      />
    </nav>
  );
}
