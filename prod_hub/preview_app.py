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
    out = {}
    for c in raw["couleurs"]:
        gunold = c.get("code_gunold")
        if gunold == "TODO_validate":
            gunold = None
        out[c["id"]] = Couleur(
            c["id"], c["nom"], c["hex"],
            c.get("numero_aiguille_canonique"),
            gunold,
        )
    return out


def _luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return 0.5
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255


def swatch_grid(palette: dict, mode: str, current, key_prefix: str, cols_per_row: int = 10):
    """Grille de swatches cliquables. mode: 'single' (cœur) ou 'multi' (gamme, support).

    Multi → st.checkbox natif sous chaque disque (1 widget par fil, pas d'ambiguïté de clic).
    Single → boutons toggle exclusif (cliquer un autre fil remplace l'ancien — comportement attendu).
    """
    fil_ids = list(palette.keys())

    if mode == "multi":
        return _swatch_grid_multi(palette, fil_ids, current, key_prefix, cols_per_row)
    return _swatch_grid_single(palette, fil_ids, current, key_prefix, cols_per_row)


def _swatch_grid_single(palette, fil_ids, current, key_prefix, cols_per_row):
    new_current = current
    rows = (len(fil_ids) + cols_per_row - 1) // cols_per_row
    for r in range(rows):
        cols = st.columns(cols_per_row, gap="small")
        for ci in range(cols_per_row):
            idx = r * cols_per_row + ci
            if idx >= len(fil_ids):
                break
            fid = fil_ids[idx]
            fil = palette[fid]
            is_sel = current == fid
            text_color = "#1A1614" if _luminance(fil.hex) > 0.65 else "#FAF7F2"
            check_mark = "●" if is_sel else ""
            border = "2.5px solid #1E2D4A" if is_sel else "1px solid rgba(0,0,0,0.12)"
            with cols[ci]:
                st.markdown(
                    f'<div style="display:flex;justify-content:center;align-items:center;'
                    f'width:36px;height:36px;border-radius:50%;background:{fil.hex};'
                    f'border:{border};margin:0 auto 2px;color:{text_color};'
                    f'font-weight:700;font-size:14px;">{check_mark}</div>',
                    unsafe_allow_html=True,
                )
                clicked = st.button(
                    fil.nom.split()[0][:7],
                    key=f"sw_{key_prefix}_{fid}",
                    help=f"{fil.nom} · {fil.hex}"
                         + (f" · Gunold {fil.code_gunold}" if fil.code_gunold else ""),
                )
            if clicked:
                new_current = None if is_sel else fid
    return new_current


