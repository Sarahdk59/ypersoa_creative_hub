/**
 * Moteur d'attribution couleur → lettre pour broderie multicolore Ypersoa.
 *
 * Port TypeScript fidèle de prod_hub/moteur_attribution/moteur_attribution.py.
 * Algorithme : backtracking avec contraintes dures + scoring sur règles molles.
 *
 * Règles dures (jamais violées) :
 *   - Adjacence horizontale : 2 lettres voisines même ligne, jamais même couleur
 *   - Alignement vertical : 2 lettres chevauchantes sur lignes adjacentes, jamais même couleur
 *   - Diagonale triple : 3 lettres en diagonale même direction, jamais même couleur
 *   - Palindrome XYX : pattern X-Y-X sur même ligne, X et X jamais même couleur
 *
 * Règles molles (scoring) :
 *   - Distribution (entropie de Shannon normalisée)
 *   - Pénalité orphelin (une couleur isolée si d'autres dominent à ≥4)
 *   - Pénalité colonne d'attaque (1res lettres lignes consécutives même couleur)
 *   - Cohérence cœur (si fournie, doit différer des 2 couleurs majoritaires)
 *
 * Déterminisme : hash FNV-1a 32-bit sur (texte + palette_id) → seed PRNG Mulberry32.
 */

export interface Position {
  ligne: number;       // index de ligne, 0-based
  indice: number;      // index dans la ligne, 0-based (parmi les chars brodés)
  x_relatif: number;   // position relative au centre de la ligne
  caractere: string;
}

export interface AttributionResult {
  texte_lignes: string[];
  palette_id: string;
  attribution: Record<number, string>; // position_idx → couleur_id
  positions: Position[];
  score: number;
  violations_dures: string[];
  seed: number;
  coeur_couleur_id: string | null;
  palette_effective: string[];
  distribution: Array<{ couleur_id: string; count: number }>;
}

// ============================================================
// PRNG seedé (Mulberry32) + hash seed déterministe
// ============================================================

function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hashSeed(texteLignes: string[], paletteId: string): number {
  return fnv1aHash(texteLignes.join("|") + "::" + paletteId);
}

class Mulberry32 {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }
  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  randint(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
  shuffleInPlace<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randint(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ============================================================
// Géométrie — parsing texte avec centrage
// ============================================================

export function parserTexte(texteLignes: string[]): Position[] {
  const positions: Position[] = [];
  for (let iLigne = 0; iLigne < texteLignes.length; iLigne++) {
    const ligne = texteLignes[iLigne];
    if (!ligne) continue;
    const chars = [...ligne].filter((c) => c !== " ");
    const n = chars.length;
    if (n === 0) continue;
    const centre = (n - 1) / 2;
    for (let iChar = 0; iChar < chars.length; iChar++) {
      positions.push({
        ligne: iLigne,
        indice: iChar,
        x_relatif: iChar - centre,
        caractere: chars[iChar],
      });
    }
  }
  return positions;
}

function alignesVerticalement(p1: Position, p2: Position, tol = 1.0): boolean {
  if (Math.abs(p1.ligne - p2.ligne) !== 1) return false;
  return Math.abs(p1.x_relatif - p2.x_relatif) < tol;
}

function enDiagonale(p1: Position, p2: Position): boolean {
  if (Math.abs(p1.ligne - p2.ligne) !== 1) return false;
  const dx = Math.abs(p1.x_relatif - p2.x_relatif);
  return dx >= 1.0 && dx < 1.5;
}

// ============================================================
// Règles dures — validation
// ============================================================

function trouverViolationsAdjacence(positions: Position[], attr: Record<number, string>): Array<[number, number]> {
  const v: Array<[number, number]> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const pi = positions[i], pj = positions[j];
      if (pi.ligne === pj.ligne && Math.abs(pi.indice - pj.indice) === 1) {
        if (attr[i] === attr[j]) v.push([i, j]);
      }
    }
  }
  return v;
}

