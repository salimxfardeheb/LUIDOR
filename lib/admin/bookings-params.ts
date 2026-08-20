import type { BookingStatus } from "@prisma/client";
import { isBookingStatus } from "@/lib/bookings/status";
import {
  PAYMENT_STAGES,
  PAYMENT_STAGE_LABELS,
  stageParam,
  type PaymentStage,
} from "@/lib/admin/payments-params";

/**
 * Recherche, filtres et tri de la liste des réservations, portés par l'URL.
 *
 * Aucune dépendance à Prisma (import *type-only*) : la barre de filtres est
 * rendue côté serveur mais ses sélecteurs sont des composants client, et une
 * vue filtrée doit rester partageable telle quelle.
 */

export const ADMIN_BOOKINGS_PATH = "/admin/reservations";

export const BOOKING_FILTER_PARAMS = {
  search: "q",
  status: "statut",
  payment: "paiement",
  sort: "tri",
  owner: "proprietaire",
} as const;

export const ALL_FILTER_VALUE = "toutes";

/**
 * Filtre de paiement : les trois étapes du circuit des espèces.
 *
 * Le vocabulaire est celui de la page des paiements, réutilisé tel quel : une
 * réservation « à reverser » doit s'appeler pareil des deux côtés, sans quoi
 * l'équipe croirait manipuler deux notions différentes.
 */
export const PAYMENT_FILTERS = PAYMENT_STAGES;
export type PaymentFilter = PaymentStage;

export const PAYMENT_FILTER_LABELS = PAYMENT_STAGE_LABELS;

export { stageParam };

export const SORTS = ["recentes", "anciennes", "evenement", "montant"] as const;
export type BookingSort = (typeof SORTS)[number];

export const SORT_LABELS: Record<BookingSort, string> = {
  recentes: "Demande la plus récente",
  anciennes: "Demande la plus ancienne",
  evenement: "Date d'événement à venir",
  montant: "Montant le plus élevé",
};

export const DEFAULT_SORT: BookingSort = "recentes";

export interface BookingAdminFilters {
  search: string | null;
  status: BookingStatus | null;
  payment: PaymentFilter | null;
  /** Restreint aux salles d'un propriétaire (accès rapide depuis sa fiche). */
  ownerId: string | null;
  sort: BookingSort;
}

export const NO_BOOKING_FILTERS: BookingAdminFilters = {
  search: null,
  status: null,
  payment: null,
  ownerId: null,
  sort: DEFAULT_SORT,
};

const MAX_SEARCH_LENGTH = 80;

export interface BookingSearchParams {
  q?: string;
  statut?: string;
  paiement?: string;
  tri?: string;
  proprietaire?: string;
}

/** Étape désignée par la valeur d'URL, ou `null` si elle est inconnue. */
function paymentFilterFrom(value: string): PaymentFilter | null {
  return PAYMENT_FILTERS.find((stage) => stageParam(stage) === value) ?? null;
}

function isSort(value: string): value is BookingSort {
  return (SORTS as readonly string[]).includes(value);
}

/** Filtres validés ; une valeur inconnue est ignorée plutôt qu'appliquée. */
export function parseBookingAdminFilters(
  searchParams: BookingSearchParams
): BookingAdminFilters {
  const search = searchParams.q?.trim().slice(0, MAX_SEARCH_LENGTH);

  return {
    search: search ? search : null,
    status:
      searchParams.statut && isBookingStatus(searchParams.statut)
        ? searchParams.statut
        : null,
    payment: searchParams.paiement
      ? paymentFilterFrom(searchParams.paiement)
      : null,
    ownerId: searchParams.proprietaire || null,
    sort:
      searchParams.tri && isSort(searchParams.tri)
        ? searchParams.tri
        : DEFAULT_SORT,
  };
}

/** Un critère autre que le tri par défaut est-il actif ? */
export function hasActiveBookingFilters(
  filters: BookingAdminFilters
): boolean {
  return (
    filters.search !== null ||
    filters.status !== null ||
    filters.payment !== null ||
    filters.ownerId !== null ||
    filters.sort !== DEFAULT_SORT
  );
}

/** Lien vers la liste ainsi filtrée ; les valeurs par défaut sortent de l'URL. */
export function buildBookingsHref(filters: BookingAdminFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set(BOOKING_FILTER_PARAMS.search, filters.search);
  if (filters.status) params.set(BOOKING_FILTER_PARAMS.status, filters.status);
  if (filters.payment) {
    params.set(BOOKING_FILTER_PARAMS.payment, stageParam(filters.payment));
  }
  if (filters.ownerId) params.set(BOOKING_FILTER_PARAMS.owner, filters.ownerId);
  if (filters.sort !== DEFAULT_SORT) {
    params.set(BOOKING_FILTER_PARAMS.sort, filters.sort);
  }

  const query = params.toString();
  return query ? `${ADMIN_BOOKINGS_PATH}?${query}` : ADMIN_BOOKINGS_PATH;
}
