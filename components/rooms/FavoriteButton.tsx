"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/actions/favorites";
import { cn } from "@/lib/utils";

/**
 * Bouton favori d'une carte salle.
 *
 * L'état est appliqué immédiatement puis confirmé par l'action serveur, qui
 * fait autorité : en cas de refus, le cœur revient à son état réel et le motif
 * remonte à l'appelant via `onError`.
 *
 * Un visiteur non connecté n'a pas de favoris à enregistrer : il est envoyé
 * vers la connexion avec l'URL courante en `callbackUrl`, plutôt que de voir un
 * cœur qui ne retient rien.
 */
export function FavoriteButton({
  roomId,
  roomName,
  initialFavorite = false,
  className,
  onToggled,
  onError,
}: {
  roomId: string;
  roomName: string;
  initialFavorite?: boolean;
  className?: string;
  /** Notifié après confirmation du serveur. */
  onToggled?: (favorite: boolean) => void;
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [favorite, setFavorite] = React.useState(initialFavorite);
  const [pending, startTransition] = React.useTransition();

  // La carte peut être remontée avec un état serveur plus récent (retour de
  // navigation, rafraîchissement) : on s'y réaligne.
  React.useEffect(() => setFavorite(initialFavorite), [initialFavorite]);

  const handleClick = () => {
    const next = !favorite;
    setFavorite(next);

    startTransition(async () => {
      const result = await toggleFavorite(roomId);

      if (!result.ok) {
        setFavorite(!next);

        if (result.status === 401) {
          router.push(`/connexion?callbackUrl=${encodeURIComponent(pathname)}`);
          return;
        }

        onError?.(result.message);
        return;
      }

      setFavorite(result.favorite);
      onToggled?.(result.favorite);
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={favorite}
      aria-label={
        favorite
          ? `Retirer ${roomName} des favoris`
          : `Ajouter ${roomName} aux favoris`
      }
      onClick={handleClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm backdrop-blur transition-colors",
        "hover:bg-white hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900",
        "disabled:cursor-progress disabled:opacity-70",
        favorite && "text-error",
        className
      )}
    >
      <Heart aria-hidden className={cn("h-4 w-4", favorite && "fill-current")} />
    </button>
  );
}
