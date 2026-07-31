/**
 * Génère le storyboard textuel (4 frames) d'un épisode Studio Mood.
 * Export en Markdown + JSON — brief de montage pour CapCut/AE.
 */
import type { StudioMoodEpisode, Storyboard, StoryboardFrame } from "./types";

const SUPPORT_NOUN: Record<string, string> = {
  sweat:      "sweat à capuche",
  tshirt:     "t-shirt",
  casquette:  "casquette",
  accessoire: "accessoire",
};

export function buildStoryboard(ep: StudioMoodEpisode): Storyboard {
  const hook = ep.hook ?? `"${ep.mot_brode}" brodé à la commande ✨`;
  const legende = ep.legende_question ?? `Et toi, tu le ferais broder comment ?\n→ ypersoa.fr`;
  const support = SUPPORT_NOUN[ep.support] ?? ep.support;
  const motif = ep.motif_ypm_nom ? ` (motif ${ep.motif_ypm_nom})` : "";
  const couleur = ep.couleur_produit ? ` ${ep.couleur_produit}` : "";
  const decor = ep.decor ?? "Studio brut neutre, fond crème, lumière douce";
  const occasion = ep.occasion ?? null;

  const frames: StoryboardFrame[] = [
    {
      index: 1,
      label: "HOOK — Arrêt scroll",
      duree_s: "0 – 3 s",
      description:
        `Texte à l'écran : "${hook}"\n` +
        `Plan : gros plan fixe du ${support}${couleur} — le mot brodé "${ep.mot_brode}" centré dans le cadre.\n` +
        `Fond : ${decor}.\n` +
        `Son : son d'ambiance doux ou rien (cut franc).`,
      note_montage:
        "Texte en Hanken Grotesk Bold blanc ou marine sur fond foncé ou crème selon couleur du vêtement. " +
        "Durée stricte 3 s — l'arrêt scroll se joue en 1,5 s. " +
        "Transition : coupure franche vers frame 2.",
    },
    {
      index: 2,
      label: "GAG HUMEUR — La mise en scène",
      duree_s: "3 – 12 s",
      description:
        `Humeur à exprimer : "${ep.humeur}".\n` +
        (occasion ? `Contexte : ${occasion}.\n` : "") +
        `Mise en scène : personne (avatar ou vrai) qui porte le ${support}${couleur}${motif}, ` +
        `dans un décor cohérent avec l'humeur — ${decor}.\n` +
        `Mouvement suggéré : regard caméra / geste du vêtement / réaction spontanée.\n` +
        `Sous-titres optionnels sur 2-3 mots clés : "${ep.mot_brode}".`,
      note_montage:
        "Coupures rythmées sur les temps de la musique. " +
        "3-5 plans max (ne pas surcharger). " +
        "Ratio 9:16 natif. " +
        "Couleurs fidèles au vêtement réel.",
    },
    {
      index: 3,
      label: "MACRO BRODERIE — Le détail qui compte",
      duree_s: "12 – 20 s",
      description:
        `Plan rapproché — zoom lent sur le mot brodé "${ep.mot_brode}"${motif}.\n` +
        `Montrer : texture du fil, point broderie net, couleur du fil sur le ${support}${couleur}.\n` +
        `Si possible : main qui effleure la broderie (humain au contact).\n` +
        `Sous-titre ou vignette : "Brodé à la commande — atelier Hauts-de-France".`,
      note_montage:
        "Plan le plus qualitatif : stabilisateur requis, lumière chaude latérale. " +
        "Durée 6-8 s minimum — c'est ici que la personnalisation se vend. " +
        "Filtre couleur : chaud (+10 température), pas de sur-saturation.",
    },
    {
      index: 4,
      label: "CTA — L'appel à l'action",
      duree_s: "20 – 24 s",
      description:
        `Plan : retour arrière ou still du ${support} posé / porté, sourire ou complicité.\n` +
        `Texte à l'écran : "${legende.split("\n")[0].trim()}"\n` +
        `CTA visible : "→ ypersoa.fr" + handle @ypersoa\n` +
        (ep.hashtags.length
          ? `Hashtags en description : ${ep.hashtags.slice(0, 5).join(" · ")}`
          : ""),
      note_montage:
        "Police Newsreader Italic pour le texte éditorial, Hanken Grotesk pour le CTA. " +
        "Couleurs brand : texte marine #16324C ou crème #F4EEE2 selon fond. " +
        "Dernière image : logo Ypersoa en coin bas droit, fade out 0,5 s.",
    },
  ];

  return {
    episode_id: ep.id,
    titre: ep.titre,
    humeur: ep.humeur,
    mot_brode: ep.mot_brode,
    motif_ypm_nom: ep.motif_ypm_nom,
    support: ep.support,
    occasion,
    decor: ep.decor,
    frames,
    hook,
    legende_question: legende,
    hashtags: ep.hashtags,
    generated_at: new Date().toISOString(),
  };
}

export function storyboardToMarkdown(sb: Storyboard): string {
  const header = [
    `# Storyboard — ${sb.titre}`,
    ``,
    `| Champ | Valeur |`,
    `|---|---|`,
    `| Humeur | ${sb.humeur} |`,
    `| Mot brodé | **"${sb.mot_brode}"** |`,
    sb.motif_ypm_nom ? `| Motif | ${sb.motif_ypm_nom} |` : null,
    `| Support | ${sb.support} |`,
    sb.occasion ? `| Occasion | ${sb.occasion} |` : null,
    sb.decor ? `| Décor | ${sb.decor} |` : null,
    `| Généré le | ${new Date(sb.generated_at).toLocaleDateString("fr-FR")} |`,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = [
    ``,
    `## Copy`,
    ``,
    `**Hook :** ${sb.hook}`,
    ``,
    `**Légende :**`,
    `> ${sb.legende_question.replace(/\n/g, "\n> ")}`,
    ``,
    sb.hashtags.length
      ? `**Hashtags :** ${sb.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`
      : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const framesSection = sb.frames
    .map((f) => {
      return [
        ``,
        `## Frame ${f.index} — ${f.label}`,
        `**Durée :** ${f.duree_s}`,
        ``,
        f.description,
        ``,
        `> 📋 **Note montage :** ${f.note_montage}`,
      ].join("\n");
    })
    .join("\n");

  return [header, copy, framesSection, ``, `---`, `*Brief généré par Studio Mood — Hub Ypersoa*`].join("\n");
}
