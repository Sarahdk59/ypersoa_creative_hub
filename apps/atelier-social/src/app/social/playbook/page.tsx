"use client";

/**
 * /social/playbook — Playbook Instagram, version visuelle « brand book ».
 *
 * Rend le contenu de docs/FICHES_RECETTES_ATELIER_SOCIAL.md en pages web :
 * mêmes tokens que app/brand/page.tsx (marine/teal/crème/rouge coquelicot),
 * même grammaire de composants (Section, cartes-mockup façon SocialCard/Slide)
 * — pour que ce soit un compagnon du brand book, pas un document à part.
 *
 * Typo des TITRES (H1, sections, piliers, noms de fiche) : Arial Rounded MT
 * Bold ou Cafeteria (Typekit) — décision Sarah 10/08/2026, même logique que
 * lib/brand-card.ts §SocialCard : plus moderne, plus « peps » que Newsreader.
 * Toggle en haut de page pour comparer les deux au feu à l'œil.
 *
 * Newsreader reste réservé au contenu de citation (hooks, gabarits, exemples
 * de commentaires) et aux mockups post dont la traduction anti-beige prescrit
 * explicitement un titre éditorial — ce n'est pas un « titre » de cette page,
 * c'est une spec de production reproduite telle quelle.
 */

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GlassWater, Ban, Link2, Sparkles, MessageCircle } from "lucide-react";
import type { FontChoice } from "@/lib/brand-card";

const SERIF = 'var(--font-serif, "Newsreader", Georgia, serif)';
const SANS = 'var(--font-sans, "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif)';
const OVERLAY_CAFETERIA = '"cafeteria", "Playfair Display", "Times New Roman", serif';

// Police des titres — même paire que le reste du hub (lib/brand-card.ts).
const TITLE_STACKS: Record<FontChoice, string> = {
  arial: `"Arial Rounded MT Bold", "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif`,
  cafeteria: `"cafeteria", "Playfair Display", "Times New Roman", serif`,
};
const TITLE_WEIGHTS: Record<FontChoice, number> = { arial: 700, cafeteria: 800 };
const FONT_OPTIONS: { id: FontChoice; label: string }[] = [
  { id: "arial", label: "Arial Rounded" },
  { id: "cafeteria", label: "Cafeteria" },
];

const TitleFontCtx = createContext<FontChoice>("arial");
function useTitleFont() {
  const choice = useContext(TitleFontCtx);
  return { fontFamily: TITLE_STACKS[choice], fontWeight: TITLE_WEIGHTS[choice] };
}

const MARINE = "#16324C";
const TEAL = "#1E6E77";
const CREME = "#F4EEE2";
const ROUGE = "#C23A2D";
const BLUSH = "#F4B4D2";
const SAUGE = "#97A886";
const SUCRE = "#E2DDD0";

// ── Data ─────────────────────────────────────────────────────────────────

const MOJITO_META: Record<string, { label: string; hex: string; ink: string }> = {
  menthe: { label: "Menthe", hex: SAUGE, ink: MARINE },
  citron: { label: "Citron vert", hex: ROUGE, ink: CREME },
  rhum: { label: "Rhum", hex: MARINE, ink: CREME },
  sucre: { label: "Sucre", hex: SUCRE, ink: "#7a6e5a" },
  bulles: { label: "Bulles", hex: TEAL, ink: CREME },
};

const MOJITO_INGREDIENTS = [
  { id: "menthe", title: "Menthe — le naturel", desc: "Si tu ne le dirais pas à une copine en terrasse, tu ne le postes pas." },
  { id: "citron", title: "Citron vert — la franchise", desc: "Une opinion par post, celle qui pique un peu." },
  { id: "rhum", title: "Rhum — l'autodérision", desc: "Tu te mets toi en cible avant les autres." },
  { id: "sucre", title: "Pas trop de sucre — l'anti-beige", desc: "Zéro « univers doux et bienveillant », zéro rafale de cœurs, zéro « je suis tellement reconnaissante »." },
  { id: "bulles", title: "Les bulles — la légèreté", desc: "Phrases courtes. Du rythme. Une chute. On lit d'une gorgée." },
] as const;

const PICK_ONE_VARIANTS = [
  { label: "Pick-one", mechanic: "question → choix → commentaire", example: "Laquelle te parle le plus ?", reply: "4 et 7 🔥" },
  { label: "Partage-relais", mechanic: "question → partage → portée", example: "Envoie ça à une copine qui…", reply: "" },
  { label: "Commente-un-mot", mechanic: "question → mot-clé → capture Club", example: "Commente CARNET pour recevoir le guide", reply: "CARNET" },
] as const;

