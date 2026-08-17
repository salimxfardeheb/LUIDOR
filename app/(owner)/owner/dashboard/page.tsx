import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, Clock, Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOwnerDashboard } from "@/lib/owner/dashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RecentRoomsTable } from "@/components/owner/RecentRoomsTable";
import { Alert } from "@/components/ui/Alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatMonthYear, formatNumber, formatRating } from "@/lib/format";

// Route /owner/dashboard — protégée, rôle OWNER (middleware).
export const metadata: Metadata = { title: "Tableau de bord" };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { kpis, recentRooms } = await getOwnerDashboard(session.user.id);

  const monthLabel = formatMonthYear(new Date());
  const activeRoomsNote =
    kpis.activeRooms === 1 ? "salle en ligne" : "salles en ligne";
  const pendingRoomsNote =
    kpis.pendingRooms === 1 ? "salle à valider" : "salles à valider";
  const reviewNote =
    kpis.reviewCount === 0
      ? "aucun avis publié"
      : `${formatNumber(kpis.reviewCount)} avis publié${kpis.reviewCount > 1 ? "s" : ""}`;

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

      {/*
        La plateforme ne prend aucune réservation en ligne : le tableau de bord
        ne montre donc ni demande ni revenu, et l'encadré rappelle par où
        passent réellement les clients.
      */}
      <Alert
        variant="info"
        title="Les réservations se font hors ligne"
        className="mt-6"
      >
        Les clients vous contactent directement depuis la fiche de votre salle,
        puis vous convenez ensemble des dates et du règlement. Tenez vos
        disponibilités à jour : c&apos;est ce que le calendrier public affiche.
      </Alert>

      <section
        aria-label="Indicateurs clés"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          icon={Building2}
          label="Salles actives"
          value={formatNumber(kpis.activeRooms)}
          note={activeRoomsNote}
        />
        <KpiCard
          icon={Clock}
          label="En attente"
          value={formatNumber(kpis.pendingRooms)}
          note={pendingRoomsNote}
        />
        <KpiCard
          icon={CalendarDays}
          label="Dates ouvertes"
          value={formatNumber(kpis.openDays)}
          note="sur les 30 prochains jours"
        />
        <KpiCard
          icon={Star}
          label="Note moyenne"
          value={kpis.avgRating !== null ? formatRating(kpis.avgRating) : "—"}
          note={reviewNote}
        />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Vos dernières salles</CardTitle>
          <CardDescription>
            Les salles que vous avez déposées le plus récemment, avec leur
            statut de publication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentRoomsTable rooms={recentRooms} />
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/owner/salles"
          className="font-semibold text-primary-900 underline underline-offset-4"
        >
          Voir toutes mes salles
        </Link>
        <Link
          href="/owner/disponibilites"
          className="font-semibold text-primary-900 underline underline-offset-4"
        >
          Gérer mes disponibilités
        </Link>
      </div>
    </div>
  );
}
