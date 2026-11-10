/**
 * Dossier de commande multi-documents (serveur).
 *
 * Rôle de chaque pièce :
 *  - bon_commande : source des articles (prioritaire)
 *  - devis        : devis We Are Perso — n'est poussé dans le Hub qu'une fois PAYÉ,
 *                   il vaut donc bon de commande (source des articles si aucun bon)
 *  - facture      : copie de la facture client (traçabilité, jamais lue)
 *  - etiquette    : transporteur, mode (locker / relais / domicile), point relais, n° de suivi
 *                   → lue par Gemini, PRIORITAIRE sur le bon pour la livraison (c'est ce qui part)
 *  - fiche_technique : FT du motif (PDF Hatch / Tajima Pulse) pour l'atelier
 *  - fichier_emb  : fichier de travail Hatch (.emb) — téléchargeable, jamais lu
 *  - fichier_graphique : logo / fichier source client (AI, EPS, SVG, PSD, ZIP ou PDF/PNG) — B2B surtout
 *  - mail_client  : échange client (.eml / .msg, ou PDF / capture du mail) — un .eml est résumé (de, objet, date)
 *  - bat, bon_livraison (bon d'expédition / livraison), autre : pièces jointes (référence visuelle / traçabilité)
 */
import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Commande, DocumentCommande, Livraison, ModeLivraison, TypeDocument } from "./commandes-loader";

export const BUCKET_DOCUMENTS = "commandes-pdf";
/** Aligné sur le file_size_limit du bucket et sur middlewareClientMaxBodySize (next.config). */
export const MAX_BYTES_DOCUMENT = 50 * 1024 * 1024;
export const MIMES_DOCUMENT = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
/** Fichiers broderie (Hatch .emb) : binaire propriétaire, stocké tel quel. */
export const EXTENSIONS_BRODERIE = [".emb"];
/** Fichiers sources graphiques (B2B) : jamais affichés dans le navigateur, téléchargés. */
export const EXTENSIONS_GRAPHIQUE = [".ai", ".eps", ".svg", ".psd", ".zip"];
/** Mails exportés depuis Mail / Outlook. */
export const EXTENSIONS_MAIL = [".eml", ".msg"];
/**
 * Formats natifs stockés en octet-stream → toujours téléchargés, jamais
 * servis inline (un SVG servi tel quel depuis une URL publique peut exécuter du script).
 */
export const MIME_BRODERIE = "application/octet-stream";
export const MIME_TELECHARGEMENT = "application/octet-stream";
export const TYPES_DOCUMENT: TypeDocument[] = [
  "bon_commande",
  "devis",
  "facture",
  "bat",
  "fiche_technique",
  "fichier_emb",
  "fichier_graphique",
  "mail_client",
  "bon_livraison",
  "etiquette",
  "autre",
];

export function estFichierBroderie(name: string): boolean {
  const n = name.toLowerCase();
  return EXTENSIONS_BRODERIE.some((ext) => n.endsWith(ext));
}

function aExtension(name: string, exts: string[]): boolean {
  const n = name.toLowerCase();
  return exts.some((ext) => n.endsWith(ext));
}

export function estFichierGraphique(name: string): boolean {
  return aExtension(name, EXTENSIONS_GRAPHIQUE);
}

export function estFichierMail(name: string): boolean {
  return aExtension(name, EXTENSIONS_MAIL);
}

/** Format natif (EMB, AI, EML…) : stocké en octet-stream, à télécharger. */
export function estFormatNatif(name: string): boolean {
  return estFichierBroderie(name) || estFichierGraphique(name) || estFichierMail(name);
}

