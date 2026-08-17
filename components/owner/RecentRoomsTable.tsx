import type { RoomStatus } from "@prisma/client";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { RoomStatusBadge } from "@/components/owner/RoomStatusBadge";

export interface RecentRoomRow {
  id: string;
  name: string;
  city: string;
  status: RoomStatus;
  /** Date de dépôt au format `YYYY-MM-DD`. */
  createdAt: string;
}

/** Tableau des dernières salles déposées : nom, ville, date de dépôt, statut. */
export function RecentRoomsTable({ rooms }: { rooms: RecentRoomRow[] }) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Building2 aria-hidden className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">Aucune salle déposée pour le moment.</p>
        <Link
          href="/owner/salles/nouvelle"
          className="text-sm font-semibold text-primary-900 underline underline-offset-4"
        >
          Ajouter une salle
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">
          Dernières salles déposées, avec ville, date de dépôt et statut.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th
              scope="col"
              className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Salle
            </th>
            <th
              scope="col"
              className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Ville
            </th>
            <th
              scope="col"
              className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Déposée le
            </th>
            <th
              scope="col"
              className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Statut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rooms.map((room) => (
            <tr key={room.id}>
              <th
                scope="row"
                className="py-3.5 pr-4 text-left font-medium text-gray-900"
              >
                <Link
                  href={`/owner/salles/${room.id}/modifier`}
                  className="underline-offset-4 hover:underline"
                >
                  {room.name}
                </Link>
              </th>
              <td className="py-3.5 pr-4 text-gray-600">{room.city}</td>
              <td className="whitespace-nowrap py-3.5 pr-4 text-gray-600">
                {formatDate(room.createdAt)}
              </td>
              <td className="py-3.5">
                <RoomStatusBadge status={room.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
