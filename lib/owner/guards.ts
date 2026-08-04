import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Gardes partagées par les actions serveur du portail propriétaire.
 *
 * Une action serveur est un point d'entrée HTTP public : le middleware et le
 * rendu des pages ne la protègent pas. Chaque mutation revérifie donc la
 * session *et* la propriété de la salle, et ces deux contrôles vivent ici pour
 * qu'aucune action ne puisse en oublier un.
 */

export interface OwnerRefusal {
  status: 401 | 403 | 404;
  message: string;
}

export type OwnerSessionResult =
  | { ok: true; ownerId: string }
  | { ok: false; refusal: OwnerRefusal };

/** Session propriétaire, ou refus typé (401 non connecté, 403 mauvais rôle). */
export async function requireOwnerSession(): Promise<OwnerSessionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      refusal: {
        status: 401,
        message: "Votre session a expiré. Reconnectez-vous pour continuer.",
      },
    };
  }

  if (session.user.role !== "OWNER") {
    return {
      ok: false,
      refusal: {
        status: 403,
        message: "Seuls les comptes propriétaire peuvent effectuer cette action.",
      },
    };
  }

  return { ok: true, ownerId: session.user.id };
}

export type RoomOwnershipResult =
  | { ok: true }
  | { ok: false; refusal: OwnerRefusal };

/**
 * Vérifie que la salle existe et appartient au propriétaire connecté.
 *
 * Les deux refus restent distincts (404 / 403) : c'est la convention déjà
 * retenue par les actions salles, et le message d'erreur reste exploitable.
 */
export async function requireRoomOwnership(
  roomId: string,
  ownerId: string
): Promise<RoomOwnershipResult> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  });

  if (!room) {
    return {
      ok: false,
      refusal: { status: 404, message: "Cette salle n'existe pas." },
    };
  }

  if (room.ownerId !== ownerId) {
    return {
      ok: false,
      refusal: {
        status: 403,
        message: "Cette salle n'appartient pas à votre compte.",
      },
    };
  }

  return { ok: true };
}
