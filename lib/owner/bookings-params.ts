import type { BookingStatus } from "@prisma/client";
import { BOOKING_STATUSES, isBookingStatus } from "@/lib/bookings/status";

/**
 * Filtres de la liste des réservations reçues, lus et écrits dans l'URL.
 *
 * Module sans dépendance à Prisma (import *type-only*) : la barre de filtres
 * est un composant client, elle importe ces helpers pour construire ses liens.
 */

export const RESERVATIONS_PATH = "/owner/reservations";

export const BOOKING_FILTER_PARAMS = { room: "salle", status: "statut" } as const;

/** Valeur du filtre « toutes les salles » / « tous les statuts ». */
export const ALL_FILTER_VALUE = "toutes";

export { BOOKING_STATUSES };

export interface BookingFilters {
  /** `null` = toutes les salles du propriétaire. */
  roomId: string | null;
  /** `null` = tous les statuts. */
  status: BookingStatus | null;
}

export const NO_BOOKING_FILTERS: BookingFilters = { roomId: null, status: null };

export function hasActiveFilters(filters: BookingFilters): boolean {
  return filters.roomId !== null || filters.status !== null;
}

/**
 * Filtres validés à partir des paramètres d'URL.
 *
 * `ownedRoomIds` borne le filtre salle aux salles du propriétaire : un
 * identifiant forgé est ignoré plutôt que transmis à la requête, où il ne
 * renverrait rien tout en laissant l'interface afficher un filtre fantôme.
 */
export function parseBookingFilters(
  searchParams: { salle?: string; statut?: string },
  ownedRoomIds: readonly string[]
): BookingFilters {
  const roomId =
    searchParams.salle && ownedRoomIds.includes(searchParams.salle)
      ? searchParams.salle
      : null;

  const status =
    searchParams.statut && isBookingStatus(searchParams.statut)
      ? searchParams.statut
      : null;

  return { roomId, status };
}

/** Lien vers la liste avec les filtres donnés ; les filtres vides disparaissent. */
export function buildBookingsHref(filters: BookingFilters): string {
  const params = new URLSearchParams();
  if (filters.roomId) params.set(BOOKING_FILTER_PARAMS.room, filters.roomId);
  if (filters.status) params.set(BOOKING_FILTER_PARAMS.status, filters.status);

  const query = params.toString();
  return query ? `${RESERVATIONS_PATH}?${query}` : RESERVATIONS_PATH;
}
