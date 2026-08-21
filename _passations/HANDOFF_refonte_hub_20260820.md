# Handoff — Refonte Hub Ypersoa (reste à faire)

> Contexte : refonte nav + accueil du Hub lancée le 20/08/2026 suite à l'audit
> du 18/08. Ce qui suit est **fait et vérifié** (type-check clean, routes
> smoke-testées) : nouveau chrome (`_passations/DESIGN_SYSTEM_hub.md` v2),
> accueil personnalisé (`app/page.tsx`), sidebar libellée (`HubSidebar.tsx`),
> fusions **Planning** (`/planning`, kanban + rétroplanning), **Bibliothèque**
> (`/bibliotheque`, médiathèque + packs sociaux + articles), **Studio**
> (`/studio`, shooting + lookbook + shooting book + studio mood), **Blog**
> promu en atelier top-level (`/blog`), nouvel atelier **Référentiel**
> (`/referentiel`, motifs + produits). Toutes les anciennes routes redirigent.
> Table Supabase `geo_articles` créée (persistance des brouillons de blog,
> avant en mémoire pure → perdue à chaque redéploiement).

Ci-dessous, ce qui reste, par ordre de priorité décroissante.

---

## 1. Auto-feed médiathèque (Phase 5 du plan initial)

Chaque image sauvegardée (pas générée en brouillon — seulement au moment de
la **sauvegarde**, sinon la médiathèque se remplit de rejets) doit pousser
une ligne dans `mediatheque_media` (table Supabase, schéma dans
`apps/atelier-social/src/lib/mediatheque/store.ts::createMedia()`).

- **Social** : hook dans le flux de sauvegarde de pack
  (`apps/atelier-social/src/components/SavePackDialog.tsx` /
  `apps/atelier-social/src/lib/social-packs.ts`), après succès → `createMedia()`
  pour chaque `image_url`, `source: "ia_generation"`, `statut: "a_valider"`.
- **Atelier Shooting** : étendre
  `apps/atelier-shooting/lib/catalog-shots.ts::addShotToCatalog()` pour
  insérer aussi une ligne miroir dans `mediatheque_media`, via le **même**
  client Supabase déjà configuré dans cette app (pas de nouvelle route
  serveur — RLS déjà ouverte, vérifiée `v1_anon_full_access_mediatheque_media`).
  `source: "shooting_studio"` ou `"packshot"` selon le shot.
- **Studio Mood** : hook au moment où le visuel choisi d'un épisode est
  persisté — chercher dans `apps/atelier-social/src/app/api/studio-mood/[id]/route.ts`
  (PATCH) le point où l'image finale est enregistrée sur l'épisode.
  `source: "ia_generation"`.

Avant de coder l'insert direct côté `atelier-shooting`, vérifier une fois de
plus les policies RLS de `mediatheque_media` (`get_advisors` / `list_tables`
côté Supabase MCP) — elles étaient bien ouvertes au 20/08/2026 mais à
reconfirmer.

## 2. Rituel "L'article du jeudi" (Phase 6 du plan initial)

`/bibliotheque/articles` n'est qu'une **liste simple**. Ce qui manque pour
matcher la maquette `atelier-blog-relook.html` (fournie par Sarah) sur `/blog` :
- Bandeau "brouillon de la semaine" avec jauge de mots (cible 700-1100),
  actions Étoffer / Régénérer / Relire et pousser.
- Bandeau "Cette semaine" (sujet, objectif éditorial, questions couvertes).
- Bande "Les jeudis tenus" (historique).
- Tout doit lire/écrire `geo_articles` (déjà persisté, cf.
  `apps/atelier-social/src/lib/blog/article-store.ts`) — pas le store mémoire.

**Décision explicite prise avec Sarah** : le cron d'auto-écriture le mercredi
soir (déclenchement automatique de `/api/blog/generate`) est **hors scope**
pour l'instant. Flux manuel d'abord, cron dans une session dédiée une fois
validé — ne pas l'ajouter sans reconfirmer avec elle.

