"use client";

import { useEffect, useState } from "react";
import { Heart, Camera, Loader2, Check, ChevronDown, ChevronRight } from "lucide-react";
import {
  ImportedShot,
  listImportedShots,
  fetchShotAsFile,
  markShotAsUsed,
} from "@/lib/imported-shots";
import { isSupabaseConfigured } from "@/lib/supabase";

interface Props {
  onImport: (file: File, base64: string) => void;
}

export function ImportedShotsPanel({ onImport }: Props) {
  const [shots, setShots] = useState<ImportedShot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const supabaseOn = isSupabaseConfigured();

  const refresh = async () => {
    if (!supabaseOn) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listImportedShots();
      setShots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Re-fetch quand on revient sur l'onglet (retour depuis Atelier Shooting
    // après avoir liké des shots) → la liste se met à jour sans clic manuel.
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const handlePick = async (shot: ImportedShot) => {
    setImportingId(shot.id);
    try {
      const { file, base64 } = await fetchShotAsFile(shot);
      onImport(file, base64);
      markShotAsUsed(shot.id).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportingId(null);
    }
  };

  if (!supabaseOn) return null;

  return (
    <div className="border border-rose-200 rounded-xl bg-rose-50/40 mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-rose-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span className="text-xs font-bold text-rose-700">
            Shots favoris depuis Atelier Shooting
          </span>
          {shots.length > 0 && (
            <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-semibold">
              {shots.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); refresh(); }}
            disabled={loading}
            className="text-[10px] text-rose-500 hover:underline disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "↺"}
          </button>
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-rose-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-rose-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3">
          {error && <div className="text-xs text-red-600 mb-2">{error}</div>}

          {!loading && shots.length === 0 && (
            <div className="text-xs text-slate-500 italic py-3 text-center">
              Aucun shot liké. Likez un shot dans Atelier Shooting pour le retrouver ici.
            </div>
          )}

          {shots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {shots.map((shot) => {
                const isImporting = importingId === shot.id;
                const wasUsed = Boolean(shot.used_in_caption_at);
                return (
                  <button
                    key={shot.id}
                    onClick={() => handlePick(shot)}
                    disabled={isImporting}
                    className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-rose-200 hover:border-rose-400 transition-all disabled:opacity-60"
                    title={shot.shot_label || "Shot importé"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.image_url}
                      alt={shot.shot_label || "shot"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                      <span className="text-[9px] text-white font-semibold uppercase tracking-tight truncate">
                        {shot.shot_label || "Shot"}
                      </span>
                      {wasUsed && (
                        <Check className="w-3 h-3 text-green-300" aria-label="déjà utilisé" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/20 transition-all flex items-center justify-center">
                      {isImporting ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
