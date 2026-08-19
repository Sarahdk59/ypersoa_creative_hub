"""
Détourage stopgap pour le test #1 (§Cible de test n°1).
PAS le workflow définitif (rembg, cf. CLAUDE.md §2) : ici on retire un fond
studio quasi uni (blanc pour les poses, noir pour les packshots) par seuil de
distance colorimétrique + feather sur les bords. Suffisant pour valider le
crossfade / flottement du moteur de scène ; à remplacer par rembg quand la
bibliothèque de poses passera en production.
"""
import sys
from PIL import Image

def detour(src_path, dst_path, bg_rgb, threshold=18, feather=40):
    im = Image.open(src_path).convert("RGBA")
    px = im.load()
    w, h = im.size
    br, bgc, bb = bg_rgb
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dist = ((r - br) ** 2 + (g - bgc) ** 2 + (b - bb) ** 2) ** 0.5
            if dist <= threshold:
                px[x, y] = (r, g, b, 0)
            elif dist <= threshold + feather:
                alpha = int(255 * (dist - threshold) / feather)
                px[x, y] = (r, g, b, alpha)
    im.save(dst_path)
    print(f"OK  {dst_path}  ({w}x{h})")

if __name__ == "__main__":
    jobs = [
        ("/Users/sarahkedziora/Documents/ypersoa_creative_hub/assets/poses/ChatGPT Image 3 août 2026 à 12_12_51.png",
         "/Users/sarahkedziora/Documents/ypersoa_creative_hub/apps/clemence-gif/assets/poses/neutre.png",
         (253, 253, 253)),
        ("/Users/sarahkedziora/Documents/ypersoa_creative_hub/assets/poses/ChatGPT Image 3 août 2026 à 12_18_56.png",
         "/Users/sarahkedziora/Documents/ypersoa_creative_hub/apps/clemence-gif/assets/poses/joie.png",
         (253, 253, 253)),
        ("/Users/sarahkedziora/Documents/ypersoa_creative_hub/assets_produits/YP005/YP005_packshot_beige.png",
         "/Users/sarahkedziora/Documents/ypersoa_creative_hub/apps/clemence-gif/assets/objects/sweat-beige.png",
         (0, 0, 0)),
    ]
    for src, dst, bg in jobs:
        detour(src, dst, bg)
