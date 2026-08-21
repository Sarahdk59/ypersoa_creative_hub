/**
 * Dépôt direct pour les deux gestes simples d'Atelier Motion.
 * Le fichier est versé dans la médiathèque avant la génération : le clip reste
 * donc traçable et réutilisable dans le Hub.
 */
"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { createMedia } from "@/lib/mediatheque/api-client";
import { uploadMediaFile } from "@/lib/mediatheque/storage";
import type { MotionMode, MotionSourceMedia } from "@/types/motion";

interface MotionImageUploadProps {
  mode: Extract<MotionMode, "macro" | "porte">;
  onUploaded: (source: MotionSourceMedia) => void;
}

export function MotionImageUpload({ mode, onUploaded }: MotionImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisis une image JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("L'image doit faire moins de 15 Mo.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const source = mode === "macro" ? "packshot" : "shooting_lifestyle";
      const stored = await uploadMediaFile(file, source);
      const media = await createMedia({
        filename: file.name,
        public_url: stored.public_url,
        storage_path: stored.storage_path,
        size_bytes: file.size,
        mime_type: file.type || "image/jpeg",
        source,
        statut: "a_valider",
        notes: mode === "macro" ? "Ajout direct Atelier Motion — macro" : "Ajout direct Atelier Motion — produit porté",
      });
      onUploaded({
        type: "media",
        id: media.id,
        label: media.filename,
        public_url: media.public_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'import de l'image a échoué.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const label = mode === "macro" ? "Déposer une macro ou un packshot" : "Déposer une photo portée";
  const hint = mode === "macro"
    ? "Un détail brodé, un produit cadré ou un packshot."
    : "Une personne portant le produit, visible et bien éclairée.";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => upload(e.target.files?.[0])}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: "100%",
          padding: "18px 16px",
          border: "1px dashed var(--hub-border)",
          borderRadius: 10,
          background: "var(--hub-bg)",
          color: "var(--hub-foreground)",
          cursor: uploading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontFamily: "var(--font-sans)",
          fontSize: 13,
        }}
      >
        {uploading ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} strokeWidth={1.6} />}
        <span><strong>{uploading ? "Import en cours…" : label}</strong><br /><small style={{ opacity: 0.65 }}>{hint} · JPG, PNG ou WEBP · 15 Mo max</small></span>
      </button>
      {error && <p style={{ color: "#7C2A24", fontFamily: "var(--font-sans)", fontSize: 12, margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}
