"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EyeOff, HeartOff } from "lucide-react";
import { removeFavorite } from "@/actions/favorites";
import { FavoriteButton } from "@/components/rooms/FavoriteButton";
import { RoomCard } from "@/components/rooms/RoomCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { FavoriteRoom } from "@/lib/account/favorites";

/**
 * Carte d'un favori : la `RoomCard` du Design System, complétée d'un retrait
 * explicite.
 *
 * Deux chemins mènent au même retrait — le cœur de la carte et le bouton sous
 * la carte — et les deux rafraîchissent la liste : une carte retirée disparaît
 * au lieu de rester affichée avec un cœur vide.
 */
export function FavoriteRoomCard({ favorite }: { favorite: FavoriteRoom }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const { room, available } = favorite;

  const remove = () => {
    setError(null);

    startTransition(async () => {
      const result = await removeFavorite(room.id);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <RoomCard
        room={room}
        favoriteSlot={
          <FavoriteButton
            roomId={room.id}
            roomName={room.name}
            initialFavorite
            onToggled={() => router.refresh()}
            onError={setError}
          />
        }
      />

      {!available && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <EyeOff aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          Cette salle n&apos;est plus publiée dans le catalogue.
        </p>
      )}

      {error && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={remove}
        className="w-full"
      >
        <HeartOff aria-hidden className="h-4 w-4" />
        {pending ? "Retrait…" : "Retirer des favoris"}
      </Button>
    </div>
  );
}
