#!/usr/bin/env python3
"""
Import du classeur « base produit » (WeArePerso / Akanea) → referentiels/catalogue_produits.json

Usage (depuis la racine du repo) :
    python3 scripts/import_catalogue_produits.py "assets_produits/base produit octobre 2026.xlsx"

Lit les onglets Produits, Couleurs, Couleurs_ref, Tailles, Tailles_produit, SKU.
Réf. article = YPxxx-CCCC-TTTT (réf interne - code couleur famille - code taille Akanea).

Volontairement SANS notion de fournisseur (marque, prix, URL) : ce référentiel
sert l'atelier, pas l'achat. Bibliothèque standard uniquement (pas d'openpyxl).
"""
import csv  # noqa: F401  (garde la parité avec d'autres scripts)
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def col_index(ref: str) -> int:
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_workbook(path: str) -> dict[str, list[list[str]]]:
    z = zipfile.ZipFile(path)
    shared: list[str] = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    targets = {r.get("Id"): r.get("Target") for r in rels}
    sheets: dict[str, list[list[str]]] = {}
    for sh in wb.find("m:sheets", NS):
        target = targets[sh.get("{%s}id" % NS["r"])].lstrip("/").replace("xl/", "")
        root = ET.fromstring(z.read("xl/" + target))
        rows = []
        for row in root.iter("{%s}row" % NS["m"]):
            cells: dict[int, str] = {}
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                inline = c.find("m:is", NS)
                val = ""
                if c.get("t") == "s" and v is not None:
                    val = shared[int(v.text)]
                elif c.get("t") == "inlineStr" and inline is not None:
                    val = "".join(t.text or "" for t in inline.iter("{%s}t" % NS["m"]))
                elif v is not None:
                    val = v.text or ""
                cells[col_index(c.get("r"))] = val.strip()
            if cells:
                rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
        sheets[sh.get("name")] = rows
    return sheets


def table(rows: list[list[str]], header_first: str) -> list[dict[str, str]]:
    """Trouve la ligne d'en-tête (1re cellule == header_first) et renvoie des dicts."""
    for i, r in enumerate(rows):
        if r and r[0] == header_first:
            head = r
            out = []
            for line in rows[i + 1:]:
                if not line or not line[0]:
                    continue
                out.append({h: (line[j] if j < len(line) else "") for j, h in enumerate(head) if h})
            return out
    raise SystemExit(f"En-tête « {header_first} » introuvable")


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = sys.argv[1]
    repo = Path(__file__).resolve().parent.parent
    out_path = repo / "referentiels" / "catalogue_produits.json"
    wb = read_workbook(src)

    produits = {}
    for p in table(wb["Produits"], "Réf interne"):
        ref = p["Réf interne"]
        if not re.match(r"^YP\d{3}$", ref):
            continue
        produits[ref] = {
            "ref": ref,
            "ref_fabricant": p.get("Réf fabricant", ""),
            "libelle": p.get("Libellé", ""),
            "famille": p.get("Famille", ""),
            "sous_famille": p.get("Sous-famille", ""),
            "genre": p.get("Genre", ""),
            "gabarit": p.get("Gabarit emplacements", ""),
            "technos": [t for t in p.get("Technos", "").split("|") if t],
            "statut": p.get("Statut", ""),
            "synonymes": [s.strip() for s in p.get("Synonymes client", "").split(",") if s.strip()],
        }

    couleurs_ref = {}
    for c in table(wb["Couleurs_ref"], "Code couleur"):
        code = c["Code couleur"]
        if not re.match(r"^\d{4}$", code):
            continue
        couleurs_ref[code] = {
            "code": code,
            "libelle": c.get("Libellé FR", ""),
            "famille": c.get("Famille", ""),
            "hex": c.get("Hex", "") or None,
            "statut": c.get("Statut", ""),
        }

    couleurs_produit: dict[str, list[dict]] = {}
    for c in table(wb["Couleurs"], "Réf interne"):
        ref, code = c["Réf interne"], c.get("Code couleur", "")
        if ref not in produits or not re.match(r"^\d{4}$", code):
            continue
        hex_ = c.get("Hex", "")
        couleurs_produit.setdefault(ref, []).append({
            "code": code,
            "couleur_fabricant": c.get("Couleur fabricant", ""),
            "libelle": c.get("Libellé (auto)", "") or couleurs_ref.get(code, {}).get("libelle", ""),
            "hex": hex_ if hex_.startswith("#") else (couleurs_ref.get(code, {}).get("hex")),
        })

    tailles = {}
    for t in table(wb["Tailles"], "Taille"):
        code = t.get("Code taille", "")
        if re.match(r"^\d{4}$", code):
            tailles[code] = {"code": code, "taille": t["Taille"], "libelle": t.get("Libellé", ""), "ordre": int(float(t.get("Ordre tri") or 0))}

    tailles_produit: dict[str, list[str]] = {}
    for t in table(wb["Tailles_produit"], "Réf interne"):
        if t["Réf interne"] in produits and t.get("Taille") and t["Taille"] != "?":
            tailles_produit.setdefault(t["Réf interne"], []).append(t["Taille"])

    skus: dict[str, list[str]] = {}
    for s in table(wb["SKU"], "SKU"):
        m = re.match(r"^(YP\d{3})-(\d{4})-(\d{4})$", s["SKU"])
        if m and m.group(1) in produits:
            skus.setdefault(m.group(1), []).append(f"{m.group(2)}-{m.group(3)}")

    data = {
        "_meta": {
            "referentiel": "catalogue_produits",
            "schema_version": "1.0",
            "source": Path(src).name,
            "importe_le": date.today().isoformat(),
            "format_ref_article": "YPxxx-CCCC-TTTT = réf. interne - code couleur (famille Akanea) - code taille Akanea",
            "note": "Généré par scripts/import_catalogue_produits.py — ne pas éditer à la main, relancer l'import. Les couleurs ajoutées depuis le Hub vivent en base (table catalogue_couleurs_ajouts). Sans notion de fournisseur.",
            "generique": "Code 9999 = couleur ou taille à préciser (produit pas encore enrichi).",
        },
        "produits": produits,
        "couleurs_ref": couleurs_ref,
        "couleurs_produit": couleurs_produit,
        "tailles": tailles,
        "tailles_produit": tailles_produit,
        "skus": skus,
    }
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"→ {out_path.relative_to(repo)} : {len(produits)} produits, {len(couleurs_ref)} familles couleur, "
          f"{sum(len(v) for v in couleurs_produit.values())} couleurs×produit, {len(tailles)} tailles, "
          f"{sum(len(v) for v in skus.values())} SKU")


if __name__ == "__main__":
    main()
