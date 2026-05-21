# Handoff Keyvan — Hébergement, authentification, accès

> Document destiné à Keyvan pour la phase d'hébergement et de mise en sécurité.
> Sarah reste référente produit / DA. Cette doc cadre **quoi** doit être fait, pas **comment** (Keyvan choisit sa stack tech).

---

## 1. Ce que le Hub fait (vue 30 secondes)

Cf. [README.md](../README.md) et [ARCHITECTURE.md](ARCHITECTURE.md).

En 1 phrase : **un monorepo de 5 apps web + 1 app Streamlit Python qui automatise les 14 métiers de la communication d'Ypersoa**, branché sur un Supabase partagé et des référentiels métier en JSON sur le filesystem.

---

## 2. Public cible et besoins d'accès

### 2.1 Profils utilisateurs

| Profil | Personne(s) | Type d'accès | Apps concernées |
|---|---|---|---|
| **Admin / DA** | Sarah (innovation@ypersoa.fr) | Full — CRUD complet, configuration, archivage, suppression | Toutes |
| **Atelier production broderie** | Adriana (DST + CQ), Felismina (broderie), Rebecca (expédition) | Opérationnel — lecture + transitions de journal + dépôt DST uniquement | atelier-social `/atelier-production`, prod_hub (Streamlit) |
| **Direction de shooting** | Maï | Opérationnel — création/édition shooting, validation visuelle | atelier-shooting, atelier-lookbook, atelier-social `/atelier-da` (lecture) |
| **Transverse** | Cyrielle, Thierry | Lecture étendue (kanban, calendrier) | Selon besoin |
| **Anonyme / public** | — | Aucun | Aucune — toutes les apps sont internes |

### 2.2 Règle d'or sur les documents

> **Les utilisateurs opérationnels peuvent DÉPOSER des `.DST` (et autres assets) dans le Hub, mais ne peuvent ni les SUPPRIMER, ni les REMPLACER, ni les ÉCRASER.**

Concrètement :
- Adriana upload `YPM-018-Nouveau.DST` dans `assets/motifs dst/` ou via UI → OK
- Adriana clique sur un DST existant pour le remplacer ou supprimer → **interdit**
- Seule Sarah (admin) peut supprimer / remplacer / archiver un fichier

C'est une règle d'**immutabilité par défaut** côté opérationnel. Implications techniques :
- Storage append-only (versioning automatique côté Supabase Storage si possible)
- Les URL d'assets doivent être stables (les hash en query string OK, le path fixe)
- UI : pas de bouton "supprimer" / "remplacer" sur les rôles opérationnels
- Backend : RLS / policy qui refuse `DELETE` et `UPDATE` sur les buckets et tables d'assets pour rôle ≠ admin

### 2.3 Matrice de droits (cible V2)

| Action | Admin (Sarah) | Opérationnel atelier | Direction shooting | Anonyme |
|---|---|---|---|---|
| Lire référentiels (motifs, fils, canoniques, ambiances) | ✅ | ✅ | ✅ | ❌ |
| Lire commandes Shopify | ✅ | ✅ (les siennes + équipe) | ❌ | ❌ |
| Créer une commande | ✅ | ❌ (auto via Shopify) | ❌ | ❌ |
| Générer planning OTIF/LPT | ✅ | ✅ | ❌ | ❌ |
| Marquer journal (DST, broderie, CQ, expé) | ✅ | ✅ (son rôle uniquement) | ❌ | ❌ |
| Archiver une commande | ✅ | ❌ | ❌ | ❌ |
| Désarchiver | ✅ | ❌ | ❌ | ❌ |
| Upload DST / PXF / PDF FT | ✅ | ✅ (append-only) | ❌ | ❌ |
| Supprimer / remplacer un asset | ✅ | ❌ | ❌ | ❌ |
| Générer pack social (Insta / Pinterest) | ✅ | ❌ | ✅ | ❌ |
| Créer / modifier un canonique mannequin | ✅ | ❌ | ✅ (suggestion) | ❌ |
| Modifier la charte éditoriale | ✅ | ❌ | ❌ | ❌ |
| Accéder Streamlit prod_hub | ✅ | ✅ | ❌ | ❌ |
| Accéder pages admin (config Supabase, etc.) | ✅ | ❌ | ❌ | ❌ |

