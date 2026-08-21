/**
 * HubSidebarItem — ligne d'atelier dans la sidebar 236px (chrome v2).
 *
 * Remplace HubSidebarIcon (icônes seules 64px, v1). Icône + libellé +
 * badge de compteur optionnel. État actif : fond --hub-accent-wash, trait
 * vertical --hub-accent 4px à gauche, icône teintée coquelicot
 * (cf. DESIGN_SYSTEM_hub.md v2, §3 nav active — un des 5 emplacements coquelicot autorisés).
 */
"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface HubSidebarItemProps {
  icon: ReactNode;
  label: string;
  href: string;
  active: boolean;
  badge?: number | string | null;
}

export function HubSidebarItem({ icon, label, href, active, badge }: HubSidebarItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "9px 14px 9px 16px",
        borderRadius: 10,
        textDecoration: "none",
        fontFamily: "var(--font-sans)",
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--hub-foreground)" : "color-mix(in srgb, var(--hub-foreground) 72%, transparent)",
        background: active ? "var(--hub-accent-wash)" : "transparent",
        transition: "background 150ms ease, color 150ms ease",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--hub-bg-alt)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: -12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 4,
            height: 20,
            borderRadius: "0 4px 4px 0",
            background: "var(--hub-accent)",
          }}
        />
      )}
      <span style={{ display: "flex", flex: "none", opacity: active ? 1 : 0.75, color: active ? "var(--hub-accent)" : "inherit" }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {badge != null && (
        <span
          style={{
            flex: "none",
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            background: "var(--hub-accent)",
            borderRadius: 999,
            padding: "1px 7px",
            lineHeight: 1.5,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
