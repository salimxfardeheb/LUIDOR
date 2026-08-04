"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendContactEmail } from "@/lib/mail";

/** Un champ absent du formulaire vaut `null` côté FormData : on normalise. */
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

const contactSchema = z.object({
  fullName: z.string().min(2, "Indiquez votre nom complet."),
  email: z.string().toLowerCase().email("Adresse email invalide."),
  subject: z
    .string()
    .min(3, "Indiquez un sujet.")
    .max(120, "Le sujet est trop long."),
  message: z
    .string()
    .min(10, "Décrivez votre demande en quelques mots.")
    .max(5000, "Le message est trop long (5 000 caractères max)."),
});

export type ContactResult =
  | { ok: true; email: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Enregistre le message du formulaire /contact et en envoie une copie par
 * email à l'équipe LIUDOR. La persistance en base est la source de vérité :
 * l'envoi SMTP, s'il échoue, ne fait pas échouer le formulaire.
 */
export async function submitContactMessage(
  formData: FormData
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse({
    fullName: text(formData.get("fullName")),
    email: text(formData.get("email")),
    subject: text(formData.get("subject")),
    message: text(formData.get("message")),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      ok: false,
      message: "Vérifiez les informations saisies.",
      fieldErrors,
    };
  }

  const { fullName, email, subject, message } = parsed.data;

  try {
    await prisma.contactMessage.create({
      data: { fullName, email, subject, message },
    });

    // Best-effort : un SMTP absent ou en échec est loggé, jamais bloquant.
    await sendContactEmail({ fullName, email, subject, message });

    return { ok: true, email };
  } catch (error) {
    console.error("submitContactMessage a échoué", error);
    return {
      ok: false,
      message: "L'envoi a échoué. Réessayez dans un instant.",
    };
  }
}
