// Reprise unique de l'ancienne Zone de test (fichier) vers Supabase.
//
//   referentiels/zone_test.json  → table zone_tests
//   assets/zone-test/*           → bucket zone-test ({test_id}/{fichier})
//
// À lancer UNE fois, après la migration 20261112_zone_tests.sql, depuis
// apps/atelier-social :  node --env-file=.env.local scripts/import-zone-test.mjs
// Idempotent : un test déjà présent en base n'est pas écrasé.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquants (.env.local).");
const supabase = createClient(url, key);

const root = join(process.cwd(), "..", "..");
const json = join(root, "referentiels", "zone_test.json");
const assets = join(root, "assets", "zone-test");
const tests = existsSync(json) ? JSON.parse(readFileSync(json, "utf-8")).tests ?? [] : [];
console.log(`${tests.length} test(s) dans zone_test.json`);

const contentType = (f) => (/\.(jpe?g)$/i.test(f) ? "image/jpeg" : /\.png$/i.test(f) ? "image/png" : "application/octet-stream");

for (const t of tests) {
  const { data: deja, error: errLecture } = await supabase.from("zone_tests").select("id").eq("id", t.id).maybeSingle();
  if (errLecture) throw new Error(`Table zone_tests inaccessible : ${errLecture.message}`);
  if (deja) {
    console.log(`= ${t.id} déjà en base, ignoré`);
    continue;
  }
  for (const f of t.files ?? []) {
    const p = join(assets, f.filename);
    if (!existsSync(p)) {
      console.warn(`  ! ${f.original_name ?? f.filename} absent de assets/zone-test`);
      continue;
    }
    const { error } = await supabase.storage
      .from("zone-test")
      .upload(`${t.id}/${f.filename}`, readFileSync(p), { contentType: contentType(f.filename), upsert: true });
    if (error) throw new Error(`Envoi ${f.filename} : ${error.message}`);
    console.log(`  + ${f.original_name ?? f.filename}`);
  }
  const { error } = await supabase.from("zone_tests").insert({ id: t.id, data: t });
  if (error) throw new Error(`Insertion ${t.id} : ${error.message}`);
  console.log(`+ ${t.id} « ${t.titre} » importé`);
}
console.log("Terminé.");
