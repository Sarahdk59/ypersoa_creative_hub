/**
 * Liste des canoniques disponibles (lecture en dur depuis le casting v3.0 du Hub).
 * Synchronisée avec referentiels/shooting/mannequins_recurrents.json — voir
 * apps/atelier-shooting/lib/canoniques.ts pour la version "source de vérité"
 * utilisée par character-reference Gemini.
 *
 * En lookbook V0, on n'utilise que les métadonnées (id, prénom, age, signature)
 * pour le contexte LLM. L'injection visage Gemini sera faite en V1 via le
 * même pattern que atelier-shooting (parts[image canonique] dans /api/canonique-image
 * de atelier-social).
 */
export interface CanoniqueLite {
  id: string;
  prenom: string;
  age: number;
  genre: "F" | "H" | "enfant";
  signature: string;
}

export const CANONIQUES_LITE: CanoniqueLite[] = [
  { id: "MAN-P01", prenom: "Clémence", age: 38, genre: "F",
    signature: "Antiquaire indépendante à Honfleur, divorcée mère épanouie, brune longs + frange rideau Bardot, lèvres bordeaux MAC Diva, taches de rousseur denses, famille esthétique 'maquillée chic assumée'." },
  { id: "MAN-P02", prenom: "Anna", age: 32, genre: "F",
    signature: "Femme française naturelle no-makeup, châtain mi-longs, allure A.P.C." },
  { id: "MAN-P03", prenom: "Aïcha", age: 40, genre: "F",
    signature: "Afro-caribéenne grande élancée, afro court ou braids tirées, DA agence com / galeriste parisienne, no-makeup naturel." },
  { id: "MAN-P04", prenom: "Lila", age: 35, genre: "F",
    signature: "Métisse française, cheveux longs ondulés, no-makeup natural." },
  { id: "MAN-P05", prenom: "Béatrice", age: 65, genre: "F",
    signature: "Senior française, grand-mère de Félicie, cheveux argentés courts, élégance posée campagne normande." },
  { id: "MAN-P06", prenom: "Mathieu", age: 40, genre: "H",
    signature: "Papa, châtain barbe brune 3 jours, cheveux dépeignés, papa sportwear chic (marinière + Stan Smith)." },
  { id: "MAN-P07", prenom: "Nicolas", age: 38, genre: "H",
    signature: "Homme adulte français, paternité tardive choisie, châtain, allure posée et calme." },
  { id: "MAN-P08", prenom: "Félicie", age: 7, genre: "enfant",
    signature: "Petite-fille de Béatrice, blonde vénitienne longs ondulés, taches rousseur denses." },
  { id: "MAN-P09", prenom: "Gabin", age: 5, genre: "enfant",
    signature: "Petit garçon blanc cheveux noirs longs, mini-sportswear papa-fils, fils de Mathieu." },
  { id: "MAN-P10", prenom: "Marie-Hélène", age: 40, genre: "F",
    signature: "Rousse cheveux longs ondulés cuivrés, taches de rousseur, mèche argentée discrète." },
  { id: "MAN-P11-LEA", prenom: "Léa", age: 37, genre: "F",
    signature: "Métisse cheveux bruns bouclés courts, mariée à Sarah (DUO_LEA_SARAH), couple lesbien établi." },
  { id: "MAN-P11-SARAH", prenom: "Sarah", age: 35, genre: "F",
    signature: "Nordique blonde cendrée androgyne, mariée à Léa (DUO_LEA_SARAH)." },
  { id: "MAN-P12", prenom: "Brune", age: 22, genre: "F",
    signature: "Brune cheveux longs, piercing discret, créative mode décontractée Gen Z (Thylane Blondeau civile), étudiante créative." },
  { id: "MAN-S13", prenom: "Priya", age: 30, genre: "F",
    signature: "Sud-asiatique, cheveux noirs longs ondulés." },
  { id: "MAN-S14", prenom: "Gaspard", age: 23, genre: "H",
    signature: "Jeune homme blanc, étudiant créatif, en couple avec Brune (DUO_GASPARD_BRUNE)." },
  { id: "MAN-S15", prenom: "Noé", age: 1, genre: "enfant",
    signature: "Bébé blanc, fils de Hugo (DUO_HUGO_NOE)." },
  { id: "MAN-S16", prenom: "Hiroshi", age: 35, genre: "H",
    signature: "Homme japonais, créatif posé." },
  { id: "MAN-S17", prenom: "Césaria", age: 40, genre: "F",
    signature: "Afro-caribéenne, prof de lettres, vitiligo discret jamais centré, twists ou afro puff." },
  { id: "MAN-S18", prenom: "Hassan", age: 38, genre: "H",
    signature: "Homme maghrébin, élégance discrète." },
  { id: "MAN-S19-HENRI", prenom: "Henri", age: 72, genre: "H",
    signature: "Senior français blanc, beau-père d'Aïcha et Césaria, marié à Joséphine (DUO_HENRI_JOSEPHINE)." },
  { id: "MAN-S19-JOSEPHINE", prenom: "Joséphine", age: 70, genre: "F",
    signature: "Senior afro-caribéenne, boucles argentées, mère biologique d'Aïcha et Césaria, mariée à Henri." },
  { id: "MAN-S20", prenom: "Coline", age: 35, genre: "F",
    signature: "Blonde cendrée bouclée, jeune mère (TRIO_COLINE_HUGO_NOE)." },
  { id: "MAN-S21", prenom: "Hugo", age: 30, genre: "H",
    signature: "Sandy-brown, jeune papa urbain (DUO_HUGO_NOE), en couple avec Coline." }
];

export function buildCanoniquesContextForLLM(): string {
  return CANONIQUES_LITE.map((c) =>
    `- ${c.id} ${c.prenom}, ${c.age} ans (${c.genre}) : ${c.signature}`
  ).join("\n");
}