function trouverViolationsVerticales(positions: Position[], attr: Record<number, string>): Array<[number, number]> {
  const v: Array<[number, number]> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (alignesVerticalement(positions[i], positions[j]) && attr[i] === attr[j]) v.push([i, j]);
    }
  }
  return v;
}

function trouverViolationsDiagonales(positions: Position[], attr: Record<number, string>): Array<[number, number, number]> {
  const v: Array<[number, number, number]> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      if (positions[j].ligne !== positions[i].ligne + 1) continue;
      if (!enDiagonale(positions[i], positions[j])) continue;
      const dirIj = positions[j].x_relatif - positions[i].x_relatif;
      for (let k = 0; k < positions.length; k++) {
        if (positions[k].ligne !== positions[j].ligne + 1) continue;
        if (!enDiagonale(positions[j], positions[k])) continue;
        const dirJk = positions[k].x_relatif - positions[j].x_relatif;
        if (Math.abs(dirIj - dirJk) > 0.5) continue;
        if (attr[i] === attr[j] && attr[j] === attr[k]) v.push([i, j, k]);
      }
    }
  }
  return v;
}

function trouverViolationsPalindrome(positions: Position[], attr: Record<number, string>): Array<[number, number, number]> {
  const v: Array<[number, number, number]> = [];
  for (let i = 0; i < positions.length; i++) {
    const pi = positions[i];
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const pj = positions[j];
      if (pj.ligne !== pi.ligne) continue;
      if (pj.indice - pi.indice !== 2) continue;
      if (attr[i] !== attr[j]) continue;
      for (let k = 0; k < positions.length; k++) {
        const pk = positions[k];
        if (pk.ligne === pi.ligne && pk.indice === pi.indice + 1) {
          if (attr[k] !== attr[i]) v.push([i, k, j]);
          break;
        }
      }
    }
  }
  return v;
}

function validerDur(positions: Position[], attr: Record<number, string>): { valid: boolean; erreurs: string[] } {
  const erreurs: string[] = [];
  const adj = trouverViolationsAdjacence(positions, attr);
  if (adj.length) erreurs.push(`Adjacence H: ${adj.length} cas`);
  const vert = trouverViolationsVerticales(positions, attr);
  if (vert.length) erreurs.push(`Alignement V: ${vert.length} cas`);
  const diag = trouverViolationsDiagonales(positions, attr);
  if (diag.length) erreurs.push(`Diagonale x3: ${diag.length} cas`);
  const palin = trouverViolationsPalindrome(positions, attr);
  if (palin.length) erreurs.push(`Palindrome XYX: ${palin.length} cas`);
  return { valid: erreurs.length === 0, erreurs };
}

// ============================================================
// Backtracking — generation de candidats valides
// ============================================================

function violeLocal(positions: Position[], attr: Record<number, string>, idx: number): boolean {
  const posIdx = positions[idx];
  const couleurIdx = attr[idx];
  for (let j = 0; j < idx; j++) {
    if (attr[j] !== couleurIdx) continue;
    const pj = positions[j];
    // adjacence horizontale
    if (pj.ligne === posIdx.ligne && Math.abs(pj.indice - posIdx.indice) === 1) return true;
    // palindrome horizontal XYX
    if (pj.ligne === posIdx.ligne && Math.abs(pj.indice - posIdx.indice) === 2) {
      const milieuIndice = Math.floor((pj.indice + posIdx.indice) / 2);
      for (let k = 0; k < idx; k++) {
        const pk = positions[k];
        if (pk.ligne === posIdx.ligne && pk.indice === milieuIndice) {
          if (attr[k] !== couleurIdx) return true;
          break;
        }
      }
    }
    // alignement vertical
    if (alignesVerticalement(pj, posIdx)) return true;
  }
  // diagonale triple (k, j, idx) tous même couleur
  for (let j = 0; j < idx; j++) {
    if (attr[j] !== couleurIdx) continue;
    const pj = positions[j];
    if (pj.ligne !== posIdx.ligne - 1) continue;
    if (!enDiagonale(pj, posIdx)) continue;
    const dirJIdx = posIdx.x_relatif - pj.x_relatif;
    for (let k = 0; k < j; k++) {
      if (attr[k] !== couleurIdx) continue;
      const pk = positions[k];
      if (pk.ligne !== pj.ligne - 1) continue;
      if (!enDiagonale(pk, pj)) continue;
      const dirKJ = pj.x_relatif - pk.x_relatif;
      if (Math.abs(dirKJ - dirJIdx) <= 0.5) return true;
    }
  }
  return false;
}

