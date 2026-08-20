import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarRange,
  Store,
  UserRound,
} from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { getAdminOverview } from "@/lib/admin/dashboard";
import { ADMIN_NAV } from "@/lib/admin/navigation";
import { formatMonthYear, formatNumber, formatPrice } from "@/lib/format";
import { StatTiles } from "@/components/admin/StatTiles";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/dashboard — accueil de l'administration, protégée (ADMIN).
export const metadata: Metadata = { title: "Tableau de bord" };

export default async function Page() {
  const session = await requireAdminPage("/admin/dashboard");
  const overview = await getAdminOverview();

  // Les raccourcis reprennent le plan de navigation : une section ajoutée à la
  // colonne apparaît ici sans avoir à tenir une seconde liste à jour.
  const shortcuts = ADMIN_NAV.flatMap((group) => group.items).filter(
    (item) => item.href !== "/admin/dashboard"
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Bonjour, ${session.name}`}
        description="L'état de la plateforme en quatre chiffres. Le détail se trouve dans chaque section."
      />

      <StatTiles
        tiles={[
          {
            icon: UserRound,
            label: "Clients inscrits",
            value: formatNumber(overview.clientsCount),
            tone: "primary",
          },
          {
            icon: Store,
            label: "Propriétaires inscrits",
            value: formatNumber(overview.ownersCount),
            tone: "secondary",
          },
          {
            icon: BadgeCheck,
            label: "Salles à valider",
            value: formatNumber(overview.pendingRoomsCount),
            tone: overview.pendingRoomsCount > 0 ? "warning" : "neutral",
          },
          {
            icon: CalendarRange,
            label: `Réservations en ${formatMonthYear(new Date())}`,
            value: formatNumber(overview.monthBookingsCount),
            tone: "accent",
          },
        ]}
      />

      {/* Le seul état qui appelle une action depuis l'accueil : des espèces
          reçues d'un client et pas encore remises au propriétaire. */}
      {overview.cashToPayout > 0 && (
        <Link
          href="/admin/paiements?etat=a-reverser"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <Banknote aria-hidden className="h-4 w-4 text-warning" />
            <span>
              <span className="font-semibold text-gray-900">
                {formatPrice(overview.cashToPayout)}
              </span>{" "}
              encaissés auprès des clients restent à reverser aux propriétaires.
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary">
            Ouvrir le suivi des paiements
            <ArrowRight aria-hidden className="h-4 w-4" />
          </span>
        </Link>
      )}

      <section aria-labelledby="raccourcis" className="flex flex-col gap-4">
        <h2 id="raccourcis" className="text-lg font-semibold text-gray-900">
          Accès rapides
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <Card className="flex h-full items-center gap-3 p-4 transition-shadow hover:shadow-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-900/10 text-primary-900">
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                  {label}
                </span>
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
