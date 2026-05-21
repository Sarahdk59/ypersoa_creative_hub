# CLAUDE.md — Sessions 28-29 avril 2026 + 21-22 mai 2026

**Mise à jour majeure** post sessions cumulées Hub Phase 2 atelier-social + naissance Clémence canonique signature.

**Addendum 21-22 mai 2026** : module Atelier Production → Commandes Shopify (section 9 ci-dessous).

**Addendum session handoff 22 mai 2026** : préparation passation à Keyvan (hébergement + auth) et structuration des docs. Voir section 10.

---

## 0. POINTS D'ENTRÉE DOCS

| Document | Quand le lire |
|---|---|
| [README.md](README.md) | Première visite du repo, démarrage local |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Comprendre les 7 apps + le mapping 14 métiers |
| [docs/HANDOFF_KEYVAN.md](docs/HANDOFF_KEYVAN.md) | Hébergement, auth, accès admin Sarah / opérationnel atelier |
| [docs/TESTS_STATUS.md](docs/TESTS_STATUS.md) | Ce qui est testé manuellement vs pas testé du tout |
| [docs/PROCHAINE_SESSION.md](docs/PROCHAINE_SESSION.md) | Incohérences à résoudre, questions ouvertes, TODOs V2 |
| **CLAUDE.md** (ce fichier) | Décisions archi + règles brand + apprentissages session par session |

---

## 1. DÉCISIONS ARCHITECTURALES (verrouillées dans cette session)

