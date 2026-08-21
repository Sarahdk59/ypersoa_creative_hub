/**
 * HubTabNav — bandeau d'onglets réutilisé par les ateliers fusionnés
 * (Planning, Bibliothèque, Studio — cf. refonte nav du 20/08/2026).
 *
 * Chaque onglet est une vraie sous-route (pas un state client) : on garde
 * les gros composants historiques (kanban, rétroplanning, shooting book…)
 * intacts sur leur propre page plutôt que de les inliner dans un switch.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface HubTab {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Rôle de cet onglet précisément, affiché sous la barre quand il est actif. */
  description?: string;
}

interface HubTabNavProps {
  title: string;
  subtitle?: string;
  tabs: HubTab[];
  /** Barre de travail compacte : utilisée quand le contenu qui suit est un atelier plein écran. */
  compact?: boolean;
}

export function HubTabNav({ title, subtitle, tabs, compact = false }: HubTabNavProps) {
  const pathname = usePathname() || "";
  const activeTab = tabs.find((t) => pathname === t.href || pathname.startsWith(t.href + "/"));

  if (compact) {
    // /studio est désormais une porte d'entrée éditoriale : les onglets ne
    // s'affichent qu'une fois qu'un atelier est choisi.
    if (pathname === "/studio") return null;
    return (
      <nav
        aria-label={`Onglets ${title}`}
        style={{
          height: 54,
          display: "flex",
          alignItems: "stretch",
          gap: 4,
          padding: "0 24px",
          borderBottom: "0.5px solid var(--hub-border)",
          background: "var(--hub-bg)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginRight: 14,
            fontFamily: "var(--font-serif)",
            fontSize: 20,
            fontWeight: 500,
            color: "var(--hub-foreground)",
          }}
        >
          {title}
        </span>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 13px",
                borderBottom: active ? "2px solid var(--hub-accent)" : "2px solid transparent",
                color: active ? "var(--hub-foreground)" : "color-mix(in srgb, var(--hub-foreground) 58%, transparent)",
                fontFamily: "var(--font-sans)",
                fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                textDecoration: "none",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          color: "var(--hub-foreground)",
          margin: 0,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13.5,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            marginTop: 6,
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}

      <nav
        aria-label={`Onglets ${title}`}
        style={{
          display: "flex",
          gap: 4,
          marginTop: 20,
          borderBottom: "0.5px solid var(--hub-border)",
        }}
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 16px",
                marginBottom: -1,
                borderBottom: active ? "2px solid var(--hub-accent)" : "2px solid transparent",
                fontFamily: "var(--font-sans)",
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--hub-foreground)" : "color-mix(in srgb, var(--hub-foreground) 60%, transparent)",
                textDecoration: "none",
                transition: "color 150ms ease, border-color 150ms ease",
              }}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {activeTab?.description && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            color: "var(--hub-foreground)",
            opacity: 0.6,
            margin: "10px 0 0",
          }}
        >
          {activeTab.description}
        </p>
      )}
    </div>
  );
}
