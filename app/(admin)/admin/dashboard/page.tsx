import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Banknote, Building2, CalendarCheck, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getAdminDashboard,
  SERIES_MONTHS,
  type AdminDashboardData,
} from "@/lib/admin/dashboard";
import { lastMonths, longMonthLabel, monthKey, parseMonthKey } from "@/lib/months";
import { BOOKING_STATUSES, BOOKING_STATUS_MAP } from "@/lib/bookings/status";
import { ROLE_LABELS } from "@/lib/roles";
import { formatNumber, formatPrice } from "@/lib/format";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { PendingRequestsTable } from "@/components/admin/PendingRequestsTable";
import { RecentRoomsTable } from "@/components/admin/RecentRoomsTable";
import { AreaChart } from "@/components/dashboard/AreaChart";
import { BarList } from "@/components/dashboard/BarList";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ROLE_COLORS, VARIANT_COLORS } from "@/components/dashboard/chart-colors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

// Route /admin/dashboard — protégée, rôle ADMIN (middleware).
export const metadata: Metadata = { title: "Tableau de bord" };

interface PageProps {
  /** `?mois=YYYY-MM` : mois analysé, mois en cours par défaut. */
  searchParams: { mois?: string };
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const month = parseMonthKey(searchParams.mois) ?? new Date();
  const data = await getAdminDashboard(month);

  return (
    <div className="flex flex-col gap-6">
      <AdminHeader
        name={session.user.name ?? "Administrateur"}
        avatarUrl={session.user.image ?? null}
        title={`Bonjour, ${firstName(session.user.name)}`}
        subtitle={`Voici l'activité de la plateforme LIUDOR ${
          data.month.isCurrent ? "ce mois-ci" : `en ${data.month.label}`
        }.`}
        pendingCount={data.badges.pendingRooms}
        messagesCount={data.badges.unreadMessages}
        month={data.month.key}
        monthOptions={monthOptions()}
      />

      <KpiSection data={data} />
      <ChartsSection data={data} />

      <Card>
        <CardHeader>
          <CardTitle>Gestion des salles récentes</CardTitle>
          <CardDescription>
            Les dernières salles inscrites sur la plateforme, tous statuts
            confondus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentRoomsTable rooms={data.recentRooms} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demandes d&apos;inscription en attente</CardTitle>
          <CardDescription>
            Dossiers déposés par les propriétaires et non encore validés, du plus
            ancien au plus récent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingRequestsTable requests={data.pendingRequests} />
        </CardContent>
      </Card>
    </div>
  );
}

/** Les quatre indicateurs de tête, avec leur évolution mensuelle. */
function KpiSection({ data }: { data: AdminDashboardData }) {
  const { kpis, month } = data;
  const trendLabel = `vs ${month.previousLabel}`;

  return (
    <section
      aria-label="Indicateurs clés de la plateforme"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <KpiCard
        icon={Building2}
        tone="primary"
        label="Nombre de salles"
        value={formatNumber(kpis.rooms.value)}
        note="salles inscrites sur la plateforme"
        trend={{ change: kpis.rooms.change, label: trendLabel }}
      />
      <KpiCard
        icon={CalendarCheck}
        tone="accent"
        label="Réservations du mois"
        value={formatNumber(kpis.bookings.value)}
        note={`demandes enregistrées en ${month.label}`}
        trend={{ change: kpis.bookings.change, label: trendLabel }}
      />
      <KpiCard
        icon={Users}
        tone="secondary"
        label="Utilisateurs inscrits"
        value={formatNumber(kpis.users.value)}
        note="comptes clients, propriétaires et administrateurs"
        trend={{ change: kpis.users.change, label: trendLabel }}
      />
      <KpiCard
        icon={Banknote}
        tone="success"
        label="Paiements en espèces"
        value={formatPrice(kpis.cashRevenue.value)}
        note={`encaissements enregistrés en ${month.label}`}
        trend={{ change: kpis.cashRevenue.change, label: trendLabel }}
      />
    </section>
  );
}

/** Graphiques et fil d'activité. */
function ChartsSection({ data }: { data: AdminDashboardData }) {
  const firstMonth = data.bookingsSeries[0]?.label ?? "—";
  const lastMonth =
    data.bookingsSeries[data.bookingsSeries.length - 1]?.label ?? "—";

  const statusSlices = BOOKING_STATUSES.map((status) => ({
    label: BOOKING_STATUS_MAP[status].label,
    value: data.bookingsByStatus.find((row) => row.status === status)?.value ?? 0,
    color: VARIANT_COLORS[BOOKING_STATUS_MAP[status].variant],
  }));

  const roleSlices = (["CLIENT", "OWNER", "ADMIN"] as const).map((role) => ({
    label: ROLE_LABELS[role].label,
    value: data.usersByRole.find((row) => row.role === role)?.value ?? 0,
    color: ROLE_COLORS[role],
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Évolution des réservations</CardTitle>
          <CardDescription>
            Réservations enregistrées chaque mois, sur les {SERIES_MONTHS}{" "}
            derniers mois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={data.bookingsSeries}
            ariaLabel={`Nombre de réservations enregistrées par mois sur la plateforme, de ${firstMonth} à ${lastMonth}.`}
            format="number"
          />
        </CardContent>
      </Card>

      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Les dernières actions enregistrées sur la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed items={data.recentActivity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Répartition des réservations par statut</CardTitle>
          <CardDescription>
            Statuts des réservations enregistrées en {data.month.label}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DonutChart
            data={statusSlices}
            centerLabel="réservations"
            className={DONUT_LAYOUT}
            ariaLabel={`Répartition par statut des réservations enregistrées en ${data.month.label}.`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs par rôle</CardTitle>
          <CardDescription>
            Ensemble des comptes créés à ce jour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DonutChart
            data={roleSlices}
            centerLabel="comptes"
            className={DONUT_LAYOUT}
            ariaLabel="Répartition des comptes de la plateforme par rôle."
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Répartition des salles par ville</CardTitle>
          <CardDescription>
            Villes où les propriétaires ont inscrit le plus de salles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarList
            data={data.roomsByCity.map((row) => ({
              label: row.city,
              value: row.value,
            }))}
            emptyMessage="Aucune salle inscrite pour le moment."
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Les deux anneaux occupent un tiers de la grille à partir de `lg` : trop
 * étroit pour poser la légende à côté du cercle. La mise en colonne y revient
 * donc, et l'alignement horizontal ne reprend qu'une fois la carte assez large.
 */
const DONUT_LAYOUT = "lg:flex-col 2xl:flex-row";

/** Prénom seul, pour un message d'accueil qui ne récite pas l'état civil. */
function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? "Administrateur";
}

/**
 * Mois proposés par le sélecteur : les douze derniers, du plus récent au plus
 * ancien. Chaque option porte sa destination — le composant de filtre n'a
 * aucune règle d'URL à connaître.
 */
function monthOptions() {
  const now = new Date();

  return lastMonths(SERIES_MONTHS, now)
    .slice()
    .reverse()
    .map(({ key, date }) => ({
      value: key,
      label:
        key === monthKey(now)
          ? `Ce mois-ci (${longMonthLabel(date)})`
          : capitalize(longMonthLabel(date)),
      href: `/admin/dashboard?mois=${key}`,
    }));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
