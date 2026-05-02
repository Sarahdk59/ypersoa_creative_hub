"""
Cadrer les 17 motifs YPM — page Streamlit dédiée Phase 1.

Lit 3 sources canoniques (motifs_ypm.json + perso-ypm*.liquid + palette_v2),
laisse Sarah définir les gammes prod par motif, écrit dans
prod_hub/gammes/gammes_ypm_all.json et collecte les fils non-canoniques
mentionnés dans _fils_non_canoniques_a_ajouter_v2.json.

Aucune réécriture des sources canoniques. Coherence par référence (motif_id,
fil_id).
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "prod_hub" / "moteur_attribution"))

MOTIFS_JSON = ROOT / "referentiels" / "motifs" / "motifs_ypm.json"
PALETTE_V2_JSON = ROOT / "referentiels" / "palette_fils_broderie_v2.json"
LIQUID_DIR = ROOT / "archives"
ASSETS_DIR = ROOT / "assets" / "motifs"
GAMMES_OUT = ROOT / "prod_hub" / "gammes" / "gammes_ypm_all.json"
NON_CANONIQUES_OUT = ROOT / "prod_hub" / "gammes" / "_fils_non_canoniques_a_ajouter_v2.json"


@st.cache_data
def load_motifs() -> list[dict]:
    return json.loads(MOTIFS_JSON.read_text(encoding="utf-8"))["motifs"]


@st.cache_data
def load_palette_v2() -> dict:
    raw = json.loads(PALETTE_V2_JSON.read_text(encoding="utf-8"))
    return {c["id"]: c for c in raw["couleurs"]}


@st.cache_data
def load_liquid_headers() -> dict[str, str]:
    """Retourne {motif_id: header_brut} pour chaque perso-ypmNNN.liquid."""
    out = {}
    for liq in sorted(LIQUID_DIR.glob("perso-ypm*.liquid")):
        m = re.match(r"perso-ypm(\d{3})", liq.stem)
        if not m:
            continue
        mid = f"YPM-{m.group(1)}"
        text = liq.read_text(encoding="utf-8")
        # Extraire le bloc {% comment %} ... {% endcomment %}
        comment_match = re.search(r"\{%\s*comment\s*%\}(.+?)\{%\s*endcomment\s*%\}", text, re.DOTALL)
        if comment_match:
            out[mid] = comment_match.group(1).strip()
    return out


def load_existing_gammes() -> dict:
    if GAMMES_OUT.exists():
        try:
            return json.loads(GAMMES_OUT.read_text(encoding="utf-8")).get("gammes_par_motif", {})
        except json.JSONDecodeError:
            return {}
    return {}


def slug_id(nom: str) -> str:
    return "fil_" + re.sub(r"[^a-z0-9]+", "_", nom.lower()).strip("_")


def swatch_grid_compact(palette: dict, current: list[str], key_prefix: str,
                        cols_per_row: int = 12) -> list[str]:
    """Grille swatches compactes (multi-select) pour la page Cadrer motifs.
    Retourne la nouvelle liste de fil_ids selectionnes."""
    fil_ids = list(palette.keys())
    new_current = list(current)
    rows = (len(fil_ids) + cols_per_row - 1) // cols_per_row

    for r in range(rows):
        cols = st.columns(cols_per_row)
        for ci in range(cols_per_row):
            idx = r * cols_per_row + ci
            if idx >= len(fil_ids):
                break
            fid = fil_ids[idx]
            fil = palette[fid]
            is_sel = fid in current
            border = "2.5px solid #1E2D4A" if is_sel else "1px solid #d0d0d0"
            with cols[ci]:
                st.markdown(
                    f'<div style="text-align:center;padding:1px 0">'
                    f'<div style="width:26px;height:26px;border-radius:50%;'
                    f'background:{fil["hex"]};border:{border};margin:0 auto"></div>'
                    f"</div>",
                    unsafe_allow_html=True,
                )
                clicked = st.button(
                    "✓" if is_sel else "·",
                    key=f"{key_prefix}_{fid}",
                    help=f"{fil['nom']} · {fil['hex']}",
                    use_container_width=True,
                )
            if clicked:
                if is_sel:
                    new_current.remove(fid)
                else:
                    new_current.append(fid)
    return new_current


def save_all(gammes_par_motif: dict, palette_v2: dict) -> tuple[Path, Path]:
    """Ecrit gammes_ypm_all.json + _fils_non_canoniques_a_ajouter_v2.json."""
    GAMMES_OUT.parent.mkdir(parents=True, exist_ok=True)

    out = {
        "_meta": {
            "schema_version": "1.0",
            "referentiel": "gammes_ypm_all",
            "description": (
                "Toutes les gammes prod par motif YPM. Source canonique pour prod_hub. "
                "Lié par motif_id à referentiels/motifs/motifs_ypm.json et par fil_id à "
                "referentiels/palette_fils_broderie_v2.json. "
                "Auto-généré par prod_hub/pages/1_Cadrer_motifs.py."
            ),
            "last_updated": date.today().isoformat(),
            "nb_motifs": len(gammes_par_motif),
        },
        "gammes_par_motif": gammes_par_motif,
    }
    GAMMES_OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Collect non-canoniques (custom fils mentioned across all gammes)
    non_canon: dict[str, dict] = {}
    for mid, gammes in gammes_par_motif.items():
        for g in gammes:
            for fil in g.get("fils_custom", []):
                fid = fil.get("id") or slug_id(fil["nom"])
                if fid not in palette_v2:
                    if fid not in non_canon:
                        non_canon[fid] = {
                            "id_propose": fid,
                            "nom": fil["nom"],
                            "hex": fil["hex"],
                            "code_gunold": "TODO_validate",
                            "numero_aiguille_canonique": None,
                            "famille": "TODO_a_categoriser",
                            "mentionne_dans": [],
                        }
                    mention = f"{mid}:{g['nom']}"
                    if mention not in non_canon[fid]["mentionne_dans"]:
                        non_canon[fid]["mentionne_dans"].append(mention)

    nc_out = {
        "_meta": {
            "description": (
                "Fils mentionnés dans gammes_ypm_all.json mais absents de "
                "palette_fils_broderie_v2.json. À ajouter au référentiel canonique "
                "après validation visuelle (codes Gunold + aiguille TMEZ)."
            ),
            "last_updated": date.today().isoformat(),
            "nb_fils_non_canoniques": len(non_canon),
        },
        "fils": list(non_canon.values()),
    }
    NON_CANONIQUES_OUT.write_text(json.dumps(nc_out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return GAMMES_OUT, NON_CANONIQUES_OUT


def main() -> None:
    st.set_page_config(page_title="Cadrer les motifs YPM", layout="wide")
    st.title("Cadrer les 17 motifs YPM")
    st.caption(
        "Pour chaque motif, lis le header Liquid (mode imposé Shopify), définis "
        "les gammes prod, ajoute les fils manquants en custom. Sauvegarde à la fin."
    )

    motifs = load_motifs()
    palette_v2 = load_palette_v2()
    liquid_headers = load_liquid_headers()

    if "gammes_par_motif" not in st.session_state:
        st.session_state.gammes_par_motif = load_existing_gammes()

    # Sticky header avec stats + save
    col_a, col_b, col_c, col_d = st.columns([1, 1, 1, 1])
    with col_a:
        st.metric("Motifs", len(motifs))
    with col_b:
        n_cadres = sum(1 for mid in [m["id"] for m in motifs] if st.session_state.gammes_par_motif.get(mid))
        st.metric("Cadrés", f"{n_cadres} / {len(motifs)}")
    with col_c:
        n_gammes_total = sum(len(g) for g in st.session_state.gammes_par_motif.values())
        st.metric("Gammes totales", n_gammes_total)
    with col_d:
        if st.button("💾 Sauvegarder tout", type="primary", use_container_width=True):
            g_path, nc_path = save_all(st.session_state.gammes_par_motif, palette_v2)
            st.success(f"Sauvegardé : {g_path.name} + {nc_path.name}")

    st.divider()

    # Une expander par motif
    fil_options = list(palette_v2.keys())
    fil_labels = {fid: f"{c['nom']} ({fid})" for fid, c in palette_v2.items()}

    for motif in motifs:
        mid = motif["id"]
        gammes_count = len(st.session_state.gammes_par_motif.get(mid, []))
        badge = f" — {gammes_count} gamme{'s' if gammes_count > 1 else ''}" if gammes_count else " — _à cadrer_"
        with st.expander(f"**{mid}** · {motif['nom_commercial']}{badge}", expanded=False):
            col_img, col_meta, col_form = st.columns([1, 2, 3])

            with col_img:
                asset_path = ASSETS_DIR / motif["asset_principal"]
                if asset_path.exists():
                    st.image(str(asset_path), width="stretch")
                else:
                    st.warning(f"PNG manquant : {motif['asset_principal']}")

            with col_meta:
                st.markdown("**Variantes texte (motifs_ypm.json)**")
                if motif.get("variantes"):
                    for v in motif["variantes"]:
                        st.caption(f"• {v['label']}")
                else:
                    st.caption("_Aucune_")

                tags = motif.get("tags", [])
                if tags:
                    st.markdown("**Tags** : " + " · ".join(tags))

            with col_form:
                st.markdown("**Header Liquid (mode imposé Shopify)**")
                liquid_text = liquid_headers.get(mid)
                if liquid_text:
                    st.code(liquid_text, language="text")
                else:
                    st.warning("Pas de Liquid template trouvé")

            st.markdown("---")
            st.markdown("**Gammes prod**")

            current_gammes = st.session_state.gammes_par_motif.get(mid, [])
            if not current_gammes:
                st.caption("_Aucune gamme cadrée pour ce motif._")

            new_gammes = []
            for i, gamme in enumerate(current_gammes):
                with st.container(border=True):
                    cg1, cg3 = st.columns([10, 1])
                    with cg1:
                        nom_g = st.text_input(
                            "Nom de la gamme",
                            value=gamme.get("nom", ""),
                            key=f"{mid}_g{i}_nom",
                            placeholder="ex. Multicolore, Camaïeu bleu, Crème...",
                        )
                    with cg3:
                        st.write("")
                        st.write("")
                        if st.button("🗑", key=f"{mid}_g{i}_del", help="Supprimer cette gamme"):
                            continue  # don't include this gamme in new_gammes

                    st.caption("Fils canoniques v2 — click pour toggle")
                    current_fils = [f for f in gamme.get("fils", []) if f in fil_options]
                    fils_canon = swatch_grid_compact(
                        palette_v2, current_fils, key_prefix=f"{mid}_g{i}_swatch"
                    )

                    # Custom fils (non-v2)
                    st.caption(f"Fils custom (non-canoniques v2) — à ajouter au référentiel ensuite")
                    custom_fils = list(gamme.get("fils_custom", []))
                    for j, cf in enumerate(custom_fils):
                        cf_c1, cf_c2, cf_c3 = st.columns([3, 2, 1])
                        with cf_c1:
                            cf["nom"] = st.text_input(
                                "Nom",
                                value=cf.get("nom", ""),
                                key=f"{mid}_g{i}_cf{j}_nom",
                                label_visibility="collapsed",
                            )
                        with cf_c2:
                            cf["hex"] = st.color_picker(
                                "Hex",
                                value=cf.get("hex", "#CCCCCC"),
                                key=f"{mid}_g{i}_cf{j}_hex",
                                label_visibility="collapsed",
                            )
                        with cf_c3:
                            if st.button("✕", key=f"{mid}_g{i}_cf{j}_del", help="Retirer"):
                                custom_fils[j] = None
                    custom_fils = [c for c in custom_fils if c]

                    if st.button(f"+ Ajouter un fil custom", key=f"{mid}_g{i}_addcf"):
                        custom_fils.append({"nom": "", "hex": "#CCCCCC"})
                        st.session_state.gammes_par_motif.setdefault(mid, [])[i] = {
                            "nom": nom_g,
                            "fils": fils_canon,
                            "fils_custom": custom_fils,
                        }
                        st.rerun()

                    new_gammes.append({
                        "nom": nom_g,
                        "fils": fils_canon,
                        "fils_custom": custom_fils,
                    })

            if st.button(f"+ Ajouter une gamme à {mid}", key=f"{mid}_addg"):
                new_gammes.append({"nom": "", "fils": [], "fils_custom": []})

            st.session_state.gammes_par_motif[mid] = new_gammes


if __name__ == "__main__":
    main()
else:
    main()
