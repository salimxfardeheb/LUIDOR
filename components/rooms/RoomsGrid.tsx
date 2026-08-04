import { RoomCard, RoomCardSkeleton } from "@/components/rooms/RoomCard";
import type { RoomSummary } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

/**
 * Grille de cartes salle, reprise à l'identique de l'accueil : 1 colonne en
 * mobile, 2 à partir de `sm`, 4 à partir de `lg`. Les pages avec colonne de
 * filtres passent une grille plus étroite via `className`.
 */
export const ROOMS_GRID_CLASSES = "grid gap-6 sm:grid-cols-2 lg:grid-cols-4";

export function RoomsGrid({
  rooms,
  className,
}: {
  rooms: RoomSummary[];
  className?: string;
}) {
  return (
    <ul className={cn(ROOMS_GRID_CLASSES, className)}>
      {rooms.map((room) => (
        <li key={room.id}>
          <RoomCard room={room} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Fallback de `<Suspense>` pendant la requête Prisma : même gabarit que la
 * grille réelle, donc aucun saut de mise en page à l'arrivée des données.
 */
export function RoomsGridSkeleton({
  count = 12,
  label = "Chargement des salles",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(ROOMS_GRID_CLASSES, className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <RoomCardSkeleton key={index} />
      ))}
    </div>
  );
}
