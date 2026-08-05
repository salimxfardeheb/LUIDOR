import type { ModerationAction } from "@prisma/client";
import { History } from "lucide-react";
import type { ModerationEntry } from "@/lib/admin/rooms";
import { RoomThumbnail } from "@/components/admin/RoomThumbnail";
import { ADMIN_TH } from "@/components/admin/table";
import { RoomStatusBadge } from "@/components/owner/RoomStatusBadge";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

const ACTION_LABELS: Record<
  ModerationAction,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  APPROVED: { label: "Validée", variant: "success" },
  REJECTED: { label: "Rejetée", variant: "error" },
};

/**
 * Journal des décisions de modération.
 *
 * Le statut actuel de la salle est rappelé à côté de la décision : une salle
 * validée puis désactivée par son propriétaire ne doit pas se lire comme une
 * validation qui aurait échoué.
 */
export function ModerationHistoryTable({
  entries,
}: {
  entries: ModerationEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <History aria-hidden className="h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-900">
          Aucune décision enregistrée
        </p>
        <p className="max-w-sm text-sm text-gray-500">
          Les validations et les rejets prononcés depuis cette page
          s&apos;afficheront ici, avec leur auteur et leur motif.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <caption className="sr-only">
          Décisions de validation et de rejet déjà prononcées, de la plus
          récente à la plus ancienne.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Salle
            </th>
            <th scope="col" className={ADMIN_TH}>
              Décision
            </th>
            <th scope="col" className={ADMIN_TH}>
              Motif
            </th>
            <th scope="col" className={ADMIN_TH}>
              Par
            </th>
            <th scope="col" className={ADMIN_TH}>
              Statut actuel
            </th>
            <th scope="col" className={ADMIN_TH}>
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => {
            const action = ACTION_LABELS[entry.action];

            return (
              <tr key={entry.id}>
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  <span className="flex items-center gap-3">
                    <RoomThumbnail src={entry.room.photoUrl} />
                    <span className="min-w-0">
                      <span className="block truncate text-gray-900">
                        {entry.room.name}
                      </span>
                      <span className="block truncate text-xs font-normal text-gray-400">
                        {entry.room.city} · {entry.room.ownerName}
                      </span>
                    </span>
                  </span>
                </th>
                <td className="py-3 pr-4">
                  <Badge variant={action.variant}>{action.label}</Badge>
                </td>
                <td className="max-w-xs py-3 pr-4 text-gray-600">
                  {entry.reason ? (
                    <span className="line-clamp-2 italic">« {entry.reason} »</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-gray-600">
                  {entry.adminName ?? (
                    <span className="text-gray-400">Compte supprimé</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <RoomStatusBadge status={entry.room.status} />
                </td>
                <td className="whitespace-nowrap py-3 text-gray-600">
                  <time dateTime={entry.at} title={formatDateTime(entry.at)}>
                    {formatRelativeTime(entry.at)}
                  </time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
