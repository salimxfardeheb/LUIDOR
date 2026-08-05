"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";

/**
 * Suspension et réactivation d'un compte.
 *
 * La suspension bloque la connexion (`authorize()` la refuse) ; elle ne touche
 * ni aux salles ni aux réservations existantes, qui restent au dossier. C'est
 * une mesure réversible : rien n'est supprimé.
 */

export type UserActionResult =
  | { ok: true; suspended: boolean; message: string }
  | { ok: false; message: string; status?: AdminRefusal["status"] };

const payloadSchema = z.object({
  userId: z.string().min(1),
  suspended: z.boolean(),
});

function revalidateUsers() {
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/proprietaires");
  revalidatePath("/admin/dashboard");
}

/** Suspend un compte (`suspended: true`) ou le réactive. */
export async function setUserSuspended(
  userId: string,
  suspended: boolean
): Promise<UserActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = payloadSchema.safeParse({ userId, suspended });
  if (!parsed.success) return { ok: false, message: "Compte inconnu." };

  // Se suspendre soi-même reviendrait à se verrouiller dehors à la prochaine
  // connexion, sans personne pour rouvrir la porte.
  if (parsed.data.userId === session.adminId) {
    return {
      ok: false,
      status: 403,
      message: "Vous ne pouvez pas suspendre votre propre compte.",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { fullName: true, role: true, suspendedAt: true },
  });

  if (!target) {
    return { ok: false, status: 404, message: "Ce compte n'existe plus." };
  }

  // Un administrateur ne se modère pas depuis cette interface : la décision
  // engage l'accès à toute la plateforme et se prend en base, à deux.
  if (target.role === "ADMIN") {
    return {
      ok: false,
      status: 403,
      message:
        "Un compte administrateur ne peut pas être suspendu depuis cette page.",
    };
  }

  const alreadyInState =
    (target.suspendedAt !== null) === parsed.data.suspended;
  if (alreadyInState) {
    return {
      ok: false,
      status: 409,
      message: parsed.data.suspended
        ? "Ce compte est déjà suspendu."
        : "Ce compte est déjà actif.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { suspendedAt: parsed.data.suspended ? new Date() : null },
    });
  } catch (error) {
    console.error("setUserSuspended a échoué", error);
    return { ok: false, message: "La mise à jour a échoué. Réessayez." };
  }

  revalidateUsers();

  return {
    ok: true,
    suspended: parsed.data.suspended,
    message: parsed.data.suspended
      ? `Le compte de ${target.fullName} est suspendu.`
      : `Le compte de ${target.fullName} est réactivé.`,
  };
}
