"use client";

/**
 * Avis — Atelier Social.
 *
 * Colle l'avis client + prénom + produit acheté + occasion → génère la
 * légende Instagram complète (squelette verrouillé : étoiles + merci,
 * citation, histoire courte, phrase-pont personnalisation, CTA, hashtags).
 * Le texte sert de légende sous le visuel composé à la main dans Illustrator
 * (carte avis avec étoiles + citation).
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

interface BrandSafety {
  safe: boolean;
  criticalViolations: BrandViolation[];
  warnings: BrandViolation[];
}

interface GenerateResponse {
  ok: boolean;
  error?: string;
  caption?: string;
  hashtagLigne?: string;
  brandSafety?: BrandSafety;
  source?: "openai" | "gemini" | "fallback";
  notice?: string;
}

export default function AvisPage() {
  const [prenom, setPrenom] = useState("");
  const [avis, setAvis] = useState("");
  const [produit, setProduit] = useState("");
  const [occasion, setOccasion] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = prenom.trim().length > 0 && avis.trim().length > 0 && !loading;

  async function onGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCopied(false);
    try {
      const res = await fetch("/api/avis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom, avis, produit, occasion }),
      });
      const json = (await res.json()) as GenerateResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || "Génération impossible.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!data?.caption) return;
    navigator.clipboard.writeText(data.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <header className="h-14 w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center gap-4">
          <Link
            href="/social"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Atelier Social
          </Link>
          <div className="w-px h-4 bg-brand-muted/20" />
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--hub-foreground)",
              margin: 0,
            }}
          >
            Avis
          </h1>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Colonne formulaire */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full"
              style={{ color: "var(--brand-terracotta)" }}
            >
              ⌘
            </span>
            <h2 className="font-serif text-lg">Générateur d&apos;avis</h2>
          </div>
          <p className="text-xs text-brand-muted mb-5 leading-relaxed">
            Colle l&apos;avis, dis ce que la cliente a offert et pourquoi. La légende se
            compose autour de ton squelette verrouillé.
          </p>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                Prénom de la cliente
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Aurélie"
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                L&apos;avis, tel quel
              </label>
              <textarea
                value={avis}
                onChange={(e) => setAvis(e.target.value)}
                placeholder="Vraiment top ! J'adore le rendu."
                rows={3}
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-y"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                Produit acheté
              </label>
              <input
                type="text"
                value={produit}
                onChange={(e) => setProduit(e.target.value)}
                placeholder="Sweat « maman de ❤️❤️❤️ »"
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                Occasion / pourquoi
              </label>
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="Anniversaire de sa meilleure amie"
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>

            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--brand-terracotta)" }}
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Génération…" : "Générer la légende"}
            </button>

            <p className="text-[11px] text-brand-muted leading-relaxed">
              Prénom + avis suffisent. Le produit et l&apos;occasion rendent la légende
              plus forte.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl p-3 flex items-start gap-2 text-xs bg-red-50 text-red-800 border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Colonne résultat */}
        <div>
          <h2 className="font-serif text-lg mb-1">Légende</h2>
          <p className="text-xs text-brand-muted mb-5 leading-relaxed">
            Prête à coller sous le visuel Illustrator (carte avis).
          </p>

          {!data && !loading && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-muted/10 text-center text-xs text-brand-muted">
              La légende générée apparaîtra ici.
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-muted/10 text-center text-xs text-brand-muted">
              Génération en cours…
            </div>
          )}

          {data && data.caption && (
            <div className="space-y-3">
              {data.notice && (
                <div className="rounded-xl p-3 text-xs bg-amber-50 text-amber-800 border border-amber-200">
                  {data.notice}
                </div>
              )}

              {data.brandSafety && (
                <div
                  className={cn(
                    "rounded-xl p-3 flex items-start gap-2 text-xs",
                    data.brandSafety.safe
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  )}
                >
                  {data.brandSafety.safe ? (
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      {data.brandSafety.safe
                        ? "Brand-safe ✓"
                        : `${data.brandSafety.criticalViolations.length} violation(s) critique(s)`}
                    </p>
                    {data.brandSafety.warnings.length > 0 && (
                      <p className="mt-0.5 opacity-80">
                        {data.brandSafety.warnings.length} vouvoiement détecté(s) — à relire.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold tracking-wide text-brand-muted uppercase">
                    Légende Instagram
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-rose hover:text-brand-rose-light transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copié
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copier
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {data.caption}
                </pre>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
