"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { parseReviewForm } from "@/lib/account/schemas";
import type { FieldErrors } from "@/lib/forms";

/**
 * Publication d'un avis depuis l'historique.
 *
 * Trois conditions sont revérifiées côté serveur, indépendamment de ce que
 * l'interface propose : l'utilisateur est connecté, il a bien une réservation
 * **clôturée** sur cette salle, et il ne l'a pas déjà notée.
 */

export type ReviewFormState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors }
  | null;

export async function submitReview(
  _prevState: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const session = await requireUserSession();
  if (!session.ok) return { ok: false, message: session.refusal.message };

  const fields = parseReviewForm(formData);
  if (!fields.ok) return fields;

  const { roomId, rating, comment } = fields.data;

  try {
    const booking = await prisma.booking.findFirst({
      where: { clientId: session.user.id, roomId, status: "CLOTUREE" },
      select: { id: true },
    });

    if (!booking) {
      return {
        ok: false,
        message:
          "Vous ne pouvez laisser un avis que sur une salle dont l'événement est clôturé.",
      };
    }

    const existing = await prisma.review.findUnique({
      where: { roomId_clientId: { roomId, clientId: session.user.id } },
      select: { id: true },
    });

    if (existing) {
      return {
        ok: false,
        message: "Vous avez déjà publié un avis sur cette salle.",
      };
    }

    await prisma.review.create({
      data: { roomId, clientId: session.user.id, rating, comment },
    });

    revalidatePath("/historique");
    revalidatePath("/profil");
    revalidatePath(`/salles/${roomId}`);

    return { ok: true, message: "Merci, votre avis a été publié." };
  } catch (error) {
    // P2002 : deux envois simultanés sur la même salle.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "Vous avez déjà publié un avis sur cette salle.",
      };
    }

    console.error("[compte/avis] publication échouée", error);
    return {
      ok: false,
      message: "Votre avis n'a pas pu être publié. Réessayez dans un instant.",
    };
  }
}
