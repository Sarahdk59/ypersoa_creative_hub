"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import {
  ActiveLookbookAmbiance,
  listActiveLookbookAmbiances,
  LOOKBOOK_VIBE_PREFIX,
} from "@/lib/active-ambiances";
import { AMBIANCES_OFFICIELLES } from "@/lib/ambiances-officielles";

/**
 * 6 ambiances officielles Ypersoa (source unique : lib/ambiances-officielles.ts).
 * Alignées entre Atelier Social, Atelier DA et Atelier Shooting depuis 2026-05-02.
 * + lookbooks ❤️ actifs (Hub partagé) exposés comme "ambiances de référence" 7 jours.
 *
 * VIBES gardé en export pour compatibilité avec page.tsx — alias de la lib partagée.
 */
export const VIBES = AMBIANCES_OFFICIELLES;

interface VibeSelectorProps {
  selectedVibe: string;
  onSelectVibe: (vibeId: string) => void;
}

export function VibeSelector({ selectedVibe, onSelectVibe }: VibeSelectorProps) {
  const [activeAmbiances, setActiveAmbiances] = useState<ActiveLookbookAmbiance[]>([]);

  useEffect(() => {
    listActiveLookbookAmbiances().then(setActiveAmbiances).catch(() => undefined);
  }, []);

  return (
    <div className="rounded-xl border border-brand-muted/15 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-muted">Ambiance visuelle</span>
        {activeAmbiances.length > 0 && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
      </div>
      <select
        value={selectedVibe}
        onChange={(event) => onSelectVibe(event.target.value)}
        className="w-full rounded-lg border border-brand-muted/20 bg-brand-bg/40 px-3 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-rose focus:ring-2 focus:ring-brand-rose/10"
      >
        <optgroup label="Ambiances Ypersoa">
          {VIBES.map((vibe) => <option key={vibe.id} value={vibe.id}>{vibe.label}</option>)}
        </optgroup>
        {activeAmbiances.length > 0 && (
          <optgroup label="Mes lookbooks actifs">
            {activeAmbiances.map((lookbook) => <option key={lookbook.id} value={`${LOOKBOOK_VIBE_PREFIX}${lookbook.id}`}>♥ {lookbook.titre}</option>)}
          </optgroup>
        )}
      </select>
      <p className="mt-2 text-xs leading-relaxed text-brand-muted">
        {VIBES.find((vibe) => vibe.id === selectedVibe)?.description ?? "Ambiance de référence issue d’un lookbook actif."}
      </p>
    </div>
  );
}
