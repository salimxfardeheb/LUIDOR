import type { Metadata } from "next";
import { Ban, Building2, CalendarCheck, Store } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { listOwners } from "@/lib/admin/users";
import {
  buildUsersHref,
  hasActiveUserFilters,
  NO_USER_FILTERS,
  OWNERS_PATH,
  parseUserFilters,
  type UserSearchParams,
} from "@/lib/admin/users-params";
import { formatNumber } from "@/lib/format";
import { OwnersTable } from "@/components/admin/OwnersTable";
import { StatTiles } from "@/components/admin/StatTiles";
import { UserFilters } from "@/components/admin/UserFilters";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/proprietaires — comptes de rôle OWNER, protégée (ADMIN).
export const metadata: Metadata = { title: "Propriétaires" };

interface PageProps {
  searchParams: UserSearchParams;
}

export default async function Page({ searchParams }: PageProps) {
  await requireAdminPage(OWNERS_PATH);

  // Le rôle est imposé par la page : le filtre de rôle n'est pas proposé, et
  // un `?role=` dans l'URL ne peut pas élargir la liste à d'autres comptes.
  const filters = parseUserFilters(searchParams, "OWNER");
  const owners = await listOwners(filters);

  const filtered = hasActiveUserFilters(filters, { ignoreRole: true });

  const activeRooms = owners.reduce(
    (sum, owner) => sum + owner.activeRoomsCount,
    0
  );
  const bookings = owners.reduce(
    (sum, owner) => sum + owner.receivedBookingsCount,
    0
  );
  const suspended = owners.filter((owner) => owner.suspendedAt !== null).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestion des propriétaires"
        description="Les comptes qui publient des salles sur LIUDOR, avec leur activité et un accès direct à leurs dossiers."
      />

      <StatTiles
        tiles={[
          {
            icon: Store,
            label: filtered ? "Propriétaires affichés" : "Propriétaires",
            value: formatNumber(owners.length),
            tone: "secondary",
          },
          {
            icon: Building2,
            label: "Salles en ligne",
            value: formatNumber(activeRooms),
            tone: "primary",
          },
          {
            icon: CalendarCheck,
            label: "Réservations reçues",
            value: formatNumber(bookings),
            tone: "accent",
          },
          {
            icon: Ban,
            label: "Comptes suspendus",
            value: formatNumber(suspended),
            tone: suspended > 0 ? "error" : "neutral",
          },
        ]}
      />

      <UserFilters
        path={OWNERS_PATH}
        filters={filters}
        showRoleFilter={false}
        searchPlaceholder="Rechercher un propriétaire par nom ou email…"
      />

      <p className="text-sm text-gray-500" aria-live="polite">
        {owners.length === 0
          ? "Aucun propriétaire à afficher."
          : `${owners.length} propriétaire${owners.length > 1 ? "s" : ""} affiché${
              owners.length > 1 ? "s" : ""
            }${filtered ? " pour ces filtres" : ""}.`}
      </p>

      {owners.length === 0 ? (
        <EmptyState
          icon={Store}
          title={
            filtered
              ? "Aucun propriétaire pour ces filtres"
              : "Aucun propriétaire inscrit"
          }
          description={
            filtered
              ? "Aucun compte propriétaire ne correspond à la recherche ou au statut sélectionné."
              : "Les comptes créés avec le rôle propriétaire apparaîtront ici, avec le nombre de salles et de réservations."
          }
          action={
            filtered
              ? {
                  href: buildUsersHref(OWNERS_PATH, {
                    ...NO_USER_FILTERS,
                    role: "OWNER",
                  }),
                  label: "Voir tous les propriétaires",
                }
              : { href: "/admin/utilisateurs", label: "Voir tous les comptes" }
          }
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <OwnersTable owners={owners} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
