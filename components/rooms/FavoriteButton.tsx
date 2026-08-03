"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bouton favori d'une carte salle.
 *
 * L'état est purement local tant qu'aucun modèle `Favorite` n'existe en base :
 * le jour où l'API arrive, seul le `onClick` change.
 */
export function FavoriteButton({
  roomName,
  className,
}: {
  roomName: string;
  className?: string;
}) {
  const [favorite, setFavorite] = React.useState(false);

  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={
        favorite
          ? `Retirer ${roomName} des favoris`
          : `Ajouter ${roomName} aux favoris`
      }
      onClick={() => setFavorite((current) => !current)}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm backdrop-blur transition-colors",
        "hover:bg-white hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900",
        favorite && "text-error",
        className
      )}
    >
      <Heart
        aria-hidden
        className={cn("h-4 w-4", favorite && "fill-current")}
      />
    </button>
  );
}
