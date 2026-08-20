import Image from "next/image";
import Link from "next/link";
import { Ban, FileText, Images, MapPin, Users } from "lucide-react";
import type { PendingRoom } from "@/lib/admin/rooms";
import { RoomModerationActions } from "@/components/admin/RoomModerationActions";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import { formatCapacity, formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Au-delà de ce délai, le dossier est signalé comme trop long à traiter. */
const OVERDUE_DAYS = 3;

/**
 * Dossier en attente de validation.
 *
 * Une carte plutôt qu'une ligne de tableau : la décision se prend sur pièces —
 * les photos, la description, l'adresse et l'historique du propriétaire doivent
 * tenir sous les yeux au même moment.
 */
export function PendingRoomCard({
  room,
  highlighted = false,
  ownerFilter = null,
}: {
  room: PendingRoom;
  /** Dossier ciblé par un lien entrant (`?salle=…`), mis en évidence. */
  highlighted?: boolean;
  /**
   * Filtre actif de la file, transmis au dossier pour que le retour ramène la
   * liste dans l'état où l'utilisateur l'avait laissée.
   */
  ownerFilter?: string | null;
}) {
  const detailHref = ownerFilter
    ? `/admin/salles/${room.id}?proprietaire=${encodeURIComponent(ownerFilter)}`
    : `/admin/salles/${room.id}`;

  return (
    <Card
      id={`salle-${room.id}`}
      className={cn(
        "overflow-hidden scroll-mt-6",
        highlighted && "border-accent ring-2 ring-accent/30"
      )}
    >
      <article className="flex flex-col gap-5 p-5 lg:flex-row">
        <PhotoStrip room={room} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900">
                <Link
                  href={detailHref}
                  className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  {room.name}
                </Link>
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                <MapPin aria-hidden className="h-4 w-4 text-secondary" />
                <span>
                  {room.district ? `${room.district}, ` : ""}
                  {room.city}
                </span>
                <span aria-hidden className="text-gray-300">
                  ·
                </span>
                <span className="truncate">{room.address}</span>
              </p>
            </div>
            <WaitingBadge days={room.waitingDays} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Fact label="Catégorie" value={room.categoryName} />
            <Fact
              label="Capacité"
              value={formatCapacity(room.capacityMin, room.capacityMax)}
              icon={<Users aria-hidden className="h-3.5 w-3.5" />}
            />
            <Fact label="Tarif de base" value={formatPrice(room.basePrice)} />
            <Fact label="Déposée le" value={formatDate(room.createdAt)} />
          </dl>

          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-600">
            {room.description}
          </p>

          <OwnerLine room={room} />

          {room.previousRejection && (
            <Alert variant="warning" title="Déjà refusée par le passé" className="mt-4">
              <span className="block italic">
                « {room.previousRejection} »
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Vérifiez que le point signalé a bien été corrigé avant de
                valider.
              </span>
            </Alert>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 lg:border-l lg:border-gray-200 lg:pl-5">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <FileText aria-hidden className="h-4 w-4" />
            Voir les detailles
          </Link>
          <RoomModerationActions roomId={room.id} roomName={room.name} />
        </div>
      </article>
    </Card>
  );
}

/**
 * Photos du dossier : la principale en grand, les suivantes en vignettes.
 * Un dossier sans photo est un signal en soi — l'absence est donc affichée,
 * pas masquée.
 */
function PhotoStrip({ room }: { room: PendingRoom }) {
  const [main, ...others] = room.photos;
  const remaining = room.photosCount - room.photos.length;

  return (
    <div className="flex shrink-0 gap-2 lg:w-64 lg:flex-col">
      <div className="relative h-28 w-40 overflow-hidden rounded-md bg-gray-100 sm:h-32 sm:w-48 lg:h-40 lg:w-full">
        {main ? (
          <Image
            src={main}
            alt={`Photo principale de ${room.name}`}
            fill
            sizes="(min-width: 1024px) 256px, 192px"
            className="object-cover"
          />
        ) : (
          <PhotoFallback />
        )}
      </div>

      {others.length > 0 && (
        <div className="flex flex-col gap-2 lg:flex-row">
          {others.map((photo, index) => (
            <div
              key={photo}
              className="relative h-8 w-14 shrink-0 overflow-hidden rounded-sm bg-gray-100 sm:h-9 sm:w-16 lg:h-14 lg:flex-1"
            >
              <Image
                src={photo}
                alt={`Photo ${index + 2} de ${room.name}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 self-end text-xs text-gray-400 lg:self-start">
        <Images aria-hidden className="h-3.5 w-3.5" />
        {room.photosCount === 0
          ? "Aucune photo fournie"
          : `${room.photosCount} photo${room.photosCount > 1 ? "s" : ""}`}
        {remaining > 0 && ` (+${remaining} non affichée${remaining > 1 ? "s" : ""})`}
      </p>
    </div>
  );
}

/** Le propriétaire du dossier, avec ce que son compte dit déjà de lui. */
function OwnerLine({ room }: { room: PendingRoom }) {
  const { owner } = room;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-gray-50 p-3">
      <Avatar
        name={owner.fullName}
        src={owner.avatarUrl}
        role="OWNER"
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {owner.fullName}
        </p>
        <p className="truncate text-xs text-gray-500">
          <a
            href={`mailto:${owner.email}`}
            className="underline-offset-2 hover:underline"
          >
            {owner.email}
          </a>
          {owner.phone && ` · ${owner.phone}`}
        </p>
      </div>

      {owner.suspended && (
        <Badge variant="error">
          <Ban aria-hidden className="h-3 w-3" />
          Compte suspendu
        </Badge>
      )}

      <Badge variant="neutral">
        {owner.activeRoomsCount} salle{owner.activeRoomsCount > 1 ? "s" : ""} en
        ligne
      </Badge>

      <Link
        href={`/admin/proprietaires?q=${encodeURIComponent(owner.email)}`}
        className="text-xs font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        Voir le propriétaire
      </Link>
    </div>
  );
}

function Fact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1.5 truncate text-gray-900">
        {icon}
        {value}
      </dd>
    </div>
  );
}

function WaitingBadge({ days }: { days: number }) {
  const label =
    days === 0 ? "Déposée aujourd'hui" : days === 1 ? "1 jour d'attente" : `${days} jours d'attente`;

  return (
    <Badge variant={days >= OVERDUE_DAYS ? "warning" : "neutral"}>{label}</Badge>
  );
}
