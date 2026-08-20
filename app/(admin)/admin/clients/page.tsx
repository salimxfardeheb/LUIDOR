import type { Metadata } from "next";
import { Ban, Banknote, CalendarCheck, UserRound } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { listClients } from "@/lib/admin/users";
import {
  buildUsersHref,
  CLIENTS_PATH,
  hasActiveUserFilters,
  NO_USER_FILTERS,
  parseUserFilters,
  type UserSearchParams,
} from "@/lib/admin/users-params";
import { formatNumber, formatPrice } from "@/lib/format";
import { ClientsTable } from "@/components/admin/ClientsTable";
import { StatTiles } from "@/components/admin/StatTiles";
import { UserFilters } from "@/components/admin/UserFilters";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/clients — comptes de rôle CLIENT, protégée (ADMIN).
export const metadata: Metadata = { title: "Clients" };

interface PageProps {
  searchParams: UserSearchParams;
}

export default async function Page({ searchParams }: PageProps) {
  await requireAdminPage(CLIENTS_PATH);

  // Le rôle est imposé par la page : aucun paramètre d'URL ne peut élargir la
  // liste aux propriétaires ou aux comptes administrateur.
  const filters = parseUserFilters(searchParams);
  const clients = await listClients(filters);

  const filtered = hasActiveUserFilters(filters);

  const confirmed = clients.reduce(
    (sum, client) => sum + client.confirmedBookingsCount,
    0
  );
  const paidTotal = clients.reduce((sum, client) => sum + client.paidTotal, 0);
  const suspended = clients.filter(
    (client) => client.suspendedAt !== null
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Les comptes qui réservent des salles sur LIUDOR. Une suspension coupe l'accès sans rien supprimer : elle se lève à tout moment."
      />

      <StatTiles
        tiles={[
          {
            icon: UserRound,
            label: filtered ? "Clients affichés" : "Clients inscrits",
            value: formatNumber(clients.length),
            tone: "primary",
          },
          {
            icon: CalendarCheck,
            label: "Réservations confirmées",
            value: formatNumber(confirmed),
            tone: "accent",
          },
          {
            icon: Banknote,
            label: "Encaissé auprès d'eux",
            value: formatPrice(paidTotal),
            tone: "secondary",
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
        path={CLIENTS_PATH}
        filters={filters}
        searchPlaceholder="Rechercher un client par nom, email ou téléphone…"
      />

      <p className="text-sm text-gray-500" aria-live="polite">
        {clients.length === 0
          ? "Aucun client à afficher."
          : `${clients.length} client${clients.length > 1 ? "s" : ""} affiché${
              clients.length > 1 ? "s" : ""
            }${filtered ? " pour ces filtres" : ""}.`}
      </p>

      {clients.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={
            filtered ? "Aucun client pour ces filtres" : "Aucun client inscrit"
          }
          description={
            filtered
              ? "Aucun compte client ne correspond à la recherche ou au statut sélectionné."
              : "Les comptes créés avec le rôle client apparaîtront ici, avec leurs réservations et les sommes encaissées."
          }
          action={
            filtered
              ? {
                  href: buildUsersHref(CLIENTS_PATH, NO_USER_FILTERS),
                  label: "Voir tous les clients",
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <ClientsTable clients={clients} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