---

## 3. État actuel de l'authentification

> **Aucune** authentification n'est implémentée à ce jour.

- Pas de pages login / signup
- Pas de session / cookie d'auth
- Pas de protection des routes API (52 routes dans atelier-social, toutes accessibles sans token)
- Le seul `middleware.ts` existant ([apps/atelier-social/src/middleware.ts](../apps/atelier-social/src/middleware.ts)) ne fait que du CORS `Access-Control-Allow-Origin: *`
- RLS Supabase = ouvert (Sarah seule user V1)
- `.env.local` contient les clés OpenAI / Gemini / Supabase en clair

**Conséquence : ces apps ne peuvent PAS être publiées sur un domaine public en l'état.**

---

## 4. Stratégie d'auth attendue

### 4.1 Choix de stack (Keyvan tranche)

Options recommandées par ordre de préférence :

1. **Supabase Auth** — le projet Supabase existe déjà, intégration native, RLS Postgres déclarative
2. **NextAuth.js (Auth.js)** — plus flexible (providers Google / Magic Link / etc.) mais demande de mapper sur la table `auth.users` Supabase
3. **Clerk** — payant, mais le plus rapide à déployer si pas de contrainte budget

Quelle que soit la stack, le **modèle de rôles** est imposé par la matrice §2.3 :
- `admin` (Sarah)
- `operateur_atelier` (Adriana, Felismina, Rebecca)
- `direction_shooting` (Maï)
- `transverse` (Cyrielle, Thierry — lecture étendue)

### 4.2 Implémentation minimale attendue

Pour chacune des 4 apps Next.js (`atelier-social`, `atelier-lookbook`, `atelier-shooting`, `planable-ypersoa`) :

1. **Page de login** (`/login`) — email + password (ou Magic Link)
2. **Middleware Next.js** qui redirige toute route non-auth vers `/login`, sauf `/login` et `/api/health`
3. **Helper `getCurrentUser()`** dans chaque route API qui retourne `{ user, role }` ou throw 401
4. **Helper `requireRole(role)`** dans chaque route mutante qui throw 403 si rôle insuffisant
5. **Cookie httpOnly Secure SameSite=Lax**, durée 30j, refresh sliding

Pour `atelier-shooting` (Vite) :
- Pas de middleware Next.js → utiliser un wrapper `<AuthGate>` React qui consume Supabase Auth côté client
- Les routes API qu'il appelle sur `atelier-social:3000` doivent vérifier le token JWT Supabase passé en header

Pour `prod_hub` (Streamlit) :
- Streamlit n'a pas d'auth native robuste
- Option 1 : déployer derrière un reverse proxy (nginx + basic auth ou OAuth proxy)
- Option 2 : embedder dans `atelier-social` via iframe avec token signé (plus complexe)
- Recommandé : option 1 (nginx + Supabase OAuth via `oauth2-proxy`)

### 4.3 RLS Supabase à mettre en place

```sql
-- Exemple cible pour la table planable_calendar_entries
ALTER TABLE planable_calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON planable_calendar_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "direction_shooting_read_write" ON planable_calendar_entries
  FOR SELECT, INSERT, UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('direction_shooting', 'admin')
    )
  );

-- Et ainsi de suite, pour chaque table, en respectant la matrice §2.3.
```

