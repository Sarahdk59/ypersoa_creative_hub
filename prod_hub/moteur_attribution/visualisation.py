"""
Visualisation matplotlib des resultats d'attribution.
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from typing import Dict, List
from moteur_attribution import Resultat, Couleur, attribuer, parser_texte

TESTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests")


def render_resultat(res: Resultat, palette_couleurs: Dict[str, Couleur],
                    titre: str = "", chemin_sortie: str = None,
                    afficher_legende: bool = True,
                    afficher_aiguilles: bool = True) -> None:
    """Genere un PNG montrant le rendu visuel de l'attribution.

    afficher_aiguilles : si True et que le palette_couleurs contient des
    numeros d'aiguille canoniques (champ .aiguille), les affiche sous chaque
    lettre. Pratique pour Adriana en prod.
    """
    fig, ax = plt.subplots(figsize=(8, 7))
    fig.patch.set_facecolor("#F5F0EA")  # fond cream Ypersoa
    ax.set_facecolor("#F5F0EA")

    # Grouper les positions par ligne
    par_ligne: Dict[int, List] = {}
    for idx, pos in enumerate(res.positions):
        couleur_id = res.attribution.get(idx, "?")
        par_ligne.setdefault(pos.ligne, []).append((pos.indice, pos.caractere, couleur_id, pos.x_relatif))

    n_lignes = max(par_ligne.keys()) + 1 if par_ligne else 0
    largeur_lettre = 1.2
    hauteur_lettre = 1.5
    espace_v = 0.3

    # Reserve d'espace bas pour la legende (multi-lignes possible)
    utilisees = sorted(set(res.attribution.values()))
    n_legende_par_ligne = 4
    n_lignes_legende = (len(utilisees) + n_legende_par_ligne - 1) // n_legende_par_ligne

    # Geometrie : derniere ligne de lettres + aiguille en dessous + marge + legende
    last_letter_y = -(n_lignes * (hauteur_lettre + espace_v))
    margin_after_aiguille = 1.6  # espace entre les ai.X de la derniere ligne et la legende
    legende_top = last_letter_y - margin_after_aiguille
    legende_row_h = 0.9
    ylim_bottom = legende_top - legende_row_h * n_lignes_legende - 0.4

    # Axes
    ax.set_xlim(-6, 6)
    ax.set_ylim(ylim_bottom, 1)
    ax.set_aspect("equal")
    ax.axis("off")

    # Coeur en haut
    coeur_y = 0
    ax.text(0, coeur_y, "♥", fontsize=22, ha="center", va="center", color="#6B1E2E")

    # Lettres + aiguille canonique en dessous (ai.? en orange si manquant)
    for i_ligne in sorted(par_ligne.keys()):
        chars = sorted(par_ligne[i_ligne])
        y = -((i_ligne + 1) * (hauteur_lettre + espace_v))
        for indice, char, couleur_id, x_rel in chars:
            x = x_rel * largeur_lettre
            col = palette_couleurs.get(couleur_id)
            hex_color = col.hex if col else "#888888"
            ax.text(x, y, char, fontsize=32, ha="center", va="center",
                    color=hex_color, weight="bold", family="sans-serif")
            if afficher_aiguilles and col:
                aig = getattr(col, "aiguille", None)
                if aig:
                    ax.text(x, y - 0.7, f"ai.{aig}", fontsize=7, ha="center",
                            va="center", color="#1E2D4A", alpha=0.6, family="monospace")
                else:
                    ax.text(x, y - 0.7, "ai.?", fontsize=7, ha="center",
                            va="center", color="#C45A2C", alpha=0.95,
                            family="monospace", weight="bold")

    # Titre
    titre_complet = titre if titre else f"{' '.join(res.texte_lignes)}"
    ax.set_title(f"{titre_complet}\nPalette: {res.palette_id} | Score: {res.score:.3f}",
                 fontsize=11, color="#1E2D4A", pad=15)

    # Legende palette : grille multi-lignes (ai.? orange pour fil sans aiguille)
    if afficher_legende and utilisees:
        cell_w = 3.0
        for i, cid in enumerate(utilisees):
            row = i // n_legende_par_ligne
            col_idx = i % n_legende_par_ligne
            items_dans_cette_ligne = min(n_legende_par_ligne, len(utilisees) - row * n_legende_par_ligne)
            x_offset_ligne = -((items_dans_cette_ligne - 1) * cell_w) / 2.0
            x_pos = x_offset_ligne + col_idx * cell_w
            y_pos = legende_top - row * legende_row_h
            if cid not in palette_couleurs:
                continue
            col = palette_couleurs[cid]
            cnt = sum(1 for v in res.attribution.values() if v == cid)
            rect = patches.Rectangle(
                (x_pos - 0.55, y_pos - 0.25), 0.5, 0.5,
                facecolor=col.hex, edgecolor="#1E2D4A", linewidth=0.5
            )
            ax.add_patch(rect)
            aig = getattr(col, "aiguille", None)
            if aig:
                ax.text(x_pos + 0.05, y_pos, f"{col.nom} · ai.{aig} ({cnt})",
                        fontsize=8, va="center", ha="left", color="#1E2D4A")
            else:
                ax.text(x_pos + 0.05, y_pos, f"{col.nom} · ", fontsize=8,
                        va="center", ha="left", color="#1E2D4A")
                ax.text(x_pos + 0.05 + len(col.nom) * 0.1 + 0.25, y_pos,
                        f"ai.? ({cnt})", fontsize=8, va="center", ha="left",
                        color="#C45A2C", weight="bold")

    plt.tight_layout()
    if chemin_sortie:
        plt.savefig(chemin_sortie, dpi=150, bbox_inches="tight", facecolor="#F5F0EA")
        print(f"Sauvegarde: {chemin_sortie}")
    plt.close()


if __name__ == "__main__":
    # Palettes mock - a remplacer par les vraies gammes Ypersoa
    PALETTE_COMPLETE = {
        "blanc": Couleur("blanc", "Blanc", "#FFFFFF"),
        "ivoire": Couleur("ivoire", "Ivoire", "#F5F0E0"),
        "sable": Couleur("sable", "Sable", "#D4C4A8"),
        "rose_pale": Couleur("rose_pale", "Rose pale", "#F0B8C0"),
        "framboise": Couleur("framboise", "Framboise", "#C4294E"),
        "bordeaux": Couleur("bordeaux", "Bordeaux", "#6B1E2E"),
        "lilas": Couleur("lilas", "Lilas", "#B8A0C8"),
        "canard": Couleur("canard", "Canard", "#1A6670"),
        "jade": Couleur("jade", "Vert jade", "#1A7A6E"),
        "jardin": Couleur("jardin", "Vert jardin", "#7A9E7E"),
        "marine": Couleur("marine", "Marine", "#1E2D4A"),
        "moutarde": Couleur("moutarde", "Moutarde", "#D4A12A"),
        "taupe": Couleur("taupe", "Taupe", "#8B6F5C"),
        "chocolat": Couleur("chocolat", "Chocolat", "#5C3A28"),
    }

    # Gammes mock
    GAMMES = {
        "chocolat": ["sable", "taupe", "chocolat", "ivoire"],
        "rose": ["bordeaux", "framboise", "rose_pale", "lilas"],
        "bleu": ["marine", "canard", "jade", "jardin"],
        "mixte": ["sable", "rose_pale", "canard", "framboise", "moutarde"],
    }

    os.makedirs(TESTS_DIR, exist_ok=True)

    # Test 1 : Maman de Gabin & Lou en gamme mixte
    texte1 = ["MAMAN", "DE", "GABIN", "& LOU"]
    res1 = attribuer(texte1, GAMMES["mixte"], palette_id="mixte")
    render_resultat(res1, PALETTE_COMPLETE, titre="MAMAN DE GABIN & LOU - gamme mixte",
                    chemin_sortie=os.path.join(TESTS_DIR, "test_1_maman_mixte.png"))

    # Test 2 : Best Dad Ever en gamme chocolat
    texte2 = ["BEST", "DAD", "EVER"]
    res2 = attribuer(texte2, GAMMES["chocolat"], palette_id="chocolat")
    render_resultat(res2, PALETTE_COMPLETE, titre="BEST DAD EVER - gamme chocolat",
                    chemin_sortie=os.path.join(TESTS_DIR, "test_2_bestdad_chocolat.png"))

    # Test 3 : Papa de Gabin en gamme bleu
    texte3 = ["PAPA", "DE", "GABIN", "& LOU"]
    res3 = attribuer(texte3, GAMMES["bleu"], palette_id="bleu")
    render_resultat(res3, PALETTE_COMPLETE, titre="PAPA DE GABIN & LOU - gamme bleu",
                    chemin_sortie=os.path.join(TESTS_DIR, "test_3_papa_bleu.png"))

    # Test 4 : Amoureuse de Paul en gamme rose
    texte4 = ["AMOUREUSE", "DE", "PAUL"]
    res4 = attribuer(texte4, GAMMES["rose"], palette_id="rose")
    render_resultat(res4, PALETTE_COMPLETE, titre="AMOUREUSE DE PAUL - gamme rose",
                    chemin_sortie=os.path.join(TESTS_DIR, "test_4_amoureuse_rose.png"))

    # Test 5 : coeur framboise force le moteur a eviter framboise dominante
    texte5 = ["MAMAN", "DE", "GABIN", "& LOU"]
    res5 = attribuer(texte5, GAMMES["mixte"], palette_id="mixte_coeur_framboise",
                     coeur_couleur_id="framboise")
    render_resultat(res5, PALETTE_COMPLETE,
                    titre="Coeur framboise force le moteur a eviter framboise dominante",
                    chemin_sortie=os.path.join(TESTS_DIR, "test_5_coeur_framboise.png"))

    # Test 6 : filtre support cream incompatible avec sable + rose pale
    texte6 = ["MAMAN", "DE", "GABIN", "& LOU"]
    res6 = attribuer(texte6, GAMMES["mixte"], palette_id="mixte_support_cream",
                     fils_incompatibles_support=["sable", "rose_pale"])
    render_resultat(res6, PALETTE_COMPLETE,
                    titre="Support cream : sable + rose_pale exclus (palette 3 fils)",
                    chemin_sortie=os.path.join(TESTS_DIR, "test_6_support_cream.png"))

    print("\nTous les visuels generes.")