def _swatch_grid_multi(palette, fil_ids, current, key_prefix, cols_per_row):
    """Mode multi via checkbox natif Streamlit. Pas de bug de clic, pas de cache."""
    rows = (len(fil_ids) + cols_per_row - 1) // cols_per_row

    # Lit les valeurs actuelles depuis session_state (alimenté par les checkboxes)
    new_current = []
    for r in range(rows):
        cols = st.columns(cols_per_row, gap="small")
        for ci in range(cols_per_row):
            idx = r * cols_per_row + ci
            if idx >= len(fil_ids):
                break
            fid = fil_ids[idx]
            fil = palette[fid]
            chk_key = f"chk_{key_prefix}_{fid}"
            # Init la 1re fois depuis `current` (paramètre)
            if chk_key not in st.session_state:
                st.session_state[chk_key] = fid in current
            is_sel = st.session_state[chk_key]

            text_color = "#1A1614" if _luminance(fil.hex) > 0.65 else "#FAF7F2"
            check_mark = "✓" if is_sel else ""
            border = "2.5px solid #1E2D4A" if is_sel else "1px solid rgba(0,0,0,0.12)"
            with cols[ci]:
                st.markdown(
                    f'<div style="display:flex;justify-content:center;align-items:center;'
                    f'width:36px;height:36px;border-radius:50%;background:{fil.hex};'
                    f'border:{border};margin:0 auto 2px;color:{text_color};'
                    f'font-weight:700;font-size:14px;">{check_mark}</div>',
                    unsafe_allow_html=True,
                )
                checked = st.checkbox(
                    fil.nom.split()[0][:7],
                    key=chk_key,
                    help=f"{fil.nom} · {fil.hex}"
                         + (f" · Gunold {fil.code_gunold}" if fil.code_gunold else ""),
                )
                if checked:
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
        with st.expander("5. Ajouter / gérer un fil custom (hors palette v2)"):
            cnom = st.text_input("Nom", value="Menthe", key="custom_nom")
            chex = st.color_picker("Hex", value="#B8DCC8", key="custom_hex")
            cgunold = st.text_input("Réf Gunold (optionnel, ex. 61190)", value="", key="custom_gunold")
            cid = st.text_input("ID interne", value=f"fil_{cnom.lower().replace(' ', '_')}", key="custom_id")
            if st.button("Ajouter ce fil"):
                st.session_state.custom_fils[cid] = Couleur(
                    cid, cnom, chex, code_gunold=cgunold.strip() or None
                )
                st.rerun()

            # Liste des fils custom existants (rename / delete)
            if st.session_state.custom_fils:
                st.markdown("---")
                st.caption(f"{len(st.session_state.custom_fils)} fil(s) custom déjà ajouté(s)")
                for fid, fil in list(st.session_state.custom_fils.items()):
                    cc1, cc2, cc3, cc4 = st.columns([1, 4, 3, 1])
                    with cc1:
                        st.markdown(
                            f'<div style="width:24px;height:24px;border-radius:50%;'
                            f'background:{fil.hex};border:1px solid rgba(0,0,0,0.15);'
                            f'margin-top:6px"></div>',
                            unsafe_allow_html=True,
                        )
                    with cc2:
                        new_nom = st.text_input(
                            "Nom", value=fil.nom, key=f"rename_{fid}",
                            label_visibility="collapsed",
                        )
                    with cc3:
                        new_gunold = st.text_input(
                            "Gunold", value=fil.code_gunold or "",
                            key=f"regunold_{fid}", placeholder="ex. 61190",
                            label_visibility="collapsed",
                        )
                    with cc4:
                        if st.button("✕", key=f"del_{fid}", help=f"Supprimer {fil.nom}"):
                            st.session_state.custom_fils.pop(fid, None)
                            # Nettoie aussi gamme/coeur/support si ce fil y était
                            if st.session_state.coeur == fid:
                                st.session_state.coeur = None
                            st.session_state.gamme = [g for g in st.session_state.gamme if g != fid]
                            st.session_state.support_incompat = [
                                s for s in st.session_state.support_incompat if s != fid
                            ]
                            st.rerun()
                    # Apply rename / regunold sans rerun violent
                    if new_nom != fil.nom or (new_gunold or None) != fil.code_gunold:
                        st.session_state.custom_fils[fid] = Couleur(
                            fid, new_nom.strip() or fil.nom, fil.hex,
                            aiguille=fil.aiguille,
                            code_gunold=new_gunold.strip() or None,
                        )

        # === 5b. Police ===
        fonts_dir = Path(__file__).parent / "assets" / "fonts"
        font_files = sorted(fonts_dir.glob("*.ttf")) + sorted(fonts_dir.glob("*.otf"))
        font_options = ["Sans-serif (défaut)"] + [f.stem for f in font_files]
        font_choice = st.selectbox("Police", font_options, index=0,
                                   help=f"Dépose un .ttf dans {fonts_dir.relative_to(Path.cwd())} pour étendre la liste")
        if font_choice == "Sans-serif (défaut)":
            font_path = None
        else:
            font_path = str(next(f for f in font_files if f.stem == font_choice))

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
                    tmp_pdf = tmp_dir / "current.pdf"
                    render_resultat(
                        res,
                        palette_courante,
                        titre=" / ".join(texte_lignes),
                        chemin_sortie=str(tmp_png),
                        afficher_legende=True,
                        font_path=font_path,
                    )
                    # Génère aussi un PDF pour le download (fiche technique Adriana)
                    render_resultat(
                        res,
                        palette_courante,
                        titre=" / ".join(texte_lignes),
                        chemin_sortie=str(tmp_pdf),
                        afficher_legende=True,
                        font_path=font_path,
                    )
                    st.image(str(tmp_png), use_container_width=True)

                    pdf_filename = "_".join(t for t in texte_lignes) + ".pdf"
                    pdf_filename = pdf_filename.replace(" ", "_") or "attribution.pdf"
                    with open(tmp_pdf, "rb") as f:
                        st.download_button(
                            label="📄 Télécharger l'attribution (PDF)",
                            data=f.read(),
                            file_name=pdf_filename,
                            mime="application/pdf",
                            use_container_width=True,
                        )

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
