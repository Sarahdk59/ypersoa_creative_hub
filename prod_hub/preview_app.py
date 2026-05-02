"""
Streamlit preview - moteur d'attribution couleur->lettre prod_hub.

Usage :
    streamlit run preview_app.py

Outil de preview interactive pour Adriana / Sarah. Lit la palette v2
canonique au boot. UX swatches cliquables alignee sur le site Ypersoa.
"""

import json
import sys
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "prod_hub" / "moteur_attribution"))

from moteur_attribution import Couleur, attribuer  # noqa: E402
from visualisation import render_resultat  # noqa: E402

PALETTE_V2_PATH = ROOT / "referentiels" / "palette_fils_broderie_v2.json"


@st.cache_data
def load_palette_v2() -> dict:
    raw = json.loads(PALETTE_V2_PATH.read_text(encoding="utf-8"))
    return {
        c["id"]: Couleur(c["id"], c["nom"], c["hex"], c.get("numero_aiguille_canonique"))
        for c in raw["couleurs"]
    }


def swatch_grid(palette: dict, mode: str, current, key_prefix: str, cols_per_row: int = 10):
    """Grille de swatches cliquables. mode: 'single' ou 'multi'.
    Retourne la nouvelle valeur de selection."""
    fil_ids = list(palette.keys())
    new_current = list(current) if mode == "multi" else current
    rows = (len(fil_ids) + cols_per_row - 1) // cols_per_row

    for r in range(rows):
        cols = st.columns(cols_per_row)
        for ci in range(cols_per_row):
            idx = r * cols_per_row + ci
            if idx >= len(fil_ids):
                break
            fid = fil_ids[idx]
            fil = palette[fid]
            if mode == "single":
                is_sel = current == fid
            else:
                is_sel = fid in current

            border = "3px solid #1E2D4A" if is_sel else "1px solid #d0d0d0"
            with cols[ci]:
                st.markdown(
                    f'<div style="text-align:center;padding:2px 0">'
                    f'<div style="width:34px;height:34px;border-radius:50%;'
                    f'background:{fil.hex};border:{border};margin:0 auto;'
                    f'box-shadow:{("0 0 0 2px white inset" if fil.hex.upper() in ("#FFFFFF",) else "none")}"></div>'
                    f"</div>",
                    unsafe_allow_html=True,
                )
                clicked = st.button(
                    "✓" if is_sel else "·",
                    key=f"{key_prefix}_{fid}",
                    help=f"{fil.nom} · {fil.hex}",
                    use_container_width=True,
                )
            if clicked:
                if mode == "single":
                    new_current = None if is_sel else fid
                else:
                    if is_sel:
                        new_current.remove(fid)
                    else:
                        new_current.append(fid)
    return new_current


def label_fil(palette: dict, fid):
    if fid is None or fid not in palette:
        return ""
    return palette[fid].nom


