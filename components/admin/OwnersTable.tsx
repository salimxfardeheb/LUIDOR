import Link from "next/link";
import { Building2, CalendarCheck } from "lucide-react";
import type { AdminOwnerRow } from "@/lib/admin/users";
import { AccountStatusBadge } from "@/components/admin/AccountBadges";
import { UserSuspendButton } from "@/components/admin/UserSuspendButton";
import { ADMIN_TABLE_SCROLL, ADMIN_TH, ADMIN_TH_RIGHT } from "@/components/admin/table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/format";

/**
 * Liste des propriétaires et de leur activité.
 *
 * Les deux compteurs sont des points d'entrée : ils mènent aux salles du
 * propriétaire dans la file de validation et à ses réservations, plutôt que de
 * laisser l'administrateur refiltrer une liste à la main.
 */
export function OwnersTable({ owners }: { owners: AdminOwnerRow[] }) {
  return (
    <div className={ADMIN_TABLE_SCROLL}>
      <table className="w-full min-w-[900px] text-sm">
        <caption className="sr-only">
          Propriétaires de la plateforme, avec le nombre de salles, le nombre de
          réservations reçues et le statut du compte.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Propriétaire
            </th>
            <th scope="col" className={ADMIN_TH}>
              Email
            </th>
            <th scope="col" className={ADMIN_TH}>
              Salles
            </th>
            <th scope="col" className={ADMIN_TH}>
              Réservations
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
          {owners.map((owner) => (
            <tr key={owner.id}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                <span className="flex items-center gap-3">
                  <Avatar
                    name={owner.fullName}
                    src={owner.avatarUrl}
                    role="OWNER"
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-gray-900">
                      {owner.fullName}
                    </span>
                    {owner.phone && (
                      <span className="block truncate text-xs font-normal text-gray-400">
                        {owner.phone}
                      </span>
                    )}
                  </span>
                </span>
              </th>
              <td className="py-3 pr-4">
                <a
                  href={`mailto:${owner.email}`}
                  className="text-gray-600 underline-offset-2 transition-colors hover:text-primary-900 hover:underline"
                >
                  {owner.email}
                </a>
              </td>
              <td className="py-3 pr-4">
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatNumber(owner.roomsCount)}
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  dont {formatNumber(owner.activeRoomsCount)} en ligne
                </span>
                {owner.pendingRoomsCount > 0 && (
                  <Badge variant="warning" className="ml-2">
                    {owner.pendingRoomsCount} en attente
                  </Badge>
                )}
              </td>
              <td className="py-3 pr-4">
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatNumber(owner.receivedBookingsCount)}
                </span>
                <span className="ml-2 text-xs text-gray-400">reçues</span>
              </td>
              <td className="py-3 pr-4">
                <AccountStatusBadge suspended={owner.suspendedAt !== null} />
              </td>
              <td className="py-3">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    <QuickLink
                      href={`/admin/salles?proprietaire=${owner.id}`}
                      label="Ses salles"
                      srSuffix={`de ${owner.fullName}`}
                    >
                      <Building2 aria-hidden className="h-3.5 w-3.5" />
                    </QuickLink>
                    <QuickLink
                      href={`/admin/reservations?proprietaire=${owner.id}`}
                      label="Ses réservations"
                      srSuffix={`de ${owner.fullName}`}
                    >
                      <CalendarCheck aria-hidden className="h-3.5 w-3.5" />
                    </QuickLink>
                  </div>
                  <UserSuspendButton
                    userId={owner.id}
                    fullName={owner.fullName}
                    suspended={owner.suspendedAt !== null}
                    roomsCount={owner.roomsCount}
                    bookingsCount={owner.receivedBookingsCount}
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

function QuickLink({
  href,
  label,
  srSuffix,
  children,
}: {
  href: string;
  label: string;
  /** Complément lu par les lecteurs d'écran : « Ses salles de Karim Haddad ». */
  srSuffix: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      {children}
      {label}
      <span className="sr-only"> {srSuffix}</span>
    </Link>
  );
}
