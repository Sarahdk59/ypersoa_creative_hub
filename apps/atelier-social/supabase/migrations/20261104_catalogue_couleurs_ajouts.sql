-- Atelier Production — couleurs produit ajoutées depuis le Hub (04/11/2026)
--
-- Le socle produit/couleur/taille vient de referentiels/catalogue_produits.json
-- (import du classeur « base produit » Akanea). Quand une commande arrive avec
-- une couleur que le catalogue ne connaît pas pour ce produit (ex. YP013 +
-- 0064 Vintage Bleu), l'atelier la rattache ici. Le disque Railway étant
-- éphémère, ces ajouts DOIVENT vivre en base (pas dans le JSON).
--
-- Règle Akanea : le code couleur est un code FAMILLE (0064 = Vintage Bleu chez
-- tous les fournisseurs). Un code ≥ 0068 non présent dans Couleurs_ref doit
-- d'abord être créé dans Akanea.

create table if not exists catalogue_couleurs_ajouts (
  id            uuid primary key default gen_random_uuid(),
  ref_produit   text not null,                -- ex. "YP013"
  code_couleur  text not null check (code_couleur ~ '^\d{4}$'),
  libelle       text not null,                -- ex. "Vintage Bleu"
  hex           text,
  nouvelle_famille boolean not null default false, -- true = code absent de Couleurs_ref (à créer dans Akanea)
  created_by    text,
  created_at    timestamptz not null default now(),
  unique (ref_produit, code_couleur)
);

alter table catalogue_couleurs_ajouts enable row level security;
create policy "catalogue_couleurs_ajouts read" on catalogue_couleurs_ajouts for select using (true);
create policy "catalogue_couleurs_ajouts insert" on catalogue_couleurs_ajouts for insert with check (true);
