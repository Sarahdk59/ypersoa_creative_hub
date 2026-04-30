/**
 * HubSidebarIcon — bouton d'app dans la sidebar 64px.
 *
 * État inactif : opacity 0.45, icône stroke ink, pas de fond.
 * État hover : opacity 0.8 (transition 150ms).
 * État actif : background ink, icône stroke cream, border-radius 8px.
 *
 * Tooltip DM Sans 12px à droite de l'icône au hover.
 *
 * Permet aussi un mode "disabled" (shooting "À venir") qui rend
 * l'icône non-cliquable et affiche un tooltip dédié.
 */
"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";

interface HubSidebarIconProps {
  icon: ReactNode;
  label: string;
  href: string;
  active: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function HubSidebarIcon({
  icon,
  label,
  href,
  active,
  disabled = false,
  disabledTooltip,
}: HubSidebarIconProps) {
  const [hovered, setHovered] = useState(false);

  const visibleTooltip = disabled && disabledTooltip ? disabledTooltip : label;

  const baseStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 150ms ease, background 150ms ease",
    opacity: active ? 1 : disabled ? 0.25 : hovered ? 0.8 : 0.45,
    background: active ? "var(--hub-foreground)" : "transparent",
    color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    left: 52,
    top: "50%",
    transform: "translateY(-50%)",
    background: "var(--hub-foreground)",
    color: "var(--hub-bg)",
    padding: "6px 10px",
    borderRadius: 6,
    whiteSpace: "nowrap",
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    fontWeight: 400,
    pointerEvents: "none",
    opacity: hovered ? 1 : 0,
    transition: "opacity 120ms ease",
    zIndex: 50,
  };

  const inner = (
    <div
      style={baseStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={visibleTooltip}
      role={disabled ? "presentation" : undefined}
    >
      {icon}
      <span style={tooltipStyle}>{visibleTooltip}</span>
    </div>
  );

  // Wrap dans une div relative pour positionner le tooltip absolu
  if (disabled) {
    return <div style={{ position: "relative" }}>{inner}</div>;
  }

  return (
    <Link href={href} style={{ position: "relative", display: "block" }} aria-label={label}>
      {inner}
    </Link>
  );
}
