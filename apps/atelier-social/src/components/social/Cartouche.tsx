"use client";

import { cartoucheTokens, CARTOUCHE_DIMENSIONS, type CartoucheFormat, type CartoucheVariant } from "@/lib/cartouche/tokens";

export interface CartouchePayload {
  kicker?: string;
  titre?: string;
  citation?: string;
  prenom?: string;
  etoiles?: number;
}

export function Cartouche({ variant, format, payload, backgroundSvg, templateSvg }: { variant: CartoucheVariant; format: CartoucheFormat; payload: CartouchePayload; backgroundSvg?: string | null; templateSvg?: string | null }) {
  const { width, height } = CARTOUCHE_DIMENSIONS[format];
  const t = cartoucheTokens;
  const scale = height / 1350;
  const center = width / 2;
  const title = variant === "avis" ? payload.citation || "Un mot doux qui reste." : payload.titre || "Une histoire à raconter.";
  const kicker = variant === "avis" ? "★★★★★" : payload.kicker || (variant === "selection" ? "MA SÉLECTION" : "YPERSOA");
  const fontSize = variant === "avis" ? 58 : variant === "selection" ? 94 : 108;
  const y = (variant === "avis" ? 570 : 635) * scale;
  const cleanTemplate = templateSvg?.replace(/<text\b[\s\S]*?<\/text>/gi, "") ?? null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cartouche Ypersoa" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {cleanTemplate && format === "r4_5" ? <image href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanTemplate)}`} width={width} height={height} /> : <>
        <rect width={width} height={height} fill={t.color.creme} />
        {variant !== "avis" && backgroundSvg && <foreignObject width={width} height={height} opacity="0.12"><div dangerouslySetInnerHTML={{ __html: backgroundSvg }} /></foreignObject>}
        <rect x={40} y={40} width={width - 80} height={height - 80} rx={16} fill="none" stroke={t.color.coquelicot} strokeWidth={4} />
      </>}
      <text x={center} y={190 * scale} textAnchor="middle" fill={variant === "avis" ? t.color.ocre : t.color.teal} fontFamily="var(--font-sans)" fontWeight="700" fontSize={variant === "avis" ? 42 : 28} letterSpacing={variant === "avis" ? 8 : 5}>{kicker}</text>
      <text x={center} y={y} textAnchor="middle" fill={variant === "avis" ? t.color.marine : t.color.coquelicot} fontFamily="var(--font-serif)" fontWeight="600" fontSize={fontSize}>
        {title.length > 52 ? `${title.slice(0, 49)}…` : title}
      </text>
      {variant === "avis" && <text x={center} y={1035 * scale} textAnchor="middle" fill={t.color.marine} fontFamily="var(--font-sans)" fontWeight="600" fontSize={32}>{payload.prenom || ""}</text>}
      {!cleanTemplate && <g transform={`translate(${center - 36} ${height - 140 * scale})`} fill="none" stroke={t.color.coquelicot} strokeWidth="6">
        <circle cx="36" cy="36" r="28" /><circle cx="36" cy="8" r="16" /><circle cx="64" cy="36" r="16" /><circle cx="36" cy="64" r="16" /><circle cx="8" cy="36" r="16" />
      </g>}
    </svg>
  );
}
