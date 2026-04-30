"use client";

import { useMemo, useState } from "react";
import { Shuffle, Users, Check, ChevronDown, ChevronUp } from "lucide-react";
import { CanoniqueLite, getCanoniquesSorted } from "@/lib/canoniques";

export type CastingMode = "auto" | "pin";

interface Props {
  mode: CastingMode;
  pinnedIds: string[];
  onModeChange: (mode: CastingMode) => void;
  onPinnedChange: (ids: string[]) => void;
}

const GENRE_LABEL: Record<CanoniqueLite["genre"], string> = {
  F: "femme",
  H: "homme",
  enfant: "enfant",
};

export function CastingPicker({ mode, pinnedIds, onModeChange, onPinnedChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const canoniques = useMemo(() => getCanoniquesSorted(), []);
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const togglePin = (id: string) => {
    if (pinnedSet.has(id)) {
      onPinnedChange(pinnedIds.filter((x) => x !== id));
    } else {
      onPinnedChange([...pinnedIds, id]);
    }
  };

  const selectedSummary =
    pinnedIds.length === 0
      ? "Aucun canonique épinglé"
      : pinnedIds
          .map((id) => canoniques.find((c) => c.id === id)?.prenom)
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="mt-3 rounded-2xl border border-brand-muted/15 bg-white">
      <div className="flex items-stretch p-1 gap-1">
        <button
          type="button"
          onClick={() => onModeChange("auto")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            mode === "auto"
              ? "bg-brand-rose text-white"
              : "text-brand-muted hover:bg-brand-rose/5"
          }`}
          title="Le LLM choisit les canoniques en fonction du brief (random intelligent)"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Auto (random)
        </button>
        <button
          type="button"
          onClick={() => onModeChange("pin")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            mode === "pin"
              ? "bg-brand-rose text-white"
              : "text-brand-muted hover:bg-brand-rose/5"
          }`}
          title="Épingler 1+ canoniques que le LLM doit utiliser dans le lookbook"
        >
          <Users className="w-3.5 h-3.5" />
          Pin canoniques
        </button>
      </div>

      {mode === "pin" && (
        <div className="border-t border-brand-muted/10">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                {pinnedIds.length} épinglé{pinnedIds.length > 1 ? "s" : ""}
              </span>
              <span className="text-xs text-brand-text truncate max-w-[280px]">
                {selectedSummary}
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-brand-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brand-muted" />
            )}
          </button>

          {expanded && (
            <div className="px-3 pb-3 max-h-[320px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {canoniques.map((c) => {
                  const checked = pinnedSet.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePin(c.id)}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all text-left ${
                        checked
                          ? "border-brand-rose ring-2 ring-brand-rose/20"
                          : "border-brand-muted/15 hover:border-brand-rose/40"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/canoniques/${c.filename}`}
                        alt={c.prenom}
                        className="w-full aspect-[3/4] object-cover bg-brand-bg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0.25";
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent text-white px-1.5 py-1">
                        <div className="text-[10px] font-bold leading-tight truncate">
                          {c.favorite ? "⭐ " : ""}
                          {c.prenom}
                        </div>
                        <div className="text-[8px] opacity-80">
                          {c.age} · {GENRE_LABEL[c.genre]}
                        </div>
                      </div>
                      {checked && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-brand-rose rounded-full flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-brand-muted mt-3 italic leading-relaxed">
                Les canoniques épinglés seront utilisés en priorité par le LLM
                pour les prompts <em>canonique_humain</em>. Si tu en pin 0, le mode
                Auto reprend la main.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
