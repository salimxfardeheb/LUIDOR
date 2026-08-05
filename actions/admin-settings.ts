"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import { SETTINGS_ID } from "@/lib/admin/settings";
import { fieldErrorsFrom, text, type FieldErrors } from "@/lib/forms";

/**
 * Réglages généraux de la plateforme.
 *
 * Une seule ligne en base : l'enregistrement est un `upsert`, ce qui évite de
 * devoir créer la configuration avant de pouvoir la modifier.
 */

export type SettingsFormState =
  | { ok: true; message: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      status?: AdminRefusal["status"];
    }
  | null;

const SETTINGS_PATH = "/admin/parametres";

const settingsSchema = z.object({
  siteName: z
    .string()
    .min(2, "Le nom de la plateforme est obligatoire.")
    .max(60, "60 caractères au maximum."),
  tagline: z.string().max(120, "120 caractères au maximum."),
  contactEmail: z.string().email("Adresse email invalide."),
  contactPhone: z.string().max(30, "30 caractères au maximum."),
  address: z.string().max(200, "200 caractères au maximum."),
  bookingLeadTimeDays: z
    .number({ message: "Indiquez un nombre de jours." })
    .int("Indiquez un nombre entier de jours.")
    .min(0, "Le délai ne peut pas être négatif.")
    .max(365, "365 jours au maximum."),
  reviewAutoPublish: z.boolean(),
  maintenanceMode: z.boolean(),
});

/** Une case non cochée n'est pas envoyée : son absence vaut « false ». */
function checkbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}

export async function updatePlatformSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const leadTime = text(formData.get("bookingLeadTimeDays"));

  const parsed = settingsSchema.safeParse({
    siteName: text(formData.get("siteName")),
    tagline: text(formData.get("tagline")),
    contactEmail: text(formData.get("contactEmail")),
    contactPhone: text(formData.get("contactPhone")),
    address: text(formData.get("address")),
    bookingLeadTimeDays: leadTime === "" ? Number.NaN : Number(leadTime),
    reviewAutoPublish: checkbox(formData.get("reviewAutoPublish")),
    maintenanceMode: checkbox(formData.get("maintenanceMode")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les informations saisies.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = {
    siteName: parsed.data.siteName,
    tagline: parsed.data.tagline,
    contactEmail: parsed.data.contactEmail,
    // Chaîne vide en base = champ renseigné vide ; `null` dit « non renseigné ».
    contactPhone: parsed.data.contactPhone || null,
    address: parsed.data.address || null,
    bookingLeadTimeDays: parsed.data.bookingLeadTimeDays,
    reviewAutoPublish: parsed.data.reviewAutoPublish,
    maintenanceMode: parsed.data.maintenanceMode,
  };

  try {
    await prisma.platformSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
  } catch (error) {
    console.error("updatePlatformSettings a échoué", error);
    return { ok: false, message: "L'enregistrement a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "SETTINGS_UPDATED",
    target: data.siteName,
    detail: [
      `modération des avis : ${data.reviewAutoPublish ? "automatique" : "manuelle"}`,
      `maintenance : ${data.maintenanceMode ? "activée" : "désactivée"}`,
    ].join(" · "),
  });

  revalidatePath(SETTINGS_PATH);

  return { ok: true, message: "Réglages enregistrés." };
}