function backtrack(positions: Position[], palette: string[], rng: Mulberry32): Record<number, string> | null {
  const attr: Record<number, string> = {};

  function solve(idx: number): boolean {
    if (idx >= positions.length) return true;
    const couleurs = rng.shuffleInPlace([...palette]);
    for (const c of couleurs) {
      attr[idx] = c;
      if (!violeLocal(positions, attr, idx)) {
        if (solve(idx + 1)) return true;
      }
    }
    delete attr[idx];
    return false;
  }

  return solve(0) ? attr : null;
}

// ============================================================
// Scoring — règles molles
// ============================================================

function scorer(
  positions: Position[],
  attr: Record<number, string>,
  palette: string[],
  coeurCouleurId: string | null,
): number {
  const couleurs = Object.values(attr);
  const n = couleurs.length;
  if (n === 0) return -Infinity;

  const counts: Record<string, number> = {};
  for (const c of couleurs) counts[c] = (counts[c] || 0) + 1;
  const countsArr = Object.values(counts);

  // 1. Distribution — entropie Shannon normalisée
  let H = 0;
  for (const cnt of countsArr) {
    const p = cnt / n;
    H -= p * Math.log2(p);
  }
  const HMax = n > 1 ? Math.log2(Math.min(palette.length, n)) : 1.0;
  const scoreDistrib = HMax > 0 ? H / HMax : 1.0;

  // 2. Pénalité orphelin
  const nMax = Math.max(...countsArr);
  let scoreOrphelin = 1.0;
  if (nMax >= 4) {
    for (const cnt of countsArr) {
      if (cnt === 1) scoreOrphelin -= 0.2;
    }
  }
  scoreOrphelin = Math.max(0, scoreOrphelin);

  // 3. Pénalité colonne d'attaque
  const premieresParLigne: Record<number, number> = {};
  for (let idx = 0; idx < positions.length; idx++) {
    const pos = positions[idx];
    if (!(pos.ligne in premieresParLigne) || pos.indice < positions[premieresParLigne[pos.ligne]].indice) {
      premieresParLigne[pos.ligne] = idx;
    }
  }
  const lignesTriees = Object.keys(premieresParLigne).map(Number).sort((a, b) => a - b);
  let scoreAttaque = 1.0;
  for (let k = 0; k < lignesTriees.length - 1; k++) {
    if (attr[premieresParLigne[lignesTriees[k]]] === attr[premieresParLigne[lignesTriees[k + 1]]]) {
      scoreAttaque -= 0.15;
    }
  }
  scoreAttaque = Math.max(0, scoreAttaque);

  // 4. Cohérence cœur
  let scoreCoeur = 1.0;
  if (coeurCouleurId !== null) {
    const ranking = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top1 = ranking.length >= 1 ? ranking[0][0] : null;
    const top2 = ranking.length >= 2 ? ranking[1][0] : null;
    if (coeurCouleurId === top1) scoreCoeur = 0.0;
    else if (coeurCouleurId === top2) scoreCoeur = 0.5;
  }

  if (coeurCouleurId !== null) {
    return 0.4 * scoreDistrib + 0.25 * scoreOrphelin + 0.15 * scoreAttaque + 0.20 * scoreCoeur;
  }
  return 0.5 * scoreDistrib + 0.3 * scoreOrphelin + 0.2 * scoreAttaque;
}