Table `user_roles` à créer :
```sql
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operateur_atelier', 'direction_shooting', 'transverse')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Hébergement attendu

### 5.1 Contraintes

- **Pas d'exposition publique sans auth** (cf. §3)
- **Tous les apps doivent être joignables depuis le même domaine racine** pour éviter les soucis CORS et cookie cross-domain (ex. `hub.ypersoa.fr` avec sous-chemins ou sous-domaines `*.hub.ypersoa.fr` partageant le cookie d'auth)
- **Storage versionné** pour les DST / PXF / PDF (cf. §2.2 immutabilité)
- **Backup quotidien** de la base Supabase + des assets

### 5.2 Reco de topologie

```
                              hub.ypersoa.fr
                              (reverse proxy nginx + auth)
                                    │
        ┌───────────┬───────────────┼───────────────┬───────────┐
        │           │               │               │           │
   /  hub     /shooting      /lookbook        /planable     /prod
   (3000)    (3001)          (3003)           (3002)       (8501)
   social    Vite            Next.js          Next.js     Streamlit
```

Alternative : sous-domaines `social.hub.ypersoa.fr`, `shooting.hub.ypersoa.fr`, etc. avec cookie `Domain=.hub.ypersoa.fr` pour le SSO.

### 5.3 Recommandations stack hébergement

Au choix de Keyvan. Pistes :
- **Vercel** pour les 4 apps Next.js (le plus naturel) + Cloudflare pour le routing
- **Railway / Render** pour Streamlit + apps Next.js homogènes
- **VPS Hetzner / Scaleway** + docker-compose si volonté de tout contrôler

Recommandation Sarah : ne pas se disperser, choisir UN provider et y mettre tout.

### 5.4 Variables d'environnement

Pour chaque app, les `.env.example` documentent les variables nécessaires :

- [apps/atelier-social/.env.example](../apps/atelier-social/.env.example)
- [apps/atelier-lookbook/.env.local.example](../apps/atelier-lookbook/.env.local.example)
- [apps/atelier-shooting/.env.local.example](../apps/atelier-shooting/.env.local.example)
- [apps/planable-ypersoa/.env.local.example](../apps/planable-ypersoa/.env.local.example)

À configurer en variables de l'hôte (pas de fichier `.env.local` en prod) :

| Variable | Sensible | Source |
|---|---|---|
| `OPENAI_API_KEY` | 🔒 | platform.openai.com |
| `GEMINI_API_KEY` | 🔒 | aistudio.google.com/apikey |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (RLS protège) | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒🔒 | Supabase dashboard — admin |
| `INTERNAL_API_TOKEN` | 🔒 | À générer (`openssl rand -hex 32`) |
| `META_LONG_LIVED_TOKEN` | 🔒 | Meta App dashboard (futur) |
| `PINTEREST_ACCESS_TOKEN` | 🔒 | Pinterest dev portal (futur) |

### 5.5 Rotation des clés

**Critique** : les `.env.local` actuels de Sarah contiennent les clés réelles. Avant tout déploiement public :

1. Rotater `OPENAI_API_KEY` (révoquer l'ancienne, en générer une nouvelle)
2. Rotater `GEMINI_API_KEY`
3. Rotater `SUPABASE_SERVICE_ROLE_KEY` (régénérer dans le dashboard)
4. Auditer les commits `git log -p --all` pour vérifier qu'aucune clé n'a fuité (le `.gitignore` protège mais double check)

---

## 6. Storage des assets binaires

### 6.1 Inventaire actuel

| Dossier | Contenu | Volume estimé | Usage |
|---|---|---|---|
| `assets/canoniques/` | 23 JPG canoniques mannequins | ~50 MB | Character ref Gemini |
| `assets/motifs/` | PNG aperçus des motifs YPM | ~200 MB | UI catalogue |
| `assets/motifs dst/` | DST Tajima (broderie machine) | ~5 MB | Production broderie (téléchargement Felismina) |
| `assets/motifs pxf/` | PXF Pulse (édition broderie) | ~10 MB | Production broderie (édition Sarah) |
| `assets/motifs ft/` | PDF fiches techniques Tajima | ~50 MB | Production broderie (consultation) |
| `assets/referentiel_ambiance/` | Moodboards ambiances | ~100 MB | Référence DA |

Total estimé : ~400 MB.

### 6.2 Migration vers Supabase Storage (recommandée)

Aujourd'hui : assets sur le FS local de Sarah, lus par les routes API Next.js. **Ne survivra pas à un déploiement multi-instance.**

Cible :
- Bucket `canoniques` (read public, write admin)
- Bucket `motifs-png` (read public, write admin)
- Bucket `motifs-dst` (read auth, write append-only operateur+, delete admin)
- Bucket `motifs-pxf` (read admin, write admin)
- Bucket `motifs-ft` (read auth, write admin)
- Bucket `referentiel-ambiance` (read admin+direction_shooting, write admin)

Le code actuel référence ces chemins via `assets/...` direct. **Refacto à prévoir** : remplacer par appels Supabase Storage (`supabase.storage.from('motifs-png').getPublicUrl(...)`).

### 6.3 Convention de nommage DST (immutabilité)

Conséquence de la règle §2.2 (append-only opérationnel) :
- Pas de remplacement → versioning dans le nom : `YPM-003-Club_Lucky.DST`, `YPM-003-Club_Lucky_v2.DST` si correction
- Le champ `variante_filename` dans `motifs_ypm.json` pointe vers la version courante (modifié par Sarah)

---

## 7. Sécurité — checklist déploiement

À cocher avant ouverture publique du domaine :

- [ ] Auth implémentée sur les 4 apps Next.js + Streamlit
- [ ] RLS Supabase activée sur toutes les tables (matrice §2.3 appliquée)
- [ ] Clés API rotées (cf. §5.5)
- [ ] Middleware CORS durci (plus de `*`, allowlist explicite des origins du Hub)
- [ ] `VITE_GEMINI_API_KEY` retiré du bundle client `atelier-shooting` (passer par proxy backend)
- [ ] HTTPS partout (certificats Let's Encrypt ou via provider)
- [ ] Cookies `httpOnly Secure SameSite=Lax`
- [ ] Headers de sécurité (`Strict-Transport-Security`, `Content-Security-Policy`, etc.)
- [ ] Rate limiting sur `/api/generate-image` et `/api/generate-copy` (anti-abus + protection crédits Gemini/OpenAI)
- [ ] Logs d'accès centralisés (qui a généré quoi, quand)
- [ ] Backup quotidien Supabase + storage
- [ ] Monitoring uptime (UptimeRobot ou équivalent)
- [ ] Procédure de rollback documentée

---

## 8. Points de contact

- **Sarah** (innovation@ypersoa.fr) — produit / DA / décisions
- **Claude** (via Claude Code) — implémentation feature, débug, génération de contenu
- **Adriana, Felismina, Rebecca** — atelier Wattrelos (broderie + expédition)
- **Maï** — direction de shooting

Pour toute décision d'archi non-évidente (ex : faut-il passer Supabase Edge Functions ?), demander avant d'agir.

---

## 9. Premiers pas recommandés pour Keyvan

1. Cloner le repo, lire ce doc + [README.md](../README.md) + [ARCHITECTURE.md](ARCHITECTURE.md)
2. Demander à Sarah un compte Supabase admin du projet `ypersoa-hub`
3. Démarrer les apps en local (cf. README §"Démarrage rapide")
4. Choisir la stack auth (recommandation Supabase Auth — §4.1)
5. Choisir le provider d'hébergement (§5.3)
6. Implémenter auth + RLS sur **une seule app pilote** (suggestion : `planable-ypersoa` car la plus simple)
7. Valider avec Sarah le flow login → rôle → permissions
8. Étendre aux 3 autres apps Next.js
9. Ajouter Streamlit derrière oauth2-proxy
10. Migrer les assets vers Supabase Storage
11. Rotater les clés et déployer

Estimation effort : **3 à 4 semaines temps plein** pour un dev expérimenté full-stack Next.js + Supabase.
