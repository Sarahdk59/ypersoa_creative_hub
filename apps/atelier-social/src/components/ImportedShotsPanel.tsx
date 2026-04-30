"use client";

import { useEffect, useState } from "react";
import { Heart, Camera, Loader2, Check } from "lucide-react";
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
    <div className="border border-rose-200 rounded-2xl bg-rose-50/40 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          <h3 className="text-sm font-bold text-rose-700">
            Shots favoris depuis Atelier Shooting
          </h3>
          {shots.length > 0 && (
            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold">
              {shots.length}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-rose-600 hover:underline disabled:opacity-50"
        >
          {loading ? "Chargement…" : "Rafraîchir"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 mb-3">{error}</div>
      )}

      {!loading && shots.length === 0 && (
        <div className="text-xs text-slate-500 italic py-4 text-center">
          Aucun shot liké pour l&apos;instant. Likez un shot dans Atelier Shooting pour le retrouver ici.
        </div>
      )}

      {shots.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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
  );
}
