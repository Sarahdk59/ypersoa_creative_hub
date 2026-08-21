"use client";

/**
 * IframeApp — embarque une app Vite/Next standalone (Shooting, Lookbook) et
 * affiche un message utile si le port cible ne répond pas, plutôt qu'une
 * page blanche silencieuse. `fetch(..., {mode:"no-cors"})` rejette bien en
 * cas de connexion refusée même cross-origin, donc la détection marche sans
 * CORS côté app cible.
 */
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface IframeAppProps {
  url: string;
  title: string;
  devCommand: string;
}

export function IframeApp({ url, title, devCommand }: IframeAppProps) {
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setUnreachable(true);
    }, 2500);
    fetch(url, { mode: "no-cors" })
      .then(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          setUnreachable(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          setUnreachable(true);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [url]);

  if (unreachable) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--hub-bg)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <AlertTriangle size={28} strokeWidth={1.4} color="var(--hub-accent)" style={{ marginBottom: 14 }} />
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 500, color: "var(--hub-foreground)", margin: "0 0 8px" }}>
            {title} ne répond pas
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, lineHeight: 1.6, margin: 0 }}>
            Cette app tourne en dev server séparé. Lance-la avec :
          </p>
          <code
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "8px 14px",
              background: "var(--hub-bg-alt)",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 8,
              fontSize: 12.5,
              color: "var(--hub-foreground)",
            }}
          >
            {devCommand}
          </code>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        background: "var(--hub-bg)",
      }}
    >
      <iframe src={url} title={title} style={{ width: "100%", height: "100%", border: 0, display: "block" }} loading="eager" />
    </div>
  );
}
