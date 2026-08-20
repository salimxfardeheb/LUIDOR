import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AdminBookingRow } from "@/lib/admin/bookings";
import { BookingDecisionActions } from "@/components/admin/BookingDecisionActions";
import { PaymentStageBadge } from "@/components/admin/PaymentStageBadge";
import {
  ADMIN_ROW_ACTION,
  ADMIN_TABLE_SCROLL,
  ADMIN_TH,
  ADMIN_TH_RIGHT,
} from "@/components/admin/table";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

/**
 * Toutes les réservations de la plateforme.
 *
 * Chaque ligne ouvre le détail : c'est là que se trouvent le dossier client,
 * la salle et l'historique des espèces. La liste ne garde que la décision
 * (prendre en charge, confirmer, annuler), le seul geste qui se prend d'un
 * coup d'œil.
 *
 * **Deux mises en page pour une même liste.** Sept colonnes plus deux boutons
 * d'action réclament près de 1 100 px ; la colonne d'administration en offre
 * environ 1 000 sur un portable, et le tableau se rognait — les actions
 * passaient sous le bord droit, sans que rien n'indique qu'il fallait faire
 * défiler. En dessous de `2xl`, la même donnée est donc présentée en cartes,
 * qui n'ont pas de largeur minimale ; le tableau ne reparaît que là où il tient.
 *
 * L'une des deux est toujours en `display: none`, donc absente de l'arbre
 * d'accessibilité : un lecteur d'écran ne rencontre jamais la liste en double.
 *
 * Le montant est affiché comme estimation tant qu'aucun paiement n'est
 * enregistré : sans cette nuance, un chiffre calculé au tarif de la salle se
 * lirait comme une somme déjà encaissée.
 */
export function BookingsTable({ bookings }: { bookings: AdminBookingRow[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 2xl:hidden">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <BookingCard booking={booking} />
          </li>
        ))}
      </ul>

      <div className={`${ADMIN_TABLE_SCROLL} hidden 2xl:block`}>
        <table className="w-full min-w-[1040px] text-sm">
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
                    <span className="block text-xs text-gray-400">
                      estimation
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <BookingStatusBadge status={booking.status} />
                </td>
                <td className="py-3 pr-4">
                  <PaymentStageBadge payment={booking.payment} />
                </td>
                {/*
                  Actions sur une seule ligne, et l'ouverture du détail réduite à
                  son icône : empilées, elles doublaient la hauteur de la ligne
                  et débordaient de la colonne.
                */}
                <td className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <BookingDecisionActions
                      bookingId={booking.id}
                      clientName={booking.clientName}
                      status={booking.status}
                    />
                    <Link
                      href={`/admin/reservations/${booking.id}`}
                      aria-label={`Ouvrir le détail de la réservation de ${booking.clientName}`}
                      className={ADMIN_ROW_ACTION}
                    >
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Une réservation en carte, pour les largeurs où le tableau ne tient pas.
 *
 * Même contenu, autre agencement : l'identité et l'état en tête, les trois
 * faits du dossier en dessous, les gestes en pied. Rien n'est tronqué et rien
 * ne défile latéralement.
 */
function BookingCard({ booking }: { booking: AdminBookingRow }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={booking.clientName}
            src={booking.clientAvatarUrl}
            role="CLIENT"
            size="sm"
          />
          <div className="min-w-0">
            <Link
              href={`/admin/reservations/${booking.id}`}
              className="block truncate font-medium text-gray-900 underline-offset-2 hover:underline"
            >
              {booking.clientName}
            </Link>
            <span className="block truncate text-xs text-gray-400">
              {booking.contactPhone}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <PaymentStageBadge payment={booking.payment} />
        </div>
      </div>

      <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label="Salle">
          <Link
            href={`/salles/${booking.roomId}`}
            className="block truncate text-gray-900 underline-offset-2 hover:underline"
          >
            {booking.roomName}
          </Link>
          <span className="block truncate text-xs text-gray-400">
            {booking.roomCity} · {booking.ownerName}
          </span>
        </Fact>

        <Fact label="Événement">
          <span className="block text-gray-900">
            {formatDate(booking.eventDate)}
          </span>
          <span className="block text-xs text-gray-400">
            {booking.eventType} · {formatNumber(booking.guestsCount)} invités
          </span>
        </Fact>

        <Fact label="Montant">
          <span className="block font-semibold tabular-nums text-gray-900">
            {formatPrice(booking.amount)}
          </span>
          {booking.amountEstimated && (
            <span className="block text-xs text-gray-400">estimation</span>
          )}
        </Fact>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
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
    </article>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
