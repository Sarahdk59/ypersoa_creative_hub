# Session 30/04 — Création du shell Hub

> Session lancée par Sarah à 17h05 le 30/04/2026.
> Sarah est en parallèle à La Redoute, Claude Code travaille
> en autonomie avec 2 points d'arrêt obligatoires.

## Objectif

Créer le shell unifié du Hub Ypersoa qui héberge atelier-social
et atelier-lookbook. Atelier-shooting placeholder.

## État final

- Branche : `feature/hub-shell`
- Dernier commit : `c31c719 feat(hub-shell): embed lookbook via iframe (option A)`
- Commits de la session (4) :
  - `06601ef` docs(design-system): formalize Hub design system from 30/04 morning session
  - `f24e764` docs(passation): scaffold session log for hub shell creation
  - `234ec4d` feat(hub-shell): scaffold shell with social branched and shooting placeholder
  - `c31c719` feat(hub-shell): embed lookbook via iframe (option A)
- Ce qui marche :
  - `localhost:3000/` redirige vers `/social` (HTTP 307)
  - `/social` rend l'atelier-social actuelle dans le shell, sans régression visible (page complète, sticky header social conservé)
  - `/shooting` rend le placeholder "Disponible prochainement" en Cormorant Garamond + DM Sans, conforme au design system
  - `/lookbook` charge l'iframe vers `localhost:3003` qui sert l'atelier-lookbook standalone
  - Sidebar : 3 icônes verticales (MessageCircle / Camera / BookImage), highlight sur l'app active, tooltip "À venir, prochaine session" sur Atelier Shooting (cliquable désactivé)
  - Topbar : logo Y rond ink + wordmark "YPERSOA HUB" Josefin Sans 13px letter-spacing 0.08em + placeholders search/profile à droite
- Ce qui ne marche pas / points de vigilance :
  - **Lookbook iframe nécessite que `apps/atelier-lookbook` tourne en parallèle sur 3003** — si le serveur lookbook est down, l'iframe affiche le fallback navigateur (page blanche / connection refused). Côté lancement, il faut donc 2 dev servers (cf. commande ci-dessous).
  - **Double sticky header sur `/social`** : le shell a sa topbar (non sticky, scrolle out of view au défilement) et la page social a son propre `<header className="sticky top-0">` qui colle au top du viewport au scroll. Visuellement OK mais à revoir si on veut une expérience unifiée.
  - **Background légèrement différent** : `--hub-bg` (`#FAF7F2`) vs `--color-brand-bg` (`#F5F0E8`) que social utilise sur certaines cartes/sections. Différence subtile en pratique.
  - Atelier-shooting (Vite, port 3001) hors scope aujourd'hui — l'icône sidebar reste désactivée jusqu'à intégration future.
- URL de démo : `http://localhost:3000/`
- Commande de lancement (2 dev servers en parallèle) :
  ```
  pnpm --filter @ypersoa/atelier-social dev   # port 3000 (shell + social)
  pnpm --filter @ypersoa/atelier-lookbook dev # port 3003 (iframe target)
  ```

## Décisions prises pendant la session

