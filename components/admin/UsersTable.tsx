import type { AdminUserRow } from "@/lib/admin/users";
import { AccountStatusBadge, UserRoleBadge } from "@/components/admin/AccountBadges";
import { UserSuspendButton } from "@/components/admin/UserSuspendButton";
import { ADMIN_TH, ADMIN_TH_RIGHT } from "@/components/admin/table";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/format";

/**
 * Liste des comptes de la plateforme.
 *
 * Un compte administrateur n'expose pas de bouton de suspension : la règle est
 * appliquée côté action serveur, et l'interface évite de proposer un geste qui
 * sera refusé.
 */
export function UsersTable({ users }: { users: AdminUserRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <caption className="sr-only">
          Comptes de la plateforme, avec rôle, date d&apos;inscription et
          statut.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Nom
            </th>
            <th scope="col" className={ADMIN_TH}>
              Email
            </th>
            <th scope="col" className={ADMIN_TH}>
              Rôle
            </th>
            <th scope="col" className={ADMIN_TH}>
              Inscription
            </th>
            <th scope="col" className={ADMIN_TH}>
              Statut
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                <span className="flex items-center gap-3">
                  <Avatar
                    name={user.fullName}
                    src={user.avatarUrl}
                    role={user.role}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-gray-900">
                      {user.fullName}
                    </span>
                    {user.phone && (
                      <span className="block truncate text-xs font-normal text-gray-400">
                        {user.phone}
                      </span>
                    )}
                  </span>
                </span>
              </th>
              <td className="py-3 pr-4">
                <a
                  href={`mailto:${user.email}`}
                  className="text-gray-600 underline-offset-2 transition-colors hover:text-primary-900 hover:underline"
                >
                  {user.email}
                </a>
              </td>
              <td className="py-3 pr-4">
                <UserRoleBadge role={user.role} />
              </td>
              <td className="whitespace-nowrap py-3 pr-4 text-gray-600">
                {formatDate(user.createdAt)}
              </td>
              <td className="py-3 pr-4">
                <AccountStatusBadge suspended={user.suspendedAt !== null} />
              </td>
              <td className="py-3">
                {user.role === "ADMIN" ? (
                  <p className="text-right text-xs text-gray-400">
                    Compte protégé
                  </p>
                ) : (
                  <UserSuspendButton
                    userId={user.id}
                    fullName={user.fullName}
                    suspended={user.suspendedAt !== null}
                    roomsCount={user.roomsCount}
                    bookingsCount={user.bookingsCount}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
