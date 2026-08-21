/** Banque de vrai Ypersoa — source unique pour les contenus de marque. */
export type EditorialOccasion = "rentree" | "cadeau" | "noel" | "naissance" | "mariage" | "evjf" | "anniversaire" | "secret-santa" | "entretien" | "atelier" | "evergreen";

export interface EditorialDetail {
  id: string;
  occasions: EditorialOccasion[];
  visibility: "public" | "coulisses" | "prive";
  text: string;
  fingerprints: string[];
}

export const EDITORIAL_BANK: EditorialDetail[] = [
  { id: "rentree-pull-perdu", occasions: ["rentree"], visibility: "public", text: "Le pull part à l'école le lundi et revient parfois sur le dos d'un autre gamin. Un prénom brodé le rend reconnaissable à trois mètres et il doit tenir jusqu'à juin, pas jusqu'à la Toussaint.", fingerprints: ["pull perdu", "trois mètres", "Toussaint"] },
  { id: "entretien-jules-ule", occasions: ["entretien", "rentree", "evergreen"], visibility: "public", text: "Le fil est pris dans la maille. L'imprimé ou le flocage peut craqueler : après quelques lavages, JULES finit parfois en ULE.", fingerprints: ["JULES", "ULE", "maille"] },
  { id: "atelier-prenom-stock", occasions: ["atelier", "rentree", "cadeau", "evergreen"], visibility: "public", text: "Chaque pièce est brodée à la commande à Wattrelos : elle a déjà un prénom avant d'exister, sans stock qui dort.", fingerprints: ["Wattrelos", "prénom avant d'exister", "stock qui dort"] },
  { id: "atelier-temps-invisible", occasions: ["atelier", "entretien", "evergreen"], visibility: "public", text: "Je passe autant de temps à préparer qu'à broder : je bugue devant la pièce, je veux agrandir, centrer un peu plus ou tenter le multicolore.", fingerprints: ["centrer un peu plus", "multicolore", "autant de temps"] },
  { id: "atelier-arc-en-ciel", occasions: ["atelier", "cadeau", "evergreen"], visibility: "public", text: "Les coloris de fil, c'est 9, 10, 12 ou 24 selon les jours, les envies et la saison. La vie, c'est un arc-en-ciel.", fingerprints: ["9, 10, 12, 24", "arc-en-ciel", "selon les jours"] },
  { id: "cadeau-derniere-minute", occasions: ["cadeau", "anniversaire", "evergreen"], visibility: "public", text: "Être invitée à un anniversaire à la dernière minute, c'est la galère pour trouver THE idée du siècle.", fingerprints: ["dernière minute", "THE idée du siècle", "anniversaire"] },
  { id: "cadeau-prends-les-deux", occasions: ["cadeau", "anniversaire", "evergreen"], visibility: "public", text: "Quand une cliente hésite, je lui dis : quand y a un doute, y a pas de doute, prends les deux ^^", fingerprints: ["prends les deux", "quand y a un doute", "^^"] },
  { id: "secret-santa-geek", occasions: ["secret-santa", "cadeau", "noel"], visibility: "public", text: "Le Secret Santa avec le collègue que tu détestes : il faut trouver un cadeau classe qui prouve que tu le connais. Le geek de l'informatique du 3e ? Le Club.", fingerprints: ["Secret Santa", "geek de l'informatique", "3e"] },
  { id: "noel-trois-sapins", occasions: ["noel", "cadeau"], visibility: "public", text: "Je commence la déco de Noël en septembre, je pense aux cadeaux depuis août sur la plage et j'ai trois sapins dans 60 m². J'avais promis de ne rien acheter avant octobre. LOL.", fingerprints: ["trois sapins", "60 m²", "août sur la plage"] },
  { id: "naissance-offrir-parents", occasions: ["naissance", "cadeau"], visibility: "public", text: "Pour une naissance, j'aime offrir aux parents, pas au bébé : un body sert un jour et après ça sent le vomi. Une date de naissance ou des coordonnées GPS restent avec eux.", fingerprints: ["ça sent le vomi", "coordonnées GPS", "aux parents, pas au bébé"] },
  { id: "naissance-dates-manches", occasions: ["naissance", "anniversaire", "cadeau"], visibility: "public", text: "J'ai fait broder les dates de naissance de mon fils et de mon copain sur des manches parce que j'oublie leurs anniversaires. #honte.", fingerprints: ["sur des manches", "j'oublie leurs anniversaires", "#honte"] },
  { id: "evjf-70-bonnets", occasions: ["mariage", "evjf", "atelier"], visibility: "public", text: "La première commande : 70 bonnets rose fluo pour la team de la mariée et un bonnet blanc, à finir en une semaine. Livrés, puis photos de la soirée le 31 décembre à Dunkerque.", fingerprints: ["70 bonnets", "rose fluo", "Dunkerque"] },
  { id: "mariage-beau-doux", occasions: ["mariage", "anniversaire", "cadeau"], visibility: "public", text: "Depuis, les mariés recommandent chaque année un beau doux : je t'aime, ramasse tes chaussettes. Le romantisme a plusieurs visages.", fingerprints: ["beau doux", "ramasse tes chaussettes", "romantisme"] },
  { id: "atelier-drache", occasions: ["atelier", "evergreen"], visibility: "public", text: "Après une drache du Nord à vélo, seule ma fesse droite est rentrée sèche. Il me restait 18 kilomètres et la menace très sérieuse d'un rhume de fesse.", fingerprints: ["fesse droite", "18 kilomètres", "rhume de fesse"] },
];

const OCCASION_KEYWORDS: Record<EditorialOccasion, string[]> = {
  rentree: ["rentrée", "rentree", "école", "ecole", "enfant", "scolaire"], cadeau: ["cadeau", "offrir", "idée", "idee"], noel: ["noël", "noel", "secret santa"], naissance: ["naissance", "bébé", "bebe", "nouveau-né"], mariage: ["mariage", "mariés", "maries", "couple"], evjf: ["evjf"], anniversaire: ["anniversaire", "anniv", "date de naissance"], "secret-santa": ["secret santa", "collègue", "collegue"], entretien: ["entretien", "lavage", "durabilité", "durabilite", "flocage", "imprimé", "imprime"], atelier: ["atelier", "broderie", "brodé", "brode", "commande"], evergreen: [],
};

export function selectEditorialDetails(targetQuery: string, angle: string, limit = 5): EditorialDetail[] {
  const brief = `${targetQuery} ${angle}`.toLocaleLowerCase("fr-FR");
  const matched = (Object.keys(OCCASION_KEYWORDS) as EditorialOccasion[]).filter((occasion) => OCCASION_KEYWORDS[occasion].some((keyword) => brief.includes(keyword)));
  const occasions = new Set<EditorialOccasion>(matched.length ? matched : ["evergreen"]);
  const selected = EDITORIAL_BANK.filter((entry) => entry.visibility === "public" && entry.occasions.some((occasion) => occasions.has(occasion)));
  const evergreen = EDITORIAL_BANK.filter((entry) => entry.visibility === "public" && entry.occasions.includes("evergreen"));
  return [...new Map([...selected, ...evergreen].map((entry) => [entry.id, entry])).values()].slice(0, limit);
}
