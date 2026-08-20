/**
 * Filtres du suivi des paiements (`/admin/paiements`), portés par l'URL.
 *
 * Aucune dépendance à Prisma : la barre de filtres mélange rendu serveur et
 * sélecteurs client, et une vue filtrée doit rester partageable telle quelle.
 */

export const PAYMENTS_PATH = "/admin/paiements";

export const PAYMENT_FILTER_PARAMS = {
  search: "q",
  stage: "etat",
  owner: "proprietaire",
} as const;

export const ALL_FILTER_VALUE = "tous";

/**
 * Étape du circuit des espèces.
 *
 * L'argent suit toujours le même chemin : le client remet la somme à LIUDOR,
 * qui la reverse au propriétaire. Les trois valeurs sont les trois positions
 * possibles sur ce chemin, et `TO_PAYOUT` est la seule où la plateforme détient
 * de l'argent qui ne lui appartient pas — c'est celle qu'on regarde en premier.
 */
export const PAYMENT_STAGES = ["TO_COLLECT", "TO_PAYOUT", "PAID_OUT"] as const;
export type PaymentStage = (typeof PAYMENT_STAGES)[number];

export const PAYMENT_STAGE_LABELS: Record<PaymentStage, string> = {
  TO_COLLECT: "À encaisser auprès du client",
  TO_PAYOUT: "À reverser au propriétaire",
  PAID_OUT: "Reversé au propriétaire",
};

/** Libellé court, affiché en badge dans la liste. */
export const PAYMENT_STAGE_SHORT_LABELS: Record<PaymentStage, string> = {
  TO_COLLECT: "À encaisser",
  TO_PAYOUT: "À reverser",
  PAID_OUT: "Reversé",
};

/** Valeurs acceptées dans l'URL pour l'étape. */
const STAGE_PARAM_VALUES: Record<string, PaymentStage> = {
  "a-encaisser": "TO_COLLECT",
  "a-reverser": "TO_PAYOUT",
  reverse: "PAID_OUT",
};

const STAGE_PARAM_BY_STAGE: Record<PaymentStage, string> = {
  TO_COLLECT: "a-encaisser",
  TO_PAYOUT: "a-reverser",
  PAID_OUT: "reverse",
};

/**
 * Position d'une réservation sur le circuit des espèces, déduite du paiement.
 *
 * Vit ici, avec le vocabulaire : la liste, les badges et les totaux doivent
 * classer une même ligne de la même façon, côté serveur comme côté client.
 */
export function paymentStageOf(
  payment: { status: string | null; payoutAt: string | Date | null } | null
): PaymentStage {
  if (!payment || payment.status !== "PAID") return "TO_COLLECT";
  return payment.payoutAt ? "PAID_OUT" : "TO_PAYOUT";
}

/** Valeur d'URL d'une étape, pour la transporter en champ caché. */
export function stageParam(stage: PaymentStage): string {
  return STAGE_PARAM_BY_STAGE[stage];
}

export interface PaymentFilters {
  search: string | null;
  /** `null` = toutes les étapes. */
  stage: PaymentStage | null;
  /** Restreint aux salles d'un propriétaire (accès rapide depuis sa fiche). */
  ownerId: string | null;
}

export const NO_PAYMENT_FILTERS: PaymentFilters = {
  search: null,
  stage: null,
  ownerId: null,
};

const MAX_SEARCH_LENGTH = 80;

export interface PaymentSearchParams {
  q?: string;
  etat?: string;
  proprietaire?: string;
}

/** Filtres validés ; une valeur inconnue est ignorée plutôt qu'appliquée. */
export function parsePaymentFilters(
  searchParams: PaymentSearchParams
): PaymentFilters {
  const search = searchParams.q?.trim().slice(0, MAX_SEARCH_LENGTH);
  const stage = searchParams.etat;

  return {
    search: search ? search : null,
    stage: stage ? (STAGE_PARAM_VALUES[stage] ?? null) : null,
    ownerId: searchParams.proprietaire || null,
  };
}

export function hasActivePaymentFilters(filters: PaymentFilters): boolean {
  return (
    filters.search !== null ||
    filters.stage !== null ||
    filters.ownerId !== null
  );
}

/** Lien vers la liste ainsi filtrée ; les valeurs vides sortent de l'URL. */
export function buildPaymentsHref(filters: PaymentFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set(PAYMENT_FILTER_PARAMS.search, filters.search);
  if (filters.stage) {
    params.set(PAYMENT_FILTER_PARAMS.stage, STAGE_PARAM_BY_STAGE[filters.stage]);
  }
  if (filters.ownerId) params.set(PAYMENT_FILTER_PARAMS.owner, filters.ownerId);

  const query = params.toString();
  return query ? `${PAYMENTS_PATH}?${query}` : PAYMENTS_PATH;
}
