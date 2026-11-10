/**
 * Carnet d'adresses clients (Atelier DA).
 *
 * Calculé à la volée depuis les commandes : une adresse e-mail = un contact,
 * toutes ses commandes regroupées. Seuls le statut marketing choisi à la main
 * et la note vivent dans la table `clients_marketing`.
 *
 * Règle de statut automatique (sans choix manuel) :
 *  - au moins une commande Shopify / B2B / manuelle → "client" (contactable :
 *    client existant, produits analogues, lien de désinscription dans l'e-mail)
 *  - uniquement des commandes Etsy → "exclu" (conditions Etsy : pas de
 *    marketing sur l'e-mail acheteur sans accord explicite)
 */
import { supabase } from "@/lib/supabase";
import { listCommandes, type Commande, type CommandeSource } from "@/lib/production/commandes-loader";

export type StatutMarketing = "client" | "inscrit" | "desinscrit" | "exclu";

export const STATUTS_MARKETING: StatutMarketing[] = ["client", "inscrit", "desinscrit", "exclu"];

/** Statuts qui autorisent l'envoi d'une promo. */
export const STATUTS_CONTACTABLES: StatutMarketing[] = ["client", "inscrit"];

export interface CommandeClientRef {
  id: string;
  numero: string;
  date: string;
  source: CommandeSource;
  montant_ttc: number | null;
}

export interface ContactClient {
  email: string;
  nom: string;
  prenom: string;
  nom_famille: string;
  telephone: string | null;
  ville: string | null;
  code_postal: string | null;
  nb_commandes: number;
  nb_articles: number;
  ca_connu: number;
  premiere_commande: string;
  derniere_commande: string;
  sources: CommandeSource[];
  motifs: string[];
  produits: string[];
  commandes: CommandeClientRef[];
  statut: StatutMarketing;
  /** true = statut calculé (aucun choix manuel enregistré). */
  statut_auto: boolean;
  contactable: boolean;
  note: string | null;
}

export interface CommandeSansEmail {
  id: string;
  numero: string;
  date: string;
  source: CommandeSource;
  client: string | null;
}

export interface Carnet {
  contacts: ContactClient[];
  sans_email: CommandeSansEmail[];
}

interface MarketingRow {
  email: string;
  statut: StatutMarketing;
  note: string | null;
}

export function normaliserEmail(email: string | undefined | null): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

function separerNom(nom: string): { prenom: string; nom_famille: string } {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { prenom: parts[0] ?? "", nom_famille: "" };
  return { prenom: parts[0], nom_famille: parts.slice(1).join(" ") };
}

function uniq(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((v) => (v ?? "").trim()).filter((v) => v && !/à identifier/i.test(v))));
}

export function statutAuto(sources: CommandeSource[]): StatutMarketing {
  return sources.some((s) => s !== "etsy") ? "client" : "exclu";
}

async function lireMarketing(): Promise<Map<string, MarketingRow>> {
  const map = new Map<string, MarketingRow>();
  if (!supabase) return map;
  const { data, error } = await supabase.from("clients_marketing").select("email, statut, note");
  if (error) {
    // Table pas encore créée (migration 20261110_clients_marketing.sql) :
    // le carnet reste lisible avec les statuts automatiques.
    console.warn(`[carnet] statuts marketing indisponibles : ${error.message}`);
    return map;
  }
  for (const r of (data ?? []) as MarketingRow[]) map.set(r.email, r);
  return map;
}

