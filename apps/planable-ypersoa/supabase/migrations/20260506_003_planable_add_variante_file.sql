-- Ajout de la variante_file pour pouvoir cibler un motif sœur (variante PNG)
-- au lieu d'utiliser systématiquement l'asset_principal.
-- Appliqué via MCP le 2026-05-06.

alter table planable_calendar_entries
  add column if not exists variante_file text;

comment on column planable_calendar_entries.variante_file is
  'Filename de la variante du motif (ex. YPM-015-DECLARATION-Maman.png). Si null, utilise asset_principal du motif. Référence le champ variantes[].file de motifs_ypm.json.';