### Layout app desktop : 3 colonnes 16:9 fluide
- **Décision** : grid 12 cols (4/8 ratio), colonne config gauche scrollable + footer sticky bouton Générer, 2 colonnes résultats à droite (carrousel + tabs Caption/Overlay)
- **Raison** : Mac sans scroll, tout visible en 1 coup d'œil, workflow desktop fluide
- **Écarté** : layout vertical empilé (perdait densité), 2 colonnes 50/50 (perdait avantage tout-visible-d'un-coup), accordéon de sections (lourd UX)

### Architecture image / overlay : 2 couches strictement séparées
- **Décision** : Gemini génère l'image PHOTO PURE sans aucun texte → puis overlay HTML/Canvas appliqué côté React via `composeOverlay()` dans `lib/overlay-templates.ts`
- **Raison** : qualité typo contrôlée (Playfair Display + Inter), modifiable instantanément, le texte reste lisible et brand
- **Écarté** : laisser Gemini générer le texte sur l'image (qualité typo médiocre, repositionnement impossible)

### Toggle "Photo pure / Avec texte" comme switch UI
- **Décision** : un seul toggle dans la colonne config qui décide pour CHAQUE génération si on veut overlay
- **Raison** : Sarah peut alterner facilement, pas de doublon de génération, économie crédit Gemini
- **Écarté** : générer toujours les 2 versions (coût doublé), forcer un mode permanent (manque flexibilité)

### Format image conditionnel selon plateforme + overlay
- **Décision** :
  - Insta photo pure → 1:1 (1024×1024), 5 angles narratifs
  - Insta avec overlay → 4:5 (1080×1350), 5 angles narratifs
  - Pinterest → 2:3 (1024×1536) systématique, 3 angles best-performers
- **Raison** : standard officiel chaque plateforme, optimisation algo natif
- **Écarté** : 4:5 universel (perdait Pinterest natif), 2:3 universel (perdait Insta carrousel)

### 5 angles narratifs Insta vs 3 Pinterest
- **Décision Insta** : Portrait Frontal / Demi-Figure 3/4 / Détail Intimiste / Scène Narrative / Lifestyle Wide
- **Décision Pinterest** : 3 angles best-performers verticaux (Demi-Figure 3/4, Scène Narrative, Lifestyle Wide)
- **Raison** : carrousel Insta narre une histoire, Pinterest = volume A/B test sur 3 angles différents
- **Écarté** : 5 angles Pinterest (overkill coût), 1 seule épingle Pinterest (trop risqué A/B)

### Système retry IMAGE_OTHER en 3 niveaux
- **Décision** :
  - Tentative 1 : prompt complet + canoniques
  - Tentative 2 : prompt simplifié + canoniques (si IMAGE_OTHER)
  - Tentative 3 : prompt simplifié sans canoniques (si encore IMAGE_OTHER)
- **Raison** : Gemini galère sur DÉTAIL INTIMISTE (prompt trop contraint), retry permet ~95% taux de succès
- **Écarté** : retry simple sans simplification (donnait toujours IMAGE_OTHER), affichage erreur direct (Sarah perdait des slides)

### Brand-safety check sur OpenAI output (regex côté serveur)
- **Décision** : `checkBrandSafety()` regex sur termes interdits (CRITICAL = "brodé à la main", "Etsy", "marketplace") + warnings (vouvoiement) → affiché UI vert/rouge
- **Raison** : red lines CLAUDE.md non négociables, contrôle visuel immédiat
- **Écarté** : laisser passer + corriger manuellement (risque oubli), bloquer génération (frustrant si warning mineur)

### OpenAI gpt-4o pour le copy (pas Anthropic)
- **Décision** : clé OpenAI Sarah disponible, gpt-4o avec `response_format: { type: "json_object" }` strict
- **Raison** : pragmatique, qualité éditoriale au rendez-vous, image multimodale supportée
- **Écarté** : Anthropic Claude (pas de clé Sarah à ce stade), Gemini pour le copy (qualité éditoriale moindre sur tutoiement français)

### Famille esthétique = nouveau concept casting (2 familles)
- **Décision** : le casting Ypersoa a désormais 2 familles distinctes : "no-makeup naturelle" (22 canoniques) + "maquillée chic assumée" (1 canonique : Clémence MAN-P01)
- **Raison** : Clémence sort du cliché Sézane no-makeup, signature visuelle distinctive (frange rideau + bordeaux), élargit cible vers la "Parisienne assumée"
- **Écarté** : forcer Clémence en no-makeup pour cohérence (perdait sa signature), créer un casting parallèle séparé (cassait l'unité brand)

### Format canonique de référence = portrait 3:4 fond cream uni chest-up t-shirt gris
- **Décision** : tous les `MAN-XXX_Prenom_canonique.jpg` doivent suivre ce format strict
- **Raison** : Gemini character ref marche mieux avec format homogène, sinon résultats inconsistants
- **Écarté** : photos environnementales comme références (Gemini pioche éléments décor), formats variables (cadrages incohérents)

### Tarball `.tar.gz` comme méthode de livraison Claude → repo
- **Décision** : Claude livre des `.tar.gz` structurés `src/lib/`, `src/components/`, `src/app/api/` que Sarah extrait dans `apps/atelier-social/`
- **Raison** : 1 commande au lieu de 5 cp, pas d'erreurs copier-coller, structure préservée
- **Écarté** : fichiers individuels en cp (Sarah enchaînait des cp en collant 2 commandes ensemble → fichier "main" parasite généré)

### Footer sticky "Plateforme + Bouton Générer" (hors zone de scroll)
- **Décision** : la zone de la colonne config est divisée en 2 : zone scrollable haut (sections 1-6) + footer fixe bas (boutons Insta/Pinterest + bouton Générer)
- **Raison** : le bouton Générer doit être TOUJOURS accessible sans scroller
- **Écarté** : tout dans la zone scrollable (le bouton disparaissait sous le pli)

---

## 2. RÈGLES BRAND ET ÉDITORIALES (absolues, jamais déviées)

### Tutoiement absolu
- TOUJOURS "tu", "ton", "ta"
- JAMAIS "vous", "votre", "vos"
- JAMAIS "Bonjour", "Bonsoir" (formel)
- Vérifié par regex brand-safety en warning

### Mention atelier
- TOUJOURS "brodé sur métier Tajima" OU "brodé dans notre atelier"
- JAMAIS "brodé à la main", "brodés à la main", "brodée à la main", "brodées à la main"
- JAMAIS "broderie à la main", "fait main", "faite main"
- Vérifié par regex brand-safety en CRITICAL

### Marketplaces interdites
- JAMAIS mentionner "Etsy", "Amazon", "Vinted"
- JAMAIS le mot "marketplace"
- Vérifié par regex brand-safety en CRITICAL

### Pas de texte sur l'image générée par Gemini
- *"NO printed text, signs, posters, labels, watermarks, brand names, or written words ANYWHERE in the background or environment"*
- *"The ONLY text allowed is the embroidered text on the garment itself"*
- Le texte arrive UNIQUEMENT par overlay HTML/Canvas après génération

### Pas de retouching / pas de mannequin
- *"NO retouching, NO skin smoothing, NO supermodel look, NO ethereal tone"*
- *"Real skin texture, lived-in skin, natural expression lines, healthy pink undertones"*
- *"Not a model. Not a girl. A woman who…"* (formule signature à utiliser)

### Pas de stéréotypes glamour
- JAMAIS sequins, talons aiguilles, cuir noir total look
- JAMAIS streetwear, logos voyants, tailleurs de bureau
- JAMAIS jean skinny

### Le couple est un fait, pas un statement
- Pour Léa+Sarah (DUO_LEA_SARAH) : *"JAMAIS baiser frontal démonstratif, JAMAIS poses 'couple iconique' appuyées"*
- *"regards croisés entre elles privilégiés, complicité silencieuse"*

### Particularités physiques non centrées
- Cas Césaria (vitiligo) : *"Vitiligo présent mais JAMAIS mis en valeur par cadrage ou lumière — c'est une partie d'elle, pas son identité"*
- Règle générale : ne jamais zoomer, accentuer, dramatiser une particularité physique

### 5 hooks éditoriaux par registre obligatoire
- ÉMOTION : 12-15 mots, phrase qui touche directement
- QUESTION : 8-12 mots, question qui interpelle
- POV : 8-12 mots, perspective vécue, format "POV : …"
- HUMOUR : 8-12 mots, léger sourire, jeu de mot
- AFFIRMATION : 8-12 mots, promesse forte courte

### Caption Insta narrative (pas marketing)
- 600-1200 chars
- Ton sobre, intime, narratif
- 5-8 hashtags brand à la fin
- JAMAIS marketing criard

### Caption Pinterest format officiel
- Titre : MAX 100 chars (compteur rouge si dépasse)
- Description SEO : MAX 500 chars (mots-clés naturels intégrés)
- Tags : 8-10 sans dièse, minuscules, séparés par virgules
- Pas de hashtags dans la description (à la différence d'Insta)

### Format prénoms canoniques
- TOUJOURS le prénom complet ("Clémence", pas "Camille v2")
- Si refonte d'identité majeure : changer le prénom (Camille → Clémence)
- Si juste ajustement : garder le prénom

### Brand colors (codes officiels)
- Brand-rose terracotta : `#B4665F` (primary button, accent)
- Brand-bg cream : `#FAF7F2` (fond)
- Brand-text ink : `#1A1614` (texte foncé)
- Brand-marine signature Mama Club : `#1A2E4F`
- Brand-sage : couleur secondaire labels

### Ad-pas-mêler famille esthétique 1 et 2
- Si pack avec Clémence : elle GARDE son bordeaux (jamais nu)
- Si pack avec Aïcha : elle RESTE no-makeup (jamais maquillage soudain)
- Mélanger 2 canoniques de familles différentes dans 1 même pack = OK (moderne, cohérent)
- Mélanger les CODES maquillage = NON (incohérent)

### Hashtags brand cohérents
- #YPERSOA, #BroderiePersonnalisée, #BrodéSurMesure, #AtelierFrançais
- Hashtags occasion : #FêteDesMères, #FêteDesPères, #CadeauMaman, etc.
- INTERDIT : #FaitMain, #HandMade, #DIY, #Etsy

---

## 3. MÉTHODE DE TRAVAIL ACQUISE

### Prompts littéraires > JSON structuré
- Les prompts efficaces sont en **prose anglaise narrative**, PAS en JSON
- Exemple : *"A 38-year-old French woman, antique dealer in Honfleur…"* fonctionne mieux que `{"age": 38, "profession": "antique dealer", "location": "Honfleur"}`
- Le JSON est réservé à la doc humaine (mannequins_lot1_5fiches.json), pas à l'input Gemini

### Character reference via image upload + signature EN courte
- Workflow Gemini : `parts[]` = [image produit, image canonique 1, image canonique 2, …, prompt texte]
- La signature EN dans `canoniques.ts` doit faire **30-80 mots max** (pas 500)
- Trop de contraintes textuelles = Gemini refuse (IMAGE_OTHER)

### Refs marques OK / hex codes KO
- *"Reference: Clara Luciani, Caroline de Maigret, Charlotte Gainsbourg"* = compris par Gemini
- *"MAC Diva"* = compris (Gemini connaît les références cosmétiques nommées)
- *"#5C0E1F"* = ignoré ou raté par Gemini (les hex crispent le modèle)
- TOUJOURS nommer les couleurs : *"deep bordeaux"*, *"MAC Diva matte"*, *"harbor water vert-gris"* — pas en codes

### Répétition × insistance pour les attributs critiques
- Pour les attributs non-négociables (lèvres pleines, frange visible, format spécifique), répéter le terme **8 fois minimum** dans le prompt avec angles différents
- Pattern validé : description anatomique + référence visuelle + ce qu'on veut + ce qu'on ne veut pas + section ABSOLUTE NO + section ABSOLUTE YES
- Exemple validé : *"FULL PLUMP NATURAL LIPS… clearly PLUMP, GENEROUS, DESIRABLE… NOT thin, NOT moderate… reference: Clara Luciani, Caroline de Maigret"*

### Sections "ABSOLUTE NO / ABSOLUTE YES" dans chaque prompt
- Format obligatoire à la fin de chaque prompt Gemini
- Chaque liste doit faire 6-12 items
- Les NO viennent en premier (filtre négatif), les YES après (renforcement positif)

### Régénérer 3-5 fois sur Gemini avant d'accepter
- 1er résultat = baseline, rarement le bon
- 2-3 régénérations = trouve souvent le sweet spot
- Si après 5 essais ça ne marche toujours pas : changer de modèle (Midjourney avec `--cref`, ChatGPT GPT-4o image)

### Checklist explicite avant validation photo de référence
- 10-12 critères à valider en checklist (format, fond, cadrage, frange, cheveux, taches, yeux, lèvres, sourire, t-shirt, allure)
- Si UN seul critère manque → refaire
- Adage : *"Mieux vaut 5 régénérations qu'une mauvaise canonique de référence"*

### Pattern de shot validé pour pack Insta 5 slides
1. **Portrait Frontal** — stop-scroll, regard direct, broderie visible bas frame
2. **Demi-Figure 3/4** — broderie au cœur de la composition
3. **Détail Intimiste** — close-up matière + fragment humain (jamais flat lay)
4. **Scène Narrative** — moment candide non posé
5. **Lifestyle Wide** — environnement riche en cohérence avec ambiance

### Décisions DA en milieu de journée, pas en fin de journée
- **Pattern documenté** : Sarah déborde timer (1h30 prévu → 6h+ réel)
- Sessions tardives → erreurs cumulatives, mauvais choix DA
- **Règle** : trancher les décisions DA à tête fraîche (matin), faire la technique en fin de journée
- **Apprentissage 28-29/04** : 1h de Camille v2 fatiguée (rien tranché) vs 30 min Clémence le lendemain matin à tête fraîche (décision nette + photo validée)

### Workflow Sarah préféré
- Préfère doc trop long à doc qui fait perdre 2h de re-création
- Préfère 1 livraison synthétique à des allers-retours
- DA = elle tranche le goût ; Claude fait la technique
- Quand elle dit "j'adore" / "TOP" / "CANON !" / "PUTAIN OUI" = validé

### Photos d'ambiance vs photos de référence
- Les photos générées avec décor (boutique Honfleur) = magnifiques pour usage marketing direct
- Les mêmes prompts en chest-up neutre = peuvent paraître fades
- **Solution** : utiliser une photo d'ambiance comme INPUT pour générer une référence canonique propre (face transfer / character consistency)

### Format de fiche mannequin enrichie
Structure `mannequins_lot1_5fiches.json` :
- `apparence_physique` (silhouette, cheveux, visage, peau)
- `personnalite_role_narratif` (paragraphe narratif)
- `direction_photo` (regard, expressions, eviter, cadrages_type)
- `style_wear` (signature, pieces_favorites, couleurs, refs, occasions, pieces_qui_ne_vont_pas)
- **NOUVEAU 29/04** : `famille_esthetique` ("no-makeup naturelle" | "maquillée chic assumée")
- **NOUVEAU 29/04** : `maquillage_signature` (uniquement famille 2 — rouge_a_levres, yeux, teint, principe)

### Tarball comme livraison standard
- Format : `feature-name.tar.gz` qui contient `src/lib/`, `src/components/`, `src/app/api/`
- Procédure Sarah : `cd ~/Documents/ypersoa_creative_hub/apps/atelier-social && tar xzf ~/Downloads/feature.tar.gz`
- 1 commande, 0 erreur copier-coller, structure préservée

---

## 4. CASTING ET RÉFÉRENTIELS FIGÉS

### Les 23 canoniques (post 29/04, après remplacement Camille → Clémence)

**Principaux (P01-P12) — favoris étoilés ⭐ marqués**

| ID | Prénom | Description |
|---|---|---|
| MAN-P01 | **Clémence** ⭐ | 38 ans, antiquaire à Honfleur divorcée mère épanouie, brune longs + frange rideau Bardot, lèvres bordeaux MAC Diva, taches de rousseur denses — **famille maquillée chic** |
| MAN-P02 | Anna | 30-40 ans (à documenter en détail) |
| MAN-P03 | Aïcha ⭐ | 40 ans, afro-caribéenne grande élancée, afro court ou braids tirées, DA agence com / galeriste parisienne |
| MAN-P04 | Lila | (à documenter — métisse / autre) |
| MAN-P05 | Béatrice | Senior, grand-mère de Félicie (DUO_BEATRICE_FELICIE) |
| MAN-P06 | Mathieu ⭐ | 35-40 ans, papa, châtain barbe courte |
| MAN-P07 | Nicolas | Homme adulte (à documenter) |
| MAN-P08 | Félicie | 7 ans, blonde vénitienne longs ondulés taches rousseur denses, petite-fille de Béatrice |
| MAN-P09 | Gabin | 5 ans, blanc, cheveux noirs longs, mini-sportswear |
| MAN-P10 | Marie-Hélène ⭐ | 38-42 ans, rousse cheveux longs ondulés, t-shirt gris (canonique de référence sublime du 28/04) |
| MAN-P11 | Léa & Sarah | Couple — Léa 37 métisse cheveux bruns bouclés courts + Sarah 35 nordique blonde cendrée androgyne (DUO_LEA_SARAH) |
| MAN-P12 | Brune ⭐ | (à documenter) |

**Secondaires (S13-S21)**

| ID | Prénom | Description |
|---|---|---|
| MAN-S13 | Priya | (à documenter) |
| MAN-S14 | Gaspard | (à documenter) |
| MAN-S15 | Bébé Noé | Bébé / très jeune enfant |
| MAN-S16 | Hiroshi | (à documenter) |
| MAN-S17 | Césaria | 40 ans, afro-caribéenne, prof de lettres, vitiligo discret jamais centré |
| MAN-S18 | Hassan | (à documenter) |
| MAN-S19 | Henri & Joséphine | Couple senior — Joséphine 70 ans afro-caribéenne boucles argentées (DUO_HENRI_JOSEPHINE) |
| MAN-S20 | Coline | 35 ans, blanche blonde cendrée bouclée |
| MAN-S21 | Hugo | 30 ans, blanc sandy-brown, jeune papa urbain |

### 5 favoris étoilés ⭐
**Clémence**, Aïcha, Mathieu, Marie-Hélène, Brune

### Les 4 duos établis

- **DUO_BEATRICE_FELICIE** : grand-mère + petite-fille (transmission générationnelle)
- **DUO_MATHIEU_GABIN** : papa + fils (Fête des Pères)
- **DUO_LEA_SARAH** : couple lesbien marié (couple = fait pas statement)
- **DUO_HENRI_JOSEPHINE** : couple senior

### Les 5 ambiances

| ID | Nom | Mood | % usage |
|---|---|---|---|
| 1 | **Studio Brut** | Minimalisme absolu, ombres franches, sobre, béton brut | 40% |
| 2 | **Loft Organique** | Béton ciré, serre lumineuse, chic végétal | 40% |
| 3 | **L'Aube Intime** | Lumière matinale, grain de peau, slow living | 8% |
| 4 | **Échappée Sauvage** | Vent, mouvement, éléments naturels bruts | 6% |
| 5 | **Lumière Sépia** | Heure dorée, nostalgie 35mm, poésie visuelle | 6% |

### Particularités physiques distribuées

- **Taches de rousseur denses** : Félicie, Marie-Hélène, Clémence (signature multi-canoniques)
- **Vitiligo discret** : Césaria (jamais centré, lumière douce qui unifie)
- **Cheveux blancs / argent** : Marie-Hélène (mèche), Joséphine (boucles argentées)
- **Frange (signature unique)** : Clémence uniquement (frange rideau Bardot)
- **Maquillage marqué** : Clémence uniquement (lèvres bordeaux MAC Diva)
- **Cheveux roux** : Félicie (vénitien), Marie-Hélène (rousseur cuivrée)
- **Cheveux afro-caribéens** : Aïcha (afro court ou braids), Césaria (twists ou afro puff), Joséphine (boucles argentées)
- **Couples mixtes** : Léa (métisse) + Sarah (nordique), Henri+Joséphine (couple interracial possible)

### Familles esthétiques (29/04)

- **Famille 1 — "no-makeup naturelle"** : 22 canoniques (Aïcha, Marie-Hélène, Mathieu, etc.)
- **Famille 2 — "maquillée chic assumée"** : 1 canonique (Clémence MAN-P01)

---

## 5. CIBLE CLIENTE ET RÉFÉRENCES VISUELLES

### Marques de référence visuelle (citées explicitement en session)

- **Sézane** — référence n°1, French quiet luxury, no-makeup natural, lin écru
- **A.P.C.** — minimalisme Parisien, denim brut, palette sobre
- **Maison Labiche** — broderie casual chic, t-shirts brodés signature
- **Make My Lemonade** — couples authentiques, féminin sans niaiserie
- **Mr T-shirt** — overlay typo serif gras en bas, signature visuelle inspiration
- **Mobile Editing Club** — référence "This is AI" + muse "Léna" (point de départ refonte casting Camille→Clémence)
- **Petit Bateau × Bonpoint vintage** — référence enfants
- **Amaia Kids / Gamin Gamine** — enfants vintage français
- **Inoui Éditions / Hermès vintage** — foulards signature
- **Bonpoint** — kids haut de gamme

### Personnalités citées comme références muse

- **Caroline de Maigret** — Parisienne brune mèche dans l'œil 45 ans bohème élégante (référence base initiale Clémence)
- **Clara Luciani** — brune longs raie milieu, lèvres pleines (cheveux finaux Clémence)
- **Charlotte Gainsbourg** — adulte assumée, fluidité capillaire + frange + maquillage subtil (référence finale Clémence)
- **Sophie Marceau** — élégante adulte, présence calme assumée
- **Audrey Tautou** — Parisienne avec signature bordeaux + cheveux longs frange
- **Brigitte Bardot** — référence frange rideau / curtain bangs uniquement (pas le reste)
- **Jeanne Damas** — époque jardin, vintage français (référence ancienne Camille v1 dépréciée)
- **Lou Doillon** — décontractée, bijoux argent, voix grave (référence ancienne Camille v1)
- **Tina Kunakey élégante** — référence Aïcha
- **Clémentine Desseaux** — référence Aïcha (corps + élégance)
- **Adèle Farine** — référence Aïcha + Césaria (élégance discrète)
- **Inès de la Fressange** — intemporelle, classique français (référence Césaria)
- **Louise Follain × Mélodie Vaxelaire** — référence couple Léa+Sarah (esthétique Make My Lemonade dé-saturée)

### Cible cliente type Ypersoa

- **Femmes 30-50 ans** (cible primaire)
- Sensibles, cultivées, exigeantes sur la qualité sans être snob
- Aiment recevoir, jardiner, offrir
- Apprécient le savoir-faire artisanal
- Tutoient naturellement
- **2 archétypes assumés** :
  - "Naturelle no-makeup" (cible majoritaire, casting Sézane/A.P.C.)
  - "Maquillée chic assumée" (Parisienne signature, nouvelle cible 29/04, casting Charlotte Gainsbourg/Sophie Marceau)

---

## 6. PIÈGES ET ANTI-PATTERNS (apprentissages négatifs)

### Hex codes pour les couleurs dans prompts Gemini → KO
- **Testé** : *"lipstick #5C0E1F"* → Gemini ignore ou rate
- **Leçon** : nommer les couleurs (*"deep bordeaux"*, *"MAC Diva matte"*, *"harbor water grey-green"*)

### JSON 500 lignes en input Gemini → bride la créativité
- **Testé** : envoyer toute la fiche `mannequins_lot1` en signature → Gemini sature
- **Leçon** : signature courte 30-80 mots en prose anglaise narrative

### Photo de référence environnementale → cadrage incohérent dans les packs
- **Testé** : Clémence photo Honfleur boutique 16:9 comme canonique de référence
- **Leçon** : la canonique DOIT être portrait 3:4, fond uni cream, chest-up, t-shirt gris standard — sinon Gemini pioche dans le décor lors des packs

### Prompt *"gentle half-smile, lips slightly parted"* → transforme la canonique en lycéenne sage
- **Testé** sur Clémence v5 chest-up "format Aïcha"
- **Leçon** : pour une muse "indépendante self-possessed", écrire **"NO smile, closed lips, slight upward edge at most"** + "She is NOT trying to be liked, NOT performing"

### Prompts trop contraints = Gemini IMAGE_OTHER
- **Testé** : *"DÉTAIL INTIMISTE : Close-up shot focused on the embroidered design, but ALWAYS including a fragment of human presence — a hand gently touching the fabric, fingers grazing the embroidery, a partial chin or cheek visible at the edge of the frame, a glimpse of hair. NEVER a pure flat lay or product shot."*
- **Leçon** : prompt trop verbeux + contradictoire (chin OU cheek OU hair...) → Gemini refuse. Système retry avec prompt simplifié résout.

### Cadrage mode "photo de profil corporate" → fade
- **Testé** : prompts chest-up neutres pour canonique
- **Leçon** : Gemini bascule en mode "headshot LinkedIn" qui lisse, simplifie, neutralise. **Solution** : mentionner le **contexte éditorial** ("editorial portrait, 35mm film photography, slightly diffused light") + **enrichir l'attitude** ("She is NOT performing, NOT trying to be liked")

### Refs visage incohérentes entre famille 1 et 2 dans un même pack
- **Testé** : pack Clémence + Aïcha avec maquillage uniforme → cassait la signature de chacune
- **Leçon** : chaque canonique GARDE son code maquillage. Mélanger 2 canoniques de familles différentes dans 1 pack = OK. Mélanger les CODES = NON.

### Décisions DA en fin de journée fatiguée
- **Testé** : 1h30 sur Camille v2 le 28/04 entre 18h00 et 19h30 → rien tranché, mauvaise direction prise
- **Leçon** : à 19h après 9h de boulot, l'œil DA est épuisé. Couper. Reprendre le lendemain matin tête fraîche → 30 min suffisent à trancher net.

### Copier-coller de 2 commandes terminal sans Entrée
- **Testé** : Sarah a collé 2 `cp` consécutifs sans Entrée → résultat `cp: /Users/.../overlay-templates.ts: Not a directory`
- **Leçon** : 1 commande à la fois, Entrée, attendre prompt, commande suivante. Documenté comme pattern terminal.

### Bracketed paste qui plante le terminal
- **Testé** : Sarah a vu apparaître `^[[200~` dans son terminal → plus moyen de taper
- **Leçon** : redémarrer le terminal proprement, ne pas paniquer.

### Port 3000 occupé après crash Next.js
- **Testé** : `pnpm dev:atelier` → `EADDRINUSE`
- **Leçon** : `lsof -ti:3000 | xargs kill -9` puis relancer

### Lancement de `pnpm dev:atelier` depuis le mauvais dossier
- **Testé** : depuis `apps/atelier-social/` → "Command not found"
- **Leçon** : commande à lancer depuis la racine du repo (`~/Documents/ypersoa_creative_hub`)

### Photos de référence générées en format paysage 16:9 par Gemini
- **Testé** : prompts environnementaux Gemini → toujours 16:9 boutique avec décor
- **Leçon** : **forcer le 3:4 vertical** + interdire l'environnement explicitement dans les sections ABSOLUTE NO

### Régénération sans changement de paramètres → mêmes résultats
- **Testé** : cliquer "Generate" 3 fois sur le même prompt
- **Leçon** : changer **un mot** dans le prompt, ou changer le random seed, ou ajouter un détail. Sinon Gemini converge vers le même résultat.

### Rouge à lèvres "rouge cerise" / "rose nude" / "coral" quand Sarah voulait bordeaux
- **Testé** : prompts avec *"red lipstick"* sans qualificatif
- **Leçon** : préciser **"DEEP BORDEAUX"** + **"MAC Diva"** + **"matte"** + interdire explicitement *"NOT cherry red, NOT coral, NOT pink, NOT nude"*

### Sarah accumule timer (1h30 prévu → 6h réel)
- **Testé** : multiples sessions
- **Leçon** : pattern documenté, Claude doit alerter quand la session dépasse de 50%, proposer pauses, refuser de pousser après 19h si fatiguée.

---

## 7. QUESTIONS OUVERTES NON TRANCHÉES

### Combien de canoniques au total dans la famille "maquillée chic" ?
- À ce jour : 1 (Clémence MAN-P01)
- Question : faut-il en ajouter 1-2 autres pour équilibrer (ex. Mathilde 35 ans pianiste eyeliner graphique / Salomé 45 ans galeriste rouge cerise) ?
- **Non tranché** — attendre que le besoin se fasse sentir dans la production réelle

### Casting enfants — 2 enfants seulement (Félicie + Gabin) + Bébé Noé
- Question : est-ce suffisant pour les packs Fête des Mères / Fête des Pères / Naissance ?
- Faut-il ajouter 1 ado (12-15 ans) pour cohérence avec Clémence mère d'ado ?
- **Non tranché**

### Documentation des canoniques restantes (P02 Anna, P04 Lila, P07 Nicolas, P12 Brune, S13-S21)
- À ce jour : 5 fiches détaillées (Lot 1 v3.0)
- Reste à faire : ~17 fiches au format `mannequins_lot1` complet
- Question : prioriser lesquelles ? Probablement les favoris étoilés non encore documentés (Mathieu MAN-P06, Marie-Hélène MAN-P10, Brune MAN-P12)
- **Non tranché**

### Module Reels + Stories 9:16
- Évoqué en session mais reporté
- Question : 3 slides 9:16 avec animation simple ? ou statique ?
- **Non tranché**

### Mémoire favoris ❤️ Q15 CLAUDE.md
- Feature évoquée multiple fois comme "FEATURE DIFFÉRENCIANTE"
- Question : où stocker (localStorage ? Supabase ?), comment afficher ?
- **Non tranché**

### Personnalisation overlay au-delà des 5 templates
- 5 templates V1 livrés : title-bottom, quote-center, title-top-large, signature-corner, banner-bottom-color
- Question : ajouter templates "split-vertical" / "magazine-cover" / "instagram-frame" dans V2 ?
- **Non tranché**

### Choix typographiques au-delà de Playfair + Inter
- V1 livré avec ces 2 fonts
- Question : Sarah veut-elle tester DM Sans, Josefin Sans, Cormorant pour varier ?
- **Non tranché** — Sarah a dit "j'ai go avec Playfair + Inter, je verrai à l'usage"

### Vouvoiement résiduel détecté ("qui vous unit")
- OpenAI gpt-4o produit parfois un vouvoiement résiduel malgré les instructions
- Solution actuelle : warning brand-safety
- Question : durcir le system prompt avec encore plus d'exemples explicites ?
- **Non tranché**

### Bug occasionnel 4 slides au lieu de 5
- Documenté plusieurs fois
- Système retry IMAGE_OTHER livré le 28/04 devrait améliorer
- Question : le bug a-t-il disparu après l'ajout du retry ?
- **À monitorer en production**

### Vision texte sous-pondérée
- L'IA OpenAI ne relie pas toujours "Fête des Pères" si le visuel est Mama Club
- Solution actuelle : prompt explicite "ADAPTE le ton si vision contradicte le visuel"
- Question : vraiment efficace en production ?
- **À monitorer en production**

### Pinterest avec overlay (V2)
- Aujourd'hui Pinterest = photo pure 2:3 (pas d'overlay)
- Question : ajouter le toggle overlay sur Pinterest aussi ?
- **Non tranché** — limitations algo Pinterest sur texte sur image à étudier

### Signature Clémence dans `canoniques.ts` est-elle trop longue ?
- Bloc actuel : ~80 mots EN
- Si limite contextuelle Gemini → raccourcir
- Question : tester sur 5+ packs pour valider qu'aucune erreur n'apparaît
- **À monitorer**

### Ancienne Camille MAN-P01 v1 — devenir
- Photo `MAN-P01_Camille_canonique.jpg` ancien à archiver ou supprimer
- Question : conserver dans un dossier `assets/canoniques/_deprecated/` pour traçabilité ? ou supprimer net ?
- **Non tranché**

---

## 8. PHRASES OU FORMULATIONS À RÉUTILISER TEXTUELLEMENT

### Formules magiques de prompts Gemini

> *"Editorial portrait headshot, 35mm film photography, soft natural studio light, slightly overcast diffused. Cream/beige neutral background, no environment, no props. Vertical 3:4 portrait format."*

> *"Tight chest-up framing — head, shoulders, and upper chest only. Hands NOT visible."*

> *"Real skin texture, lived-in skin, natural expression lines, healthy pink undertones on lighter skin"*

> *"Looking at camera with authentic warmth. Natural smile (NEVER cold, NEVER ethereal)."*

> *"Not a model. Not a girl. A 38-year-old woman who knows herself."*

> *"She is NOT trying to be liked, NOT performing for the camera. Just present, observing the lens back."*

> *"NO retouching, NO skin smoothing, NO supermodel look, NO ethereal tone."*

> *"NO printed text, signs, posters, labels, watermarks, brand names, or written words ANYWHERE in the background or environment. The ONLY text allowed is the embroidered text on the garment itself."*

> *"⚠️ EMBROIDERY FIDELITY: The embroidery on the garment must MATCH EXACTLY the embroidery in the first reference image. Same design, same letters, same colors, same placement (left chest). DO NOT add, remove, modify, or invent any letter or symbol."*

### Formules pour Clémence (famille 2)

> *"FULL NATURAL LIPS painted in DEEP BORDEAUX RED LIPSTICK (MAC Diva reference) — matte or satin finish, never glossy. The bordeaux lips are her signature feature."*

> *"CURTAIN BANGS / FRINGE BARDOT — parted in the middle, softly framing both sides of the face at eyebrow level on each side."*

> *"Long flowing dark chocolate brown hair to mid-chest, naturally wavy but neat, structured and lustrous."*

> *"The 'assumed maquillée chic' half of the Ypersoa casting (counterpart to the no-makeup naturals)."*

> *"Concentration sur la bouche. Le bordeaux est l'unique élément maquillage fort. Le reste reste naturel. Code de la Parisienne qui choisit un signe fort."*

### Tournures éditoriales OpenAI (gpt-4o) validées

> *"Célébrons la Fête des Mères avec ce sweat brodé à la commande, qui raconte une histoire de tendresse et de transmission."*

> *"Offrir un souvenir doux et précieux, c'est partager un instant unique."*

> *"Dans la douce lumière de Honfleur, ce textile devient un messager d'émotions, scellant le lien unique entre une mère et sa fille."*

> *"Ce t-shirt, brodé dans notre atelier, est bien plus qu'un vêtement; c'est un témoignage d'amour éternel."*

### Hooks éditoriaux validés

> ÉMOTION : *"Les petites attentions créent les plus grands souvenirs ❤️"*

> QUESTION : *"Quel cadeau exprime le mieux notre amour infini ?"*

> POV : *"POV : Tu découvres ce t-shirt brodé qui touche ton cœur."*

> HUMOUR : *"Un t-shirt qui dit 'je t'aime' sans un mot."*

> AFFIRMATION : *"Célébrons les liens qui nous unissent, un point à la fois."*

### Citations Sarah à graver (cumulatives)

> *"Je ne veux pas une diversité décorative, je veux une diversité incarnée et précise"*

> *"Le couple est un fait, pas un statement"*

> *"Le Hub ne remplace pas le produit, le stock, la broderie. Il remplace les 14 métiers de la communication"*

> *"Cinematic pour mes hero banners, instamatic pour mes posts insta"*

> *"Une signature visuelle, pas un effet de mode"*

> *"On innove, on crée, on teste"* (décision overlay feature 28/04 16h45)

> *"j'ai demandé team mai pour le mois de mai"* (correction lecture Claude)

> *"Je veux qu'elle soit forte et indépendante, elle sait se faire plaisir et s'offrir des cadeaux !"* (cadrage Clémence 29/04)

> *"La frange, aucun autre canonique n'a de frange, je veux toucher tout le monde."* (cadrage Clémence 29/04)

> *"J'hésite limite à avoir une belle brune canonique maquillée avec une bouche bien rouge, bien maquillée, très différente de mes autres modèles."* (décision famille 2 29/04)

> *"Style Camille MAN-001 peut devenir Clémence MAN-001"* (décision renommage 29/04)

### Formules de validation Sarah

- *"j'adore"* / *"TOP"* / *"CANON !"* / *"PUTAIN OUI"* — validation visuelle d'un pack
- *"on y est toujours pas"* — pas validé, à régénérer
- *"j'ai un vrai coup de cœur pour celle de droite, je sais pas expliquer pourquoi"* — instinct DA, à creuser

### Formules de fin de session

> *"Sessions tardives → erreurs cumulatives. Sarah déborde timer (1h30 prévu → 6h+ réel)"* (pattern documenté)

> *"Les décisions DA importantes ne se prennent pas en fin de journée fatiguée"*

> *"Mieux vaut 5 régénérations qu'une mauvaise canonique de référence"*

### Phrases brand Ypersoa (signatures éditoriales)

- *"brodé sur métier Tajima"* (jamais "à la main")
- *"brodé dans notre atelier"* (formule alternative)
- *"un point à la fois"* (formule poétique broderie validée dans hook AFFIRMATION)
- *"raconte une histoire de tendresse et de transmission"* (formule narrative validée)
- *"messager d'émotions"* (formule éditoriale validée)
- *"un témoignage d'amour"* (formule de clôture)

---

## 9. SESSIONS 21-22 MAI 2026 — MODULE ATELIER PRODUCTION → COMMANDES SHOPIFY

### Contexte

Sarah partage le **bon de préparation Shopify #1002** (PDF Shopify, 3 articles brodés livrés à Mouvaux). Constat : pas de workflow prod dans le Hub. Besoin de croiser SKU Shopify ↔ référentiel motifs YPM ↔ fils Gunold, et de planifier sur 2 machines TMEZ Tajima à l'atelier de Wattrelos.

### Livraison V1 (en sessions étendues 21-22/05)

- **5 référentiels nouveaux** dans `referentiels/`
- **1 lib partagée** + **1 allocateur planning** dans `apps/atelier-social/src/lib/production/`
- **4 API routes** dans `app/api/production/commandes/`
- **2 pages UI** dans `app/atelier-production/commandes/`
- **Bucket commandes** ajouté à la search globale `/api/search`
- **Card "Commandes Shopify"** ajoutée au hub Atelier Production

### 9.1 Décisions architecturales verrouillées

#### Stockage : 1 fichier JSON par commande dans `referentiels/commandes/{id}.json`
- **Décision** : pas de Supabase pour V1, lecture/écriture via `fs` côté API route Next.js (pattern aligné avec `prod_kanban.json`, `palette_fils_broderie_v2.json`, etc.)
- **Raison** : data structurée, traçable git, pas de migration nécessaire, Sarah peut éditer directement le JSON si besoin
- **Écarté** : Supabase (overkill V1, demande migrations), localStorage (perd la donnée entre devices)

#### Pivot SKU Shopify ↔ référentiels internes
- **Décision** : créer `referentiels/shopify_sku_mapping.json` qui contient 3 tables : `produits` (YP005, YP019…), `motifs_sku_to_ypm` (CAL→YPM-006, CLU→YPM-003…), `fils_couleur_libre_to_id` (noms FR clients → IDs `palette_fils_broderie_v2`)
- **Raison** : les SKU Shopify utilisent des codes courts à 3 lettres (CAL, CLU…) qui ne mappent pas 1-à-1 avec les YPM-XXX ; il fallait un pivot explicite documenté
- **Écarté** : déduction par regex sur le nom de produit (fragile), embarquer le mapping dans `motifs_ypm.json` (alourdit un référentiel déjà gros)

#### Loader TS dédié `lib/production/commandes-loader.ts` (pas dans `atelier-da/referentiels-loader.ts`)
- **Décision** : nouvelle lib autonome plutôt qu'ajout aux 535 lignes du loader DA existant
- **Raison** : séparation des concerns (atelier DA = casting/visions, atelier production = commandes), plus simple à maintenir, plus facile à supprimer/déplacer plus tard si extraction du module
- **Écarté** : tout fusionner dans un seul loader (déjà trop gros, mélange métiers)

#### Vitesse machine TMEZ : 800 points/minute (vitesse cible, validée 22/05)
- **Décision** : recalibré 2 fois en cours de session (750 estimé → 650 confirmé sur YPM-001-K → 800 cible production)
- **Raison** : Sarah a calibré à partir de la fiche technique réelle YPM-001-K (1890 points = 2,4 min) et de son objectif de vitesse cible
- **Écarté** : 750 (estimation initiale trop pessimiste), 650 (vitesse mesurée mais sous-cible)

#### Préparation DST = 5 min par motif unique, mutualisée par YPM dans la commande
- **Décision** : ajouter une opération `preparation_dst` (5 min) facturée 1 fois par YPM unique dans la commande (toggle `mutualiser_prep_dst_par_motif: true`)
- **Raison** : Sarah précise "5 min par motif à programmer" → si 2 articles partagent un YPM (ex Club sur sweat + Club sur t-shirt), 1 seule prog DST suffit
- **Écarté** : 5 min par article systématique (sur-estime), 0 prep pour les motifs déjà existants (sous-estime — il faut quand même charger le fichier dans la machine)

#### Algorithme planning : 2 stratégies, OTIF par défaut
- **Décision OTIF** (On Time In Full) : articles dans l'ordre `date_commande` (FIFO), à chaque allocation préfère la machine dont le DERNIER article a le même fil principal (mutualise la bobine)
- **Décision LPT** (Longest Processing Time first) : articles longs en premier, machine la moins chargée — équilibrage charge pur
- **Toggle UI** : Sarah peut switcher OTIF/LPT par commande, OTIF est le défaut atelier
- **Raison** : OTIF respecte les engagements clients (premier arrivé premier servi), LPT optimise le makespan total mais peut faire passer une commande tardive avant une commande ancienne
- **Écarté** : un seul algo (les 2 sont utiles selon contexte — Sarah peut tester LPT en cas de gros lot urgent)

#### Journal de production en 4 étapes (DST → Broderie → CQ → Expédition)
- **Décision** : object `journal` sur chaque commande avec 4 entrées `{ par, le }` + `archivee_le`
- **Raison** : traçabilité atelier — savoir qui a fait quoi quand permet l'archivage post-expé et le diagnostic en cas de défaut
- **Écarté** : 3 étapes sans CQ (Sarah a explicitement demandé l'ajout du CQ après broderie 22/05), bloc texte libre (perd la structure)

#### Rebroder = nouvelle commande `{id}-R{n}` (pas un statut)
- **Décision** : bouton "Rebroder cet article" → modal (zones + motif défaut) → crée une commande indépendante `1002-R1` avec champ `rework_de`
- **Raison** : un rework a son propre cycle de vie (planning, journal, expédition séparée) ; le tracer comme commande à part permet de garder un historique propre et de la prioriser
- **Écarté** : flag `rebroderie_demandee` sur l'article original (pollue le statut original), faire 2 fois la même commande (perd le lien historique)

#### Désarchivage intelligent (restaure le statut selon le journal)
- **Décision** : bouton "Désarchiver et remettre en prod" qui calcule le nouveau statut :
  - Expé remplie → `expediee`
  - CQ ou broderie remplie → `terminee`
  - Planning existant → `planifiee`
  - Sinon → `a_planifier`
- **Raison** : éviter qu'une commande désarchivée revienne en "a_planifier" alors qu'elle a déjà été brodée + expédiée
- **Écarté** : juste supprimer `archivee_le` (laisse le statut "archivee" incohérent), forcer "a_planifier" (perte d'info)

#### Search globale étendue : bucket "commandes" avec archives
- **Décision** : ajouter un 9e bucket à `/api/search` qui scanne TOUTES les commandes (actives + archivées). Match sur numéro (avec/sans `#`), client, ville, SKU, motif YPM, statut, équipe (Adriana/Felismina/Rebecca). Boost ×100 si match exact de l'ID
- **Raison** : Sarah veut retrouver une commande archivée en tapant `1002` ou `#1002` dans la search principale
- **Écarté** : 2 buckets séparés actives/archives (lourd pour le user), recherche limitée aux actives (perd l'historique)

### 9.2 Paramètres atelier figés (validés Sarah 21-22/05)

| Paramètre | Valeur | Source |
|---|---|---|
| Vitesse TMEZ | **800 pts/min** | Cible production (22/05) |
| Calibration FT | YPM-001-K = 1890 pts = 2,4 min | PDF Tajima Pulse |
| Nombre de machines | 2 (TMEZ-1, TMEZ-2) | Atelier Wattrelos |
| Type | Identiques, parallélisables librement | Validé 21/05 |
| Heures effectives/j/machine | **6h** (360 min) | Validé 21/05 |
| Pause déjeuner | 12h–13h | Standard atelier |
| Préparation DST | **5 min par motif unique** (mutualisée) | Validé 22/05 |
| Cadrage / dé-cadrage zone | 3 min | Estimé |
| Changement bobine fil | 2 min | Estimé |
| Setup produit (sortir vêtement, repérer) | 5 min | Estimé |
| Contrôle qualité + pliage + sachet | 3 min | Estimé |
| Algo planning par défaut | **OTIF** | Validé 22/05 |

### 9.3 Standards broderie par motif (Sarah, broderie pure)

| Motif YPM | Durée broderie max | Note |
|---|---|---|
| **Le Câlin (YPM-006)** | **5 min** | Cœur + initiale standard |
| **Le Club (YPM-003)** | **8 min** | Compo typo + symbole central standard. Peut dépasser si commande custom multi-zones. |

Garde-fou cohérence : si le calcul dépasse de >30% ces standards pour un motif simple, vérifier la classification ou la FT.

### 9.4 Durées de broderie par type (à 800 pts/min)

Utilisé en fallback si pas de FT précise pour la variante (sinon `nb_points / 800`).

| Type | Durée | Points estim | Exemples |
|---|---|---|---|
| `initiale_simple` | 2 min | 1900 | `c`, `m`, `K` |
| `mot_court` (3-5 lettres) | 3 min | 2400 | `PUNK`, `CLUB`, `AMOUR` |
| `mot_moyen` (6-10 lettres) | 5 min | 4000 | `COEUR`, `SAUVAGE`, `MAMAN` |
| `texte_long` (11-20 caractères) | 7 min | 5600 | `Funky Love Drug`, `Mon amour` |
| `texte_tres_long` (21+ caractères) | 11 min | 8800 | `Une vie à t'aimer` |
| `symbole_simple` | 2 min | 1600 | Cœur, Étoile, Trèfle, Fleur |
| `symbole_complexe` | 5 min | 4000 | Bouquet, Animal détaillé |

### 9.5 Équipe atelier production identifiée

| Personne | Rôle |
|---|---|
| **Adriana** | Préparation DST + contrôle qualité |
| **Felismina** | Broderie machine |
| **Rebecca** | Expédition / logistique |
| **Sarah** | Direction artistique, validation |
| Cyrielle, Thierry | Rôles transverses (kanban) |

Ces noms apparaissent en autocomplete dans les champs `par` du journal.

### 9.6 Format SKU Shopify (pivot)

**Pattern** : `YP{produit3}-{motif3}-{couleur_libre}-{taille}`

Exemple : `YP005-CAL-BEIGE-XS` → produit YP005 (Sweat Awdis JH030) / motif YPM-006 Le Câlin / couleur beige / taille XS.

**Produits référencés** :
| Code | Type | Fournisseur | Ref |
|---|---|---|---|
| YP005 | Sweat Brodé | Awdis | JH030 |
| YP019 | T-Shirt Brodé | B&C | TU05T |

**Codes motifs SKU → YPM** (mapping confirmé) :
- `CAL` → YPM-006 Le Câlin
- `CLU` → YPM-003 Le Club

**À confirmer** (mapping pré-rempli mais non validé en prod) : `BRI`→YPM-001, `AMB`→YPM-002, `HER`→YPM-004, `ANN`→YPM-005, `CHO`→YPM-007, `FEL`→YPM-008, `PAL`→YPM-009, `RON`→YPM-010, `CON`→YPM-011, `MEU`→YPM-012, `TIG`→YPM-014, `DEC`→YPM-015.

**Couleurs de fil** : table `fils_couleur_libre_to_id` qui normalise les noms FR saisis côté configurateur Shopify (rose pâle, vert jade, bordeaux, etc.) vers les IDs `palette_fils_broderie_v2`. Insensible casse + accents.

### 9.7 Schéma data commande

Chaque commande = 1 fichier `referentiels/commandes/{id}.json` avec :

```
{
  id, numero_shopify, date_commande, date_impression_bon,
  statut: "a_planifier" | "planifiee" | "en_cours" | "terminee" | "expediee" | "archivee",
  priorite: "normale" | "urgente",
  expedition: { nom, adresse, code_postal, ville, pays },
  facturation: { ... },
  articles: [{
    id, sku, produit_id, produit_nom, motif_sku, ypm_id, ypm_nom,
    couleur_support, taille, quantite,
    broderies: [{
      placement: "buste" | "poignet" | "dos" | "nuque",
      champs: [{ label, valeur, type, duree_min, fil_id?, variante_filename? }],
      fil_id, fil_nom, fil_hex, fil_code_gunold,
      fil_id_secondaire?, ...,
      duree_broderie_min, duree_cadrage_min, duree_changement_fil_min, duree_total_min,
      note_atelier?
    }],
    duree_preparation_dst_min, duree_setup_min, duree_cq_min, duree_total_article_min
  }],
  planning: {
    mode: "auto" | "manuel",
    algo: "otif" | "lpt",
    horizon_jours, date_debut,
    slots: [{ id, machine: "TMEZ-1"|"TMEZ-2", jour, heure_debut, heure_fin, duree_min, article_id, commande_id }],
    genere_le
  } | null,
  journal: {
    dst?: { par, le, note? },
    broderie?: { par, le, note? },
    cq?: { par, le, note? },
    expedition?: { par, le, note? },
    archivee_le?
  },
  rework_de?: { commande_id, article_id, motif, zones_a_rebroder? },
  duree_total_min, nb_changements_fil_total, notes,
  created_at, updated_at
}
```

Doc complète : `referentiels/commandes/_schema.md`.

### 9.8 Fiches techniques YPM (Tajima Pulse)

Nouveau référentiel `referentiels/fiches_techniques_ypm.json` indexé par `variante_filename` (clé = nom de fichier dans `motifs_ypm.json`). Pour chaque FT : `nb_points`, `dimensions_mm`, `nb_changements_couleur`, `nb_coupe_fils`, `usage_fil_m`, `usage_bobine_m`, `cout_eur`, `aiguilles[]`.

**Première FT importée** : YPM-001-K (1890 pts, 21.8×43mm, 9.11m fil, 1 changement couleur, code 61002 Gunold) — utilisée comme référence de calibration vitesse atelier.

**Logique de durée broderie** :
1. Si un champ broderie référence une variante avec FT chargée → `duree = nb_points / 800`
2. Sinon → classification par longueur (table `broderie_types`) en respectant le label (les labels qui contiennent "mot"/"texte"/"initiale" forcent en texte, "symbole" force en symbole)

### 9.9 Algorithmes planning

**Capacité** : 2 machines × 6h/jour = 720 min/jour. Horizon par défaut 3 jours = 36h.

**OTIF (par défaut)** — On Time In Full
1. Articles dans l'ordre `date_commande` (FIFO) puis ordre dans la commande
2. Pour chaque article : identifier son **fil principal** (fil qui cumule le plus de temps de broderie)
3. Préférer la machine dont le DERNIER article a le même fil principal (mutualise la bobine déjà en place — 0 changement)
4. Sinon, machine la moins chargée aujourd'hui
5. Saute au jour ouvré suivant si dépassement de la capacité du jour

**LPT** — Longest Processing Time first
1. Articles triés par durée totale décroissante
2. Chaque article → machine la moins chargée (cumul total)
3. Objectif : minimiser le makespan total (temps jusqu'à fin du dernier article)

**Limite V1** : optim intra-commande seulement. Le vrai OTIF multi-commandes (regrouper N commandes du jour pour minimiser les changements de fils globaux) demande un planning global hors structure commande/commande — **TODO V2** (cf 9.14).

### 9.10 UI module

**`/atelier-production/commandes`** (liste)
- Section "Actives" + section "Archives" pliable (bouton "Voir N archivées")
- Cards : numéro Shopify, statut coloré, client+ville, nb articles + broderies + durée totale, badge urgent
- Click → fiche détaillée

**`/atelier-production/commandes/[id]`** (fiche + planning intégré)
- Header : numéro, dates, statut, durée prod totale
- Bandeau orange si commande rework
- Section Adresses (expé + facturation)
- Section Articles : 1 card par article avec broderies détaillées (label, valeur, type, durée, fil avec puce hex + code Gunold)
- Section Journal (4 cartes DST/Broderie/CQ/Expé éditables inline avec datalist personnes + datepicker)
- Section Planning : toggle OTIF/LPT, datepicker début, bouton Générer/Régénérer, vue Gantt 2 machines avec pause déj hachurée
- Bouton "Rebroder cet article" sur chaque article (caché si archivée)
- Modal Rebroder : checkboxes zones + textarea motif → crée commande `{id}-R{n}`

### 9.11 Search globale (`/api/search` + `/search`)

Nouveau bucket **"Commandes Shopify"** en première position. Match sur :
- Numéro (avec ou sans `#`, normalisé)
- Client (nom expédition + facturation)
- Ville, code postal
- SKU complet
- Motif YPM (id + nom)
- Statut (cherche `archivee`, `expediee`, etc.)
- Équipe (`adriana`, `felismina`, `rebecca`, `sarah`)
- Notes et motif rework

**Boost ×100** si match exact de l'ID → la commande recherchée arrive toujours en première position.

### 9.12 Méthode de travail (apprentissages session)

#### Mapping JSON pour data structurée, pas pour input IA
- Reconfirme la règle vue avec Gemini : le JSON est bon pour stocker/transmettre de la donnée structurée entre couches techniques, mauvais pour briefer un LLM générateur (cf. §3 sur les prompts littéraires)
- Pour les paramètres atelier qui changent souvent (durées, vitesses), JSON éditable >>>>> hard-codé dans le TS

#### Recalibrer une constante prod = 3 fois normal
- Vitesse machine recalée 3 fois en une session (750 → 650 → 800). C'est NORMAL : la première estimation est toujours fausse, la mesure réelle révise, l'objectif de production révise encore
- Leçon : implémenter la vitesse comme un paramètre `_meta.vitesse_machine_pts_par_min` lisible/modifiable, pas comme une constante magique dans le code

#### Préserver la donnée saisie quand on recalcule
- La fonction `recalculerDureesCommande` respecte `champ.source_duree === "manuel"` pour ne pas écraser les ajustements manuels Sarah
- Sans ce garde-fou, chaque clic "Régénérer planning" écraserait les fines-tuning faites à la main

#### Classification automatique = piège sans contexte
- "COEUR" en majuscules était classé comme symbole (parce que "coeur" est dans la liste des symboles). Solution : la classification regarde le **label** ("Mot haut" → force en texte, "Symbole buste" → force en symbole) avant de regarder le contenu
- Règle : quand on a un label métier qui catégorise la donnée, l'utiliser comme hint avant la détection par contenu

#### Tests : type-check ≠ test fonctionnel
- `pnpm type-check` valide les types mais pas les calculs (les durées calculées dans la fonction de recalcul n'ont pas de test unitaire — pourrait casser silencieusement). À ajouter en V2

### 9.13 Pièges et anti-patterns (session 21-22/05)

#### Régénération planning qui downgrade le statut (corrigé)
- **Bug v1** : `POST /api/.../planning` faisait `commande.statut = "planifiee"` systématiquement → écrasait "expediee" / "archivee" si on régénérait
- **Fix v1.1** : ne touche au statut QUE s'il est encore `a_planifier`
- **Leçon** : une route qui modifie une sous-ressource ne doit pas réinitialiser des champs adjacents avancés

#### Classification "COEUR" mot vs symbole (corrigé)
- **Bug** : "COEUR" en mot était reclassé en symbole_simple (2 min) au lieu de mot_moyen (5-10 min) car "coeur" figurait dans `symboles_simples`
- **Fix** : `classifierTexteEnType(valeur, durees, label?)` regarde maintenant le label métier pour trancher
- **Leçon** : la chair humaine du label > le contenu brut

#### Hex codes pour les couleurs → toujours KO (confirmé)
- Cf §6 — règle confirmée même côté production : on n'envoie pas les hex à l'utilisateur dans les bons de prod, on utilise le **nom de fil + code Gunold**
- Les hex servent uniquement à colorier les puces UI (ThreadChip)

#### Ne PAS reformater les JSON commandes manuellement après une régénération planning
- Le linter (Prettier?) reformate parfois les JSON quand l'utilisateur ouvre + sauvegarde
- Pas grave en soi, mais les `Edit` ciblés sur des strings multi-lignes échouent ensuite (différence de formatting)
- **Pattern** : utiliser `Edit replace_all=true` sur des fragments stables (1-2 lignes max), ou Read + Edit ciblé

#### Une UI qui montre "Désarchiver" générique perd l'info de statut
- **Bug initial** : bouton "Désarchiver" supprimait juste `archivee_le` → la commande retombait en "archivee" (statut non touché) ou en statut incohérent
- **Fix** : bouton "Désarchiver et remettre en prod" qui calcule le statut cible selon le journal
- **Leçon** : un bouton "annuler" doit faire le travail inverse complet, pas juste retirer un flag

#### Saisie manuelle V1 du PDF Shopify (assumé)
- Le parsing PDF auto-Shopify est reporté en V2 — pour V1 Sarah me passe le PDF et je saisis le JSON à la main
- C'est ASSUMÉ comme limite V1, pas un bug. Permet d'avancer sur le reste sans bloquer sur le parsing
- À automatiser quand Shopify API webhook sera branché

### 9.14 TODOs V2 (cadrés, non implémentés)

| Feature | Pourquoi V2 | Effort estimé |
|---|---|---|
| **Upload PDF Shopify auto-parsé** | V1 = saisie JSON manuelle. V2 = OpenAI Vision ou pdf-parse + parsing structuré | 1 session |
| **Planning global multi-commandes** | V1 = 1 planning par commande. V2 = vue Gantt qui empile N commandes du jour sur les 2 machines avec vrai OTIF inter-commandes (regroupement bordeaux ensemble cross-commandes) | 2-3 sessions |
| **Drag-and-drop manuel des slots** | V1 = allocation auto seulement. V2 = repositionnement manuel à la souris (react-dnd) | 1-2 sessions |
| **Export PDF bons d'atelier** | Imprimer la fiche article + plan d'aiguille pour Felismina/Adriana | 1 session |
| **Import en masse des FT YPM** | V1 = 1 FT (YPM-001-K). V2 = parser auto les exports Tajima Pulse PDF → enrichit `fiches_techniques_ypm.json` | 1 session |
| **Mode "broderie en cours"** | Statut intermédiaire avec timer live + alerte Felismina si dépassement | 1 session |
| **Notifications statut** (Slack/email) | Quand une commande passe en "expediee" notifier le client + Sarah | 1 session |
| **Webhook Shopify** | Création auto de la commande dans le Hub dès qu'une commande Shopify est payée | 2 sessions |

### 9.15 Citations Sarah à graver (sessions 21-22/05)

> *"voici le bon de préparation de shopify. J'aimerais pouvoir les intégrer dans l'atelier de production avec la référence motif, couleur de fils et faire un planning de flow production sur 3 jours pour optimiser l'utilisation des deux machines à broder"* (cadrage initial 21/05)

> *"650 points à la minute en moyenne. Câlin doit faire 5 min de broderie, Club 8 min max. On doit aussi prendre en compte un temps de préparation du fichier DST. au moins 5 minutes par motifs à programmer sur le planning de prod."* (recalibrage atelier 22/05)

> *"je veux pouvoir noter DST par Adriana le 20/05. Broderie par Felismina le 22/05. Expedition par Rebecca le 23/05. Archive le 23/05"* (cadrage journal 22/05)

> *"je veux pouvoir desarchiver la commande et la remettre en prod rapidement"* (cadrage UX désarchivage 22/05)

> *"calculer automatiquement ma production à 800 points minute avec la génération d'un planning de prod par OTIF : on time in full, premier arrivé premier servi avec l'optimisation des machines"* (cadrage algo OTIF 22/05)

> *"Si 10 modèles multicolores sur la journée, optimiser les changements de couleurs, de fils, et de palettes pour broder au plus vite"* (vision V2 planning global multi-commandes 22/05)

> *"Je veux aussi une option : rebroder pour rebroder un article qui presente un defaut"* (cadrage feature rework 22/05)

> *"Je veux aussi la date du CQ contrôle qualité après broderie"* (cadrage 4e étape journal 22/05)

> *"dans mon search, je dois pouvoir retrouver mes commandes archivées"* (cadrage search étendue 22/05)

### 9.16 Inventaire fichiers livrés (sessions 21-22/05)

**Référentiels** (`referentiels/`)
- `shopify_sku_mapping.json` — pivot SKU ↔ YPM ↔ fils
- `durees_broderie.json` v1.2 — vitesse, types broderie, prep DST, capacité atelier
- `fiches_techniques_ypm.json` — FT Tajima Pulse par variante (1 entrée : YPM-001-K)
- `commandes/_schema.md` — doc schéma
- `commandes/1002.json` — commande de test enrichie (3 articles, 86 min total, journal complet 4 étapes, archivée 23/05)

**Code** (`apps/atelier-social/src/`)
- `lib/production/commandes-loader.ts` — types + CRUD JSON + helper recalcul
- `lib/production/planning-allocator.ts` — algos LPT + OTIF
- `app/api/production/commandes/route.ts` — GET liste / POST création
- `app/api/production/commandes/[id]/route.ts` — GET / PATCH
- `app/api/production/commandes/[id]/planning/route.ts` — POST génération / DELETE reset
- `app/api/production/commandes/[id]/rebroder/route.ts` — POST création commande rework
- `app/api/search/route.ts` — bucket commandes ajouté
- `app/atelier-production/commandes/page.tsx` — liste avec toggle archives
- `app/atelier-production/commandes/[id]/page.tsx` — fiche + journal + Gantt + modal rebroder
- `app/atelier-production/page.tsx` — card Commandes Shopify ajoutée
- `app/search/page.tsx` — section Commandes Shopify ajoutée

**Mémoire feedback** (`~/.claude/projects/.../memory/`)
- `project_atelier_prod_params.md` — 800 pts/min, prep DST, journal 4 étapes, algos OTIF/LPT, mécanique rebroder, désarchivage intelligent

---

## 10. SESSION HANDOFF — 22 MAI 2026 (préparation passation Keyvan)

### 10.1 Objectif de la session

Pas une session de code feature. Une session **handoff** pour préparer la transmission du projet :
- À Keyvan (hébergement, auth, mise en sécurité)
- À toute personne arrivant sur le repo sans contexte

### 10.2 Livrables docs

| Fichier | Rôle | État |
|---|---|---|
| `README.md` | Réécrit — entrée du repo, démarrage rapide, inventaire des 7 apps | ✅ |
| `docs/ARCHITECTURE.md` | Carte des apps + mapping 14 métiers + dataflows + Supabase schema | ✅ |
| `docs/HANDOFF_KEYVAN.md` | Hébergement + auth + matrice de droits (admin Sarah / opérationnel atelier) + checklist sécurité | ✅ |
| `docs/TESTS_STATUS.md` | App par app — ce qui est testé manuellement vs pas testé | ✅ |
| `docs/PROCHAINE_SESSION.md` | Incohérences (dossier mediateque vide, double route motifs, etc.) + questions ouvertes + TODOs V2 | ✅ |
| `apps/*/.env.local.example` + `.env.example` | Mis à jour avec TOUTES les vars utilisées | ✅ |
| `prod_hub/requirements.txt` | Créé — streamlit + matplotlib | ✅ |

### 10.3 Décisions de cette session

- **Auth = documentation uniquement** pour Keyvan. Pas d'implémentation NextAuth ni de stub middleware. Keyvan choisira sa stack (recommandation : Supabase Auth).
- **Hébergement = ouvert**. Recommandation Vercel pour les Next.js, oauth2-proxy pour Streamlit.
- **Matrice de droits** verrouillée : Sarah admin full, opérationnel atelier peut DÉPOSER des DST mais pas SUPPRIMER ni REMPLACER. Toute modification destructive = Sarah seule.
- **Storage assets** : recommandation migration vers Supabase Storage avec buckets par type (canoniques / motifs-png / motifs-dst / motifs-pxf / motifs-ft / referentiel-ambiance).
- **Rotation clés** : à faire AVANT premier déploiement public. Keys actuelles dans `.env.local` valides pour Sarah locale uniquement.

### 10.4 Incohérences identifiées (à trancher en prochaine session)

1. `apps/atelier-mediateque/` est un dossier vide alors que l'implémentation est dans `atelier-social` → décider : supprimer ou migrer
2. `apps/atelier-incarnation/` contient uniquement de la doc (XLSX + SQL + Liquid + SPEC) → Sprint 1 MVP à implémenter dans `atelier-social/atelier-da/incarnations/`
3. `referentiels/palette_fils_broderie.json` (v1) coexiste avec `_v2.json` → auditer les imports v1, migrer, supprimer v1
4. Double route `/atelier-da/motifs` (catalogue créatif) et `/atelier-production/motifs` (vue technique) → vérifier pas de logique dupliquée
5. Inventaire canoniques : CLAUDE.md mentionne 23, le tableau §4 n'en liste que 21 → recompter dans `referentiels/casting/`

### 10.5 Question critique non tranchée

Les **assets binaires** (`.DST`, `.PXF`, `.pdf` fiches techniques, PNG aperçus) — ~200-400 MB — sont-ils versionnés sur git ? Aujourd'hui ils traînent en `??` dans `git status` (212 fichiers). Recommandation Claude : **non**, gérer via Git LFS ou directement Supabase Storage. À discuter avec Keyvan AVANT premier push sur remote partagé.

### 10.6 Commits thématiques effectués

1. **docs(handoff)** : README + docs/ARCHITECTURE + HANDOFF_KEYVAN + TESTS_STATUS + PROCHAINE_SESSION + CLAUDE.md §10
2. **chore(env)** : mise à jour `.env.example` de toutes les apps + `prod_hub/requirements.txt`
3. **(reste du code en cours)** — à grouper par module en prochaines sessions (cf. PROCHAINE_SESSION §3)

### 10.7 Citations Sarah à graver (22/05 handoff)

> *"On commit tout ce qui traine. On rédige un nouveau read me. On controle en .env.example et on les complète si necessaire. On rédige les requirements.txt"* (cadrage handoff)

> *"On documente le besoin de fournir des accès admin à Sarah, un accès opérationnel aux métiers avec la possibilité de déposer des .DST dans le hub mais pas de supprimer, d'ajouter ou de remplacer des documents"* (matrice de droits)

> *"On documente et on explique pour keyvan le besoin d'heberger proprement pour tous les différentes app selon l'atelier metier"* (cadrage handoff Keyvan)

> *"Expliquer spécifiquement ce qui a été testé vs non testé"* (honnêteté handoff)