export async function construireCarnet(): Promise<Carnet> {
  const [commandes, marketing] = await Promise.all([listCommandes(), lireMarketing()]);
  const parEmail = new Map<string, Commande[]>();
  const sansEmail: CommandeSansEmail[] = [];

  for (const c of commandes) {
    // Les reworks (1002-R1) ne sont pas de nouveaux achats.
    if (c.rework_de) continue;
    const email = normaliserEmail(c.contact?.email);
    if (!email) {
      sansEmail.push({
        id: c.id,
        numero: c.numero_shopify,
        date: c.date_commande,
        source: c.source ?? "manuel",
        client: c.expedition?.nom || c.facturation?.nom || null,
      });
      continue;
    }
    const list = parEmail.get(email) ?? [];
    list.push(c);
    parEmail.set(email, list);
  }

  const contacts: ContactClient[] = [];
  for (const [email, cmds] of parEmail) {
    cmds.sort((a, b) => b.date_commande.localeCompare(a.date_commande));
    const recente = cmds[0];
    const nom = recente.facturation?.nom || recente.expedition?.nom || "";
    const sources = Array.from(new Set(cmds.map((c) => c.source ?? "manuel"))) as CommandeSource[];
    const articles = cmds.flatMap((c) => c.articles ?? []);
    const override = marketing.get(email);
    const statut = override?.statut ?? statutAuto(sources);

    contacts.push({
      email,
      nom,
      ...separerNom(nom),
      telephone: cmds.find((c) => c.contact?.telephone)?.contact?.telephone ?? null,
      ville: recente.expedition?.ville || recente.facturation?.ville || null,
      code_postal: recente.expedition?.code_postal || recente.facturation?.code_postal || null,
      nb_commandes: cmds.length,
      nb_articles: articles.reduce((s, a) => s + (a.quantite || 1), 0),
      ca_connu: cmds.reduce((s, c) => s + (c.montant_total_ttc ?? 0), 0),
      premiere_commande: cmds[cmds.length - 1].date_commande,
      derniere_commande: recente.date_commande,
      sources,
      motifs: uniq(articles.map((a) => a.ypm_nom)),
      produits: uniq(articles.map((a) => a.produit_nom)),
      commandes: cmds.map((c) => ({
        id: c.id,
        numero: c.numero_shopify,
        date: c.date_commande,
        source: c.source ?? "manuel",
        montant_ttc: c.montant_total_ttc ?? null,
      })),
      statut,
      statut_auto: !override,
      contactable: STATUTS_CONTACTABLES.includes(statut),
      note: override?.note ?? null,
    });
  }

  contacts.sort((a, b) => b.derniere_commande.localeCompare(a.derniere_commande));
  sansEmail.sort((a, b) => b.date.localeCompare(a.date));
  return { contacts, sans_email: sansEmail };
}

/**
 * Enregistre un choix manuel. `statut: null` = revenir au statut automatique
 * (la ligne est supprimée si aucune note ne reste).
 */
export async function enregistrerMarketing(
  email: string,
  patch: { statut?: StatutMarketing | null; note?: string | null },
  par: string | null,
): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré.");
  const { data: existant, error: errLecture } = await supabase
    .from("clients_marketing")
    .select("email, statut, note")
    .eq("email", email)
    .maybeSingle();
  if (errLecture) throw new Error(errLecture.message);

  const note = patch.note !== undefined ? (patch.note?.trim() || null) : (existant?.note ?? null);
  let statut: StatutMarketing | null =
    patch.statut !== undefined ? patch.statut : ((existant?.statut as StatutMarketing | undefined) ?? null);

  if (!statut && !note) {
    const { error } = await supabase.from("clients_marketing").delete().eq("email", email);
    if (error) throw new Error(error.message);
    return;
  }

  if (!statut) {
    // Note sans choix manuel : on fige le statut automatique actuel.
    const carnet = await construireCarnet();
    statut = carnet.contacts.find((c) => c.email === email)?.statut ?? "client";
  }

  const { error } = await supabase
    .from("clients_marketing")
    .upsert({ email, statut, note, updated_by: par }, { onConflict: "email" });
  if (error) throw new Error(error.message);
}

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV compatible Shopify Email / Brevo (en-têtes standards, séparateur virgule, BOM UTF-8). */
export function contactsEnCsv(contacts: ContactClient[]): string {
  const header = ["Email", "First Name", "Last Name", "City", "Zip", "Orders", "Last Order", "Motifs", "Statut"];
  const lignes = contacts.map((c) =>
    [c.email, c.prenom, c.nom_famille, c.ville, c.code_postal, c.nb_commandes, c.derniere_commande, c.motifs.join(" / "), c.statut]
      .map(csvCell)
      .join(","),
  );
  return "﻿" + [header.join(","), ...lignes].join("\r\n");
}
