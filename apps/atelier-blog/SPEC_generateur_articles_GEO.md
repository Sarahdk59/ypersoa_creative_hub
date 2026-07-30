# Générateur d'articles GEO — Hub Ypersoa

Module `apps/atelier-blog` (ou `packages/geo-generator`) du monorepo `ypersoa_creative_hub`.

> **Principe directeur** : l'outil n'est pas un robinet à contenu. C'est un **filtre** qui refuse
> de produire un article qui ne sert ni le Club, ni le défensif de marque, ni une occasion
> identifiée. Le gate passe avant l'IA. Cohérent avec la logique lab-tested : on valide, puis on produit.

---

## 1. Pourquoi un gate avant l'IA

L'analyse de visibilité IA a établi trois faits qui pilotent toute l'architecture :

| Fait | Conséquence produit |
|---|---|
| Le rang de récupération domine : une page non récupérée n'est jamais citée | On ne génère que sur des requêtes à SERP molle. Un `serp_softness` faible = refus. |
| Distribution bimodale (58 % jamais citées / 25 % toujours) | Le volume ne fait pas franchir le seuil. On plafonne délibérément la production. |
| Spécialiste > exhaustif (26-50 % de couverture surperforme) | Le générateur force **un seul angle** par article et interdit le format guide-fourre-tout. |

Et un fait métier : l'intention DIY (gens qui brodent eux-mêmes) n'achète pas. Un article
entretien/durabilité est légitime **pour alimenter le Club**, pas pour vendre. Le champ
`conversion_goal` rend ce choix explicite au lieu de l'ignorer.

---

## 2. Pipeline — 5 étapes

```
[1] BRIEF          saisie / import depuis geo_queries (le classeur de suivi)
       │
[2] GATE           déterministe, ZÉRO appel IA
       │           ├─ requête cible précise ?        (non → refus)
       │           ├─ serp_softness >= 3/5 ?          (non → refus)
       │           └─ conversion_goal défini ?        (non → refus)
       │           refus = message actionnable, pas de génération
       ▼
[3] GÉNÉRATION     API Anthropic, sortie JSON stricte
       │           H1 = requête exacte · slug = requête exacte
       │           1 angle · réponse directe en tête · H2 = sous-requêtes
       │           faits produit injectés (jamais inventés)
       ▼
[4] LINT           déterministe, regex — PAS de jugement IA
       │           ├─ vocabulaire interdit      → hard fail
       │           ├─ vocabulaire requis        → hard fail
       │           ├─ H1 ≠ requête cible        → hard fail
       │           └─ chiffre absent des faits  → warning
       │           échec → 1 boucle de correction auto, puis remontée humaine
       ▼
[5] EXPORT         JSON canonique → HTML Shopify + bundle Liquid + JSON-LD FAQPage
                   statut `ready_for_review` (jamais publié automatiquement)
```

**Le lint est déterministe par conception.** Les règles de vocabulaire Ypersoa sont absolues :
on ne demande pas à un modèle de juger s'il a respecté une interdiction, on vérifie par regex.

---

## 3. Modèle de données (Supabase)

- **`geo_queries`** — le backlog. C'est le classeur de suivi de visibilité IA porté en base :
  requête, catégorie, intention, `serp_softness`, `conversion_goal`, état par moteur, priorité.
  Le générateur **lit** cette table : une seule source de vérité entre le suivi et la production.
- **`geo_brand_facts`** — faits produit vérifiés (délais, coloris de fil, grammages, atelier,
  livraison). Injectés dans le prompt. Le modèle a l'interdiction d'énoncer un fait hors de cette table.
- **`geo_vocab_rules`** — vocabulaire interdit / requis, éditable sans redéploiement.
- **`geo_articles`** — articles générés, versionnés, avec rapport de lint et statut.

Voir `supabase/schema.sql`.

---

## 4. Contrat de sortie

Le modèle renvoie du JSON strict (pas de markdown, pas de préambule) :

```json
{
  "h1": "Broderie ou flocage : lequel dure le plus longtemps ?",
  "slug": "broderie-ou-flocage-lequel-dure-le-plus-longtemps",
  "meta_title": "…",           // ≤ 60 car., contient la requête
  "meta_description": "…",     // ≤ 155 car.
  "direct_answer": "…",        // 2-3 phrases factuelles, extractibles — LE bloc citable
  "sections": [                // 3-5 max, H2 = formulation de sous-requête
    { "h2": "…", "body": "…" }
  ],
  "faq": [                     // 3-5 Q/R, réponses de 2-3 phrases
    { "question": "…", "answer": "…" }
  ],
  "cta": { "label": "…", "body": "…" },   // orienté Club ou fiche produit
  "internal_links": ["…"],
  "coverage_note": "…"         // l'angle volontairement NON traité (preuve de spécialisation)
}
```

`coverage_note` est un garde-fou anti-exhaustivité : le modèle doit nommer ce qu'il a
délibérément laissé de côté. S'il ne trouve rien à exclure, l'article est trop large.

### Sorties Shopify prevues

- `html` : version simple a coller dans l'editeur d'article Shopify.
- `articleBodyHtml` : version enrichie avec sommaire, ancres et FAQ repliable.
- `shopify.liquid_section` : bloc Liquid pret a injecter dans un template d'article ou une section personnalisee.
- `shopify.seo` : `handle`, `meta_title` et `meta_description` a reporter dans l'onglet SEO.
- `shopify.faq_jsonld` : script JSON-LD a coller si le theme ne l'injecte pas via metafield.

---

## 5. Réglages recommandés

| Paramètre | Valeur | Pourquoi |
|---|---|---|
| Modèle | `claude-sonnet-5` (défaut) · `claude-opus-5` pour les articles héros | Rapport qualité/coût sur du contenu court structuré |
| `max_tokens` | 4000 | Un article spécialiste = 700-1100 mots, pas plus |
| `temperature` | 0.7 | Assez de personnalité éditoriale, sortie JSON stable |
| Longueur cible | 700-1100 mots | Au-delà, on glisse vers le guide exhaustif qui sous-performe |
| Quota | **max 3 articles / semaine** | Garde-fou volontaire contre la dérive volume |

---

## 6. Ce que l'outil ne fait PAS (délibérément)

- **Pas de publication automatique.** Sortie en `ready_for_review`. Le BAT reste humain.
- **Pas de génération en masse.** Pas de bouton « générer 20 articles ». Le quota est le produit.
- **Pas de requêtes transactionnelles courtes.** Le gate les rejette : c'est du terrain payant
  (SEA / Shopping / Pinterest), pas du SEO organique.
- **Pas d'invention de faits produit.** Tout fait chiffré vient de `geo_brand_facts` ou n'existe pas.

---

## 7. Évolutions v2

1. **Boucle de mesure** — rebrancher l'article publié sur son état dans `geo_queries` (cité / absent
   par moteur) pour savoir quels angles produisent réellement des citations.
2. **Détection de cannibalisation** — embeddings pgvector sur les articles existants ; alerte si un
   nouvel article recouvre > 70 % d'un article déjà publié.
3. **Générateur de fiches sources tierces** — même pipeline, pour produire les pitchs d'outreach
   (sélections cadeaux, annuaires) qui sont le vrai levier de citation IA.
4. **Commercialisation** — une fois validé en interne sur Ypersoa, le module devient un template
   de mission consulting Phenix Group.
