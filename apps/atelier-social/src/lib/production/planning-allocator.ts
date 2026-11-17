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
import { estBrodee } from "./broderie-utils";

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
  for (const b of article.broderies.filter(estBrodee)) {
    // Une palette (Orage, Printemps…) se monte en bloc : on regroupe par palette.
    if (b.palette_id) {
      const k = `palette:${b.palette_id}`;
      totParFil.set(k, (totParFil.get(k) ?? 0) + b.duree_broderie_min);
      continue;
    }
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
  const minParJour = options.min_par_jour ?? durees.capacite_atelier.minutes_effectives_par_jour ?? MIN_PAR_JOUR_DEFAUT;
  // Horizon par défaut : 3 jours, allongé si la charge (séries B2B de 20-40 pièces) le demande.
  const nbMachines = (durees.capacite_atelier.noms_machines ?? ["TMEZ-1", "TMEZ-2"]).length;
  const chargeMin = commande.articles
    .filter((a) => a.broderies.some(estBrodee))
    .reduce((s, a) => s + a.duree_preparation_dst_min + (a.duree_total_article_min - a.duree_preparation_dst_min) * Math.max(1, a.quantite || 1), 0);
  const horizonJours = options.horizon_jours ?? Math.max(3, Math.ceil(chargeMin / (nbMachines * minParJour)) + 1);
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
  let piecesNonPlanifiees = 0;
  // Lot en cours par machine : pièces consécutives du même article fusionnées en 1 créneau.
  const lotEnCours = new Map<Machine, { slot: PlanningSlot; debutConsomme: number }>();

  for (const article of articlesTries) {
    // 100 % DTF / écusson / sublimation : rien à faire sur les TMEZ.
    if (!article.broderies.some(estBrodee)) continue;
    const filPrinc = filPrincipalArticle(article);
    const prep = article.duree_preparation_dst_min || 0;
    const parPiece = Math.max(1, article.duree_total_article_min - prep);
    const quantite = Math.max(1, article.quantite || 1);

    // Pièce par pièce : une série de 40 se répartit sur les 2 machines et sur les jours.
    for (let k = 0; k < quantite; k++) {
      const duree = parPiece + (k === 0 ? prep : 0);

      // Stratégie de choix machine
      let idxMachine: number;
      if (algoPref === "otif" && filPrinc) {
        // Préférence : machine où le dernier article = même fil principal (0 changement)
        const idxMatchFil = machines.findIndex((m) => m.dernier_fil_principal === filPrinc);
        if (idxMatchFil >= 0 && machines[idxMatchFil].minutes_consommees_aujourdhui + duree <= minParJour) {
          idxMachine = idxMatchFil;
        } else {
          // Sinon, machine la moins avancée (jour puis charge du jour)
          idxMachine = machines.reduce((best, m, i) => {
            const b = machines[best];
            if (m.jour !== b.jour) return m.jour < b.jour ? i : best;
            return m.minutes_consommees_aujourdhui < b.minutes_consommees_aujourdhui ? i : best;
          }, 0);
        }
      } else {
        // LPT pur : la moins chargée en cumul total
        const totaux = machines.map((m) => m.slots.reduce((s, sl) => s + sl.duree_min, 0));
        idxMachine = totaux.indexOf(Math.min(...totaux));
      }

      const machine = machines[idxMachine];

      // Sauter au jour suivant si pas de place
      while (machine.minutes_consommees_aujourdhui + duree > minParJour && machine.jour < dateFin) {
        machine.jour = ajouterJourOuvre(machine.jour);
        machine.minutes_consommees_aujourdhui = 0;
        machine.dernier_fil_principal = undefined; // nouvelle journée = nouveau setup
        lotEnCours.delete(machine.nom);
      }

      if (machine.minutes_consommees_aujourdhui + duree > minParJour) {
        // Ne tient pas dans l'horizon → signalé, à replanifier sur un horizon plus long
        piecesNonPlanifiees++;
        continue;
      }

      const lot = lotEnCours.get(machine.nom);
      if (lot && lot.slot.article_id === article.id && lot.slot.jour === machine.jour) {
        // Pièce suivante du même article, juste derrière : on allonge le créneau.
        lot.slot.duree_min += duree;
        lot.slot.nb_pieces = (lot.slot.nb_pieces ?? 1) + 1;
        const { fin } = calculerCreneau(lot.debutConsomme, lot.slot.duree_min, minParJour);
        lot.slot.heure_fin = minutesVersHHMM(fin);
      } else {
        const { debut, fin } = calculerCreneau(machine.minutes_consommees_aujourdhui, duree, minParJour);
        const slot: PlanningSlot = {
          id: genererSlotId(),
          machine: machine.nom,
          jour: machine.jour,
          heure_debut: minutesVersHHMM(debut),
          heure_fin: minutesVersHHMM(fin),
          duree_min: duree,
          article_id: article.id,
          commande_id: commande.id,
          nb_pieces: 1,
        };
        machine.slots.push(slot);
        articlesPlanifies.push(slot);
        lotEnCours.set(machine.nom, { slot, debutConsomme: machine.minutes_consommees_aujourdhui });
      }
      machine.minutes_consommees_aujourdhui += duree;
      machine.dernier_fil_principal = filPrinc;
    }
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
    ...(piecesNonPlanifiees ? { pieces_non_planifiees: piecesNonPlanifiees } : {}),
  };
}
