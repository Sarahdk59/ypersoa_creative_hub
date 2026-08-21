"use client";

/**
 * /bibliotheque/articles — liste des articles de blog générés (onglet
 * "Articles" de Bibliothèque). Lecture seule ; l'édition/génération se fait
 * toujours sur /blog. Source : table geo_articles (persistée depuis le
 * 20/08/2026, cf. lib/blog/article-store.ts).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2 } from "lucide-react";
import type { BlogArticleRecord } from "@/lib/blog/article-store";

export default function BibliothequeArticlesPage() {
  const [articles, setArticles] = useState<BlogArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/blog/articles");
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Lecture impossible.");
        setArticles(json.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={28} className="animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#a13a16" }}>Erreur : {error}</p>
    );
  }

  if (articles.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", opacity: 0.6 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>
          Aucun article pour l&apos;instant.{" "}
          <Link href="/blog" style={{ color: "var(--hub-accent)", fontWeight: 600 }}>
            Générer le brouillon de la semaine →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {articles.map((a) => (
        <div
          key={a.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "16px 18px",
            background: "var(--hub-bg-alt)",
            borderRadius: 12,
            border: "0.5px solid var(--hub-border)",
          }}
        >
          <FileText size={18} strokeWidth={1.5} color="var(--hub-foreground)" style={{ opacity: 0.6, marginTop: 2, flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 17,
                fontWeight: 500,
                margin: 0,
                color: "var(--hub-foreground)",
              }}
            >
              {a.article?.h1 || a.target_query}
            </h3>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, opacity: 0.6, margin: "6px 0 0" }}>
              {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              {" · "}
              {a.lint?.wordCount ?? 0} mots
              {" · "}
              {a.status === "ready_for_review" ? "Prêt à relire" : "Lint à corriger"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
