# TODO_INTEGRATION — Planable Ypersoa

Ce qui reste à brancher / à décider après la V1.0.

---

## V1.1 — Intégration atelier-social (`/api/generate`)

**Aujourd'hui** : `POST /api/calendar/[id]/generate-pack` est mocké. Il crée un pack avec slides factices (placeholder image), caption hardcodée "MOCK V1.0", `casting_ids = ['MAN-P06']` quel que soit le contexte.

**À faire côté `apps/atelier-social/`** :
1. Exposer un endpoint `POST /api/generate` qui accepte :
   ```ts
   {
     motif_code: string;        // YPM-XXX
     platform: 'instagram_post' | 'instagram_reel' | 'instagram_story' | 'pinterest_pin';
     format: '1:1' | '4:5' | '9:16' | '2:3';
     ambiance_id: number;       // 1-6
     casting_ids: string[];     // ['MAN-P06', 'MAN-P09']
     with_overlay: boolean;     // Insta post : true ; reel/story : false
     occasion_slug?: string;    // pour récupérer hooks éditoriaux + hashtags brand
   }
   ```
2. Réponse attendue :
   ```ts
   {
     ok: true;
     data: {
       slides: { index: number; angle: string; image_url: string; overlay_text: string | null }[];
       caption: string;
       hashtags: string[];
       brand_safety_status: 'ok' | 'warning' | 'critical';
       brand_safety_issues: { rule: string; matched: string }[] | null;
     }
   }
   ```
3. Authentification : header `x-internal-token: $INTERNAL_API_TOKEN` (env partagé).

**À faire côté Planable (V1.1)** :
- Remplacer le mock par un fetch vers `process.env.ATELIER_SOCIAL_URL/api/generate`.
- Mapper `occasion_slug` → `casting_ids` via la table `planable_occasions.recommended_*`.
- Si `brand_safety_status === 'critical'` → bloquer la publication (pas insertion en DB d'un pack invalide ? À trancher).

---

## V1.2 — Intégration Meta Graph API (publication Insta)

**À faire** :
1. Setup Meta App + Instagram Business Account (Sarah doit valider via Meta Business Suite).
2. Long-lived token 60j → stocker dans `META_LONG_LIVED_TOKEN`.
3. Implémenter `lib/meta/graph-client.ts` :
   - Wrapper `fetch` avec auto `appsecret_proof`
   - Retry sur 429
   - Logging dev mode
4. Implémenter `lib/meta/publish.ts` :
   - `publishCarousel(pack)` : containers children → container CAROUSEL → media_publish → fetch permalink
   - `publishReel(pack)` : `media_type: 'REELS'` + `video_url` (TODO : où stocker la vidéo ? Storage Supabase ?)
   - `publishStory(pack)` : `media_type: 'STORIES'`
5. Endpoint `POST /api/calendar/[id]/publish` :
   - Récupère entry + pack
   - Appelle bonne fonction publish selon platform
   - Update entry : `status = 'published'`, `meta_media_id`, `meta_permalink`
   - Insère row vide dans `planable_post_metrics` pour refresh ultérieur
6. UI bouton "Publier" actif quand brand_safety = ok, désactivé sinon.

**Token Meta expiré (401)** : à gérer comme banner global dans `app/page.tsx`.

---

## V1.3 — Pinterest API publication

**À faire** :
1. Pinterest Business v5 API setup.
2. Env var `PINTEREST_ACCESS_TOKEN`.
3. `lib/pinterest/client.ts` : wrapper similaire à Meta.
4. `lib/pinterest/publish.ts` : `POST /pins` avec `board_id`, `media_source`, `title`, `description`, `link`.
5. Intégrer dans la même route `/api/calendar/[id]/publish` qui dispatche selon platform.

---

## V1.4 — Métriques performance

**À faire** :
1. Endpoint `GET /api/metrics/[postId]` : appelle `/{ig-media-id}/insights?metric=likes,comments,saves,shares,reach,impressions`. Insert dans `planable_post_metrics`.
2. Endpoint `POST /api/metrics/refresh-all` : itère sur entries publiées dans les 30j, refresh metrics.
3. UI badge `MetricsBadge.tsx` dans EntryDetailPanel.
4. (V1.5) Cron Supabase Edge Function quotidien 6h Europe/Paris pour auto-refresh.

---

## V1.5 — UX qualité de vie

- **Drag & drop** d'une entrée sur un autre jour (V1.0 → click Edit dans Detail panel pour reprogrammer)
- **Vue semaine** : 7 cols × créneaux (matin 9h, midi 12h, soir 19h)
- **Shadow slots** : créneaux suggérés grisés (lun 19h, mar 12h, mer 9h, jeu 19h, ven 19h, sam 11h) → click crée entrée pré-remplie
- **Édition d'une entrée existante** : ouvrir EntryDialog en mode édition (aujourd'hui : seulement création)
- **Édition de la caption** dans EntryDetailPanel (aujourd'hui : caption immuable issue du pack)
- **Hooks éditoriaux** par occasion dans EntryDialog (cf. brief annexe B)

---

## Décisions ouvertes (V2 / à débattre avec Sarah)

### 1. Brand safety partagé `@ypersoa/shared` ou import relatif ?
V1.0 : pas implémenté (mock retourne toujours `ok`). Quand on branche atelier-social en V1.1, atelier-social fait déjà tourner `checkBrandSafety()` côté lui — Planable n'a qu'à lire `brand_safety_status`. Pas besoin de package partagé pour l'instant. Si Sarah édite la caption depuis Planable, il faudra re-vérifier → soit dupliquer la fonction, soit créer `@ypersoa/shared/brand-safety`. **Recommandation par défaut** : import relatif `../../atelier-social/src/lib/brand-rules` (atelier-social l'expose déjà), créer le package quand le 3e consommateur arrive.

### 2. Auth multi-user
V1 = Sarah seule (RLS ouvert). V2 = Mai (assistante) doit aussi pouvoir éditer → activer Supabase Auth + scope par `created_by`. Pas urgent.

### 3. Format vidéo Reels
V1.2 publication Reels nécessite hébergement vidéo. Options :
- Supabase Storage (bucket `planable-reels`)
- atelier-social génère + stocke vidéo
- Manuel : Sarah upload via UI dédiée

Pas tranché.

### 4. Programmation différée
V1 = "publier maintenant" only. V2 = scheduler queue (Supabase Edge Function cron toutes les 5 min qui scan entries `status='scheduled'` avec `scheduled_at <= now()`). Trivial techniquement, mais nécessite de bien gérer les erreurs (token expiré au moment du publish, etc.).

### 5. Vue analytics
Pas de vue agrégée des perfs en V1. V2 = dashboard avec graphes par motif / occasion / casting (quel canonique génère le plus d'engagement ? quelle ambiance convertit le mieux ?). Source de vérité = `planable_post_metrics`.

### 6. Notifications push
V1 = bandeaux dans l'app uniquement. V2 = optionnel (web push pour deadline J-3 / token expiré / pub publiée OK).

---

## Coquilles dans le prompt source à acter

- Ligne du commit message dupliquée (FdP 2026 deadline 17/06 vs 11/06) → **11/06** est la bonne (cf. brief seed + special-campaigns).
- Pas de FETE_DES_MERES_2026_BRIEF (campagne hors Planable cycle 2026, occasion masquée via `auto_campaign_disabled_year`).