## 3. Pont "Envoyer vers Social" depuis Shooting/Shooting Book

Décision de Sarah (20/08) : **après** avoir tranché le doublon Shooting
Book / Atelier Shooting. Ce doublon a été tranché "on les garde séparés mais
on clarifie leur rôle" (fait — descriptions distinctes dans
`apps/atelier-social/src/app/studio/layout.tsx`) — donc le pont est
maintenant déblocable si Sarah le souhaite.

Pattern à réutiliser : le pont existant Shooting Book → Planable
(`sendToPlanable` dans `apps/atelier-social/src/app/studio/shooting-book/page.tsx`,
attache une image via `POST {planable_url}/api/calendar/{id}/attach-image`).
Un shot depuis Shooting/Shooting Book doit pouvoir devenir la
`source_shot_id` d'un `social_pack` (le champ existe déjà côté schéma,
`social_packs.source_shot_id → liked_shots.id`) — vérifier si le pont doit
passer par `liked_shots` (déjà le cas pour Atelier Shooting) ou un nouveau
mécanisme pour Shooting Book.

## 4. Dette visuelle — Bibliothèque · Packs sociaux

`apps/atelier-social/src/components/LibraryPacksPanel.tsx` (et son
sous-composant `PackDetail`) gardent encore les anciennes classes Tailwind
codées en dur (`rose-500`, `slate-*`) au lieu des tokens `--hub-*` /
`--hub-accent`. Fonctionnel mais visuellement à part du reste du Hub
réchauffé. À réharmoniser (remplacer les classes Tailwind par des styles
inline sur les tokens, comme le reste du chrome v2).

## 5. Vérifier l'état de `_passations/DESIGN_SYSTEM_hub.md` vs le code

Des retouches ont été faites en live sur `HubSidebarItem.tsx`, `HubTopbar.tsx`
et `globals.css` (probablement par Sarah directement, pendant la session)
avec un commentaire citant *"DESIGN_SYSTEM_hub.md v2, §3 nav active — un des
5 emplacements coquelicot autorisés"* — **cette section §3 n'existe pas
dans le doc actuel**. Il faut soit écrire cette règle "5 emplacements
coquelicot" dans `DESIGN_SYSTEM_hub.md` (si Sarah l'a définie ailleurs),
soit clarifier avec elle ce qu'elle voulait dire, pour que le doc reste la
source de vérité fidèle au code.

## 6. Impact rôles à reconfirmer avec Sarah

Le gating de rôle (`apps/atelier-social/src/lib/access.ts::sectionForPath`)
fait maintenant vivre `/planning`, `/bibliotheque`, `/studio`, `/blog`,
`/referentiel` dans la section `"atelier-da"` (admin + crea uniquement).
Avant la fusion, **Kanban contenu** (`/social/kanban`) et la **bibliothèque
des packs** étaient accessibles à tous les rôles (section `"dashboard"`,
via `/social`). Le rôle `prod` (Adriana) a donc perdu l'accès direct à ces
deux-là dans la nouvelle nav — acceptable vu l'usage réel quasi nul
(cf. audit), mais à faire confirmer explicitement par Sarah plutôt que de le
laisser comme un effet de bord silencieux.

## 7. Non-régressions à surveiller (déjà vérifiées une fois, à re-tester après tes changements)

- `pnpm --filter @ypersoa/atelier-social type-check` doit rester clean.
- `pnpm dev:studio` (nouveau script racine) doit lancer les 3 apps
  (Social:3000, Shooting:3001, Lookbook:3003) ensemble.
- Toutes les anciennes URLs doivent continuer à rediriger (liste dans
  `git log` du 20/08, chercher les fichiers `redirect(...)` sous `app/atelier-da/*`,
  `app/social/kanban`, `app/shooting`, `app/lookbook`).