const REPOUSSOIRS = [
  { label: "Le mum-beige", desc: "Manuscrit rose, quadrillé pastel, champêtre, serif crème sur photo trop léchée. Bien exécuté ne suffit pas : c'est beige, ça ne rentre pas." },
  { label: "Le flex-Dubaï", desc: "LV + business class + « GRATEFUL » : le flex qui appelle le retour de bâton. Vu le commentaire à 313 likes." },
  { label: "L'emprunt-cancer/mort", desc: "Le selfie souriant + « 50 millions se battent contre le cancer » — emprunter la maladie pour extorquer de l'engagement. L'exact inverse de ta franchise. Poubelle immédiate." },
] as const;

interface Fiche {
  id: string;
  nom: string;
  star?: boolean;
  tagline: string;
  frequence: string;
  hookVisual: string;
  hookEcrit: string;
  overlayStyle: "overlay" | "editorial";
  question: string;
  mojito: (keyof typeof MOJITO_META)[];
  mojitoCheck: string;
  traduction: string;
  reproductible: string;
  extra?: string;
}

const FICHES_PREUVE: Fiche[] = [
  {
    id: "P1",
    nom: "Le déballage",
    tagline: "Le colis qui s'ouvre. Le vrai, filmé.",
    frequence: "Dès qu'une vraie commande part · vise 1×/semaine",
    hookVisual: "Colis fermé, papier de soie, ta main dessus. Macro. On ne voit pas encore la pièce.",
    hookEcrit: "Ce qu'il y a dans le colis de [Prénom].",
    overlayStyle: "overlay",
    question: "Tu veux voir le tien ? → configurateur en bio. (variante : « Commente TIEN »)",
    mojito: ["rhum", "menthe"],
    mojitoCheck: "On voit tes vraies mains et un vrai colis — pas un flatlay studio. Si c'est trop propre, c'est faux.",
    traduction: "Fond crème pour l'overlay texte. Filmé en atelier réel, lumière naturelle. Papier de soie en rouge coquelicot possible. Jamais l'équipement — la matière, le fil, tes mains. Vocabulaire : « brodé à la commande », « cousu pour durer ».",
    reproductible: "Chaque commande est un épisode. Numérotable (« Colis #47 »).",
  },
  {
    id: "P2",
    nom: "Photo produit ⟷ vrai",
    tagline: "Le split : la version catalogue, et ce qu'il s'est vraiment passé.",
    frequence: "2×/mois",
    hookVisual: "Split screen. Gauche : photo produit léchée. Droite : le chaos réel (atelier, chutes de fil, 4e tentative).",
    hookEcrit: "Ce que tu vois sur la photo ⟷ ce qu'il s'est vraiment passé.",
    overlayStyle: "editorial",
    question: "Team photo parfaite ou team coulisses ? Dis-moi en commentaire.",
    mojito: ["rhum"],
    mojitoCheck: "Tu te mets TOI en cible — pas le client, pas « les autres marques ».",
    traduction: "Marine en fond de la partie « vrai », crème sur la partie « photo ». Titre en Newsreader. La franchise du split fait le travail — pas besoin de fioritures.",
    reproductible: "Un « vrai » derrière chaque pièce. Format infini.",
  },
  {
    id: "P3",
    nom: "Étape X sur 47",
    tagline: "Le work-in-progress, avec le compteur autodérision.",
    frequence: "1×/semaine, Reels ou Story",
    hookVisual: "Macro sur le motif à moitié brodé, le fil en cours.",
    hookEcrit: "Étape 12 sur 47 avant que ce soit parfait (ou que je craque).",
    overlayStyle: "overlay",
    question: "À ton avis, ça part sur quelle nuance ? (pick-one, léger et vrai)",
    mojito: ["rhum", "citron"],
    mojitoCheck: "Le compteur est drôle ET vrai — l'obsession du détail assumée, pas la plainte.",
    traduction: "Overlay crème sur la matière réelle. Le compteur en Cafeteria bold (ou Arial Rounded). Une nuance de fil qui varie à chaque épisode = série.",
    reproductible: "Chaque commande a 47 étapes (ou 12, ou 3). Compteur infini.",
  },
  {
    id: "P4",
    nom: "À ton image : [Prénom]",
    tagline: "Une commande custom racontée. La preuve incarnée.",
    frequence: "Dès qu'un client envoie une photo",
    hookVisual: "La pièce portée, par le vrai client, dans sa vraie vie. Regram.",
    hookEcrit: "[Prénom] voulait [l'idée derrière le motif]. Voilà ce qu'on a brodé.",
    overlayStyle: "editorial",
    question: "Et toi, ce serait quoi TON motif ? (pick-one + amorce configurateur)",
    mojito: ["menthe", "citron"],
    mojitoCheck: "C'est l'histoire du client, pas ton argumentaire. Tu racontes pourquoi ce motif existe pour cette personne.",
    traduction: "Cadre discret teal autour de la photo client, prénom en Newsreader. RGPD/consentement : repost uniquement si le client a dit oui.",
    reproductible: "Chaque commande est un « À ton image ». Format signature, numérotable.",
    extra: "Comment collecter les photos (à brancher sur le hub) : un mot dans le colis (carte insert) + un DM automatisable à J+10 : « Si tu la portes, envoie-moi une photo — j'adorerais la montrer (avec ton accord). » Referme la boucle avis→visuel avec de vraies photos.",
  },
];