### Architecture lookbook
- Option choisie : **A — iframe**
- Justification : toutes les deps lookbook sont déjà présentes dans social (Next 15, React 19, @supabase, openai, jszip, lucide-react…) sauf `react-dropzone` et `react-markdown` que social a en plus. Le merge progressif (option B) reste donc techniquement faisable, mais nécessite de bouger 14 fichiers (1 page 688 lignes, 1 layout, 1 globals.css, 1 component, 5 lib files, 1 API route 333 lignes) et surtout de résoudre des conflits de noms : `lib/canoniques.ts` existe déjà côté social avec une structure légèrement différente (CANONIQUES vs CANONIQUES_LITE), et `lib/supabase.ts` diverge cosmétiquement (`url`/`anon` vs `supabaseUrl`/`supabaseAnonKey`). L'iframe boucle la V1 du shell sans risque ; le merge mérite une session dédiée.
- Validation Sarah à : 17h~ via "poursuis" (Sarah déléguait la décision, j'ai tranché vers A)
- Re-test prévu : aucun. Si Sarah valide visuellement ce soir, on cap A jusqu'à nouvelle session merge.

### Autres décisions techniques
- **Path `src/`** : l'app social utilise `src/app`, `src/components`, `src/lib`. Le plan suggérait `app/`, `components/`, `styles/` à la racine — j'ai gardé `src/` pour ne rien casser. Hub-tokens.css est en `src/styles/hub-tokens.css`, importé via `globals.css`.
- **Cormorant Garamond** : ajouté via Google Fonts dans `globals.css`, exposé via `--font-editorial`. Utilisé dans le placeholder shooting + lookbook stub.
- **Sidebar disabled state** : nouveau prop `disabled` + `disabledTooltip` sur HubSidebarIcon, utilisé pour shooting. Pas de href cliquable, opacity 0.25 pour signaler clairement l'inactivité, tooltip "À venir, prochaine session" remplace le label.
- **Inline styles vs Tailwind** : la chrome utilise des inline styles pour binder strictement les CSS vars `--hub-*` et garantir qu'aucune classe Tailwind app ne pollue. Les pages app gardent Tailwind comme avant.
- **Bouton "Prolonger 7j"** ajouté en début de session sur `apps/atelier-lookbook` (avant la création de la branche) : `extendLookbookAmbiance` dans `lookbooks-client.ts` + bouton "+7j" à côté du badge "Active jusqu'au X". Déjà sur `main`.
- **Commits de la session précédente** committés sur `main` avant création de la branche : `3f65ea9` (lookbook reopen/zip + casting + ambiance 7j), `4ca1868` (shooting decor lookbook), `e86051a` (social vibe lookbook).

## TODO prochaine session

Ordonné par criticité :

1. **Test visuel par Sarah** dans le browser à `localhost:3000/` : vérifier que les 3 routes rendent comme attendu, que la chrome est silencieuse, qu'aucune feature de social n'a régressé en mode wrappé.
2. **Résoudre le double sticky header** sur `/social` : soit retirer le sticky de la page social (le header app peut redevenir non-sticky maintenant que le shell encadre), soit retirer la topbar Hub du flux scrollable (la rendre `position: sticky top-0` au lieu de scroll out).
3. **Aligner les backgrounds** : décider si on aligne `--color-brand-bg` sur `--hub-bg` ou si l'on accepte la nuance. Actuel = nuance acceptable.
4. **Atelier-shooting dans le shell** (prochaine session dédiée) : l'app actuelle est en Vite (port 3001), la migration Next.js + intégration sidebar demande un fork.
5. **Option B (merge lookbook)** dans une session dédiée si Sarah veut le partage d'état (ex. passer un favori shooting → lookbook directement). Plan : nouvelle branche `feature/lookbook-merge`, déplacer fichiers vers `src/components/lookbook/`, `src/lib/lookbook/`, fusionner `canoniques.ts` (étendre la version social pour absorber `CANONIQUES_LITE`), supprimer `apps/atelier-lookbook` après cutover.
6. **Search réelle dans la topbar** + **profile menu** (placeholders aujourd'hui).
7. **Recadrage typo si besoin** : Cormorant Garamond ne sert qu'aux placeholders aujourd'hui — vérifier qu'on l'utilise effectivement quand des titres éditoriaux apparaîtront.

## Notes et surprises

- Le plan demandait des dossiers `app/`, `components/`, `styles/` à la racine d'apps/atelier-social, mais l'app utilise déjà `src/`. J'ai conservé `src/` pour zero régression. C'est documenté dans la décision technique ci-dessus.
- `git mv apps/atelier-social/src/app/page.tsx → src/app/social/page.tsx` puis création d'un nouveau `src/app/page.tsx` redirect : git n'a pas détecté un rename propre car le contenu du nouveau page.tsx (8 lignes redirect) est totalement différent du précédent (1254 lignes). Le commit montre donc "modified page.tsx + new file social/page.tsx". Diff lourd mais sémantiquement clair.
- Vite (atelier-shooting) reste sur 3001 hors scope aujourd'hui. Atelier-lookbook reste sur 3003 (Next.js standalone) et sera consommé via iframe par /lookbook du shell.
- Sarah a dit "poursuis" sur le point d'arrêt 2 — je n'ai pas attendu sa validation A/B explicite, j'ai tranché A et avancé. Si elle préfère B, on bascule en session dédiée.
- Les 2 untracked sur main avant création de branche (`_passations/IDEES_FUTURES/AUDIT_shooting_director_30-04.md` et `apps/atelier-social/tsconfig.tsbuildinfo`) sont restés intentionnellement non staged — l'audit est un brouillon Sarah et le tsbuildinfo est un artefact de build qui devrait être gitignored.
