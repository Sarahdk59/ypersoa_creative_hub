/**
 * HubTopbar — chrome supérieure invariable du Hub.
 *
 * Ne porte AUCUNE couleur d'app (cf. _passations/DESIGN_SYSTEM_hub.md).
 * Hauteur 56px, fond cream, bordure bottom 0.5px ink.
 *
 * Search : input qui submit vers /search?q=… (raccourci Cmd+K focus).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";

export function HubTopbar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  // Raccourci global Cmd+K / Ctrl+K → focus l'input search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header
      className="flex items-center justify-between px-6 gap-6"
      style={{
        height: "var(--topbar-height)",
        background: "var(--hub-bg)",
        borderBottom: "0.5px solid var(--hub-border)",
        color: "var(--hub-foreground)",
      }}
    >
      {/* Logo Y rond + wordmark */}
      <Link
        href="/"
        className="flex items-center gap-3 shrink-0"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            background: "var(--hub-foreground)",
            color: "var(--hub-bg)",
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          Y
        </div>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.08em",
          }}
        >
          YPERSOA HUB
        </span>
      </Link>

      {/* Search input centré — submit / Entrée → /search?q=… */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          if (!v) return;
          router.push(`/search?q=${encodeURIComponent(v)}`);
        }}
        className="flex-1 max-w-md mx-auto"
        style={{ position: "relative" }}
      >
        <SearchIcon
          size={14}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cherche dans le Hub (club, mariage, YPM-007…)"
          style={{
            width: "100%",
            padding: "6px 12px 6px 32px",
            borderRadius: 999,
            border: "0.5px solid var(--hub-border)",
            background: "white",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            outline: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "var(--font-sans)",
            fontSize: 9.5,
            opacity: 0.4,
            background: "var(--hub-bg)",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 4,
            padding: "1px 5px",
            letterSpacing: 0.3,
            pointerEvents: "none",
          }}
          title="Cmd+K pour focus"
        >
          ⌘K
        </span>
      </form>

      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          opacity: 0.5,
        }}
      >
        profile
      </span>
    </header>
  );
}
