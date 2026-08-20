import type { RateUnit } from "@prisma/client";
import { normalizeText } from "@/lib/utils";

/**
 * Grille tarifaire d'une salle : unités de facturation et formules types.
 *
 * Une salle des fêtes ne se loue pas à un prix unique. Elle se loue par
 * créneau — après-midi, dîner, soirée — et parfois au couvert, à des tarifs
 * sans rapport les uns avec les autres. `Room.basePrice` reste le prix d'appel
 * du catalogue ; la grille dit ce que le client paiera réellement selon la
 * formule qu'il choisit.
 *
 * Les formules proposées ici ne sont **que** des suggestions de saisie : elles
 * ne portent aucun prix, parce qu'un tarif n'a de sens que pour une salle
 * donnée (voir `RoomRate` dans le schéma). Le propriétaire part d'une formule
 * type ou compose la sienne de zéro.
 */

/**
 * Valeurs de l'énumération `RateUnit`, sous une forme énumérable.
 *
 * `satisfies` sur le type Prisma : ajouter une valeur au schéma sans la
 * reporter ici casse la compilation plutôt que de disparaître silencieusement
 * du sélecteur.
 */
export const RATE_UNIT_VALUES = [
  "FORFAIT",
  "COUVERT",
  "PERSONNE",
  "HEURE",
] as const satisfies readonly RateUnit[];

export interface RateUnitOption {
  value: RateUnit;
  /** Libellé du sélecteur du formulaire salle. */
  label: string;
  /** Complément affiché après le montant sur la fiche, vide pour un forfait. */
  suffix: string;
}

export const RATE_UNITS: readonly RateUnitOption[] = [
  { value: "FORFAIT", label: "Forfait (la location)", suffix: "" },
  { value: "COUVERT", label: "Par couvert", suffix: "par couvert" },
  { value: "PERSONNE", label: "Par personne", suffix: "par personne" },
  { value: "HEURE", label: "Par heure", suffix: "par heure" },
] as const;

/** Unité par défaut d'une formule : la location d'un créneau. */
export const DEFAULT_RATE_UNIT: RateUnit = "FORFAIT";

/** « par couvert », ou chaîne vide pour un forfait. */
export function rateUnitSuffix(unit: RateUnit): string {
  return RATE_UNITS.find((option) => option.value === unit)?.suffix ?? "";
}

/**
 * Une ligne de grille tarifaire, telle qu'elle circule entre le serveur et le
 * formulaire : le `Decimal` de Prisma est déjà ramené à un nombre, sans quoi
 * elle ne traverserait pas la frontière serveur → client.
 */
export interface RateValue {
  label: string;
  detail: string | null;
  price: number;
  unit: RateUnit;
}

export interface RateSuggestion {
  /** Intitulé prérempli, ex. « Location soirée ». */
  label: string;
  /** Créneau proposé, `null` quand la formule n'en porte pas. */
  detail: string | null;
  unit: RateUnit;
}

/** Formules d'une salle de fêtes : tout se joue sur le créneau et le repas. */
const RECEPTION_RATES: readonly RateSuggestion[] = [
  { label: "Location déjeuner", detail: "12h – 16h", unit: "FORFAIT" },
  { label: "Location après-midi", detail: "14h – 19h", unit: "FORFAIT" },
  { label: "Dîner et demi-soirée", detail: "17h – minuit", unit: "FORFAIT" },
  { label: "Location soirée", detail: "21h – 3h", unit: "FORFAIT" },
  { label: "Journée complète", detail: "10h – 2h", unit: "FORFAIT" },
  { label: "Dîner par couvert", detail: "18h – 22h", unit: "COUVERT" },
];

/** Formules d'un lieu professionnel : la journée, l'heure, le participant. */
const MEETING_RATES: readonly RateSuggestion[] = [
  { label: "Demi-journée", detail: "8h – 13h", unit: "FORFAIT" },
  { label: "Journée complète", detail: "8h – 18h", unit: "FORFAIT" },
  { label: "Location à l'heure", detail: null, unit: "HEURE" },
  { label: "Pause-café", detail: "Accueil et collation", unit: "PERSONNE" },
  { label: "Déjeuner d'affaires", detail: "12h – 14h", unit: "PERSONNE" },
];

/**
 * Formules proposées par catégorie.
 *
 * Une catégorie absente de cette table — celles qu'un propriétaire ajoute
 * lui-même, en particulier — n'est pas un oubli : toutes les salles ne se
 * louent pas par créneau, et le formulaire laisse alors composer la grille de
 * zéro plutôt que de suggérer des formules hors sujet.
 */
const RATE_SUGGESTIONS: Record<string, readonly RateSuggestion[]> = {
  Mariage: RECEPTION_RATES,
  Fiançailles: RECEPTION_RATES,
  Réception: RECEPTION_RATES,
  "Soirée privée": RECEPTION_RATES,
  Anniversaire: RECEPTION_RATES,
  Conférence: MEETING_RATES,
  Séminaire: MEETING_RATES,
  "Événement pro": MEETING_RATES,
};

/**
 * Formules suggérées pour les catégories retenues, dans l'ordre où elles ont
 * été choisies et sans doublon : deux catégories partagent souvent la même
 * grille, « Location soirée » ne doit pas être proposée deux fois.
 */
export function rateSuggestions(
  categoryNames: readonly string[]
): RateSuggestion[] {
  const seen = new Set<string>();
  const suggestions: RateSuggestion[] = [];

  for (const category of categoryNames) {
    for (const suggestion of RATE_SUGGESTIONS[category] ?? []) {
      const key = normalizeText(suggestion.label);
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}
