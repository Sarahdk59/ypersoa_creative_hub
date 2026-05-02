"""
Moteur d'attribution couleur -> lettre pour broderie multicolore Ypersoa.
Version prototype - itere a partir d'ici.
"""

import hashlib
import random
import math
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional


# ============================================================
# MODELES DE DONNEES
# ============================================================

@dataclass
class Couleur:
    id: str
    nom: str
    hex: str


@dataclass
class Position:
    ligne: int          # index de ligne, 0-base
    indice: int         # index dans la ligne, 0-base (parmi les chars brodes)
    x_relatif: float    # position relative au centre de la ligne
    caractere: str      # le char brode


@dataclass
class Resultat:
    texte_lignes: List[str]
    palette_id: str
    attribution: Dict[int, str]      # position_idx -> couleur_id
    positions: List[Position]
    score: float
    violations_dures: List[str]
    seed: int
    coeur_couleur_id: Optional[str] = None
    palette_effective: List[str] = field(default_factory=list)  # palette apres filtre support


# ============================================================
# GEOMETRIE - parsing du texte avec centrage
# ============================================================

def parser_texte(texte_lignes: List[str], compter_espaces: bool = False) -> List[Position]:
    """
    Convertit les lignes de texte en liste de Positions avec geometrie centree.
    Les espaces sont ignores par defaut (= ne comptent pas comme position).
    """
    positions = []
    for i_ligne, ligne in enumerate(texte_lignes):
        if not ligne:
            continue
        chars = list(ligne) if compter_espaces else [c for c in ligne if c != ' ']
        N = len(chars)
        if N == 0:
            continue
        centre = (N - 1) / 2.0
        for i_char, c in enumerate(chars):
            if c == ' ':
                continue  # cas compter_espaces=True : on garde la position mais on n'ajoute pas
            positions.append(Position(
                ligne=i_ligne,
                indice=i_char,
                x_relatif=i_char - centre,
                caractere=c,
            ))
    return positions


def sont_alignes_verticalement(p1: Position, p2: Position, tol: float = 1.0) -> bool:
    """
    Deux positions sont 'voisines verticalement' si leurs largeurs se chevauchent.
    Avec largeur de lettre = 1 unite, chevauchement <=> ecart x < 1.
    Cas type : "DE" centree au-dessus de "GABIN" -> D chevauche A et B.
    """
    if abs(p1.ligne - p2.ligne) != 1:
        return False
    return abs(p1.x_relatif - p2.x_relatif) < tol


def sont_en_diagonale(p1: Position, p2: Position) -> bool:
    """
    Deux positions sont en diagonale stricte si lignes adjacentes ET juxtaposition
    sans chevauchement : ecart x dans [1.0, 1.5).
    """
    if abs(p1.ligne - p2.ligne) != 1:
        return False
    dx = abs(p1.x_relatif - p2.x_relatif)
    return 1.0 <= dx < 1.5


# ============================================================
# REGLES DURES - validation
# ============================================================

def trouver_violations_adjacence(positions: List[Position], attr: Dict[int, str]) -> List[Tuple[int, int]]:
    """Lettres adjacentes meme ligne, meme couleur."""
    v = []
    for i in range(len(positions)):
        for j in range(i + 1, len(positions)):
            pi, pj = positions[i], positions[j]
            if pi.ligne == pj.ligne and abs(pi.indice - pj.indice) == 1:
                if attr.get(i) == attr.get(j):
                    v.append((i, j))
    return v


def trouver_violations_verticales(positions: List[Position], attr: Dict[int, str]) -> List[Tuple[int, int]]:
    """Lettres alignees verticalement, meme couleur."""
    v = []
    for i in range(len(positions)):
        for j in range(i + 1, len(positions)):
            if sont_alignes_verticalement(positions[i], positions[j]):
                if attr.get(i) == attr.get(j):
                    v.append((i, j))
    return v


def trouver_violations_diagonales(positions: List[Position], attr: Dict[int, str]) -> List[Tuple[int, int, int]]:
    """Trios en diagonale (meme direction), meme couleur."""
    v = []
    for i in range(len(positions)):
        for j in range(len(positions)):
            if positions[j].ligne != positions[i].ligne + 1:
                continue
            if not sont_en_diagonale(positions[i], positions[j]):
                continue
            dir_ij = positions[j].x_relatif - positions[i].x_relatif
            for k in range(len(positions)):
                if positions[k].ligne != positions[j].ligne + 1:
                    continue
                if not sont_en_diagonale(positions[j], positions[k]):
                    continue
                dir_jk = positions[k].x_relatif - positions[j].x_relatif
                if abs(dir_ij - dir_jk) > 0.5:
                    continue  # pas la meme direction
                if attr.get(i) == attr.get(j) == attr.get(k):
                    v.append((i, j, k))
    return v