const FICHES_COMMUNAUTE: Fiche[] = [
  {
    id: "C1",
    nom: "Le pick-one",
    star: true,
    tagline: "Le mécanisme roi. Si tu ne gardes qu'une fiche, c'est celle-là.",
    frequence: "1×/semaine minimum — ton moteur d'engagement",
    hookVisual: "Carrousel. Une idée / permission / mini-histoire par slide, sur une belle photo de matière ou d'atelier.",
    hookEcrit: "5 trucs que je me répète quand je doute sur une commande.",
    overlayStyle: "editorial",
    question: "Laquelle te parle le plus ? Dis-moi en commentaire. — c'est LA ligne.",
    mojito: ["menthe", "bulles"],
    mojitoCheck: "Chaque slide se lit d'une gorgée. Aucune ne sonne coach.",
    traduction: "Newsreader crème sur photo de matière réelle (fil, tissu, atelier) — pas de serif doré sur plage léchée. Une nuance de fil différente par slide = ta signature. Rouge coquelicot en accent sur la slide-question.",
    reproductible: "Infini. « 5 [n'importe quoi] » + « laquelle ? ». Gabarit à vie.",
  },
  {
    id: "C2",
    nom: "La note d'atelier",
    tagline: "La note à moi-même — mais vraie.",
    frequence: "1×/semaine, quand tu as un truc vrai en tête",
    hookVisual: "Ta note, écrite à la main, dans ton vrai carnet d'atelier ou épinglée sur une chute de tissu. Pas un Clairefontaine rose.",
    hookEcrit: "Note à moi-même : [la vraie pensée qui parle en fait à ta cliente].",
    overlayStyle: "editorial",
    question: "Ça te parle ? / Dis-moi si t'es pareille.",
    mojito: ["menthe"],
    mojitoCheck: "Intime et vrai. Écrit comme tu écris, pas comme une citation motivante.",
    traduction: "Ta vraie écriture sur ta vraie matière = déjà anti-beige par nature. Photo brute. Si overlay : marine sur crème.",
    reproductible: "Une note par jour dans ta tête. Format infini.",
  },
  {
    id: "C3",
    nom: "J'ai un avis",
    tagline: "L'opinion du mois. Le citron vert pur.",
    frequence: "1×/mois — rare = fort",
    hookVisual: "Toi, cash, face cam. Ou fond marine plein, texte gros.",
    hookEcrit: "Mon avis qui va pas plaire : [l'opinion qui pique].",
    overlayStyle: "editorial",
    question: "T'es d'accord ou pas ? Je lis tout.",
    mojito: ["citron"],
    mojitoCheck: "Une vraie opinion qui dérange un peu — pas un consensus déguisé.",
    traduction: "Fond marine, texte crème gros en Newsreader. Sobre, tranchant. Aucun emoji cœur.",
    reproductible: "Un avis par mois, facile. Format « J'ai un avis — édition [mois] ».",
  },
  {
    id: "C4",
    nom: "Commente [MOT]",
    tagline: "La capture Club, en douceur.",
    frequence: "2×/mois, jamais plus (sinon ça devient promo)",
    hookVisual: "Aperçu du lead magnet (guide d'entretien) ou une pièce en teaser.",
    hookEcrit: "Le guide pour que ta pièce brodée dure des années. Gratuit.",
    overlayStyle: "overlay",
    question: "Commente ENTRETIEN et je te l'envoie.",
    mojito: ["menthe", "bulles"],
    mojitoCheck: "Un cadeau utile, jamais une promo/réduction. Le Club, c'est l'accès — jamais le discount.",
    traduction: "Teal en dominante, Cafeteria (ou Arial Rounded). Le mot à commenter en majuscules, rouge coquelicot. Vit sur le feed/Stories, pas dans les Messages Etsy — la carte insert reste le canal compliant pour l'offre Club.",
    reproductible: "Un lead magnet = une campagne. Réutilisable à chaque drop.",
  },
];

