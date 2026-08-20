import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import type { AdminClientRow } from "@/lib/admin/users";
import { AccountStatusBadge } from "@/components/admin/AccountBadges";
import { UserSuspendButton } from "@/components/admin/UserSuspendButton";
import { ADMIN_TABLE_SCROLL, ADMIN_TH, ADMIN_TH_RIGHT } from "@/components/admin/table";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

/**
 * Liste des comptes clients et de leur activité.
 *
 * Le montant affiché est ce qui a réellement été encaissé en espèces, pas la
 * somme des réservations déposées : une demande annulée ou jamais payée ne doit
 * pas gonfler le total d'un client.
 */
export function ClientsTable({ clients }: { clients: AdminClientRow[] }) {
  return (
    <div className={ADMIN_TABLE_SCROLL}>
      <table className="w-full min-w-[900px] text-sm">
        <caption className="sr-only">
          Clients de la plateforme, avec leurs réservations, le montant encaissé
          et le statut du compte.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Client
            </th>
            <th scope="col" className={ADMIN_TH}>
              Email
            </th>
            <th scope="col" className={ADMIN_TH}>
              Inscription
            </th>
            <th scope="col" className={ADMIN_TH}>
              Réservations
            </th>
            <th scope="col" className={ADMIN_TH}>
              Encaissé
            </th>
            <th scope="col" className={ADMIN_TH}>
              Statut
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Accès rapides
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clients.map((client) => (
            <tr key={client.id}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                <span className="flex items-center gap-3">
                  <Avatar
                    name={client.fullName}
                    src={client.avatarUrl}
                    role="CLIENT"
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-gray-900">
                      {client.fullName}
                    </span>
                    {client.phone && (
                      <span className="block truncate text-xs font-normal text-gray-400">
                        {client.phone}
                      </span>
                    )}
                  </span>
                </span>
              </th>
              <td className="py-3 pr-4">
                <a
                  href={`mailto:${client.email}`}
                  className="text-gray-600 underline-offset-2 transition-colors hover:text-primary-900 hover:underline"
                >
                  {client.email}
                </a>
              </td>
              <td className="whitespace-nowrap py-3 pr-4 text-gray-600">
                {formatDate(client.createdAt)}
              </td>
              <td className="py-3 pr-4">
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatNumber(client.bookingsCount)}
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  dont {formatNumber(client.confirmedBookingsCount)} confirmée
                  {client.confirmedBookingsCount > 1 ? "s" : ""}
                </span>
                {client.lastBookingAt && (
                  <span className="block text-xs text-gray-400">
                    dernière le {formatDate(client.lastBookingAt)}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap py-3 pr-4">
                {client.paidTotal === 0 ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : (
                  <span className="font-semibold tabular-nums text-gray-900">
                    {formatPrice(client.paidTotal)}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4">
                <AccountStatusBadge suspended={client.suspendedAt !== null} />
              </td>
              <td className="py-3">
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/admin/reservations?q=${encodeURIComponent(client.email)}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <CalendarCheck aria-hidden className="h-3.5 w-3.5" />
                    Ses réservations
                    <span className="sr-only"> de {client.fullName}</span>
                  </Link>
                  <UserSuspendButton
                    userId={client.id}
                    fullName={client.fullName}
                    suspended={client.suspendedAt !== null}
                    bookingsCount={client.bookingsCount}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