// ============================================================
// Pipeline principal
// ============================================================

// ============================================================
// Mode PATTERN — attribution déterministe par règle fixe (ex. YPM-004)
// ============================================================

export interface PatternDistribution {
  type: "fixed_per_line";
  fils_order: string[];                            // ordre A/B/C/D...
  patterns_dates: Record<string, string[]>;         // "1" → ["DDAA"], "2" → ["BBCC","DDAA"], ...
  signature_line?: string;                          // ex. "DDDD"
}

/**
 * Attribution déterministe par pattern (pas de backtracking).
 * - texteLignes[0..N-2] = lignes dates (N = nombre de dates)
 * - texteLignes[N-1] = ligne signature optionnelle (si pattern.signature_line défini ET dernière ligne ≠ chiffres pures)
 *
 * Si une ligne n'a pas assez/trop de caractères vs le pattern, on cycle le pattern
 * (modulo longueur) pour étendre. Robustesse > pureté.
 *
 * Si filsOverride est fourni (ex. palette sélectionnée par l'utilisateur), ces fils
 * remplacent l'ordre A/B/C/D figé dans la bible. Permet à l'utilisateur de choisir
 * sa gamme tout en gardant la règle de distribution du motif.
 */
export function attribuerPattern(
  texteLignes: string[],
  pattern: PatternDistribution,
  paletteId = "pattern_fixe",
  filsOverride?: string[],
): AttributionResult {
  const positions = parserTexte(texteLignes);

  // Si l'utilisateur fournit une palette, on remplace l'ordre A/B/C/D figé bible
  // par les fils de sa palette (premier fil = A, deuxième = B, etc.).
  const filsOrder = filsOverride && filsOverride.length >= pattern.fils_order.length
    ? filsOverride.slice(0, pattern.fils_order.length)
    : pattern.fils_order;

  // Détecte la ligne signature : dernière ligne qui contient un ESPACE ou un "&"
  // (typique "David & Mathilde", "Famille Martin"). Un prénom seul (LOLA, EMMA)
  // n'a pas d'espace et reste une "date".
  const lignesAvecCaractere = texteLignes.filter((l) => l.trim().length > 0);
  const dernIdx = lignesAvecCaractere.length - 1;
  const isLigneSignature = (l: string) => / |&/.test(l.trim());
  const hasSignature = dernIdx >= 0 && isLigneSignature(lignesAvecCaractere[dernIdx]) && pattern.signature_line;

  const nbDates = hasSignature ? lignesAvecCaractere.length - 1 : lignesAvecCaractere.length;
  const patternLignes = pattern.patterns_dates[String(nbDates)];
  if (!patternLignes) {
    return {
      texte_lignes: texteLignes,
      palette_id: paletteId,
      attribution: {},
      positions,
      score: -Infinity,
      violations_dures: [`Pattern indisponible pour ${nbDates} ligne(s) de dates (disponibles : ${Object.keys(pattern.patterns_dates).join(", ")})`],
      seed: 0,
      coeur_couleur_id: null,
      palette_effective: pattern.fils_order,
      distribution: [],
    };
  }

  // Map lettre A/B/C/D → fil_id via filsOrder (palette utilisateur OU fils_order bible)
  const letterToFil = (letter: string): string | null => {
    const idx = letter.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
    if (idx < 0 || idx >= filsOrder.length) return null;
    return filsOrder[idx];
  };

  // Construit l'attribution : pour chaque position, trouve sa ligne et son indice → lettre du pattern → fil
  const attribution: Record<number, string> = {};
  for (let idx = 0; idx < positions.length; idx++) {
    const pos = positions[idx];
    // Détermine quel index de pattern utiliser pour cette ligne
    let patternStr: string;
    if (hasSignature && pos.ligne === dernIdx) {
      patternStr = pattern.signature_line!;
    } else {
      // Les dates suivent l'ordre des lignes
      patternStr = patternLignes[pos.ligne] || patternLignes[patternLignes.length - 1];
    }
    // Cycle modulo si lettre déborde
    const letter = patternStr[pos.indice % patternStr.length];
    const filId = letterToFil(letter);
    attribution[idx] = filId || filsOrder[0];
  }

  // Distribution
  const counts: Record<string, number> = {};
  for (const cid of Object.values(attribution)) counts[cid] = (counts[cid] || 0) + 1;
  const distribution = Object.entries(counts)
    .map(([couleur_id, count]) => ({ couleur_id, count }))
    .sort((a, b) => b.count - a.count);

  return {
    texte_lignes: texteLignes,
    palette_id: paletteId,
    attribution,
    positions,
    score: 1.0, // pattern fixe = parfait par construction
    violations_dures: [],
    seed: 0,
    coeur_couleur_id: null,
    palette_effective: filsOrder,
    distribution,
  };
}