const PLAN_CATEGORIES = [
  { label: "Toi", items: ["Selfie face cam", "Toi qui écris dans le carnet d'atelier", "Toi qui choisis une nuance", "Toi qui réponds aux DM à 23h", "Toi qui bois ton café devant une pièce en cours"] },
  { label: "Atelier / process", items: ["Mains sur la matière", "Le fil qui se déroule", "Le motif qui apparaît", "Une chute de tissu", "La table de travail"] },
  { label: "Produit / détails", items: ["Pièce dans la main", "Colis qui s'ouvre", "Papier de soie", "Étiquette", "Pile de commandes prêtes"] },
  { label: "Lifestyle Hauts-de-France", items: ["La lumière du Nord", "Ton coin", "Ce qui ancre la marque ici"] },
] as const;

const GABARITS = [
  { structure: "Personne te dit ça quand tu commandes ___.", mojito: "citron" },
  { structure: "Mon avis qui va pas plaire sur ___.", mojito: "citron" },
  { structure: "J'ai galéré sur ___ pendant des mois. Voilà ce qui a marché.", mojito: "rhum" },
  { structure: "3 trucs que j'aurais aimé savoir avant de me lancer dans ___.", mojito: "menthe" },
  { structure: "Dis-moi que je suis pas la seule à ___.", mojito: "rhum" },
  { structure: "L'erreur que tout le monde fait avec ___.", mojito: "citron" },
  { structure: "Pourquoi j'assume complètement de ___.", mojito: "rhum" },
  { structure: "Ce que personne voit derrière ___.", mojito: "menthe" },
  { structure: "Avant, je détestais ___. Voilà comment j'y ai repris goût.", mojito: "menthe" },
  { structure: "___ m'a appris plus que je pensais.", mojito: "menthe" },
] as const;

const HOOKS_FRAIS = [
  { mojito: "citron", text: `Personne te le dit quand tu commandes une pièce à la commande : y a un moment, vers 23h, où je choisis LA nuance de fil en me demandant si t'es plutôt "ça se voit de loin" ou "faut s'approcher pour comprendre".` },
  { mojito: "citron", text: `Mon avis qui va pas plaire : un vêtement "à ton image" livré en 24h chrono, ça existe pas. Ou alors c'est pas à ton image. C'est à l'image du stock.` },
  { mojito: "rhum", text: `J'ai vendu mes premières pièces 22,90€. À ce prix-là, je payais surtout le plaisir de bosser gratuitement. J'ai mis des mois à oser écrire le vrai prix.` },
  { mojito: "rhum", text: `Dis-moi que je suis pas la seule à recommencer un motif entier pour un fil de 2 mm qui me dérange. Dis-le-moi. J'ai besoin de le lire.` },
  { mojito: "citron", text: `L'erreur quand on veut du "personnalisé" : croire que ça veut dire "on colle ton prénom dessus". Non. C'est choisir la couleur du fil comme tu choisis tes fringues le matin.` },
  { mojito: "rhum", text: `J'ai lancé une marque brodée à la commande. Mon compte en banque, lui, n'était pas au courant.` },
  { mojito: "menthe", text: `3 trucs que personne m'avait dits avant de broder à la commande : c'est long, c'est angoissant, et je recommencerais demain.` },
  { mojito: "citron", text: `Le monde entier : "brodé à la commande, c'est trop long". Moi, à 23h, en train de choisir la nuance pour que ce soit exactement à ton image :` },
  { mojito: "rhum", text: `Non, je vends pas des t-shirts. Je vends trois semaines de "est-ce que ce rose passe avec ce beige" dans ma tête.` },
  { mojito: "menthe", text: `Ici, à [ton coin des Hauts-de-France], une pièce met des semaines à exister. Et c'est exactement pour ça qu'elle te ressemble.` },
] as const;

const SEMAINE = [
  { jour: "Lundi", format: "Reels « Étape X sur 47 » ou « Le déballage »", fiche: "P3 / P1", color: ROUGE },
  { jour: "Mercredi", format: "Carrousel « Pick-one »", fiche: "C1", color: TEAL },
  { jour: "Vendredi", format: "« J'ai un avis » (1×/mois) ou « Note d'atelier »", fiche: "C3 / C2", color: TEAL },
  { jour: "En continu", format: "Stories : coulisses + reposts client + rappel Club", fiche: "P4 / C4", color: BLUSH },
] as const;