export function isTypeDocument(t: unknown): t is TypeDocument {
  return typeof t === "string" && (TYPES_DOCUMENT as string[]).includes(t);
}

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = (dot >= 0 ? name.slice(dot + 1) : "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const base =
    (dot >= 0 ? name.slice(0, dot) : name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";
  return `${base}.${ext}`;
}

/** Contrôle d'un fichier déposé. Renvoie un message d'erreur ou null. */
export function checkFichier(file: File, type?: TypeDocument): string | null {
  const broderie = estFichierBroderie(file.name);
  if (type === "fichier_emb" && !broderie) return `« ${file.name} » : un fichier Hatch .emb est attendu.`;
  if (broderie && type && type !== "fichier_emb") return `« ${file.name} » : un .emb se range en « Fichier EMB (Hatch) ».`;
  const graphique = estFichierGraphique(file.name);
  if (graphique && type && !["fichier_graphique", "bat", "autre"].includes(type)) {
    return `« ${file.name} » : un fichier AI / EPS / SVG / PSD / ZIP se range en « Fichier graphique », « BAT » ou « Autre ».`;
  }
  const mail = estFichierMail(file.name);
  if (mail && type && !["mail_client", "autre"].includes(type)) {
    return `« ${file.name} » : un .eml / .msg se range en « Mail client ».`;
  }
  if (!estFormatNatif(file.name) && file.type && !MIMES_DOCUMENT.includes(file.type)) {
    return `« ${file.name} » : type non supporté (${file.type}). PDF, PNG, JPG, WebP, AI, EPS, SVG, PSD, ZIP, EML, MSG ou EMB attendu.`;
  }
  if (file.size > MAX_BYTES_DOCUMENT) {
    return `« ${file.name} » : trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo, max ${MAX_BYTES_DOCUMENT / 1024 / 1024} Mo).`;
  }
  return null;
}

export function mimeOf(file: File): string {
  if (estFormatNatif(file.name)) return MIME_TELECHARGEMENT;
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  return "application/pdf";
}

export async function uploadDocument(
  supabase: SupabaseClient,
  opts: { buffer: Buffer; filename: string; mime: string; type: TypeDocument; numero: string; uploadedBy?: string | null },
): Promise<DocumentCommande> {
  const id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const yyyymm = new Date().toISOString().slice(0, 7);
  const storage_path = `${yyyymm}/${opts.numero}/${opts.type}-${id.slice(-5)}-${sanitizeFilename(opts.filename)}`;
  const { error } = await supabase.storage
    .from(BUCKET_DOCUMENTS)
    .upload(storage_path, opts.buffer, { contentType: opts.mime, upsert: true });
  if (error) throw new Error(`Upload « ${opts.filename} » échoué : ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_DOCUMENTS).getPublicUrl(storage_path);
  return {
    id,
    type: opts.type,
    storage_path,
    public_url: data.publicUrl,
    filename: opts.filename,
    mime: opts.mime,
    size_bytes: opts.buffer.length,
    uploaded_by: opts.uploadedBy ?? undefined,
    uploaded_at: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────
// Mail client (.eml) → résumé de traçabilité (sans IA)
// ──────────────────────────────────────────────────────────

/** Décode les mots encodés RFC 2047 (=?UTF-8?B?…?= / =?UTF-8?Q?…?=). */
function decoderEnTete(v: string): string {
  return v
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, charset: string, enc: string, txt: string) => {
      try {
        const bytes =
          enc.toUpperCase() === "B"
            ? Buffer.from(txt, "base64")
            : Buffer.from(
                txt.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_x, h: string) => String.fromCharCode(parseInt(h, 16))),
                "latin1",
              );
        return new TextDecoder(charset.toLowerCase()).decode(bytes);
      } catch {
        return txt;
      }
    });
}

/** Lit expéditeur, objet et date d'un .eml. Renvoie undefined si rien de lisible (ex. .msg Outlook). */
export function resumerMail(buffer: Buffer, filename: string): string | undefined {
  if (!filename.toLowerCase().endsWith(".eml")) return undefined;
  const brut = buffer.subarray(0, 64 * 1024).toString("utf8");
  const fin = brut.search(/\r?\n\r?\n/);
  const entetes = (fin >= 0 ? brut.slice(0, fin) : brut).replace(/\r?\n[ \t]+/g, " ");
  const lire = (nom: string) => {
    const m = entetes.match(new RegExp(`^${nom}:\\s*(.+)$`, "im"));
    return m ? decoderEnTete(m[1].trim()) : undefined;
  };
  const de = lire("From");
  const objet = lire("Subject");
  const date = lire("Date");
  const d = date ? new Date(date) : null;
  const dateFr = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("fr-FR") : date;
  const resume = [de && `de ${de}`, objet && `« ${objet} »`, dateFr].filter(Boolean).join(" · ");
  return resume || undefined;
}

// ──────────────────────────────────────────────────────────
// Étiquette d'expédition → livraison
// ──────────────────────────────────────────────────────────

export interface EtiquetteLue {
  transporteur?: string;
  mode?: ModeLivraison;
  point_relais?: string;
  numero_suivi?: string;
  destinataire_nom?: string;
}

const PROMPT_ETIQUETTE = [
  "Tu lis une étiquette d'expédition de colis (Mondial Relay, Colissimo, Chronopost, La Poste, UPS, DHL, GLS…).",
  "Renvoie UNIQUEMENT ce JSON (omets un champ absent, n'invente rien) :",
  "{",
  '  "transporteur": "Mondial Relay",',
  '  "mode": "locker" | "point_relais" | "domicile",',
  '  "point_relais": "nom et/ou numéro du locker ou du point relais de destination",',
  '  "numero_suivi": "numéro de colis / tracking tel qu\'imprimé",',
  '  "destinataire_nom": "nom du destinataire"',
  "}",
  "Règles : « Locker », « Lockers », « Consigne » → \"locker\" ; « Point Relais », « Relais », « Pickup », « Bureau de poste » de retrait → \"point_relais\" ;",
  "livraison à une adresse de particulier → \"domicile\". Le point relais / locker est l'adresse de DESTINATION, jamais l'expéditeur.",
].join("\n");

export async function lireEtiquette(buffer: Buffer, mime: string): Promise<EtiquetteLue> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: mime, data: buffer.toString("base64") } },
        { text: "Extrais les informations de cette étiquette d'expédition." },
      ],
    },
    config: { systemInstruction: PROMPT_ETIQUETTE, responseMimeType: "application/json", temperature: 0 },
  });
  const raw = response.text;
  if (!raw) throw new Error("Pas de contenu Gemini");
  const j = JSON.parse(raw) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const mode = str(j.mode);
  return {
    transporteur: str(j.transporteur),
    mode: mode === "locker" || mode === "point_relais" || mode === "domicile" ? mode : undefined,
    point_relais: str(j.point_relais),
    numero_suivi: str(j.numero_suivi),
    destinataire_nom: str(j.destinataire_nom),
  };
}

function normNom(s: string): string[] {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter((w) => w.length > 1);
}

/**
 * Applique l'étiquette à la commande (l'étiquette fait foi pour la livraison).
 * Renvoie les avertissements (destinataire différent, etc.) et un résumé.
 */
export function appliquerEtiquette(commande: Commande, e: EtiquetteLue): { warnings: string[]; resume: string } {
  const warnings: string[] = [];
  const avant: Livraison = commande.livraison ?? {};
  const apres: Livraison = {
    transporteur: e.transporteur ?? avant.transporteur,
    mode: e.mode ?? avant.mode,
    point_relais: e.point_relais ?? avant.point_relais,
    numero_suivi: e.numero_suivi ?? avant.numero_suivi,
  };
  for (const k of ["transporteur", "mode", "point_relais"] as const) {
    if (avant[k] && e[k] && avant[k] !== e[k]) {
      warnings.push(`Étiquette ≠ bon pour ${k.replace("_", " ")} : « ${avant[k]} » remplacé par « ${e[k]} » (l'étiquette fait foi).`);
    }
  }
  commande.livraison = apres;

  if (e.destinataire_nom && commande.expedition?.nom) {
    const a = normNom(e.destinataire_nom);
    const b = new Set(normNom(commande.expedition.nom));
    if (a.length && !a.some((w) => b.has(w))) {
      warnings.push(`Destinataire de l'étiquette (« ${e.destinataire_nom} ») différent du client de la commande (« ${commande.expedition.nom} ») — vérifie que c'est la bonne étiquette.`);
    }
  }
  const resume = [e.transporteur, e.mode, e.point_relais, e.numero_suivi && `suivi ${e.numero_suivi}`, e.destinataire_nom && `pour ${e.destinataire_nom}`]
    .filter(Boolean)
    .join(" · ");
  return { warnings, resume: resume || "rien de lisible" };
}
