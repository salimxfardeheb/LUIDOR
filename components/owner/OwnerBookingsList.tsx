import { Mail, Phone } from "lucide-react";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { paymentNote } from "@/lib/bookings/status";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import type { OwnerBookingRow } from "@/lib/owner/bookings";

/**
 * Liste des réservations reçues, en lecture seule.
 *
 * Deux rendus pour une même donnée : un tableau dense à partir de `md`, des
 * cartes en dessous — six colonnes dont des coordonnées ne tiennent pas sur un
 * téléphone, et un tableau à défilement horizontal y serait pénible à lire.
 */
export function OwnerBookingsList({
  bookings,
}: {
  bookings: OwnerBookingRow[];
}) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <BookingCard booking={booking} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Réservations reçues sur vos salles : client, coordonnées, salle,
            date, montant et statut.
          </caption>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {["Client", "Coordonnées", "Salle", "Date", "Montant", "Statut"].map(
                (heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 ${
                      heading === "Montant" ? "text-right" : "text-left"
                    }`}
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((booking) => (
              <tr key={booking.id} className="align-top">
                <th
                  scope="row"
                  className="px-4 py-4 text-left font-medium text-gray-900"
                >
                  {booking.clientName}
                  <span className="mt-0.5 block text-xs font-normal text-gray-400">
                    reçue le {formatDate(booking.createdAt)}
                  </span>
                </th>
                <td className="px-4 py-4">
                  <ContactLinks booking={booking} />
                </td>
                <td className="px-4 py-4 text-gray-600">
                  {booking.roomName}
                  <span className="mt-0.5 block text-xs text-gray-400">
                    {booking.roomCity}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                  {formatDate(booking.eventDate)}
                  <span className="mt-0.5 block text-xs text-gray-400">
                    {booking.eventType} ·{" "}
                    {formatNumber(booking.guestsCount)} invités
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-gray-900">
                  {formatPrice(booking.amount)}
                  <span className="mt-0.5 block text-xs font-normal text-gray-400">
                    {paymentNote(booking.paymentStatus)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <BookingStatusBadge status={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BookingCard({ booking }: { booking: OwnerBookingRow }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {booking.clientName}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            reçue le {formatDate(booking.createdAt)}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <ContactLinks booking={booking} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-gray-400">
            Salle
          </dt>
          <dd className="mt-0.5 text-gray-700">
            {booking.roomName}{" "}
            <span className="text-gray-400">· {booking.roomCity}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400">Date</dt>
          <dd className="mt-0.5 text-gray-700">
            {formatDate(booking.eventDate)}
          </dd>
          <dd className="text-xs text-gray-400">
            {booking.eventType} · {formatNumber(booking.guestsCount)} invités
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs uppercase tracking-wide text-gray-400">
            Montant
          </dt>
          <dd className="mt-0.5 font-semibold text-gray-900">
            {formatPrice(booking.amount)}
          </dd>
          <dd className="text-xs text-gray-400">{paymentNote(booking.paymentStatus)}</dd>
        </div>
      </dl>
    </article>
  );
}

/** Coordonnées cliquables : le propriétaire contacte le client sans recopie. */
function ContactLinks({ booking }: { booking: OwnerBookingRow }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      <li>
        <a
          href={`mailto:${booking.contactEmail}`}
          className="inline-flex max-w-full items-center gap-1.5 text-gray-600 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Mail aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{booking.contactEmail}</span>
        </a>
      </li>
      <li>
        <a
          href={`tel:${booking.contactPhone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-gray-600 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Phone aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          {booking.contactPhone}
        </a>
      </li>
    </ul>
  );
}