const METRICS = [
  { icon: "💬", label: "Communauté", metric: "Commentaires / post pick-one", desc: "Gratuit, immédiat. C'est ta métrique n°1.", color: TEAL },
  { icon: "🔗", label: "Preuve → vente", metric: "Clics UTM", desc: "Sur le lien du « Déballage » / « À ton image » → configurateur. C'est le câble.", color: ROUGE },
  { icon: "✉️", label: "Club", metric: "« Commente [MOT] »", desc: "→ emails capturés.", color: MARINE },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────

export default function PlaybookPage() {
  const [titleFont, setTitleFont] = useState<FontChoice>("arial");
  const titleStyle = { fontFamily: TITLE_STACKS[titleFont], fontWeight: TITLE_WEIGHTS[titleFont] };

  return (
    <div className="min-h-screen bg-hub-bg text-brand-text font-sans">
      <header className="mx-auto max-w-[1100px] border-b border-hub-border px-6 pt-8 pb-0">
          <Link href="/social" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-hub-accent transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Atelier Social</Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[34px] leading-none text-hub-foreground">Le playbook</h1>
              <p className="mt-3 text-sm text-hub-foreground/60">Les recettes à ressortir quand tu veux publier sans repartir de zéro.</p>
            </div>

          {/* Toggle typo titres — Arial Rounded / Cafeteria, décision Sarah 10/08/2026 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Titres</span>
            <div className="flex items-center bg-brand-muted/10 rounded-full p-0.5 border border-brand-muted/15">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTitleFont(f.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: titleFont === f.id ? "#fff" : "transparent",
                    color: titleFont === f.id ? ROUGE : "#7a8894",
                    boxShadow: titleFont === f.id ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          </div>
      </header>

      <TitleFontCtx.Provider value={titleFont}>
      <main style={{ maxWidth: 1100, margin: "0 auto", color: MARINE, fontFamily: SANS, padding: "32px 24px 80px" }}>
        {/* ── En-tête ── */}
        <header style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: TEAL, fontWeight: 700, margin: "0 0 10px" }}>
            Fiches-recettes · le meuble opérationnel
          </p>
          <h1 style={{ ...titleStyle, fontSize: 42, lineHeight: 1.08, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
            Le bar est monté. <span style={{ color: ROUGE }}>Les fiches sont les recettes.</span>
          </h1>
          <p style={{ maxWidth: 680, fontSize: 15, lineHeight: 1.6, color: "#4a5a68", margin: "0 0 20px" }}>
            Six fournées à décortiquer ~80 visuels de comptes qui convertissent. On n&apos;a rien copié : on a{" "}
            <strong>volé le squelette, jeté la peau</strong> — la peau des autres (rose pastel, quadrillé pastel,
            manuscrit champêtre), c&apos;est le beige que tu fuis. Chaque case de ta semaine = un format d&apos;ici.
            Zéro invention à chaque post.
          </p>
          <div style={{ display: "inline-flex", gap: 8, background: CREME, borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#56636e" }}>
            <strong style={{ color: MARINE }}>Chaque fiche donne 5 choses :</strong>{" "}
            le hook (frame 1 + écrit) · la question qui convertit · le test mojito · la traduction anti-beige · pourquoi c&apos;est reproductible.
          </div>
        </header>

        {/* ── §1 : Le mojito ── */}
        <Section title="1 · Le test mojito" sub="Avant de publier quoi que ce soit, tu vérifies que le verre est bon. Cinq ingrédients, jamais plus." icon={<GlassWater size={18} color={TEAL} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {MOJITO_INGREDIENTS.map((m) => {
              const meta = MOJITO_META[m.id];
              return (
                <div key={m.id} style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                  <div style={{ background: meta.hex, height: 56, display: "flex", alignItems: "flex-end", padding: "8px 12px" }}>
                    <span style={{ color: meta.ink, fontFamily: SANS, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{meta.label}</span>
                  </div>
                  <div style={{ padding: "10px 12px 14px" }}>
                    <div style={{ ...titleStyle, fontSize: 13.5, marginBottom: 4 }}>{m.title.split("—")[1]?.trim() ?? m.title}</div>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: "#56636e" }}>{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── §2 : Le pick-one ── */}
        <Section title="2 · Le mécanisme roi : le pick-one" sub="Prouvé 6 fois sur 6 comptes différents. Toujours le même geste : une question → un choix → un commentaire. C'est ta brique Communauté, celle que ta charte marquait « à faire »." icon={<MessageCircle size={18} color={TEAL} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            {PICK_ONE_VARIANTS.map((v) => (
              <div key={v.label} style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 14, padding: 16, background: "#fff" }}>
                <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13.5, margin: "0 0 2px", color: TEAL }}>{v.label}</p>
                <p style={{ fontFamily: SANS, fontSize: 11, color: "#8a8f96", margin: "0 0 12px" }}>{v.mechanic}</p>

                {/* mini mock d'un commentaire Instagram */}
                <div style={{ background: CREME, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: MARINE, flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 13, lineHeight: 1.35, color: MARINE }}>&ldquo;{v.example}&rdquo;</p>
                </div>
                {v.reply && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <span style={{ background: "#fff", border: "1px solid rgba(22,50,76,.12)", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: TEAL }}>
                      {v.reply}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* ── §3 : Repoussoirs ── */}
        <Section title="3 · Les repoussoirs" sub="Poubelle sans débat. Le jour où un brouillon flirte avec ça → poubelle immédiate." icon={<Ban size={18} color={ROUGE} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {REPOUSSOIRS.map((r) => (
              <div key={r.label} style={{ border: "1px solid rgba(194,58,45,.25)", borderLeft: `4px solid ${ROUGE}`, borderRadius: 10, padding: "14px 16px", background: "#fff" }}>
                <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, color: ROUGE, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                  ✕ {r.label}
                </p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#56636e" }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── §4 : Le câble ── */}
        <Section title="4 · Avant de servir : le câble" sub="Une fiche ne convertit que si tu peux voir qu'elle a converti. Aujourd'hui rien ne relie un post à une vente Shopify — le trou n°1 de ton audit de hub." icon={<Link2 size={18} color={ROUGE} />}>
          <div style={{ background: "#FFF5F5", border: "1px solid rgba(194,58,45,.15)", borderRadius: 14, padding: "18px 22px" }}>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.85, color: "#7a3a34" }}>
              <li>Une page <strong>link-in-bio</strong> unique (Shopify ou simple page) qui centralise : configurateur, Club, dernier drop.</li>
              <li>Un <strong>UTM</strong> par format sur les liens partagés (<code style={{ background: "#fff", borderRadius: 4, padding: "1px 5px" }}>?utm_source=ig&amp;utm_medium=reel&amp;utm_campaign=deballage</code>).</li>
              <li>Le pick-one donne déjà la <strong>métrique Communauté gratuite</strong> : le nombre de commentaires par post. Pas besoin d&apos;outil.</li>
            </ul>
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#7a3a34", fontStyle: "italic" }}>
              Tu ne le poses pas pour les stats du mois prochain. Tu le poses pour ne pas produire six mois de super contenu Preuve sans jamais pouvoir dire ce qu&apos;il a vendu.
            </p>
          </div>
        </Section>

        {/* ── PILIER PREUVE ── */}
        <PillarBanner
          emoji="🧵"
          title="Pilier Preuve"
          color={ROUGE}
          ink={CREME}
          desc="Ce que les autres planquent, toi tu le montres. La matière, tes mains, l'à-la-commande, le Hauts-de-France. C'est ton acidité en image. Personne ne peut copier tes coulisses."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14, marginBottom: 60 }}>
          {FICHES_PREUVE.map((f) => (
            <FicheCard key={f.id} fiche={f} pillarColor={ROUGE} pillarInk={CREME} />
          ))}
        </div>

        {/* ── PILIER COMMUNAUTÉ ── */}
        <PillarBanner
          emoji="💬"
          title="Pilier Communauté"
          color={TEAL}
          ink={CREME}
          desc="Les gens ne rejoignent pas une marque, ils rejoignent une bande. Ce pilier ne vend rien : il fait parler. C'est là que le Club se remplit."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14, marginBottom: 60 }}>
          {FICHES_COMMUNAUTE.map((f) => (
            <FicheCard key={f.id} fiche={f} pillarColor={TEAL} pillarInk={CREME} />
          ))}
        </div>

        {/* ── PILIER TOI ── */}
        <PillarBanner
          emoji="🙂"
          title="Pilier Toi (connexion)"
          color={MARINE}
          ink={CREME}
          desc="Déjà à moitié couvert par le générateur /social/connexion. La fondatrice qui galère, qui doute sur la 4e nuance, qui répond aux mails à 23h. C'est le rhum — ça transforme une marque en personne qu'on suit."
        />
        <Section title="Le meuble de plans" sub="Tu piges dans cette liste dès que tu te demandes « je filme quoi ». Fini la page blanche visuelle. (Le pilier Produit-histoire est déjà bien servi par le générateur /social — on ne le refait pas ici.)">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {PLAN_CATEGORIES.map((cat) => (
              <div key={cat.label} style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, padding: "14px 16px", background: "#fff" }}>
                <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 12.5, color: MARINE, margin: "0 0 8px" }}>{cat.label}</p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.7, color: "#56636e" }}>
                  {cat.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Banque de gabarits ── */}
        <Section title="5 · La banque de gabarits" sub="Vole thefrenchcreator, mais on garde uniquement franchise et autodérision — pas le curiosity-gap de coach, qui sonnerait faux et sentirait le sucre. Ce ne sont pas des phrases finies : des structures. Tu changes le mot, tu réutilises 50 fois.">
          <div style={{ border: "1px solid rgba(22,50,76,.1)", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
            {GABARITS.map((g, i) => (
              <div
                key={g.structure}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "12px 18px",
                  borderTop: i === 0 ? "none" : "1px solid rgba(22,50,76,.08)",
                }}
              >
                <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: MARINE }}>&laquo; {g.structure} &raquo;</p>
                <MojitoChip id={g.mojito} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: "#7a8894", marginTop: 12, lineHeight: 1.5 }}>
            <strong style={{ color: MARINE }}>Règle d&apos;or :</strong> la première ligne doit tenir seule — c&apos;est tout ce qu&apos;on voit avant le « plus ». Légende courte, une idée. 1 CTA à la fin. Pas de pavé de 15 lignes.
          </p>
        </Section>

        {/* ── Hooks frais ── */}
        <Section title="6 · Les hooks frais" sub="Écrits à ta voix pour calibrer le verre sur du concret. Chacun est un gabarit ci-dessus, rempli à ta sauce brodée.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {HOOKS_FRAIS.map((h, i) => {
              const meta = MOJITO_META[h.mojito];
              return (
                <div key={i} style={{ border: "1px solid rgba(22,50,76,.1)", borderLeft: `4px solid ${meta.hex}`, borderRadius: 10, padding: "14px 16px", background: "#fff" }}>
                  <div style={{ marginBottom: 8 }}>
                    <MojitoChip id={h.mojito} />
                  </div>
                  <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, lineHeight: 1.5, color: MARINE }}>&ldquo;{h.text}&rdquo;</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Semaine-type ── */}
        <Section title="7 · La semaine-type" sub="Tenable, pas héroïque. Un système qui tient, c'est un système qui tourne encore en décembre.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SEMAINE.map((s) => (
              <div key={s.jour} style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid rgba(22,50,76,.1)", borderRadius: 12, padding: "12px 16px", background: "#fff" }}>
                <span style={{ background: s.color, color: s.color === BLUSH ? MARINE : CREME, borderRadius: 999, padding: "6px 14px", fontFamily: SANS, fontWeight: 700, fontSize: 12, flexShrink: 0, minWidth: 92, textAlign: "center" }}>
                  {s.jour}
                </span>
                <p style={{ margin: 0, fontSize: 13, flex: 1, color: "#41505c" }}>{s.format}</p>
                <span style={{ fontFamily: "monospace", fontSize: 11.5, color: "#8a8f96", flexShrink: 0 }}>{s.fiche}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: "#7a8894", marginTop: 12, lineHeight: 1.5 }}>
            <strong style={{ color: MARINE }}>Le rangement</strong> (Planable / kanban) : tague chaque post pilier + fiche + étape funnel (découverte / considération / Club).{" "}
            <strong style={{ color: MARINE }}>Le recyclage</strong> : un carrousel qui marche → refais-le en Reels. Un Reels qui marche → carrousel.
          </p>
        </Section>

        {/* ── Comment savoir si ça marche ── */}
        <Section title="8 · Comment savoir si ça marche" sub="Léger, pas une usine à gaz. Trois signaux.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {METRICS.map((m) => (
              <div key={m.label} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(22,50,76,.1)" }}>
                <div style={{ background: m.color, color: CREME, padding: "14px 18px" }}>
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13.5, margin: "6px 0 0" }}>{m.label}</p>
                </div>
                <div style={{ background: "#fff", padding: "14px 18px" }}>
                  <p style={{ ...titleStyle, fontSize: 15, margin: "0 0 4px", color: MARINE }}>{m.metric}</p>
                  <p style={{ fontSize: 12, lineHeight: 1.5, color: "#56636e", margin: 0 }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "#56636e", marginTop: 14, lineHeight: 1.5 }}>
            Le reste (Hero vs Désir, le ⭐ du casting), tu peux enfin arrêter de le trancher au feeling. <strong style={{ color: MARINE }}>La donnée tranche.</strong>
          </p>
        </Section>

        <p style={{ fontSize: 12, color: "#8a8f96", marginTop: 8, lineHeight: 1.5, marginBottom: 0 }}>
          Source : <code>docs/FICHES_RECETTES_ATELIER_SOCIAL.md</code>. Compagnon du{" "}
          <Link href="/brand" style={{ color: TEAL, fontWeight: 600 }}>Brand Book</Link> — même épine dorsale, même règles, appliquées au calendrier Instagram.
        </p>
      </main>
      </TitleFontCtx.Provider>
    </div>
  );
}

