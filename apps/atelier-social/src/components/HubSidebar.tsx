/**
 * HubSidebar — chrome latérale 64px, 5 icônes verticales.
 *
 * Détecte l'app active via usePathname (Next App Router).
 */
"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, Camera, BookImage, Compass, Cpu, TrendingUp, BookOpen, Palette } from "lucide-react";
import { HubSidebarIcon } from "./HubSidebarIcon";
import { useAuth } from "./auth/AuthProvider";
import { canAccess } from "@/lib/access";

export function HubSidebar() {
  const pathname = usePathname() || "";
  const { role, loading } = useAuth();

  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");

  // Pendant le chargement du rôle on montre tout (le middleware fait foi),
  // puis on masque les sections interdites au rôle.
  const show = (href: string) => loading || canAccess(role, href);

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
      {show("/social") && (
        <HubSidebarIcon
          icon={<MessageCircle size={20} strokeWidth={1.6} />}
          label="Atelier Social"
          href="/social"
          active={isActive("/social")}
        />
      )}
      {show("/shooting") && (
        <HubSidebarIcon
          icon={<Camera size={20} strokeWidth={1.6} />}
          label="Atelier Shooting"
          href="/shooting"
          active={isActive("/shooting")}
        />
      )}
      {show("/lookbook") && (
        <HubSidebarIcon
          icon={<BookImage size={20} strokeWidth={1.6} />}
          label="Atelier Lookbook"
          href="/lookbook"
          active={isActive("/lookbook")}
        />
      )}
      {show("/atelier-da") && (
        <HubSidebarIcon
          icon={<Compass size={20} strokeWidth={1.6} />}
          label="Atelier DA"
          href="/atelier-da"
          active={isActive("/atelier-da")}
        />
      )}
      {show("/atelier-trends") && (
        <HubSidebarIcon
          icon={<TrendingUp size={20} strokeWidth={1.6} />}
          label="Atelier Trends"
          href="/atelier-trends"
          active={isActive("/atelier-trends")}
        />
      )}
      {show("/atelier-production") && (
        <HubSidebarIcon
          icon={<Cpu size={20} strokeWidth={1.6} />}
          label="Atelier Production"
          href="/atelier-production"
          active={isActive("/atelier-production")}
        />
      )}

      {/* Aperçu Brand — référence Design System v1, visible par tous les rôles */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingBottom: 12 }}>
        <HubSidebarIcon
          icon={<Palette size={20} strokeWidth={1.6} />}
          label="Aperçu Brand"
          href="/brand"
          active={isActive("/brand")}
        />
        <HubSidebarIcon
          icon={<BookOpen size={20} strokeWidth={1.6} />}
          label="Guide d'utilisation"
          href="/guide"
          active={isActive("/guide")}
        />
      </div>
    </nav>
  );
}
