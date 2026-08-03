import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Users } from "lucide-react";
import { FavoriteButton } from "@/components/rooms/FavoriteButton";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import type { RoomSummary } from "@/lib/home/queries";
import { formatCapacity, formatPrice, formatRating } from "@/lib/format";

/** Carte salle : photo + overlays, nom, ville, capacité et prix d'appel. */
export function RoomCard({ room }: { room: RoomSummary }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-primary-900">
        {room.photoUrl ? (
          <Image
            src={room.photoUrl}
            alt={`Salle ${room.name}, ${room.city}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <PhotoFallback />
        )}

        <div className="absolute left-3 top-3">
          {room.rating === null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-600 backdrop-blur">
              Nouveau
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-900 backdrop-blur">
              <Star aria-hidden className="h-3.5 w-3.5 fill-secondary text-secondary" />
              {formatRating(room.rating)}
              <span className="font-normal text-gray-500">
                ({room.reviewCount})
              </span>
            </span>
          )}
        </div>

        <FavoriteButton
          roomName={room.name}
          className="absolute right-3 top-3 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          {room.categoryName}
        </p>

        <h3 className="text-base font-semibold leading-snug text-gray-900">
          {/*
            Lien étendu à toute la carte : le bouton favori reste cliquable
            grâce à son propre contexte d'empilement (z-10).
          */}
          <Link
            href={`/salles/${room.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
          >
            {room.name}
          </Link>
        </h3>

        <p className="flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
          {room.city}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-gray-100 pt-3">
          <p className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
            {formatCapacity(room.capacityMin, room.capacityMax)}
          </p>
          <p className="text-sm text-gray-500">
            à partir de{" "}
            <span className="text-base font-bold text-secondary">
              {formatPrice(room.basePrice)}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

/** Squelette affiché pendant le chargement des salles. */
export function RoomCardSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="aspect-[4/3] animate-pulse bg-gray-100" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-20 animate-pulse rounded-sm bg-gray-100" />
        <div className="h-4 w-3/4 animate-pulse rounded-sm bg-gray-100" />
        <div className="h-3 w-1/2 animate-pulse rounded-sm bg-gray-100" />
        <div className="h-8 animate-pulse rounded-sm bg-gray-50" />
      </div>
    </div>
  );
}
