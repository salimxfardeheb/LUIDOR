import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet, CalendarCheck, Building2, Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOwnerDashboard } from "@/lib/owner/dashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AreaChart } from "@/components/dashboard/AreaChart";
import { RecentBookingsTable } from "@/components/dashboard/RecentBookingsTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatMonthYear, formatNumber, formatPrice, formatRating } from "@/lib/format";

// Route /owner/dashboard — protégée, rôle OWNER (middleware).
export const metadata: Metadata = { title: "Tableau de bord" };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { kpis, monthlySeries, recentBookings } = await getOwnerDashboard(
    session.user.id
  );

  const monthLabel = formatMonthYear(new Date());
  const activeRoomsNote =
    kpis.activeRooms === 1 ? "salle en ligne" : "salles en ligne";

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d&apos;ensemble de votre activité sur LIUDOR en {monthLabel}.
        </p>
      </header>

      <section
        aria-label="Indicateurs clés"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          icon={Wallet}
          label="Revenus du mois"
          value={formatPrice(kpis.revenueMonth)}
          note="réservations confirmées ce mois-ci"
        />
        <KpiCard
          icon={CalendarCheck}
          label="Réservations"
          value={formatNumber(kpis.bookingsCount)}
          note="événements ce mois-ci"
        />
        <KpiCard
          icon={Building2}
          label="Salles actives"
          value={formatNumber(kpis.activeRooms)}
          note={activeRoomsNote}
        />
        <KpiCard
          icon={Star}
          label="Note moyenne"
          value={kpis.avgRating !== null ? formatRating(kpis.avgRating) : "—"}
          note="avis reçus sur vos salles"
        />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Réservations par mois</CardTitle>
          <CardDescription>
            Nombre de réservations reçues sur vos salles, sur les 12 derniers
            mois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={monthlySeries.map(({ label, count }) => ({
              label,
              value: count,
            }))}
            ariaLabel={`Nombre de réservations par mois sur vos salles, de ${
              monthlySeries[0]?.label ?? "—"
            } à ${monthlySeries[monthlySeries.length - 1]?.label ?? "—"}.`}
            format="number"
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dernières réservations</CardTitle>
          <CardDescription>
            Les réservations les plus récentes sur vos salles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentBookingsTable bookings={recentBookings} />
        </CardContent>
      </Card>
    </div>
  );
}
