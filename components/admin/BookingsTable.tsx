import Link from "next/link";
import type { AdminBookingRow, AdminOption } from "@/lib/admin/bookings";
import { BookingRowActions } from "@/components/admin/BookingRowActions";
import { ADMIN_TH, ADMIN_TH_RIGHT } from "@/components/admin/table";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PAYMENT_STATUS_LABELS } from "@/lib/admin/bookings-params";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

/**
 * Toutes les réservations de la plateforme.
 *
 * Le montant est affiché comme estimation tant qu'aucun paiement n'est
 * enregistré : sans cette nuance, un chiffre calculé au tarif de la salle se
 * lirait comme une somme déjà encaissée.
 */
export function BookingsTable({
  bookings,
  admins,
  currentAdminId,
}: {
  bookings: AdminBookingRow[];
  admins: AdminOption[];
  currentAdminId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <caption className="sr-only">
          Réservations de la plateforme, avec client, salle, date
          d&apos;événement, montant, statut et paiement.
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
                    <span className="block truncate text-gray-900">
                      {booking.clientName}
                    </span>
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
                {booking.paymentStatus === null ? (
                  <span className="text-xs text-gray-400">Non enregistré</span>
                ) : (
                  <>
                    <Badge
                      variant={
                        booking.paymentStatus === "PAID"
                          ? "success"
                          : booking.paymentStatus === "REFUNDED"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {PAYMENT_STATUS_LABELS[booking.paymentStatus]}
                    </Badge>
                    {booking.recordedByName && (
                      <span className="mt-1 block text-xs text-gray-400">
                        par {booking.recordedByName}
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className="py-3">
                <BookingRowActions
                  bookingId={booking.id}
                  clientName={booking.clientName}
                  roomName={booking.roomName}
                  status={booking.status}
                  expectedAmount={booking.amount}
                  alreadyPaid={booking.paymentStatus === "PAID"}
                  admins={admins}
                  currentAdminId={currentAdminId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
