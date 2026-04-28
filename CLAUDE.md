# CLAUDE.md — Sessions 28-29 avril 2026

**Mise à jour majeure** post sessions cumulées Hub Phase 2 atelier-social + naissance Clémence canonique signature.

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
| MAN-P11 | Léa & Sarah | Couple — Léa 37 métisse cheveux bouclés courts + Sarah 35 nordique blonde cendrée androgyne (DUO_LEA_SARAH) |
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
