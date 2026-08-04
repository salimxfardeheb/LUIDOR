import { prisma } from "@/lib/prisma";
import {
  ROOM_SUMMARY_SELECT,
  toRoomSummary,
  type RoomSummary,
} from "@/lib/rooms/types";

/** Salle en favori, avec l'information de disponibilité publique. */
export interface FavoriteRoom {
  room: RoomSummary;
  /**
   * `false` si la salle n'est plus publiée (suspendue, retirée du catalogue).
   * La carte reste affichée — sinon le favori serait impossible à retirer —
   * mais l'indisponibilité est signalée.
   */
  available: boolean;
  addedAt: Date;
}

/** Favoris de l'utilisateur, les plus récemment ajoutés d'abord. */
export async function listFavoriteRooms(
  userId: string
): Promise<FavoriteRoom[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      room: { select: { ...ROOM_SUMMARY_SELECT, status: true } },
    },
  });

  return favorites.map(({ room, createdAt }) => ({
    room: toRoomSummary(room),
    available: room.status === "ACTIVE",
    addedAt: createdAt,
  }));
}

/**
 * Identifiants des salles mises en favori par l'utilisateur.
 *
 * Sert à préremplir l'état du bouton favori dans une grille de cartes, en une
 * seule requête plutôt qu'une par salle.
 */
export async function getFavoriteRoomIds(
  userId: string,
  roomIds: readonly string[]
): Promise<Set<string>> {
  if (roomIds.length === 0) return new Set();

  const favorites = await prisma.favorite.findMany({
    where: { userId, roomId: { in: [...roomIds] } },
    select: { roomId: true },
  });

  return new Set(favorites.map((favorite) => favorite.roomId));
}
