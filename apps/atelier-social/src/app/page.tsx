/**
 * Accueil du Hub — refonte du 20/08/2026 (cf. plan de refonte nav +
 * _passations/DESIGN_SYSTEM_hub.md v2). Accueil chaud, pas un dashboard
 * froid : salutation personnalisée, pouls de la semaine, grille des ateliers.
 *
 * Server Component : lit Supabase (packs, médiathèque, projets) et le
 * rétroplanning (fs) directement, sans aller-retour API.
 */
import Link from "next/link";
import {
  MessageCircle,
  Newspaper,
  CalendarClock,
  Clapperboard,
  Library,
  Compass,
  Cpu,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listBlogArticles } from "@/lib/blog/article-store";
import { loadRetroplanning } from "@/lib/planning/retroplanning-loader";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { GreetingName } from "@/components/GreetingName";

function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Semaines consécutives (lundi→lundi) avec au moins un article, en partant de la semaine la plus récente. */
function computeThursdayStreak(createdDates: string[]): number {
  if (createdDates.length === 0) return 0;
  const weekStarts = new Set(createdDates.map((d) => isoDate(mondayOf(new Date(d)))));
  const sorted = [...weekStarts].sort().reverse();
  let streak = 0;
  let cursor = mondayOf(new Date());
  // La semaine en cours ne compte que si elle a déjà un article ; sinon on part
  // de la dernière semaine qui en a un.
  if (!weekStarts.has(isoDate(cursor))) {
    if (!sorted.length) return 0;
    cursor = new Date(sorted[0]);
  }
  while (weekStarts.has(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export default async function HubHomePage() {
  const weekStart = mondayOf(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [articles, packsRes, mediaRes, projectsRes] = await Promise.all([
    listBlogArticles().catch(() => []),
    supabase
      ? supabase.from("social_packs").select("id, created_at, is_favorite").gte("created_at", since7d)
      : Promise.resolve({ data: [] as { id: string; created_at: string; is_favorite: boolean }[] }),
    supabase ? supabase.from("mediatheque_media").select("id", { count: "exact", head: true }) : Promise.resolve({ count: 0 }),
    supabase ? supabase.from("social_projects").select("id, statut") : Promise.resolve({ data: [] as { id: string; statut: string }[] }),
  ]);

  const latestArticle = articles[0] ?? null;
  const toValidate = (packsRes.data ?? []).filter((p) => !p.is_favorite).length;
  const streak = computeThursdayStreak(articles.map((a) => a.created_at));
  const mediaCount = mediaRes.count ?? 0;
  const projects = projectsRes.data ?? [];

  const retro = loadRetroplanning();
  const weekActions = retro.actions.filter((a) => a.date >= isoDate(weekStart) && a.date <= isoDate(weekEnd));
  const weekActionsFait = weekActions.filter((a) => a.statut === "fait").length;

  const articleStatusLabel = !latestArticle
    ? "Aucun brouillon"
    : latestArticle.status === "ready_for_review"
    ? "Prêt à relire"
    : "À corriger";

  const ateliers = [
    {
      href: "/social",
      label: "Atelier Social",
      icon: <MessageCircle size={20} strokeWidth={1.4} />,
      blurb: "On raconte l'atelier à Anaïs, avec Clémence en fil rouge.",
      status: toValidate > 0 ? `${toValidate} post${toValidate > 1 ? "s" : ""} à valider` : "Tout est à jour",
      tone: "accent" as const,
    },
    {
      href: "/blog",
      label: "Atelier Blog",
      icon: <Newspaper size={20} strokeWidth={1.4} />,
      blurb: "L'article du jeudi, prêt à relire et à pousser sur Shopify.",
      status: latestArticle ? `${articleStatusLabel} · ${latestArticle.article?.h1 ?? latestArticle.target_query}` : "Rien en préparation",
      tone: "cream" as const,
    },
    {
      href: "/planning",
      label: "Planning",
      icon: <CalendarClock size={20} strokeWidth={1.4} />,
      blurb: "Cette semaine, et où on en est sur l'année.",
      status: `${projects.length} projet${projects.length > 1 ? "s" : ""} actif${projects.length > 1 ? "s" : ""} · ${weekActionsFait}/${weekActions.length || 0} cette semaine`,
      tone: "teal" as const,
    },
    {
      href: "/studio",
      label: "Studio",
      icon: <Clapperboard size={20} strokeWidth={1.4} />,
      blurb: "Shooting, Lookbook, Shooting Book, Studio Mood — au même endroit.",
      status: "Storyboards & séances",
      tone: "marine" as const,
    },
    {
      href: "/bibliotheque",
      label: "Bibliothèque",
      icon: <Library size={20} strokeWidth={1.4} />,
      blurb: "Tout ce que l'atelier a déjà produit.",
      status: `${mediaCount} visuel${mediaCount > 1 ? "s" : ""} · ${articles.length} article${articles.length > 1 ? "s" : ""}`,
      tone: "cream" as const,
    },
    {
      href: "/atelier-da",
      label: "Atelier DA",
      icon: <Compass size={20} strokeWidth={1.4} />,
      blurb: "Casting, ambiances, motifs, incarnations, Radar.",
      status: "Le référentiel créatif",
      tone: "teal" as const,
    },
    {
      href: "/atelier-production",
      label: "Atelier Production",
      icon: <Cpu size={20} strokeWidth={1.4} />,
      blurb: "Commandes, fils, palettes, règles de broderie.",
      status: "Le référentiel atelier",
      tone: "marine" as const,
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* ─── Hello ─── */}
      <section style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 36 }}>
        <div style={{ flex: "none", opacity: 0.9 }}>
          <AnimatedLogo size={72} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--hub-accent)",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 3.6vw, 40px)",
              fontWeight: 500,
              letterSpacing: "-0.015em",
              lineHeight: 1.08,
              margin: 0,
              color: "var(--hub-foreground)",
            }}
          >
            Bonjour <GreetingName />
            on fait vivre la marque aujourd&apos;hui&nbsp;?
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, opacity: 0.65, marginTop: 8, maxWidth: 60 + "ch" }}>
            Tout est calme, tu peux y aller à ton rythme. Le pouls de la semaine est juste en dessous.
          </p>
        </div>
      </section>

      {/* ─── Pouls de la semaine ─── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 36,
        }}
      >
        <PulseCard label="Article du jeudi" big={latestArticle ? articleStatusLabel : "—"} lil={latestArticle ? `${latestArticle.lint?.wordCount ?? 0} mots` : "rien pour l'instant"} attention={!latestArticle} href="/blog" />
        <PulseCard label="À valider" big={String(toValidate)} lil="posts avant programmation" attention={toValidate > 0} href="/bibliotheque/packs" />
        <PulseCard label="Planning" big={`${weekActionsFait}/${weekActions.length}`} lil="créneaux faits cette semaine" attention={false} href="/planning/retroplanning" />
        <PulseCard label="Série de jeudis" big={String(streak)} lil={streak > 0 ? "articles tenus d'affilée" : "on démarre la série"} attention={false} href="/blog" />
      </section>

      {/* ─── Les ateliers ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 21, fontWeight: 500, margin: 0, color: "var(--hub-foreground)" }}>
          Tes ateliers
        </h2>
        <div className="hub-stitch" style={{ color: "var(--hub-border)" }} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {ateliers.map((a) => (
          <AtelierCard key={a.href} {...a} />
        ))}
      </div>
    </div>
  );
}

function PulseCard({
  label,
  big,
  lil,
  attention,
  href,
}: {
  label: string;
  big: string;
  lil: string;
  attention: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 14,
        padding: "15px 16px",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, fontWeight: 600 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: attention ? "var(--hub-accent)" : "var(--hub-accent-soft)",
            boxShadow: attention ? "0 0 0 3px color-mix(in srgb, var(--hub-accent) 20%, transparent)" : "none",
          }}
        />
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 27, fontWeight: 500, color: "var(--hub-foreground)", margin: "8px 0 2px" }}>
        {big}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.55 }}>{lil}</div>
    </Link>
  );
}

const TONES: Record<string, { bg: string; icon: string }> = {
  accent: { bg: "color-mix(in srgb, var(--hub-accent-soft) 55%, white)", icon: "var(--hub-accent-hover)" },
  teal: { bg: "color-mix(in srgb, var(--hub-teal) 16%, white)", icon: "var(--hub-teal)" },
  marine: { bg: "color-mix(in srgb, var(--hub-foreground) 12%, white)", icon: "var(--hub-foreground)" },
  cream: { bg: "var(--hub-bg-alt)", icon: "var(--hub-foreground)" },
};

function AtelierCard({
  href,
  label,
  icon,
  blurb,
  status,
  tone,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  blurb: string;
  status: string;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 16,
        overflow: "hidden",
        textDecoration: "none",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
      className="hub-atelier-card"
    >
      <div style={{ background: t.bg, padding: "16px 18px 14px" }}>
        <div className="hub-stitch" style={{ color: t.icon, opacity: 0.4, marginBottom: 12 }} />
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "rgba(255,255,255,.7)",
            color: t.icon,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ padding: "14px 18px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500, margin: "0 0 4px", color: "var(--hub-foreground)" }}>
          {label}
        </h3>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, opacity: 0.6, margin: "0 0 12px", lineHeight: 1.4, flex: 1 }}>{blurb}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--hub-foreground)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.icon, flex: "none" }} />
          {status}
        </div>
      </div>
    </Link>
  );
}
