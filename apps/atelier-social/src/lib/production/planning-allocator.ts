/**
 * Allocateur planning pour 2 machines TMEZ identiques.
 *
 * Deux stratégies disponibles :
 *
 *  • LPT (Longest Processing Time first) — équilibrage charge pur.
 *      → Articles longs en premier, machine la moins chargée.
 *      → Optimal pour minimiser le temps total ("makespan").
 *      → Ne respecte PAS l'ordre d'arrivée des commandes.
 *
 *  • OTIF (On Time In Full) — FIFO + optimisation regroupement fils.
 *      → Articles dans l'ordre de date_commande, puis ordre dans la commande.
 *      → À chaque article : préfère la machine où le DERNIER article alloué
 *        partage le même fil principal (évite le changement de bobine inter-articles).
 *      → Sinon, machine la moins chargée.
 *      → Optimise les changements de fils sans casser le FIFO.
 *
 * Notes V2 :
 *  - Le vrai OTIF multi-commandes (groupement de N commandes du jour pour
 *    minimiser les changements globaux) demande un planning global stocké
 *    séparément. V1 = optim intra-commande.
 *  - Fenêtres bloquées (rdv, livraisons) à ajouter.
 */
import type { Article, Commande, Machine, Planning, PlanningSlot, AlgoPlanning } from "./commandes-loader";
import type { DureesRef } from "./commandes-loader";

interface MachineState {
  nom: Machine;
  jour: string; // YYYY-MM-DD
  minutes_consommees_aujourdhui: number;
  slots: PlanningSlot[];
  dernier_fil_principal?: string;
}

const MIN_PAR_JOUR_DEFAUT = 360; // 6h
const HEURE_DEBUT_MATIN = 9 * 60; // 540 min depuis minuit
const HEURE_FIN_MATIN = 12 * 60; // 720
const HEURE_DEBUT_APRESM = 13 * 60; // 780

function minutesVersHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ajouterJourOuvre(jourISO: string): string {
  const d = new Date(jourISO + "T00:00:00Z");
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

function ajouterJoursOuvres(jourISO: string, nbJours: number): string {
  let cur = jourISO;
  for (let i = 0; i < nbJours; i++) cur = ajouterJourOuvre(cur);
  return cur;
}

function calculerCreneau(
  minutesConsommees: number,
  dureeMin: number,
  minParJour: number
): { debut: number; fin: number } {
  const moitie = minParJour / 2;
  let debut: number;
  if (minutesConsommees < moitie) {
    debut = HEURE_DEBUT_MATIN + minutesConsommees;
  } else {
    debut = HEURE_DEBUT_APRESM + (minutesConsommees - moitie);
  }
  let fin = debut + dureeMin;
  if (debut < HEURE_FIN_MATIN && fin > HEURE_FIN_MATIN) {
    const partieMatin = HEURE_FIN_MATIN - debut;
    const reste = dureeMin - partieMatin;
    fin = HEURE_DEBUT_APRESM + reste;
  }
  return { debut, fin };
}

function genererSlotId(): string {
  return `slot_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Fil principal d'un article = fil qui cumule le plus de temps de broderie. */
function filPrincipalArticle(article: Article): string | undefined {
  const totParFil = new Map<string, number>();
  for (const b of article.broderies) {
    totParFil.set(b.fil_id, (totParFil.get(b.fil_id) ?? 0) + b.duree_broderie_min);
    if (b.fil_id_secondaire && b.duree_changement_fil_min) {
      // Estimation : la moitié restante va au fil secondaire si présent
      totParFil.set(b.fil_id_secondaire, (totParFil.get(b.fil_id_secondaire) ?? 0) + 1);
    }
  }
  let best: string | undefined;
  let bestVal = -1;
  for (const [fil, v] of totParFil.entries()) {
    if (v > bestVal) {
      bestVal = v;
      best = fil;
    }
  }
  return best;
}

export interface AllouerOptions {
  date_debut?: string;
  horizon_jours?: number;
  min_par_jour?: number;
  algo?: AlgoPlanning;
}

export function allouerPlanningAuto(
  commande: Commande,
  durees: DureesRef,
  options: AllouerOptions = {}
): Planning {
  const horizonJours = options.horizon_jours ?? 3;
  const minParJour = options.min_par_jour ?? durees.capacite_atelier.minutes_effectives_par_jour ?? MIN_PAR_JOUR_DEFAUT;
  const dateDebut = options.date_debut ?? new Date().toISOString().slice(0, 10);
  const algoPref = (options.algo ?? (durees.capacite_atelier as { algo_planning_par_defaut?: AlgoPlanning }).algo_planning_par_defaut ?? "otif") as AlgoPlanning;

  // Tri selon stratégie
  const articlesTries =
    algoPref === "lpt"
      ? [...commande.articles].sort((a, b) => b.duree_total_article_min - a.duree_total_article_min)
      : [...commande.articles]; // OTIF = ordre naturel = ordre commande

  const machines: MachineState[] = (durees.capacite_atelier.noms_machines ?? ["TMEZ-1", "TMEZ-2"]).map((nom) => ({
    nom,
    jour: dateDebut,
    minutes_consommees_aujourdhui: 0,
    slots: [],
  }));

  const dateFin = ajouterJoursOuvres(dateDebut, horizonJours - 1);

  const articlesPlanifies: PlanningSlot[] = [];

  for (const article of articlesTries) {
    const filPrinc = filPrincipalArticle(article);

    // Stratégie de choix machine
    let idxMachine: number;
    if (algoPref === "otif" && filPrinc) {
      // Préférence : machine où le dernier article = même fil principal (0 changement)
      const idxMatchFil = machines.findIndex((m) => m.dernier_fil_principal === filPrinc);
      if (idxMatchFil >= 0 && machines[idxMatchFil].minutes_consommees_aujourdhui + article.duree_total_article_min <= minParJour) {
        idxMachine = idxMatchFil;
      } else {
        // Sinon, machine la moins chargée (par jour pour rester compact)
        idxMachine = machines.reduce((best, m, i) => (m.minutes_consommees_aujourdhui < machines[best].minutes_consommees_aujourdhui ? i : best), 0);
      }
    } else {
      // LPT pur : la moins chargée en cumul total
      const totaux = machines.map((m) => m.slots.reduce((s, sl) => s + sl.duree_min, 0));
      idxMachine = totaux.indexOf(Math.min(...totaux));
    }

    const machine = machines[idxMachine];

    // Sauter au jour suivant si pas de place
    while (
      machine.minutes_consommees_aujourdhui + article.duree_total_article_min > minParJour &&
      machine.jour < dateFin
    ) {
      machine.jour = ajouterJourOuvre(machine.jour);
      machine.minutes_consommees_aujourdhui = 0;
      machine.dernier_fil_principal = undefined; // nouvelle journée = nouveau setup
    }

    if (machine.minutes_consommees_aujourdhui + article.duree_total_article_min > minParJour) {
      // Article ne tient pas dans l'horizon → on saute (à traiter ultérieurement)
      continue;
    }

    const { debut, fin } = calculerCreneau(
      machine.minutes_consommees_aujourdhui,
      article.duree_total_article_min,
      minParJour
    );

    const slot: PlanningSlot = {
      id: genererSlotId(),
      machine: machine.nom,
      jour: machine.jour,
      heure_debut: minutesVersHHMM(debut),
      heure_fin: minutesVersHHMM(fin),
      duree_min: article.duree_total_article_min,
      article_id: article.id,
      commande_id: commande.id,
    };
    machine.slots.push(slot);
    machine.minutes_consommees_aujourdhui += article.duree_total_article_min;
    machine.dernier_fil_principal = filPrinc;
    articlesPlanifies.push(slot);
  }

  // Tri final des slots par jour/machine/heure pour cohérence d'affichage
  articlesPlanifies.sort((a, b) => {
    if (a.jour !== b.jour) return a.jour.localeCompare(b.jour);
    if (a.machine !== b.machine) return a.machine.localeCompare(b.machine);
    return a.heure_debut.localeCompare(b.heure_debut);
  });

  return {
    mode: "auto",
    algo: algoPref,
    horizon_jours: horizonJours,
    date_debut: dateDebut,
    slots: articlesPlanifies,
    genere_le: new Date().toISOString(),
  };
}
