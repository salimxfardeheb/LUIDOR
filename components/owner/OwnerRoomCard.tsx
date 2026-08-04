import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Images, MapPin, Users } from "lucide-react";
import { RoomActions } from "@/components/owner/RoomActions";
import { ROOM_STATUS, RoomStatusBadge } from "@/components/owner/RoomStatusBadge";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import { formatCapacity, formatPrice } from "@/lib/format";
import type { OwnerRoomListItem } from "@/lib/owner/rooms";

/**
 * Ligne de salle du portail propriétaire : photo, nom, ville, prix, statut et
 * actions. Empilée en mobile, disposée en ligne à partir de `sm`.
 */
export function OwnerRoomCard({ room }: { room: OwnerRoomListItem }) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:gap-5">
      {/* Photo */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-primary-900 sm:aspect-[4/3] sm:w-40">
        {room.photoUrl ? (
          <Image
            src={room.photoUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 160px, 100vw"
            className="object-cover"
          />
        ) : (
          <PhotoFallback />
        )}

        {room.photoCount > 1 && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 backdrop-blur">
            <Images aria-hidden className="h-3 w-3" />
            {room.photoCount}
          </span>
        )}
      </div>

      {/* Informations */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-base font-semibold text-gray-900">
            <Link
              href={`/owner/salles/${room.id}/modifier`}
              className="rounded-sm transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
            >
              {room.name}
            </Link>
          </h3>
          <RoomStatusBadge status={room.status} />
        </div>

        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-secondary">
          {room.categoryName}
        </p>

        <dl className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Ville</dt>
            <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
            <dd>{room.city}</dd>
          </div>

          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Capacité</dt>
            <Users aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
            <dd>{formatCapacity(room.capacityMin, room.capacityMax)}</dd>
          </div>

          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Prix de base</dt>
            <dd>
              <span className="font-semibold text-gray-900">
                {formatPrice(room.basePrice)}
              </span>
              <span className="text-gray-500"> /jour</span>
            </dd>
          </div>
        </dl>

        <p className="mt-2 text-xs text-gray-500">
          {ROOM_STATUS[room.status].help}
        </p>

        {room.activeBookingCount > 0 && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-info">
            <CalendarCheck aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {room.activeBookingCount} réservation
            {room.activeBookingCount > 1 ? "s" : ""} en cours
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 sm:self-start">
        <RoomActions
          roomId={room.id}
          roomName={room.name}
          status={room.status}
          activeBookingCount={room.activeBookingCount}
        />
      </div>
    </article>
  );
}
