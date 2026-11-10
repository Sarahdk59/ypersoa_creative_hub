-- Atelier DA — carnet d'adresses clients (10/11/2026)
--
-- Le carnet est CALCULÉ depuis la table `commandes` (une adresse e-mail = un
-- contact, toutes ses commandes regroupées) : aucune donnée client dupliquée.
-- Cette table ne garde que ce qui ne se déduit pas d'une commande : le statut
-- marketing choisi à la main (désinscription, exclusion, inscription
-- newsletter) et une note libre.
--
-- Sans ligne ici, le statut est automatique : client Shopify / B2B / manuel →
-- "client" (contactable) ; client uniquement Etsy → "exclu" (les conditions
-- Etsy interdisent d'utiliser l'e-mail acheteur pour du marketing).

create table if not exists clients_marketing (
  email       text primary key,               -- toujours en minuscules, sans espaces
  statut      text not null
              check (statut in ('client', 'inscrit', 'desinscrit', 'exclu')),
  note        text,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_clients_marketing_updated_at on clients_marketing;
create trigger trg_clients_marketing_updated_at
  before update on clients_marketing
  for each row execute function update_updated_at_column();

-- Même modèle que `commandes` : accès via les routes API serveur, qui vérifient
-- le rôle (admin / créa). À durcir avec le reste des tables (cf. HANDOFF_KEYVAN).
alter table clients_marketing enable row level security;
create policy "clients_marketing read"  on clients_marketing for select using (true);
create policy "clients_marketing write" on clients_marketing for all using (true) with check (true);