def valider_dur(positions: List[Position], attr: Dict[int, str]) -> Tuple[bool, List[str]]:
    """Retourne (est_valide, liste_erreurs)."""
    erreurs = []
    adj = trouver_violations_adjacence(positions, attr)
    if adj:
        erreurs.append(f"Adjacence H: {len(adj)} cas {adj[:3]}")
    vert = trouver_violations_verticales(positions, attr)
    if vert:
        erreurs.append(f"Alignement V: {len(vert)} cas {vert[:3]}")
    diag = trouver_violations_diagonales(positions, attr)
    if diag:
        erreurs.append(f"Diagonale x3: {len(diag)} cas {diag[:3]}")
    return (len(erreurs) == 0, erreurs)


# ============================================================
# BACKTRACKING - generation de candidats valides
# ============================================================

def viole_local(positions: List[Position], attr: Dict[int, str], idx: int) -> bool:
    """Verifie les contraintes liees a l'ajout de la couleur a la position idx."""
    pos_idx = positions[idx]
    couleur_idx = attr[idx]
    for j in range(idx):
        if attr[j] != couleur_idx:
            continue
        pj = positions[j]
        # adjacence horizontale
        if pj.ligne == pos_idx.ligne and abs(pj.indice - pos_idx.indice) == 1:
            return True
        # alignement vertical
        if sont_alignes_verticalement(pj, pos_idx):
            return True
    # diagonale 3-de-suite : on doit chercher un trio (k, j, idx) tous meme couleur
    for j in range(idx):
        if attr[j] != couleur_idx:
            continue
        pj = positions[j]
        if pj.ligne != pos_idx.ligne - 1:
            continue
        if not sont_en_diagonale(pj, pos_idx):
            continue
        dir_j_idx = pos_idx.x_relatif - pj.x_relatif
        for k in range(j):
            if attr[k] != couleur_idx:
                continue
            pk = positions[k]
            if pk.ligne != pj.ligne - 1:
                continue
            if not sont_en_diagonale(pk, pj):
                continue
            dir_k_j = pj.x_relatif - pk.x_relatif
            if abs(dir_k_j - dir_j_idx) <= 0.5:
                return True
    return False


def backtrack(positions: List[Position], palette: List[str], rng: random.Random) -> Optional[Dict[int, str]]:
    """Tente de remplir une attribution valide via backtracking."""
    attr: Dict[int, str] = {}

    def _solve(idx: int) -> bool:
        if idx >= len(positions):
            return True
        couleurs = list(palette)
        rng.shuffle(couleurs)
        for c in couleurs:
            attr[idx] = c
            if not viole_local(positions, attr, idx):
                if _solve(idx + 1):
                    return True
        attr.pop(idx, None)
        return False

    return attr if _solve(0) else None


# ============================================================
# SCORING - regles molles
# ============================================================

def scorer(
    positions: List[Position],
    attr: Dict[int, str],
    palette: List[str],
    coeur_couleur_id: Optional[str] = None,
) -> float:
    """Score [0, 1] base sur les regles molles. Plus c'est haut, mieux c'est."""
    if not attr:
        return -math.inf

    couleurs = list(attr.values())
    n = len(couleurs)
    counts: Dict[str, int] = {}
    for c in couleurs:
        counts[c] = counts.get(c, 0) + 1

    # 1. Distribution : entropie de Shannon normalisee
    H = -sum((cnt / n) * math.log2(cnt / n) for cnt in counts.values())
    H_max = math.log2(min(len(palette), n)) if n > 1 else 1.0
    score_distrib = H / H_max if H_max > 0 else 1.0

    # 2. Penalite couleur orpheline
    n_max = max(counts.values())
    score_orphelin = 1.0
    if n_max >= 4:
        for cnt in counts.values():
            if cnt == 1:
                score_orphelin -= 0.2
    score_orphelin = max(0.0, score_orphelin)

    # 3. Penalite colonne d'attaque (1eres lettres de lignes consecutives meme couleur)
    premieres_par_ligne: Dict[int, int] = {}
    for idx, pos in enumerate(positions):
        if pos.ligne not in premieres_par_ligne or pos.indice < positions[premieres_par_ligne[pos.ligne]].indice:
            premieres_par_ligne[pos.ligne] = idx
    lignes_triees = sorted(premieres_par_ligne.keys())
    score_attaque = 1.0
    for k in range(len(lignes_triees) - 1):
        if attr[premieres_par_ligne[lignes_triees[k]]] == attr[premieres_par_ligne[lignes_triees[k + 1]]]:
            score_attaque -= 0.15
    score_attaque = max(0.0, score_attaque)

    # 4. Coherence coeur : la couleur du coeur doit differer des 2 couleurs majoritaires du texte
    score_coeur = 1.0
    if coeur_couleur_id is not None:
        ranking = sorted(counts.items(), key=lambda x: -x[1])
        top1 = ranking[0][0] if len(ranking) >= 1 else None
        top2 = ranking[1][0] if len(ranking) >= 2 else None
        if coeur_couleur_id == top1:
            score_coeur = 0.0  # le coeur se perd dans la couleur dominante
        elif coeur_couleur_id == top2:
            score_coeur = 0.5  # le coeur se confond avec la 2e couleur

    if coeur_couleur_id is not None:
        return 0.4 * score_distrib + 0.25 * score_orphelin + 0.15 * score_attaque + 0.20 * score_coeur
    return 0.5 * score_distrib + 0.3 * score_orphelin + 0.2 * score_attaque