export interface AttribuerOptions {
  texte_lignes: string[];
  palette: string[];               // fil_ids
  palette_id?: string;
  n_candidats?: number;
  coeur_couleur_id?: string | null;
  fils_incompatibles_support?: string[];
}

export function attribuer({
  texte_lignes,
  palette,
  palette_id = "default",
  n_candidats = 100,
  coeur_couleur_id = null,
  fils_incompatibles_support = [],
}: AttribuerOptions): AttributionResult {
  const positions = parserTexte(texte_lignes);
  const seed = hashSeed(texte_lignes, palette_id);
  const rngMaster = new Mulberry32(seed);

  const incompat = new Set(fils_incompatibles_support);
  const paletteEffective = palette.filter((p) => !incompat.has(p));

  if (paletteEffective.length === 0) {
    return {
      texte_lignes,
      palette_id,
      attribution: {},
      positions,
      score: -Infinity,
      violations_dures: [`Palette épuisée par incompatibilités support : ${[...incompat].join(", ")} retirés de [${palette.join(", ")}]`],
      seed,
      coeur_couleur_id,
      palette_effective: [],
      distribution: [],
    };
  }

  let meilleurAttr: Record<number, string> | null = null;
  let meilleurScore = -Infinity;

  for (let i = 0; i < n_candidats; i++) {
    const rng = new Mulberry32(rngMaster.randint(0x7fffffff));
    const attr = backtrack(positions, paletteEffective, rng);
    if (attr === null) continue;
    const s = scorer(positions, attr, paletteEffective, coeur_couleur_id);
    if (s > meilleurScore) {
      meilleurScore = s;
      meilleurAttr = attr;
    }
  }

  if (meilleurAttr === null) {
    return {
      texte_lignes,
      palette_id,
      attribution: {},
      positions,
      score: -Infinity,
      violations_dures: [`Aucune attribution valide trouvée — palette effective trop pauvre (${paletteEffective.length} fils après filtre support)`],
      seed,
      coeur_couleur_id,
      palette_effective: paletteEffective,
      distribution: [],
    };
  }

  const { valid, erreurs } = validerDur(positions, meilleurAttr);
  const counts: Record<string, number> = {};
  for (const cid of Object.values(meilleurAttr)) counts[cid] = (counts[cid] || 0) + 1;
  const distribution = Object.entries(counts)
    .map(([couleur_id, count]) => ({ couleur_id, count }))
    .sort((a, b) => b.count - a.count);

  return {
    texte_lignes,
    palette_id,
    attribution: meilleurAttr,
    positions,
    score: meilleurScore,
    violations_dures: valid ? [] : erreurs,
    seed,
    coeur_couleur_id,
    palette_effective: paletteEffective,
    distribution,
  };
}
