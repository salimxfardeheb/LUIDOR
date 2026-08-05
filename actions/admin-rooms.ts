"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { fieldErrorsFrom, type FieldErrors } from "@/lib/forms";

/**
 * Modération des salles : validation et rejet.
 *
 * Chaque décision est écrite dans `RoomModeration` en même temps que le statut
 * de la salle, dans une transaction : un dossier ne peut pas changer d'état
 * sans laisser de trace dans l'historique, ni l'inverse.
 */

export type ModerationResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors; status?: AdminRefusal["status"] };

const ADMIN_ROOMS_PATH = "/admin/salles";

/**
 * Le motif de rejet part au propriétaire : trop court, il ne lui dit pas quoi
 * corriger, et le dossier revient tel quel.
 */
const rejectSchema = z.object({
  roomId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(15, "Expliquez en une phrase ce qui bloque la mise en ligne.")
    .max(1000, "Motif trop long : 1000 caractères au maximum."),
});

const roomIdSchema = z.string().min(1);

/** Recharge les vues où la décision se voit. */
function revalidateModeration(roomId: string) {
  revalidatePath(ADMIN_ROOMS_PATH);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/proprietaires");
  // Une salle validée entre au catalogue public, une salle rejetée n'y est
  // plus : les deux pages doivent repartir d'une lecture fraîche.
  revalidatePath("/salles");
  revalidatePath(`/salles/${roomId}`);
  revalidatePath("/owner/salles");
}

/**
 * Vérifie que le dossier existe et attend toujours une décision.
 *
 * Deux administrateurs peuvent ouvrir la même file : sans ce contrôle, le
 * second écraserait la décision du premier sans le savoir.
 */
async function requirePendingRoom(
  roomId: string
): Promise<{ ok: true; name: string } | { ok: false; result: ModerationResult }> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { name: true, status: true },
  });

  if (!room) {
    return {
      ok: false,
      result: { ok: false, status: 404, message: "Cette salle n'existe plus." },
    };
  }

  if (room.status !== "PENDING") {
    return {
      ok: false,
      result: {
        ok: false,
        status: 409,
        message:
          "Ce dossier a déjà été traité. Actualisez la page pour voir la décision enregistrée.",
      },
    };
  }

  return { ok: true, name: room.name };
}

/** Valide une salle : elle entre au catalogue public. */
export async function approveRoom(roomId: string): Promise<ModerationResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = roomIdSchema.safeParse(roomId);
  if (!parsed.success) return { ok: false, message: "Salle inconnue." };

  const pending = await requirePendingRoom(parsed.data);
  if (!pending.ok) return pending.result;

  try {
    await prisma.$transaction([
      prisma.room.update({
        where: { id: parsed.data },
        data: {
          status: "ACTIVE",
          // `verifiedAt` porte le badge « vérifié » de la fiche publique et
          // date du dernier contrôle : un dossier corrigé puis revalidé porte
          // donc la date de sa nouvelle vérification, pas de la première.
          verifiedAt: new Date(),
        },
      }),
      prisma.roomModeration.create({
        data: {
          roomId: parsed.data,
          adminId: session.adminId,
          action: "APPROVED",
        },
      }),
    ]);
  } catch (error) {
    console.error("approveRoom a échoué", error);
    return { ok: false, message: "La validation a échoué. Réessayez." };
  }

  revalidateModeration(parsed.data);
  return { ok: true, message: `« ${pending.name} » est en ligne.` };
}

/** Rejette une salle. Le motif est obligatoire : il est transmis au propriétaire. */
export async function rejectRoom(
  roomId: string,
  reason: string
): Promise<ModerationResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = rejectSchema.safeParse({ roomId, reason });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Le motif du rejet est obligatoire.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const pending = await requirePendingRoom(parsed.data.roomId);
  if (!pending.ok) return pending.result;

  try {
    await prisma.$transaction([
      prisma.room.update({
        where: { id: parsed.data.roomId },
        data: { status: "REJECTED" },
      }),
      prisma.roomModeration.create({
        data: {
          roomId: parsed.data.roomId,
          adminId: session.adminId,
          action: "REJECTED",
          reason: parsed.data.reason,
        },
      }),
    ]);
  } catch (error) {
    console.error("rejectRoom a échoué", error);
    return { ok: false, message: "Le rejet a échoué. Réessayez." };
  }

  revalidateModeration(parsed.data.roomId);
  return { ok: true, message: `« ${pending.name} » a été refusée.` };
}
