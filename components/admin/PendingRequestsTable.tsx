import Link from "next/link";
import { CheckCircle2, FileSearch } from "lucide-react";
import type { AdminPendingRequestRow } from "@/lib/admin/dashboard";
import { RoomThumbnail } from "@/components/admin/RoomThumbnail";
import {
  ADMIN_ROW_ACTION,
  ADMIN_TH,
  ADMIN_TH_RIGHT,
} from "@/components/admin/table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";

/** Au-delà de ce délai, une demande est signalée comme trop longue à traiter. */
const OVERDUE_DAYS = 3;

/**
 * Demandes d'inscription de salles en attente de validation.
 *
 * Les plus anciennes d'abord, avec leur ancienneté : c'est l'ordre de
 * traitement, et un dossier qui dort depuis une semaine doit se voir. La
 * décision elle-même (valider, refuser) se prend sur la page de gestion des
 * salles — ce tableau est un point d'entrée, pas un écran de modération.
 */
export function PendingRequestsTable({
  requests,
}: {
  requests: AdminPendingRequestRow[];
}) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 aria-hidden className="h-8 w-8 text-success/60" />
        <p className="text-sm font-medium text-gray-900">
          Aucune demande en attente
        </p>
        <p className="max-w-sm text-sm text-gray-500">
          Tous les dossiers déposés par les propriétaires ont été traités.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <caption className="sr-only">
          Demandes d&apos;inscription de salles en attente de validation, de la
          plus ancienne à la plus récente.
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
              Déposée le
            </th>
            <th scope="col" className={ADMIN_TH}>
              Attente
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests.map((request) => (
            <tr key={request.id}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                <span className="flex items-center gap-3">
                  <RoomThumbnail src={request.photoUrl} />
                  <span className="min-w-0 truncate text-gray-900">
                    {request.name}
                  </span>
                </span>
              </th>
              <td className="py-3 pr-4">
                <span className="block truncate text-gray-900">
                  {request.ownerName}
                </span>
                <span className="block truncate text-xs text-gray-400">
                  {request.ownerEmail}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-600">{request.city}</td>
              <td className="whitespace-nowrap py-3 pr-4 text-gray-600">
                {formatDate(request.createdAt)}
              </td>
              <td className="py-3 pr-4">
                <WaitingBadge days={request.waitingDays} />
              </td>
              <td className="py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/salles?salle=${request.id}`}
                    title="Ouvrir le dossier"
                    className={ADMIN_ROW_ACTION}
                  >
                    <FileSearch aria-hidden className="h-4 w-4" />
                    <span className="sr-only">
                      Ouvrir le dossier de {request.name}
                    </span>
                  </Link>
                  <Link href={`/admin/verification?salle=${request.id}`}>
                    <Button variant="outline" size="sm">
                      Examiner
                      <span className="sr-only"> la demande {request.name}</span>
                    </Button>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WaitingBadge({ days }: { days: number }) {
  const label =
    days === 0 ? "Aujourd'hui" : days === 1 ? "1 jour" : `${days} jours`;

  return (
    <Badge variant={days >= OVERDUE_DAYS ? "warning" : "neutral"}>{label}</Badge>
  );
}
