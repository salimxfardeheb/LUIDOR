"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import type { CatalogKind } from "@/lib/admin/catalog";
import { fieldErrorsFrom, text, type FieldErrors } from "@/lib/forms";

/**
 * CRUD des référentiels : catégories d'événement, équipements et services.
 *
 * Trois tables aux formes différentes mais au même cycle de vie ; les gardes,
 * la journalisation et le refus de supprimer une entrée encore utilisée sont
 * donc écrits une seule fois ici.
 */

export type CatalogResult =
  | { ok: true; message: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      status?: AdminRefusal["status"];
    };

const SETTINGS_PATH = "/admin/parametres";

const KIND_LABELS: Record<CatalogKind, { singular: string; article: string }> = {
  category: { singular: "catégorie", article: "Cette" },
  equipment: { singular: "équipement", article: "Cet" },
  service: { singular: "service", article: "Ce" },
};

const KINDS = ["category", "equipment", "service"] as const;

const itemSchema = z.object({
  kind: z.enum(KINDS),
  id: z.string().optional(),
  name: z
    .string()
    .min(2, "Le nom doit faire au moins 2 caractères.")
    .max(60, "60 caractères au maximum."),
  /** Icône lucide d'une catégorie, ex. « party-popper ». */
  iconSlug: z
    .string()
    .max(40, "40 caractères au maximum.")
    .regex(
      /^[a-z0-9-]*$/,
      "Utilisez le nom d'une icône lucide, en minuscules (ex. party-popper)."
    ),
  price: z
    .number({ message: "Indiquez un tarif en dinars." })
    .min(0, "Le tarif ne peut pas être négatif.")
    .max(10_000_000, "Tarif improbable : vérifiez la saisie."),
});

function revalidateCatalog() {
  revalidatePath(SETTINGS_PATH);
  // Les référentiels alimentent les filtres du catalogue et le formulaire salle.
  revalidatePath("/salles");
  revalidatePath("/owner/salles/nouvelle");
}

/**
 * Nombre de salles rattachées à une entrée.
 *
 * Décide si la suppression est possible : retirer une catégorie encore utilisée
 * laisserait des salles sans catégorie principale, que `Room.categoryId` exige.
 */
async function usageCount(kind: CatalogKind, id: string): Promise<number> {
  if (kind === "category") return prisma.room.count({ where: { categoryId: id } });
  if (kind === "equipment") {
    return prisma.roomEquipment.count({ where: { equipmentId: id } });
  }
  return prisma.roomService.count({ where: { serviceId: id } });
}

/** Crée ou met à jour une entrée de référentiel. */
export async function saveCatalogItem(
  formData: FormData
): Promise<CatalogResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const price = text(formData.get("price"));

  const parsed = itemSchema.safeParse({
    kind: text(formData.get("kind")),
    id: text(formData.get("id")) || undefined,
    name: text(formData.get("name")),
    iconSlug: text(formData.get("iconSlug")),
    // Seuls les services portent un tarif : les deux autres formulaires ne
    // l'envoient pas, et zéro laisse le schéma commun valider quand même.
    price: price === "" ? 0 : Number(price),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les informations saisies.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { kind, id, name, iconSlug, price: amount } = parsed.data;
  const labels = KIND_LABELS[kind];

  if (kind === "category" && !iconSlug) {
    return {
      ok: false,
      message: "L'icône de la catégorie est obligatoire.",
      fieldErrors: { iconSlug: "Indiquez le nom d'une icône lucide." },
    };
  }

  try {
    if (kind === "category") {
      const data = { name, iconSlug };
      if (id) await prisma.category.update({ where: { id }, data });
      else await prisma.category.create({ data });
    } else if (kind === "equipment") {
      if (id) await prisma.equipment.update({ where: { id }, data: { name } });
      else await prisma.equipment.create({ data: { name } });
    } else {
      const data = { name, price: new Prisma.Decimal(amount) };
      if (id) await prisma.service.update({ where: { id }, data });
      else await prisma.service.create({ data });
    }
  } catch (error) {
    // P2002 : le nom d'une catégorie ou d'un équipement est unique en base.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: `Une ${labels.singular} porte déjà ce nom.`,
        fieldErrors: { name: "Ce nom est déjà utilisé." },
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        ok: false,
        status: 404,
        message: `${labels.article} ${labels.singular} n'existe plus.`,
      };
    }

    console.error("saveCatalogItem a échoué", error);
    return { ok: false, message: "L'enregistrement a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "CATALOG_UPDATED",
    target: name,
    detail: `${labels.singular} ${id ? "modifiée" : "ajoutée"}`,
  });

  revalidateCatalog();

  return {
    ok: true,
    message: id
      ? `${labels.singular.charAt(0).toUpperCase()}${labels.singular.slice(1)} mise à jour.`
      : `${labels.singular.charAt(0).toUpperCase()}${labels.singular.slice(1)} ajoutée.`,
  };
}

/** Supprime une entrée, à condition qu'aucune salle ne l'utilise. */
export async function deleteCatalogItem(
  kind: CatalogKind,
  id: string
): Promise<CatalogResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = z
    .object({ kind: z.enum(KINDS), id: z.string().min(1) })
    .safeParse({ kind, id });

  if (!parsed.success) return { ok: false, message: "Entrée inconnue." };

  const labels = KIND_LABELS[parsed.data.kind];
  const used = await usageCount(parsed.data.kind, parsed.data.id);

  if (used > 0) {
    return {
      ok: false,
      status: 409,
      message: `${labels.article} ${labels.singular} est utilisé${
        parsed.data.kind === "category" ? "e" : ""
      } par ${used} salle${used > 1 ? "s" : ""} : détachez-les avant de le supprimer.`,
    };
  }

  try {
    if (parsed.data.kind === "category") {
      await prisma.category.delete({ where: { id: parsed.data.id } });
    } else if (parsed.data.kind === "equipment") {
      await prisma.equipment.delete({ where: { id: parsed.data.id } });
    } else {
      await prisma.service.delete({ where: { id: parsed.data.id } });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        ok: false,
        status: 404,
        message: `${labels.article} ${labels.singular} n'existe plus.`,
      };
    }

    console.error("deleteCatalogItem a échoué", error);
    return { ok: false, message: "La suppression a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "CATALOG_UPDATED",
    target: parsed.data.id,
    detail: `${labels.singular} supprimé${parsed.data.kind === "category" ? "e" : ""}`,
  });

  revalidateCatalog();

  return { ok: true, message: "Entrée supprimée." };
}