# ============================================================
# PIPELINE PRINCIPAL
# ============================================================

def hash_seed(texte_lignes: List[str], palette_id: str) -> int:
    s = "|".join(texte_lignes) + "::" + palette_id
    return int(hashlib.sha256(s.encode("utf-8")).hexdigest()[:8], 16)


def attribuer(
    texte_lignes: List[str],
    palette: List[str],
    palette_id: str = "default",
    n_candidats: int = 100,
    coeur_couleur_id: Optional[str] = None,
    fils_incompatibles_support: Optional[List[str]] = None,
) -> Resultat:
    """Pipeline complet : genere N candidats valides, score, retourne le meilleur.

    coeur_couleur_id: si fourni, penalise les attributions ou le coeur se confond
        avec la couleur dominante (ou la 2e couleur) du texte.
    fils_incompatibles_support: liste de fil_ids a exclure de la palette parce que
        peu lisibles sur le support choisi (cf. supports_incompatibles dans
        palette_fils_broderie_v2.json).
    """
    positions = parser_texte(texte_lignes)
    seed = hash_seed(texte_lignes, palette_id)
    rng_master = random.Random(seed)

    # Filtre support : on retire les fils peu lisibles sur le support cible
    incompat = set(fils_incompatibles_support or [])
    palette_effective = [p for p in palette if p not in incompat]

    if not palette_effective:
        return Resultat(
            texte_lignes=texte_lignes,
            palette_id=palette_id,
            attribution={},
            positions=positions,
            score=-math.inf,
            violations_dures=[
                f"Palette epuisee par incompatibilites support: {sorted(incompat)} retires de {palette}"
            ],
            seed=seed,
            coeur_couleur_id=coeur_couleur_id,
            palette_effective=[],
        )

    meilleur_attr: Optional[Dict[int, str]] = None
    meilleur_score = -math.inf

    for _ in range(n_candidats):
        rng = random.Random(rng_master.randint(0, 10 ** 9))
        attr = backtrack(positions, palette_effective, rng)
        if attr is None:
            continue
        s = scorer(positions, attr, palette_effective, coeur_couleur_id=coeur_couleur_id)
        if s > meilleur_score:
            meilleur_score = s
            meilleur_attr = attr

    if meilleur_attr is None:
        return Resultat(
            texte_lignes=texte_lignes,
            palette_id=palette_id,
            attribution={},
            positions=positions,
            score=-math.inf,
            violations_dures=[
                f"Aucune attribution valide trouvee - palette effective trop pauvre ({len(palette_effective)} fils apres filtre support)"
            ],
            seed=seed,
            coeur_couleur_id=coeur_couleur_id,
            palette_effective=palette_effective,
        )

    valide, erreurs = valider_dur(positions, meilleur_attr)
    return Resultat(
        texte_lignes=texte_lignes,
        palette_id=palette_id,
        attribution=meilleur_attr,
        positions=positions,
        score=meilleur_score,
        violations_dures=erreurs if not valide else [],
        seed=seed,
        coeur_couleur_id=coeur_couleur_id,
        palette_effective=palette_effective,
    )


# ============================================================
# AFFICHAGE TERMINAL (debug)
# ============================================================

