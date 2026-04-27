# Atelier Social — Module Hub Ypersoa

Premier module du Hub Ypersoa. Génère des carrousels Instagram/Pinterest brand-safe à partir d'une photo produit.

## Stack
- Next.js 15 (App Router)
- React 19
- TypeScript strict
- Tailwind 4
- Anthropic Claude (copywriting brand-safe FR)
- Google Gemini 3 Pro Image / Nano Banana 2 (génération images)

## Architecture
- **Frontend** : `src/app/page.tsx` + composants
- **Backend proxy** : `src/app/api/generate-copy/route.ts` + `src/app/api/generate-image/route.ts`
- **Brand rules** : `src/lib/brand-rules.ts` (source de vérité TS, sync CLAUDE.md v1.1)
- **Sécurité** : les clés API restent côté serveur (`.env.local`), jamais exposées au browser

## Setup local

```bash
# Depuis ypersoa_creative_hub/
cd apps/atelier-social

# Copier le fichier env et remplir tes clés
cp .env.example .env.local

# Éditer .env.local avec tes vraies clés API
# - ANTHROPIC_API_KEY (https://console.anthropic.com)
# - GEMINI_API_KEY (https://aistudio.google.com/apikey)
```

## Lancer en dev

```bash
# Depuis la racine du repo
pnpm dev:atelier

# OU depuis apps/atelier-social/
pnpm dev
```

Ouvre http://localhost:3000

## Différences vs ancienne version archivée

- ✅ Aligné CLAUDE.md v1.1 (suppression "artisanal", tutoiement, ton Émoï-Émoï)
- ✅ API Anthropic Claude pour le copy (au lieu de Gemini)
- ✅ Backend proxy Next.js (clés API côté serveur uniquement)
- ✅ Vérification automatique brand-safety post-génération
- ✅ Vibes alignés sur 5 ambiances officielles CLAUDE.md
- ✅ 6 occasions reformulées brand-safe

## Statut

V1 - 27/04/2026. Module fondateur du Hub Phase 2.
