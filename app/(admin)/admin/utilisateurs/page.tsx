import type { Metadata } from "next";
import { Ban, Store, UserRound, Users } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { getUserCounts, listUsers } from "@/lib/admin/users";
import {
  buildUsersHref,
  hasActiveUserFilters,
  NO_USER_FILTERS,
  parseUserFilters,
  USERS_PATH,
  type UserSearchParams,
} from "@/lib/admin/users-params";
import { formatNumber } from "@/lib/format";
import { StatTiles } from "@/components/admin/StatTiles";
import { UserFilters } from "@/components/admin/UserFilters";
import { UsersTable } from "@/components/admin/UsersTable";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/utilisateurs — comptes de la plateforme, protégée (ADMIN).
export const metadata: Metadata = { title: "Utilisateurs" };

interface PageProps {
  searchParams: UserSearchParams;
}

export default async function Page({ searchParams }: PageProps) {
  await requireAdminPage(USERS_PATH);

  const filters = parseUserFilters(searchParams);
  const [users, counts] = await Promise.all([listUsers(filters), getUserCounts()]);

  const filtered = hasActiveUserFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestion des utilisateurs"
        description="Tous les comptes de la plateforme. Une suspension coupe l'accès à LIUDOR sans rien supprimer : elle se lève à tout moment."
      />

      <StatTiles
        tiles={[
          {
            icon: Users,
            label: "Comptes au total",
            value: formatNumber(counts.total),
            tone: "primary",
          },
          {
            icon: UserRound,
            label: "Clients",
            value: formatNumber(counts.byRole.CLIENT),
            tone: "neutral",
          },
          {
            icon: Store,
            label: "Propriétaires",
            value: formatNumber(counts.byRole.OWNER),
            tone: "secondary",
          },
          {
            icon: Ban,
            label: "Comptes suspendus",
            value: formatNumber(counts.suspended),
            tone: counts.suspended > 0 ? "error" : "neutral",
          },
        ]}
      />

      <UserFilters path={USERS_PATH} filters={filters} />

      <p className="text-sm text-gray-500" aria-live="polite">
        {users.length === 0
          ? "Aucun compte à afficher."
          : `${users.length} compte${users.length > 1 ? "s" : ""} affiché${
              users.length > 1 ? "s" : ""
            }${filtered ? " pour ces filtres" : ""}.`}
      </p>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            filtered ? "Aucun compte pour ces filtres" : "Aucun compte inscrit"
          }
          description={
            filtered
              ? "Aucun compte ne correspond à la recherche, au rôle ou au statut sélectionné."
              : "Les inscriptions sur LIUDOR apparaîtront ici, clients et propriétaires confondus."
          }
          action={
            filtered
              ? {
                  href: buildUsersHref(USERS_PATH, NO_USER_FILTERS),
                  label: "Voir tous les comptes",
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <UsersTable users={users} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
