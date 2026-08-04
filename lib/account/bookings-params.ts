import type { BookingStatus } from "@prisma/client";
import { isBookingStatus } from "@/lib/bookings/status";

/**
 * Filtre de la page « Mes réservations », porté par l'URL.
 *
 * Sans dépendance à Prisma (import *type-only*) : le sélecteur de statut est un
 * composant client, il construit ses liens à partir d'ici.
 */

export const ACCOUNT_BOOKINGS_PATH = "/reservations";

export const STATUS_PARAM = "statut";

/** Valeur du choix « tous les statuts ». */
export const ALL_STATUS_VALUE = "tous";

/** Statut validé depuis l'URL ; toute valeur inconnue vaut « tous ». */
export function parseBookingStatusParam(
  value: string | undefined
): BookingStatus | null {
  return value && isBookingStatus(value) ? value : null;
}

export function buildAccountBookingsHref(status: BookingStatus | null): string {
  return status
    ? `${ACCOUNT_BOOKINGS_PATH}?${STATUS_PARAM}=${status}`
    : ACCOUNT_BOOKINGS_PATH;
}
