/**
 * HubSidebar — chrome latérale 236px, groupée et libellée (chrome v2).
 *
 * Groupe "Les ateliers" : Social, Blog, Planning, Studio, Bibliothèque
 * (nommage voulu par Sarah, refonte du 20/08/2026). Groupe suivant, même
 * niveau visuel : Atelier DA (casting/ambiances/incarnations/Radar) et
 * Atelier Production. Référentiel (motifs + produits) a entièrement fusionné
 * dans Bibliothèque le 21/08/2026 ("tout au même endroit") — plus d'entrée
 * top-level séparée. Radar a rejoint Atelier DA le 21/08/2026 (n'était plus
 * un atelier de premier niveau) — cf. _passations/DESIGN_SYSTEM_hub.md v2.
 *
 * Détecte l'app active via usePathname (Next App Router).
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Newspaper,
  CalendarClock,
  Clapperboard,
  Library,
  Compass,
  Cpu,
  BookOpen,
  Palette,
  Settings,
} from "lucide-react";
import { HubSidebarItem } from "./HubSidebarItem";
import { useAuth } from "./auth/AuthProvider";
import { canAccess, ROLE_LABELS } from "@/lib/access";
import { supabase } from "@/lib/supabase";

interface AtelierEntry {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeKey?: "socialToValidate";
}

const ATELIERS: AtelierEntry[] = [
  { href: "/social", label: "Social", icon: <MessageCircle size={17} strokeWidth={1.6} />, badgeKey: "socialToValidate" },
  { href: "/blog", label: "Blog", icon: <Newspaper size={17} strokeWidth={1.6} /> },
  { href: "/planning", label: "Planning", icon: <CalendarClock size={17} strokeWidth={1.6} /> },
  { href: "/studio", label: "Studio", icon: <Clapperboard size={17} strokeWidth={1.6} /> },
  { href: "/bibliotheque", label: "Bibliothèque", icon: <Library size={17} strokeWidth={1.6} /> },
];

const REFERENTIELS: AtelierEntry[] = [
  { href: "/atelier-da", label: "Atelier DA", icon: <Compass size={17} strokeWidth={1.6} /> },
  { href: "/atelier-production", label: "Atelier Production", icon: <Cpu size={17} strokeWidth={1.6} /> },
];

export function HubSidebar() {
  const pathname = usePathname() || "";
  const { role, loading, displayName, email } = useAuth();
  const [socialToValidate, setSocialToValidate] = useState<number | null>(null);

  const isActive = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");
  const show = (href: string) => loading || canAccess(role, href);

  // Badge "à valider" — heuristique v1 : packs créés ≤ 7 jours, pas encore
  // marqués favoris. Ajustable au fil de l'usage (cf. plan refonte 20/08/2026).
  useEffect(() => {
    if (!supabase) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("social_packs")
      .select("id", { count: "exact", head: true })
      .eq("is_favorite", false)
      .gte("created_at", since)
      .then(({ count }) => setSocialToValidate(count ?? 0));
  }, [pathname]);

  const badgeFor = (key?: AtelierEntry["badgeKey"]) => {
    if (key === "socialToValidate") return socialToValidate && socialToValidate > 0 ? socialToValidate : null;
    return null;
  };

  return (
    <nav
      aria-label="Hub navigation"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--hub-bg)",
        borderRight: "0.5px solid var(--hub-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px 12px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "color-mix(in srgb, var(--hub-foreground) 45%, transparent)",
            padding: "4px 16px 8px",
          }}
        >
          Les ateliers
        </div>
        {ATELIERS.map(
          (a) =>
            show(a.href) && (
              <HubSidebarItem
                key={a.href}
                icon={a.icon}
                label={a.label}
                href={a.href}
                active={isActive(a.href)}
                badge={badgeFor(a.badgeKey)}
              />
            ),
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
        {REFERENTIELS.map(
          (a) =>
            show(a.href) && (
              <HubSidebarItem key={a.href} icon={a.icon} label={a.label} href={a.href} active={isActive(a.href)} />
            ),
        )}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="hub-stitch" style={{ color: "var(--hub-border)", margin: "4px 16px 10px" }} />
        <HubSidebarItem icon={<Palette size={17} strokeWidth={1.6} />} label="Brand Book" href="/brand" active={isActive("/brand")} />
        <HubSidebarItem icon={<BookOpen size={17} strokeWidth={1.6} />} label="Guide d'utilisation" href="/guide" active={isActive("/guide")} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 12px 4px",
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--hub-accent-soft)",
              color: "var(--hub-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-serif)",
              fontSize: 13,
              fontWeight: 500,
              flex: "none",
            }}
          >
            {(displayName ?? email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--hub-foreground)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName ?? email ?? "…"}
            </div>
            {role && (
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55, color: "var(--hub-foreground)" }}>
                {ROLE_LABELS[role]}
              </div>
            )}
          </div>
          <Settings size={15} strokeWidth={1.6} style={{ marginLeft: "auto", opacity: 0.4, flex: "none" }} />
        </div>
      </div>
    </nav>
  );
}
