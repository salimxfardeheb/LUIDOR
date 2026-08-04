"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";

/**
 * Favoris de l'utilisateur connecté.
 *
 * L'`userId` vient toujours de la session, jamais du client : le seul
 * paramètre accepté est la salle concernée.
 */

export type FavoriteActionResult =
  | { ok: true; favorite: boolean }
  | { ok: false; message: string; status?: 401 | 404 };

const FAVORITES_PATH = "/favoris";

/** Ajoute ou retire la salle des favoris, et renvoie l'état obtenu. */
export async function toggleFavorite(
  roomId: string
): Promise<FavoriteActionResult> {
  const session = await requireUserSession();
  if (!session.ok) {
    return { ok: false, status: 401, message: session.refusal.message };
  }

  if (!roomId) {
    return { ok: false, status: 404, message: "Cette salle n'existe pas." };
  }

  try {
    const existing = await prisma.favorite.findUnique({
      where: { userId_roomId: { userId: session.user.id, roomId } },
      select: { userId: true },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { userId_roomId: { userId: session.user.id, roomId } },
      });
      revalidatePath(FAVORITES_PATH);
      return { ok: true, favorite: false };
    }

    await prisma.favorite.create({ data: { userId: session.user.id, roomId } });
    revalidatePath(FAVORITES_PATH);
    return { ok: true, favorite: true };
  } catch (error) {
    // P2003 : la salle référencée n'existe pas (ou plus).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { ok: false, status: 404, message: "Cette salle n'existe plus." };
    }

    console.error("[compte/favoris] mise à jour échouée", error);
    return {
      ok: false,
      message: "Le favori n'a pas pu être enregistré. Réessayez dans un instant.",
    };
  }
}

/**
 * Retire une salle des favoris.
 *
 * `deleteMany` plutôt que `delete` : retirer un favori déjà retiré (double
 * clic, page laissée ouverte) n'est pas une erreur à afficher.
 */
export async function removeFavorite(
  roomId: string
): Promise<FavoriteActionResult> {
  const session = await requireUserSession();
  if (!session.ok) {
    return { ok: false, status: 401, message: session.refusal.message };
  }

  try {
    await prisma.favorite.deleteMany({
      where: { userId: session.user.id, roomId },
    });

    revalidatePath(FAVORITES_PATH);
    return { ok: true, favorite: false };
  } catch (error) {
    console.error("[compte/favoris] retrait échoué", error);
    return {
      ok: false,
      message: "Le favori n'a pas pu être retiré. Réessayez dans un instant.",
    };
  }
}
