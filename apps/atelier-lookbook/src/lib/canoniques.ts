/**
 * Liste des canoniques disponibles (lecture en dur depuis le casting v3.0 du Hub).
 * Synchronisée avec referentiels/shooting/mannequins_recurrents.json — voir
 * apps/atelier-shooting/lib/canoniques.ts pour la version "source de vérité"
 * utilisée par character-reference Gemini.
 *
 * Phase A casting (30/04) : ajout `filename` + `favorite` pour pouvoir afficher
 * les vignettes dans le CastingPicker, identique au pattern shooting.
 */
export type CanoniqueGenre = "F" | "H" | "enfant";

export interface CanoniqueLite {
  id: string;
  prenom: string;
  age: number;
  genre: CanoniqueGenre;
  signature: string;
  filename: string;
  favorite?: boolean;
  duo?: string;
}

export const CANONIQUES_LITE: CanoniqueLite[] = [
  { id: "MAN-P01", prenom: "Clémence", age: 38, genre: "F",
    signature: "Antiquaire indépendante à Honfleur, divorcée mère épanouie, brune longs + frange rideau Bardot, lèvres bordeaux MAC Diva, taches de rousseur denses, famille esthétique 'maquillée chic assumée'.",
    filename: "MAN-P01_Clemence_canonique.jpg", favorite: true },
  { id: "MAN-P02", prenom: "Anna", age: 32, genre: "F",
    signature: "Femme française naturelle no-makeup, châtain mi-longs, allure A.P.C.",
    filename: "MAN-P02_Anna_canonique.jpg" },
  { id: "MAN-P03", prenom: "Aïcha", age: 40, genre: "F",
    signature: "Afro-caribéenne grande élancée, afro court ou braids tirées, DA agence com / galeriste parisienne, no-makeup naturel.",
    filename: "MAN-P03_Aicha_canonique.jpg", favorite: true },
  { id: "MAN-P04", prenom: "Lila", age: 35, genre: "F",
    signature: "Métisse française, cheveux longs ondulés, no-makeup natural.",
    filename: "MAN-P04_Lila_canonique.jpg" },
  { id: "MAN-P05", prenom: "Béatrice", age: 65, genre: "F",
    signature: "Senior française, grand-mère de Félicie, cheveux argentés courts, élégance posée campagne normande.",
    filename: "MAN-P05_Beatrice_canonique.jpg" },
  { id: "MAN-P06", prenom: "Mathieu", age: 40, genre: "H",
    signature: "Papa, châtain barbe brune 3 jours, cheveux dépeignés, papa sportwear chic (marinière + Stan Smith).",
    filename: "MAN-P06_Mathieu_canonique.jpg", favorite: true },
  { id: "MAN-P07", prenom: "Nicolas", age: 38, genre: "H",
    signature: "Homme adulte français, paternité tardive choisie, châtain, allure posée et calme.",
    filename: "MAN-P07_Nicolas_canonique.jpg" },
  { id: "MAN-P08", prenom: "Félicie", age: 7, genre: "enfant",
    signature: "Petite-fille de Béatrice, blonde vénitienne longs ondulés, taches rousseur denses.",
    filename: "MAN-P08_Felicie_canonique.jpg" },
  { id: "MAN-P09", prenom: "Gabin", age: 5, genre: "enfant",
    signature: "Petit garçon blanc cheveux noirs longs, mini-sportswear papa-fils, fils de Mathieu.",
    filename: "MAN-P09_Gabin_canonique.jpg" },
  { id: "MAN-P10", prenom: "Marie-Hélène", age: 40, genre: "F",
    signature: "Rousse cheveux longs ondulés cuivrés, taches de rousseur, mèche argentée discrète.",
    filename: "MAN-P10_MarieHelene_canonique.jpg", favorite: true },
  { id: "MAN-P11-LEA", prenom: "Léa", age: 37, genre: "F",
    signature: "Métisse cheveux bruns bouclés courts, mariée à Sarah (DUO_LEA_SARAH), couple lesbien établi.",
    filename: "MAN-P11_Lea_canonique.jpg", duo: "DUO_LEA_SARAH" },
  { id: "MAN-P11-SARAH", prenom: "Sarah", age: 35, genre: "F",
    signature: "Nordique blonde cendrée androgyne, mariée à Léa (DUO_LEA_SARAH).",
    filename: "MAN-P11_Sarah_canonique.jpg", duo: "DUO_LEA_SARAH" },
  { id: "MAN-P12", prenom: "Brune", age: 22, genre: "F",
    signature: "Brune cheveux longs, piercing discret, créative mode décontractée Gen Z (Thylane Blondeau civile), étudiante créative.",
    filename: "MAN-P12_Brune_canonique.jpg", favorite: true },
  { id: "MAN-S13", prenom: "Priya", age: 30, genre: "F",
    signature: "Sud-asiatique, cheveux noirs longs ondulés.",
    filename: "MAN-S13_Priya_canonique.jpg" },
  { id: "MAN-S14", prenom: "Gaspard", age: 23, genre: "H",
    signature: "Jeune homme blanc, étudiant créatif, en couple avec Brune (DUO_GASPARD_BRUNE).",
    filename: "MAN-S14_Gaspard_canonique.jpg" },
  { id: "MAN-S15", prenom: "Noé", age: 1, genre: "enfant",
    signature: "Bébé blanc, fils de Hugo (DUO_HUGO_NOE).",
    filename: "MAN-S15_Noe_canonique.jpg" },
  { id: "MAN-S16", prenom: "Hiroshi", age: 35, genre: "H",
    signature: "Homme japonais, créatif posé.",
    filename: "MAN-S16_Hiroshi_canonique.jpg" },
  { id: "MAN-S17", prenom: "Césaria", age: 40, genre: "F",
    signature: "Afro-caribéenne, prof de lettres, vitiligo discret jamais centré, twists ou afro puff.",
    filename: "MAN-S17_Cesaria_canonique.jpg" },
  { id: "MAN-S18", prenom: "Hassan", age: 38, genre: "H",
    signature: "Homme maghrébin, élégance discrète.",
    filename: "MAN-S18_Hassan_canonique.jpg" },
  { id: "MAN-S19-HENRI", prenom: "Henri", age: 72, genre: "H",
    signature: "Senior français blanc, beau-père d'Aïcha et Césaria, marié à Joséphine (DUO_HENRI_JOSEPHINE).",
    filename: "MAN-S19_Henri_canonique.jpg", duo: "DUO_HENRI_JOSEPHINE" },
  { id: "MAN-S19-JOSEPHINE", prenom: "Joséphine", age: 70, genre: "F",
    signature: "Senior afro-caribéenne, boucles argentées, mère biologique d'Aïcha et Césaria, mariée à Henri.",
    filename: "MAN-S19_Josephine_canonique.jpg", duo: "DUO_HENRI_JOSEPHINE" },
  { id: "MAN-S20", prenom: "Coline", age: 35, genre: "F",
    signature: "Blonde cendrée bouclée, jeune mère (TRIO_COLINE_HUGO_NOE).",
    filename: "MAN-S20_Coline_canonique.jpg" },
  { id: "MAN-S21", prenom: "Hugo", age: 30, genre: "H",
    signature: "Sandy-brown, jeune papa urbain (DUO_HUGO_NOE), en couple avec Coline.",
    filename: "MAN-S21_Hugo_canonique.jpg" },
];

export function getCanoniqueById(id: string): CanoniqueLite | undefined {
  return CANONIQUES_LITE.find((c) => c.id === id);
}

export function getCanoniquesSorted(): CanoniqueLite[] {
  return [...CANONIQUES_LITE].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return a.id.localeCompare(b.id);
  });
}

export function buildCanoniquesContextForLLM(restrictTo?: string[]): string {
  const list = restrictTo && restrictTo.length > 0
    ? CANONIQUES_LITE.filter((c) => restrictTo.includes(c.id))
    : CANONIQUES_LITE;
  return list.map((c) =>
    `- ${c.id} ${c.prenom}, ${c.age} ans (${c.genre}) : ${c.signature}`
  ).join("\n");
}
