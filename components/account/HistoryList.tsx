import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ReviewDialog } from "@/components/account/ReviewDialog";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { paymentNote } from "@/lib/bookings/status";
import { formatDate, formatPrice } from "@/lib/format";
import type { AccountHistoryEntry } from "@/lib/account/bookings";

/**
 * Historique des réservations, en liste compacte.
 *
 * Tableau dense à partir de `md`, cartes empilées en dessous : les cinq
 * colonnes ne tiennent pas sur un téléphone et un tableau à défilement
 * horizontal y serait pénible à lire.
 */
export function HistoryList({ entries }: { entries: AccountHistoryEntry[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-gray-900">
                  <RoomLink entry={entry} />
                </h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  {entry.eventType} · {entry.roomCity}
                </p>
              </div>
              <BookingStatusBadge status={entry.status} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">
                  Date
                </dt>
                <dd className="mt-0.5 text-gray-700">
                  {formatDate(entry.eventDate)}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs uppercase tracking-wide text-gray-400">
                  Montant
                </dt>
                <dd className="mt-0.5 font-semibold text-gray-900">
                  {formatPrice(entry.amount)}
                </dd>
                <dd className="text-xs text-gray-400">
                  {paymentNote(entry.paymentStatus)}
                </dd>
              </div>
            </dl>

            <ReviewCell entry={entry} />
          </li>
        ))}
      </ul>

      {/* `relative` : sans bloc conteneur, les libellés `sr-only` du tableau
          échapperaient au découpage du défilement et étireraient la page. */}
      <div className="relative hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Historique de vos réservations terminées ou annulées : salle, date,
            montant, statut et avis.
          </caption>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {["Salle", "Date", "Montant", "Statut", "Avis"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 ${
                    heading === "Montant" ? "text-right" : "text-left"
                  }`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="align-middle">
                <th
                  scope="row"
                  className="px-4 py-4 text-left font-medium text-gray-900"
                >
                  <RoomLink entry={entry} />
                  <span className="mt-0.5 block text-xs font-normal text-gray-400">
                    {entry.eventType} · {entry.roomCity}
                  </span>
                </th>
                <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                  {formatDate(entry.eventDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-gray-900">
                  {formatPrice(entry.amount)}
                  <span className="mt-0.5 block text-xs font-normal text-gray-400">
                    {paymentNote(entry.paymentStatus)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <BookingStatusBadge status={entry.status} />
                </td>
                <td className="px-4 py-4">
                  <ReviewCell entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RoomLink({ entry }: { entry: AccountHistoryEntry }) {
  return (
    <Link
      href={`/salles/${entry.roomId}`}
      className="rounded-md transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      {entry.roomName}
    </Link>
  );
}

/**
 * Colonne « avis » : l'action n'apparaît que sur un événement clôturé et non
 * encore noté. Une salle déjà notée affiche la mention, une réservation annulée
 * n'ouvre aucun droit à avis.
 */
function ReviewCell({ entry }: { entry: AccountHistoryEntry }) {
  if (entry.canReview) {
    return <ReviewDialog roomId={entry.roomId} roomName={entry.roomName} />;
  }

  if (entry.reviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
        <CheckCircle2 aria-hidden className="h-4 w-4" />
        Avis publié
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-400">
      {entry.status === "ANNULEE" ? "Réservation annulée" : "—"}
    </span>
  );
}
