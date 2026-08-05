"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";

/**
 * Modération des avis.
 *
 * Deux gestes seulement : publier — l'avis paraît sur la fiche salle et compte
 * dans la note moyenne — ou supprimer. Aucun n'altère le texte du client : un
 * avis affiché est toujours celui qu'il a écrit.
 */

export type ReviewActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; status?: AdminRefusal["status"] };

const idSchema = z.string().min(1);

function revalidateReview(roomId: string) {
  revalidatePath("/admin/avis");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/salles/${roomId}`);
  // La note moyenne apparaît sur les cartes du catalogue et de la recherche.
  revalidatePath("/salles");
  revalidatePath("/salles/resultats");
}

async function findReview(id: string) {
  return prisma.review.findUnique({
    where: { id },
    select: {
      publishedAt: true,
      rating: true,
      roomId: true,
      room: { select: { name: true } },
      client: { select: { fullName: true } },
    },
  });
}

/** Met un avis en ligne. */
export async function publishReview(
  reviewId: string
): Promise<ReviewActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = idSchema.safeParse(reviewId);
  if (!parsed.success) return { ok: false, message: "Avis inconnu." };

  const review = await findReview(parsed.data);
  if (!review) {
    return { ok: false, status: 404, message: "Cet avis n'existe plus." };
  }

  if (review.publishedAt) {
    return { ok: false, status: 409, message: "Cet avis est déjà publié." };
  }

  try {
    await prisma.review.update({
      where: { id: parsed.data },
      data: { publishedAt: new Date() },
    });
  } catch (error) {
    console.error("publishReview a échoué", error);
    return { ok: false, message: "La publication a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "REVIEW_PUBLISHED",
    target: `${review.room.name} — ${review.client.fullName}`,
    detail: `note ${review.rating}/5`,
  });

  revalidateReview(review.roomId);
  return { ok: true, message: "Avis publié." };
}

/**
 * Supprime un avis.
 *
 * Suppression définitive et non simple retrait : le client peut alors en
 * déposer un nouveau sur la même salle, ce que la contrainte d'unicité
 * `roomId + clientId` interdirait si la ligne restait en base.
 */
export async function deleteReview(
  reviewId: string
): Promise<ReviewActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = idSchema.safeParse(reviewId);
  if (!parsed.success) return { ok: false, message: "Avis inconnu." };

  const review = await findReview(parsed.data);
  if (!review) {
    return { ok: false, status: 404, message: "Cet avis n'existe plus." };
  }

  try {
    await prisma.review.delete({ where: { id: parsed.data } });
  } catch (error) {
    console.error("deleteReview a échoué", error);
    return { ok: false, message: "La suppression a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "REVIEW_DELETED",
    target: `${review.room.name} — ${review.client.fullName}`,
    detail: `note ${review.rating}/5`,
  });

  revalidateReview(review.roomId);
  return { ok: true, message: "Avis supprimé." };
}
