import Link from "next/link";
import { Building2, Eye, FileSearch } from "lucide-react";
import type { AdminRoomRow } from "@/lib/admin/dashboard";
import { RoomStatusBadge } from "@/components/owner/RoomStatusBadge";
import { RoomThumbnail } from "@/components/admin/RoomThumbnail";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ADMIN_ROW_ACTION,
  ADMIN_TH,
  ADMIN_TH_RIGHT,
} from "@/components/admin/table";
import { formatDate } from "@/lib/format";

/**
 * Dernières salles inscrites sur la plateforme.
 *
 * Toutes salles confondues, quel que soit leur statut : l'administration doit
 * voir arriver un dossier au moment où il est déposé, pas seulement une fois
 * publié.
 */
export function RecentRoomsTable({ rooms }: { rooms: AdminRoomRow[] }) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Aucune salle inscrite"
        description="Les salles déposées par les propriétaires apparaîtront ici dès leur première soumission."
        action={{ href: "/admin/salles", label: "Ouvrir la gestion des salles" }}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <caption className="sr-only">
          Dernières salles inscrites, avec propriétaire, ville, statut et date
          d&apos;inscription.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Salle
            </th>
            <th scope="col" className={ADMIN_TH}>
              Propriétaire
            </th>
            <th scope="col" className={ADMIN_TH}>
              Ville
            </th>
            <th scope="col" className={ADMIN_TH}>
              Statut
            </th>
            <th scope="col" className={ADMIN_TH}>
              Inscription
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rooms.map((room) => (
            <tr key={room.id}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                <span className="flex items-center gap-3">
                  <RoomThumbnail src={room.photoUrl} />
                  <span className="min-w-0 truncate text-gray-900">
                    {room.name}
                  </span>
                </span>
              </th>
              <td className="py-3 pr-4">
                <span className="block truncate text-gray-900">
                  {room.ownerName}
                </span>
                <span className="block truncate text-xs text-gray-400">
                  {room.ownerEmail}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-600">{room.city}</td>
              <td className="py-3 pr-4">
                <RoomStatusBadge status={room.status} />
              </td>
              <td className="whitespace-nowrap py-3 pr-4 text-gray-600">
                {formatDate(room.createdAt)}
              </td>
              <td className="py-3">
                <RoomRowActions room={room} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Actions d'une ligne. La fiche publique n'est proposée que pour une salle en
 * ligne : les autres statuts ne sont pas servis par `/salles/[id]`, le lien
 * mènerait à une page 404.
 */
function RoomRowActions({ room }: { room: AdminRoomRow }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/salles?salle=${room.id}`}
        title="Ouvrir le dossier"
        className={ADMIN_ROW_ACTION}
      >
        <FileSearch aria-hidden className="h-4 w-4" />
        <span className="sr-only">Ouvrir le dossier de {room.name}</span>
      </Link>
      {room.status === "ACTIVE" && (
        <Link
          href={`/salles/${room.id}`}
          title="Voir la fiche publique"
          className={ADMIN_ROW_ACTION}
        >
          <Eye aria-hidden className="h-4 w-4" />
          <span className="sr-only">Voir la fiche publique de {room.name}</span>
        </Link>
      )}
    </div>
  );
}