// ── Sous-composants ─────────────────────────────────────────────────────

function Section({ title, sub, icon, children }: { title: string; sub: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const titleStyle = useTitleFont();
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
        {icon}
        <h2 style={{ ...titleStyle, fontSize: 24, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      <p style={{ fontSize: 13.5, color: "#56636e", margin: "0 0 20px", maxWidth: 680, lineHeight: 1.5 }}>{sub}</p>
      {children}
    </section>
  );
}

function PillarBanner({ emoji, title, color, ink, desc }: { emoji: string; title: string; color: string; ink: string; desc: string }) {
  const titleStyle = useTitleFont();
  return (
    <div style={{ background: color, color: ink, borderRadius: 18, padding: "22px 26px", marginBottom: 20 }}>
      <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, opacity: 0.85, margin: "0 0 6px" }}>{emoji} Pilier</p>
      <h2 style={{ ...titleStyle, fontSize: 28, margin: "0 0 8px" }}>{title}</h2>
      <p style={{ fontFamily: SANS, fontSize: 13.5, lineHeight: 1.55, opacity: 0.92, maxWidth: 660, margin: 0 }}>{desc}</p>
    </div>
  );
}

function MojitoChip({ id }: { id: string }) {
  const m = MOJITO_META[id];
  if (!m) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.hex, color: m.ink, borderRadius: 999, padding: "3px 10px 3px 7px", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.ink, opacity: 0.5 }} />
      {m.label}
    </span>
  );
}

