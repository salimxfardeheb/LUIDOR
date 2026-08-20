import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AdminBookingRow } from "@/lib/admin/bookings";
import { BookingDecisionActions } from "@/components/admin/BookingDecisionActions";
import { PaymentStageBadge } from "@/components/admin/PaymentStageBadge";
import { ADMIN_TABLE_SCROLL, ADMIN_TH, ADMIN_TH_RIGHT } from "@/components/admin/table";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

/**
 * Toutes les réservations de la plateforme.
 *
 * Chaque ligne ouvre le détail : c'est là que se trouvent le dossier client,
 * la salle et l'historique des espèces. La liste ne garde que la décision
 * (confirmer, annuler), le seul geste qui se prend d'un coup d'œil.
 *
 * Le montant est affiché comme estimation tant qu'aucun paiement n'est
 * enregistré : sans cette nuance, un chiffre calculé au tarif de la salle se
 * lirait comme une somme déjà encaissée.
 */
export function BookingsTable({ bookings }: { bookings: AdminBookingRow[] }) {
  return (
    <div className={ADMIN_TABLE_SCROLL}>
      <table className="w-full min-w-[1100px] text-sm">
        <caption className="sr-only">
          Réservations de la plateforme, avec client, salle, date
          d&apos;événement, montant, statut et état du paiement.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Client
            </th>
            <th scope="col" className={ADMIN_TH}>
              Salle
            </th>
            <th scope="col" className={ADMIN_TH}>
              Événement
            </th>
            <th scope="col" className={ADMIN_TH}>
              Montant
            </th>
            <th scope="col" className={ADMIN_TH}>
              Statut
            </th>
            <th scope="col" className={ADMIN_TH}>
              Paiement
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                <span className="flex items-center gap-3">
                  <Avatar
                    name={booking.clientName}
                    src={booking.clientAvatarUrl}
                    role="CLIENT"
                    size="sm"
                  />
                  <span className="min-w-0">
                    <Link
                      href={`/admin/reservations/${booking.id}`}
                      className="block truncate text-gray-900 underline-offset-2 hover:underline"
                    >
                      {booking.clientName}
                    </Link>
                    <span className="block truncate text-xs font-normal text-gray-400">
                      {booking.contactPhone}
                    </span>
                  </span>
                </span>
              </th>
              <td className="py-3 pr-4">
                <Link
                  href={`/salles/${booking.roomId}`}
                  className="block truncate text-gray-900 underline-offset-2 hover:underline"
                >
                  {booking.roomName}
                </Link>
                <span className="block truncate text-xs text-gray-400">
                  {booking.roomCity} · {booking.ownerName}
                </span>
              </td>
              <td className="whitespace-nowrap py-3 pr-4">
                <span className="block text-gray-900">
                  {formatDate(booking.eventDate)}
                </span>
                <span className="block text-xs text-gray-400">
                  {booking.eventType} · {formatNumber(booking.guestsCount)}{" "}
                  invités
                </span>
              </td>
              <td className="whitespace-nowrap py-3 pr-4">
                <span className="block font-semibold tabular-nums text-gray-900">
                  {formatPrice(booking.amount)}
                </span>
                {booking.amountEstimated && (
                  <span className="block text-xs text-gray-400">estimation</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <BookingStatusBadge status={booking.status} />
              </td>
              <td className="py-3 pr-4">
                <PaymentStageBadge payment={booking.payment} />
              </td>
              <td className="py-3">
                <div className="flex flex-col items-end gap-2">
                  <BookingDecisionActions
                    bookingId={booking.id}
                    clientName={booking.clientName}
                    status={booking.status}
                  />
                  <Link
                    href={`/admin/reservations/${booking.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    Ouvrir le détail
                    <span className="sr-only">
                      {" "}
                      de la réservation de {booking.clientName}
                    </span>
                    <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
