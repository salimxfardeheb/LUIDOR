import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";
import { HistoryList } from "@/components/account/HistoryList";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { auth } from "@/lib/auth";
import { listAccountHistory } from "@/lib/account/bookings";
import { SIGN_IN_PATH } from "@/lib/roles";

// Route /historique — protégée. Ne remonte que les réservations clôturées ou
// annulées du compte connecté (`clientId` filtré en base).
export const metadata: Metadata = { title: "Historique" };

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect(`${SIGN_IN_PATH}?callbackUrl=/historique`);

  const entries = await listAccountHistory(session.user.id);
  const reviewable = entries.filter((entry) => entry.canReview).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Historique"
        description="Vos réservations terminées et annulées, de la plus récente à la plus ancienne."
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={Clock3}
          title="Aucune réservation passée"
          description="Vos événements terminés ou annulés apparaîtront ici, avec la possibilité de laisser un avis sur la salle."
          action={{ href: "/reservations", label: "Voir mes réservations" }}
        />
      ) : (
        <>
          {reviewable > 0 && (
            <p className="text-sm text-gray-500">
              {reviewable === 1
                ? "Une salle attend votre avis."
                : `${reviewable} salles attendent votre avis.`}
            </p>
          )}

          <HistoryList entries={entries} />
        </>
      )}
    </div>
  );
}
