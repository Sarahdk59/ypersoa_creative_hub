"use client";

import Link from "next/link";
import { Palette, ImageIcon, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { MODES, MODE_ORDER, type ModeKey } from "@/app/social/modes.config";

/**
 * Chrome partagé de l'Atelier Social — bandeau rituel + sélecteur de mode.
 * Ne contient AUCUNE logique de génération : chaque mode reste responsable
 * de son propre moteur (Gemini/Pinterest, /api/avis/generate, /api/connexion/generate).
 */
export function AtelierShell({
  mode,
  onModeChange,
  children,
}: {
  mode: ModeKey;
  onModeChange: (m: ModeKey) => void;
  children: React.ReactNode;
}) {
  const active = MODES[mode];

  return (
    <div className="min-h-screen bg-hub-bg text-hub-foreground font-sans">
      <div className="flex items-center gap-5 px-6 md:px-8 py-3.5 border-b border-hub-border bg-hub-bg sticky top-0 z-20">
        <div
          className="flex items-center gap-2.5 font-serif font-semibold text-sm tracking-wide"
          style={{ color: "var(--hub-foreground)" }}
        >
          <AnimatedLogo size={22} />
          YPERSOA HUB
        </div>
        <span className="text-hub-foreground/50 text-sm">
          Atelier <b className="font-serif text-hub-foreground">Social</b>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/social/fonds"
            className="flex items-center gap-1.5 text-xs font-semibold text-hub-foreground hover:bg-hub-bg-alt px-3 py-1.5 rounded-full border border-hub-border transition-all"
          >
            <Palette className="w-3.5 h-3.5" />
            Fonds
          </Link>
          <Link
            href="/studio"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-hub-accent hover:bg-hub-accent-hover px-3 py-1.5 rounded-full transition-all"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Shooting social
          </Link>
          <Link
            href="/le-livre?tab=playbook"
            className="flex items-center gap-1.5 text-xs font-semibold text-hub-foreground hover:bg-hub-bg-alt px-3 py-1.5 rounded-full border border-hub-border transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Playbook
          </Link>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7">
        {/* BANDEAU RITUEL */}
        <section
          className="relative overflow-hidden rounded-[18px] border border-hub-border p-6 sm:p-7 shadow-[0_1px_2px_rgba(22,50,76,.05),0_8px_24px_rgba(22,50,76,.06)]"
          style={{ background: "linear-gradient(180deg, var(--hub-accent-wash), #fff 82%)" }}
        >
          <div className="hub-stitch absolute inset-x-0 top-0" style={{ color: `var(${active.colorVar})`, height: 4, opacity: 0.9 }} />
          <p className="text-[11px] font-semibold tracking-[.16em] uppercase" style={{ color: `var(${active.colorVar})` }}>
            {active.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-[30px] sm:text-[34px] leading-none text-hub-foreground">
            {active.hero.title}
          </h1>
          <p className="mt-2 font-serif text-[18px] sm:text-[19px]" style={{ color: "var(--hub-foreground)" }}>
            {active.hero.lead}
          </p>
          <p className="mt-1 text-sm text-hub-foreground/60 max-w-[60ch]">{active.hero.sub}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs font-medium bg-white border border-hub-border rounded-full px-3 py-1.5 text-hub-foreground">
              🧵 Atelier Social
            </span>
            <span
              className="text-xs font-medium rounded-full px-3 py-1.5 text-white"
              style={{ backgroundColor: `var(${active.colorVar})` }}
            >
              Pilier du moment · {active.pillar}
            </span>
          </div>
        </section>

        {/* SÉLECTEUR DE MODE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5">
          {MODE_ORDER.map((key) => {
            const m = MODES[key];
            const Icon = m.icon;
            const isOn = key === mode;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onModeChange(key)}
                className={cn(
                  "text-left rounded-[14px] border bg-[var(--card,#FBF7EF)] p-3.5 flex flex-col gap-2 transition-all",
                  isOn
                    ? "border-transparent shadow-[0_0_0_1.5px_var(--mc),0_1px_2px_rgba(22,50,76,.05),0_8px_24px_rgba(22,50,76,.06)] bg-white"
                    : "border-hub-border hover:-translate-y-0.5 hover:shadow-sm"
                )}
                style={isOn ? ({ "--mc": `var(${m.colorVar})` } as React.CSSProperties) : undefined}
              >
                <span
                  className="w-8 h-8 rounded-[10px] grid place-items-center text-white"
                  style={{ backgroundColor: `var(${m.colorVar})` }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span
                  className="font-serif text-[15px] leading-none"
                  style={{ color: isOn ? `var(${m.colorVar})` : "var(--hub-foreground)" }}
                >
                  {m.label}
                </span>
                <span className="text-[12px] text-hub-foreground/55 leading-snug">{m.detail}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