def main() -> None:
    st.set_page_config(page_title="prod_hub - preview", layout="wide")

    # Style global
    st.markdown(
        """
        <style>
        button[kind="secondary"] { padding: 2px 0 !important; min-height: 22px !important;
            font-size: 11px !important; }
        h3 { font-size: 16px !important; margin-top: 8px !important; margin-bottom: 4px !important; }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.title("prod_hub — preview attribution")
    st.caption("Saisis le brief commande, choisis les fils, regenere a l'envie.")

    palette_v2 = load_palette_v2()

    # State init
    if "custom_fils" not in st.session_state:
        st.session_state.custom_fils = {}
    if "coeur" not in st.session_state:
        st.session_state.coeur = "fil_canard"
    if "gamme" not in st.session_state:
        st.session_state.gamme = ["fil_marine", "fil_vert_jade", "fil_vert_jardin", "fil_canard", "fil_bleu_glacier"]
    if "support_incompat" not in st.session_state:
        st.session_state.support_incompat = []
    if "ligne1" not in st.session_state:
        st.session_state.ligne1 = "marraine"
    if "ligne2" not in st.session_state:
        st.session_state.ligne2 = "adoree"
    if "ligne3" not in st.session_state:
        st.session_state.ligne3 = "de"
    if "ligne4" not in st.session_state:
        st.session_state.ligne4 = "jules"

    palette_courante = {**palette_v2, **st.session_state.custom_fils}

    col_form, col_result = st.columns([1, 1])

    with col_form:
        # === 1. Coeur ===
        st.markdown(f"### 1. Couleur du cœur — _{label_fil(palette_courante, st.session_state.coeur)}_")
        st.session_state.coeur = swatch_grid(
            palette_courante, "single", st.session_state.coeur, "coeur"
        )

        # === 2. Gamme (Multicolore impose par variante) ===
        st.markdown(
            f"### 2. Gamme imposée — _{len(st.session_state.gamme)} fils_"
        )
        st.caption("Selection multiple : les fils que la variante Shopify impose")
        st.session_state.gamme = swatch_grid(
            palette_courante, "multi", st.session_state.gamme, "gamme"
        )

        # === 3. Texte ===
        st.markdown("### 3. Texte client")
        st.caption("Jusqu'à 4 lignes · 8-10 car. max par ligne")
        st.session_state.ligne1 = st.text_input("Ligne 1 (obligatoire)", value=st.session_state.ligne1, max_chars=12)
        st.session_state.ligne2 = st.text_input("Ligne 2 (optionnelle)", value=st.session_state.ligne2, max_chars=12)
        st.session_state.ligne3 = st.text_input("Ligne 3 (optionnelle)", value=st.session_state.ligne3, max_chars=12)
        st.session_state.ligne4 = st.text_input("Ligne 4 (optionnelle)", value=st.session_state.ligne4, max_chars=12)

        # === 4. Filtre support (pliable) ===
        with st.expander("4. Filtre support (avancé) — fils incompatibles avec le sweat client"):
            st.caption("Pour Adriana : exclut les fils peu lisibles sur le support choisi")
            st.session_state.support_incompat = swatch_grid(
                palette_courante, "multi", st.session_state.support_incompat, "support"
            )

        # === 5. Custom fil ===
        with st.expander("5. Ajouter un fil custom (hors palette v2)"):
            cnom = st.text_input("Nom", value="Menthe", key="custom_nom")
            chex = st.color_picker("Hex", value="#B8DCC8", key="custom_hex")
            cid = st.text_input("ID interne", value=f"fil_{cnom.lower().replace(' ', '_')}", key="custom_id")
            if st.button("Ajouter ce fil"):
                st.session_state.custom_fils[cid] = Couleur(cid, cnom, chex)
                st.rerun()

        # === 6. Generer ===
        st.markdown("### 6. Generer")
        n_candidats = st.slider("Candidats à scorer", 10, 500, 100, step=10)
        go = st.button("Lancer l'attribution", type="primary", use_container_width=True)

    with col_result:
        st.markdown("### Resultat")
        if not go:
            st.info("Saisis les inputs à gauche et clique 'Lancer l'attribution'.")
        else:
            texte_lignes = [
                l for l in [
                    st.session_state.ligne1,
                    st.session_state.ligne2,
                    st.session_state.ligne3,
                    st.session_state.ligne4,
                ] if l and l.strip()
            ]
            if not texte_lignes:
                st.error("Texte vide.")
            elif len(st.session_state.gamme) < 2:
                st.error("Selectionne au moins 2 fils dans la gamme.")
            else:
                res = attribuer(
                    texte_lignes=texte_lignes,
                    palette=st.session_state.gamme,
                    palette_id="preview",
                    n_candidats=n_candidats,
                    coeur_couleur_id=st.session_state.coeur,
                    fils_incompatibles_support=st.session_state.support_incompat or None,
                )
                if res.violations_dures:
                    st.error("\n".join(res.violations_dures))
                else:
                    st.success(f"Score : {res.score:.3f}")

                    tmp_dir = Path("/tmp/prod_hub_preview")
                    tmp_dir.mkdir(exist_ok=True)
                    tmp_png = tmp_dir / "current.png"
                    render_resultat(
                        res,
                        palette_courante,
                        titre=" / ".join(texte_lignes),
                        chemin_sortie=str(tmp_png),
                        afficher_legende=True,
                    )
                    st.image(str(tmp_png), use_container_width=True)

                    with st.expander("Plan d'aiguille (attribution détaillée)"):
                        rows = []
                        for idx, pos in enumerate(res.positions):
                            cid = res.attribution.get(idx, "?")
                            nom = palette_courante[cid].nom if cid in palette_courante else cid
                            hexv = palette_courante[cid].hex if cid in palette_courante else "?"
                            rows.append({
                                "Ligne": pos.ligne,
                                "Lettre": pos.caractere,
                                "Fil": nom,
                                "ID": cid,
                                "Hex": hexv,
                            })
                        st.dataframe(rows, hide_index=True, use_container_width=True)

                    with st.expander("Distribution"):
                        counts: dict = {}
                        for cid in res.attribution.values():
                            counts[cid] = counts.get(cid, 0) + 1
                        dist_rows = [
                            {
                                "Fil": palette_courante[cid].nom if cid in palette_courante else cid,
                                "Hex": palette_courante[cid].hex if cid in palette_courante else "?",
                                "Occurrences": cnt,
                            }
                            for cid, cnt in sorted(counts.items(), key=lambda x: -x[1])
                        ]
                        st.dataframe(dist_rows, hide_index=True, use_container_width=True)


if __name__ == "__main__":
    main()