function FicheCard({ fiche, pillarColor, pillarInk }: { fiche: Fiche; pillarColor: string; pillarInk: string }) {
  const f = fiche;
  const titleStyle = useTitleFont();
  return (
    <article style={{ border: "1px solid rgba(22,50,76,.12)", borderRadius: 18, background: "#fff", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px 0" }}>
        <span style={{ background: pillarColor, color: pillarInk, borderRadius: 999, width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {f.id}
        </span>
        <div>
          <h3 style={{ ...titleStyle, fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            {f.nom}
            {f.star && <Sparkles size={14} color={pillarColor} />}
          </h3>
          <p style={{ fontFamily: SANS, fontSize: 11.5, fontStyle: "italic", color: "#7a8894", margin: "2px 0 0" }}>{f.tagline}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, padding: 20, flexWrap: "wrap" }}>
        {/* Mockup mini-post */}
        <div style={{ flex: "0 0 auto", width: 164 }}>
          <div style={{ width: 164, aspectRatio: "4 / 5", borderRadius: 12, background: "#e7ddcd", border: "1.5px dashed rgba(22,50,76,.2)", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: 8, left: 9, fontSize: 8.5, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, color: "#8a7d69" }}>
              Frame 1
            </span>
            <p style={{ fontSize: 10, lineHeight: 1.35, color: "#7a6e5a", padding: "22px 10px 8px", margin: 0 }}>{f.hookVisual}</p>
            <div style={{ background: pillarColor, color: pillarInk, padding: "8px 10px" }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: f.overlayStyle === "overlay" ? OVERLAY_CAFETERIA : SERIF,
                  fontStyle: f.overlayStyle === "overlay" ? "normal" : "italic",
                  fontWeight: f.overlayStyle === "overlay" ? 800 : 500,
                  fontSize: 12,
                  lineHeight: 1.25,
                }}
              >
                {f.hookEcrit}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 9.5, color: "#9aa3aa", margin: "5px 0 0", textAlign: "center" }}>
            {f.overlayStyle === "overlay" ? "Overlay · Cafeteria / Arial Rounded" : "Overlay · Newsreader"}
          </p>
        </div>

        {/* Détails */}
        <div style={{ flex: "1 1 220px", minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ display: "inline-flex", alignSelf: "flex-start", background: CREME, color: "#56636e", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            {f.frequence}
          </span>

          <div style={{ background: "#F8F5EF", borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: pillarColor }}>
              La question qui convertit
            </p>
            <p style={{ margin: "4px 0 0", fontFamily: SANS, fontSize: 12.5, lineHeight: 1.4, color: MARINE }}>{f.question}</p>
          </div>

          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
              {f.mojito.map((m) => <MojitoChip key={m} id={m} />)}
            </div>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "#56636e" }}>{f.mojitoCheck}</p>
          </div>

          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: "#41505c" }}>
            <strong style={{ color: MARINE }}>Traduction anti-beige — </strong>
            {f.traduction}
          </p>

          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: "#7a8894", fontStyle: "italic" }}>
            Reproductible : {f.reproductible}
          </p>
        </div>
      </div>

      {f.extra && (
        <div style={{ margin: "0 20px 20px", background: "#FFF5F5", border: "1px solid rgba(194,58,45,.15)", borderRadius: 10, padding: "10px 14px", fontSize: 11.5, lineHeight: 1.5, color: "#7a3a34" }}>
          {f.extra}
        </div>
      )}
    </article>
  );
}
