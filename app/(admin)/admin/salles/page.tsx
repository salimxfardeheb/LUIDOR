import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ClipboardCheck, Clock, RotateCcw, ShieldCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import {
  getOwnerName,
  HISTORY_LIMIT,
  listModerationHistory,
  listPendingRooms,
} from "@/lib/admin/rooms";
import { formatNumber } from "@/lib/format";
import { ModerationHistoryTable } from "@/components/admin/ModerationHistoryTable";
import { PendingRoomCard } from "@/components/admin/PendingRoomCard";
import { StatTiles } from "@/components/admin/StatTiles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/salles — file de validation des salles, protégée (ADMIN).
export const metadata: Metadata = { title: "Validation des salles" };

const PATH = "/admin/salles";

interface PageProps {
  searchParams: {
    /** Restreint la file à un propriétaire (accès rapide depuis sa fiche). */
    proprietaire?: string;
    /** Dossier ciblé par un lien entrant, mis en évidence dans la liste. */
    salle?: string;
  };
}

export default async function Page({ searchParams }: PageProps) {
  await requireAdminPage(PATH);

  // Un identifiant forgé ou périmé retombe sur la file complète plutôt que
  // d'afficher une liste vide sous un filtre fantôme.
  const requestedOwnerId = searchParams.proprietaire ?? null;
  const ownerName = requestedOwnerId
    ? await getOwnerName(requestedOwnerId)
    : null;
  const ownerId = ownerName ? requestedOwnerId : null;

  const [pending, history] = await Promise.all([
    listPendingRooms(ownerId),
    listModerationHistory(ownerId),
  ]);

  const approvedCount = history.filter(
    (entry) => entry.action === "APPROVED"
  ).length;
  const rejectedCount = history.length - approvedCount;
  const oldestWait = pending.at(0)?.waitingDays ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Validation des salles"
        description="Les dossiers déposés par les propriétaires, du plus ancien au plus récent. Une salle validée entre immédiatement au catalogue public."
      />

      {ownerId && ownerName && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
          <p className="text-sm text-gray-700">
            File filtrée sur les salles de{" "}
            <span className="font-semibold text-gray-900">{ownerName}</span>.
          </p>
          <Link
            href={PATH}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Voir toute la file
          </Link>
        </div>
      )}

      <StatTiles
        tiles={[
          {
            icon: ClipboardCheck,
            label: "Dossiers en attente",
            value: formatNumber(pending.length),
            tone: pending.length > 0 ? "warning" : "neutral",
          },
          {
            icon: Clock,
            label: "Attente la plus longue",
            value: oldestWait === 0 ? "—" : `${oldestWait} j`,
            tone: "neutral",
          },
          {
            icon: BadgeCheck,
            label: `Validations (${HISTORY_LIMIT} dernières)`,
            value: formatNumber(approvedCount),
            tone: "secondary",
          },
          {
            icon: ShieldCheck,
            label: `Rejets (${HISTORY_LIMIT} derniers)`,
            value: formatNumber(rejectedCount),
            tone: rejectedCount > 0 ? "error" : "neutral",
          },
        ]}
      />

      <section aria-labelledby="file-attente" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="file-attente"
            className="text-lg font-semibold text-gray-900"
          >
            Dossiers en attente
          </h2>
          <p className="text-sm text-gray-500" aria-live="polite">
            {pending.length === 0
              ? "Aucun dossier à traiter."
              : `${pending.length} dossier${pending.length > 1 ? "s" : ""} à traiter.`}
          </p>
        </div>

        {pending.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title={
              ownerId
                ? "Aucun dossier en attente pour ce propriétaire"
                : "Aucune salle en attente de validation"
            }
            description={
              ownerId
                ? "Toutes les salles de ce propriétaire ont déjà été traitées."
                : "Tous les dossiers déposés ont été traités. Les nouvelles soumissions des propriétaires apparaîtront ici."
            }
            action={
              ownerId
                ? { href: PATH, label: "Voir toute la file" }
                : { href: "/admin/dashboard", label: "Retour au tableau de bord" }
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((room) => (
              <PendingRoomCard
                key={room.id}
                room={room}
                highlighted={room.id === searchParams.salle}
              />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Historique des validations</CardTitle>
          <CardDescription>
            Les {HISTORY_LIMIT} dernières décisions prises sur les dossiers, avec
            leur auteur et, pour un rejet, le motif transmis au propriétaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModerationHistoryTable entries={history} />
        </CardContent>
      </Card>
    </div>
  );
}
