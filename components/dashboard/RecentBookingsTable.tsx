import type { BookingStatus } from "@prisma/client";
import { CalendarX } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";

export interface RecentBookingRow {
  id: string;
  clientName: string;
  roomName: string;
  /** Date de l'événement au format `YYYY-MM-DD`. */
  eventDate: string;
  amount: number;
  status: BookingStatus;
}

/** Tableau des dernières réservations : client, salle, date, montant, statut. */
export function RecentBookingsTable({
  bookings,
}: {
  bookings: RecentBookingRow[];
}) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <CalendarX aria-hidden className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">
          Aucune réservation pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">
          Dernières réservations sur vos salles, avec client, salle, date,
          montant et statut.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th
              scope="col"
              className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Client
            </th>
            <th
              scope="col"
              className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Salle
            </th>
            <th
              scope="col"
              className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Date
            </th>
            <th
              scope="col"
              className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Montant
            </th>
            <th
              scope="col"
              className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Statut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <th
                scope="row"
                className="py-3.5 pr-4 text-left font-medium text-gray-900"
              >
                {booking.clientName}
              </th>
              <td className="py-3.5 pr-4 text-gray-600">{booking.roomName}</td>
              <td className="whitespace-nowrap py-3.5 pr-4 text-gray-600">
                {formatDate(booking.eventDate)}
              </td>
              <td className="whitespace-nowrap py-3.5 pr-4 text-right font-semibold text-gray-900">
                {formatPrice(booking.amount)}
              </td>
              <td className="py-3.5">
                <BookingStatusBadge status={booking.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
