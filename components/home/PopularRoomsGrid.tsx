"use client";

import * as React from "react";
import { RoomCard } from "@/components/rooms/RoomCard";
import type { RoomSummary } from "@/lib/home/queries";
import { cn } from "@/lib/utils";

const PER_PAGE = 4;

/**
 * Grille paginée des salles populaires.
 *
 * Toutes les salles sont rendues côté serveur ; la pagination en points ne
 * fait que masquer les pages inactives, ce qui garde le contenu indexable et
 * accessible sans requête supplémentaire.
 */
export function PopularRoomsGrid({ rooms }: { rooms: RoomSummary[] }) {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.ceil(rooms.length / PER_PAGE);
  const visible = rooms.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((room) => (
          <li key={room.id}>
            <RoomCard room={room} />
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div
          role="group"
          aria-label="Pages de salles populaires"
          className="mt-8 flex items-center justify-center gap-2.5"
        >
          <p aria-live="polite" className="sr-only">
            Page {page + 1} sur {pageCount}
          </p>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-current={index === page ? "true" : undefined}
              aria-label={`Afficher la page ${index + 1} sur ${pageCount}`}
              onClick={() => setPage(index)}
              className={cn(
                "h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2",
                index === page
                  ? "w-8 bg-secondary"
                  : "w-2.5 bg-gray-300 hover:bg-gray-400"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