def afficher_resultat_terminal(res: Resultat, palette_couleurs: Dict[str, Couleur]) -> str:
    """Genere une representation texte du resultat."""
    lignes_out = []
    lignes_out.append(f"Texte: {res.texte_lignes}")
    lignes_out.append(f"Palette: {res.palette_id}")
    if res.coeur_couleur_id is not None:
        nom_coeur = palette_couleurs[res.coeur_couleur_id].nom if res.coeur_couleur_id in palette_couleurs else res.coeur_couleur_id
        lignes_out.append(f"Coeur: {nom_coeur}")
    lignes_out.append(f"Seed: {res.seed}")
    lignes_out.append(f"Score: {res.score:.3f}")
    if res.violations_dures:
        lignes_out.append(f"VIOLATIONS DURES: {res.violations_dures}")
    else:
        lignes_out.append("OK - aucune violation dure")

    # Reconstruction visuelle
    lignes_out.append("")
    par_ligne: Dict[int, List[Tuple[int, str, str]]] = {}
    for idx, pos in enumerate(res.positions):
        couleur_id = res.attribution.get(idx, "?")
        par_ligne.setdefault(pos.ligne, []).append((pos.indice, pos.caractere, couleur_id))

    for i_ligne in sorted(par_ligne.keys()):
        chars = sorted(par_ligne[i_ligne])
        ligne_str = " ".join(f"{c}({palette_couleurs[cid].nom if cid in palette_couleurs else cid})" 
                            for _, c, cid in chars)
        lignes_out.append(f"L{i_ligne}: {ligne_str}")

    # Distribution
    lignes_out.append("")
    counts: Dict[str, int] = {}
    for cid in res.attribution.values():
        counts[cid] = counts.get(cid, 0) + 1
    lignes_out.append("Distribution:")
    for cid, cnt in sorted(counts.items(), key=lambda x: -x[1]):
        nom = palette_couleurs[cid].nom if cid in palette_couleurs else cid
        lignes_out.append(f"  {nom}: {cnt}")

    return "\n".join(lignes_out)


# ============================================================
# DEMO
# ============================================================

if __name__ == "__main__":
    # Palette mock - gamme "rose-bleu-mixte" comme dans le motif Maman de Gabin & Lou
    PALETTE_MOCK = {
        "sable": Couleur("sable", "Sable", "#D4C4A8"),
        "rose_pale": Couleur("rose_pale", "Rose pale", "#F0B8C0"),
        "canard": Couleur("canard", "Canard", "#1A6670"),
        "framboise": Couleur("framboise", "Framboise", "#C4294E"),
        "moutarde": Couleur("moutarde", "Moutarde", "#D4A12A"),
    }
    palette_ids = list(PALETTE_MOCK.keys())

    # Test 1 : MAMAN DE GABIN & LOU
    texte = ["MAMAN", "DE", "GABIN", "& LOU"]
    res = attribuer(texte, palette_ids, palette_id="mixte_5fils")
    print("=" * 60)
    print("TEST 1 - MAMAN DE GABIN & LOU")
    print("=" * 60)
    print(afficher_resultat_terminal(res, PALETTE_MOCK))

    # Test 2 : palette pauvre (3 couleurs) sur texte simple
    print("\n" + "=" * 60)
    print("TEST 2 - palette reduite 3 couleurs sur BEST DAD EVER")
    print("=" * 60)
    palette_taupe = ["sable", "canard", "framboise"]  # mock
    res2 = attribuer(["BEST", "DAD", "EVER"], palette_taupe, palette_id="taupe_3fils")
    print(afficher_resultat_terminal(res2, PALETTE_MOCK))

    # Test 3 : determinisme
    print("\n" + "=" * 60)
    print("TEST 3 - determinisme (meme input -> meme output)")
    print("=" * 60)
    res3a = attribuer(texte, palette_ids, palette_id="mixte_5fils")
    res3b = attribuer(texte, palette_ids, palette_id="mixte_5fils")
    print(f"Run A attribution: {res3a.attribution}")
    print(f"Run B attribution: {res3b.attribution}")
    print(f"Identiques: {res3a.attribution == res3b.attribution}")

    # Test 4 : coherence coeur (le coeur framboise force le moteur a equilibrer ailleurs)
    print("\n" + "=" * 60)
    print("TEST 4 - coherence coeur framboise sur MAMAN DE GABIN & LOU")
    print("=" * 60)
    res4 = attribuer(texte, palette_ids, palette_id="mixte_5fils_coeur_framboise",
                     coeur_couleur_id="framboise")
    print(afficher_resultat_terminal(res4, PALETTE_MOCK))

    # Test 5 : filtre support (sable/rose_pale exclus -> reste 3 fils)
    print("\n" + "=" * 60)
    print("TEST 5 - support cream incompatible avec sable + rose_pale")
    print("=" * 60)
    res5 = attribuer(texte, palette_ids, palette_id="mixte_support_cream",
                     fils_incompatibles_support=["sable", "rose_pale"])
    print(afficher_resultat_terminal(res5, PALETTE_MOCK))
    print(f"Palette effective: {res5.palette_effective}")
