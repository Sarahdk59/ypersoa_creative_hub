# Polices broderie Ypersoa

Dépose ici tes fichiers `.ttf` ou `.otf`. La preview Streamlit (`prod_hub/preview_app.py`) scanne automatiquement ce dossier et propose chaque police dans le sélecteur "Police".

## À ajouter

- **LOONEY** — police signature pour le motif YPM-009 palette (et autres). À récupérer chez Adriana / dans le dossier brand. Nom de fichier attendu : `LOONEY.ttf` ou `Looney.ttf`.

## Convention

- Le nom commercial = nom du fichier sans extension (ex: `LOONEY.ttf` → "LOONEY" dans le sélecteur).
- Privilégier `.ttf` (rendu plus stable matplotlib que `.otf` sur macOS).
- Si une police a plusieurs styles (Regular / Bold), poser plusieurs fichiers : `LOONEY-Regular.ttf`, `LOONEY-Bold.ttf`.

## Tests

Si une police rendue ne ressemble pas à ce que tu vois dans Aperçu (Mac), c'est probablement un fichier `.otf` avec features OpenType non gérées par matplotlib. Convertir en `.ttf` via FontForge ou un convertisseur en ligne.
