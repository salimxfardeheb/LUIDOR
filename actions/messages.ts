"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Réservé à l'équipe : seule un ADMIN peut manipuler les messages. */
async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user.role === "ADMIN";
}

export type MarkReadResult =
  | { ok: true; read: boolean }
  | { ok: false; message: string };

const idSchema = z.object({ id: z.string().min(1) });

/** Bascule un message du formulaire /contact entre lu et non lu. */
export async function toggleContactMessageRead(
  id: string
): Promise<MarkReadResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "Action réservée aux administrateurs." };
  }

  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, message: "Message inconnu." };

  const existing = await prisma.contactMessage.findUnique({
    where: { id: parsed.data.id },
    select: { readAt: true },
  });
  if (!existing) return { ok: false, message: "Message introuvable." };

  try {
    await prisma.contactMessage.update({
      where: { id: parsed.data.id },
      data: { readAt: existing.readAt ? null : new Date() },
    });
    revalidatePath("/admin/messages");
    return { ok: true, read: !existing.readAt };
  } catch (error) {
    console.error("toggleContactMessageRead a échoué", error);
    return { ok: false, message: "La mise à jour a échoué. Réessayez." };
  }
}
