import Link from "next/link";
import type { AdminOption } from "@/lib/admin/bookings";
import type { PaymentRow } from "@/lib/admin/payments";
import { CashMovementActions } from "@/components/admin/CashMovementActions";
import { PaymentStageBadge } from "@/components/admin/PaymentStageBadge";
import { ADMIN_TH, ADMIN_TH_RIGHT } from "@/components/admin/table";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatPrice } from "@/lib/format";

/**
 * Suivi des espèces, réservation par réservation.
 *
 * Deux colonnes de montants plutôt qu'une : ce que le client a remis à LIUDOR,
 * et ce que LIUDOR a remis au propriétaire. Les lire côte à côte est tout
 * l'intérêt de la page — un écart entre les deux, ou une case vide à droite,
 * saute aux yeux sans avoir à ouvrir le dossier.
 */
export function PaymentsTable({
  rows,
  admins,
  currentAdminId,
}: {
  rows: PaymentRow[];
  admins: AdminOption[];
  currentAdminId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <caption className="sr-only">
          Paiements en espèces des réservations : somme reçue du client, somme
          reversée au propriétaire et étape en cours.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Client
            </th>
            <th scope="col" className={ADMIN_TH}>
              Salle et propriétaire
            </th>
            <th scope="col" className={ADMIN_TH}>
              Événement
            </th>
            <th scope="col" className={ADMIN_TH}>
              Reçu du client
            </th>
            <th scope="col" className={ADMIN_TH}>
              Reversé au propriétaire
            </th>
            <th scope="col" className={ADMIN_TH}>
              Étape
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.bookingId}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                <span className="flex items-center gap-3">
                  <Avatar
                    name={row.clientName}
                    src={row.clientAvatarUrl}
                    role="CLIENT"
                    size="sm"
                  />
                  <span className="min-w-0">
                    <Link
                      href={`/admin/reservations/${row.bookingId}`}
                      className="block truncate text-gray-900 underline-offset-2 hover:underline"
                    >
                      {row.clientName}
                    </Link>
                    <span className="block truncate text-xs font-normal text-gray-400">
                      {row.clientPhone}
                    </span>
                  </span>
                </span>
              </th>
              <td className="py-3 pr-4">
                <Link
                  href={`/salles/${row.roomId}`}
                  className="block truncate text-gray-900 underline-offset-2 hover:underline"
                >
                  {row.roomName}
                </Link>
                <span className="block truncate text-xs text-gray-400">
                  {row.roomCity} · {row.ownerName}
                </span>
              </td>
              <td className="whitespace-nowrap py-3 pr-4">
                <span className="block text-gray-900">
                  {formatDate(row.eventDate)}
                </span>
                <span className="block text-xs text-gray-400">
                  {row.eventType}
                </span>
              </td>
              <td className="whitespace-nowrap py-3 pr-4">
                {row.payment?.status === "PAID" ? (
                  <>
                    <span className="block font-semibold tabular-nums text-gray-900">
                      {formatPrice(row.payment.amount)}
                    </span>
                    {row.payment.paidAt && (
                      <span className="block text-xs text-gray-400">
                        le {formatDate(row.payment.paidAt)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="block tabular-nums text-gray-400">
                      {formatPrice(row.amount)}
                    </span>
                    <span className="block text-xs text-gray-400">attendu</span>
                  </>
                )}
              </td>
              <td className="whitespace-nowrap py-3 pr-4">
                {row.payment?.payoutAt ? (
                  <>
                    <span className="block font-semibold tabular-nums text-gray-900">
                      {formatPrice(row.payment.payoutAmount ?? 0)}
                    </span>
                    <span className="block text-xs text-gray-400">
                      le {formatDate(row.payment.payoutAt)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <PaymentStageBadge payment={row.payment} />
              </td>
              <td className="py-3">
                <CashMovementActions
                  bookingId={row.bookingId}
                  clientName={row.clientName}
                  roomName={row.roomName}
                  ownerName={row.ownerName}
                  bookingStatus={row.bookingStatus}
                  expectedAmount={row.amount}
                  payment={row.payment}
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
