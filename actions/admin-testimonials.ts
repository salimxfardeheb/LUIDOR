"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import {
  nextPosition,
  QUOTE_MAX_LENGTH,
  QUOTE_MIN_LENGTH,
  RATING_MAX,
  RATING_MIN,
} from "@/lib/admin/testimonials";
import { fieldErrorsFrom, text, type FieldErrors } from "@/lib/forms";

/**
 * Rédaction et publication des témoignages de la page d'accueil.
 *
 * Un témoignage est du contenu éditorial : il n'est rattaché à aucun compte et
 * ne peut donc pas être « vérifié » automatiquement. La contrepartie est que
 * seule l'administration l'écrit — d'où le contrôle de session à chaque
 * mutation, une action serveur étant appelable sans passer par l'écran.
 */

export type TestimonialActionResult =
  | { ok: true; testimonialId: string; message: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      status?: AdminRefusal["status"];
    };

/** État consommé par `useFormState` : seuls les échecs y transitent. */
export type TestimonialFormState = Extract<
  TestimonialActionResult,
  { ok: false }
> | null;

const TESTIMONIALS_PATH = "/admin/temoignages";

const testimonialSchema = z.object({
  authorName: z
    .string()
    .min(2, "Indiquez le nom de la personne citée.")
    .max(80, "Nom trop long : 80 caractères au maximum."),
  role: z
    .string()
    .min(3, "Précisez le contexte, par exemple « Mariage · Alger ».")
    .max(80, "Contexte trop long : 80 caractères au maximum."),
  rating: z
    .number()
    .int("La note doit être un nombre entier.")
    .min(RATING_MIN, `La note va de ${RATING_MIN} à ${RATING_MAX} étoiles.`)
    .max(RATING_MAX, `La note va de ${RATING_MIN} à ${RATING_MAX} étoiles.`),
  quote: z
    .string()
    .min(
      QUOTE_MIN_LENGTH,
      `Le témoignage doit faire au moins ${QUOTE_MIN_LENGTH} caractères.`
    )
    .max(
      QUOTE_MAX_LENGTH,
      `Témoignage trop long : ${QUOTE_MAX_LENGTH} caractères au maximum.`
    ),
  position: z
    .number()
    .int("L'ordre doit être un nombre entier.")
    .min(0, "L'ordre ne peut pas être négatif.")
    .max(999, "Ordre trop grand : 999 au maximum."),
});

/**
 * L'accueil est prérendu et régénéré toutes les 5 minutes : sans invalidation
 * explicite, une publication mettrait ce délai à apparaître.
 */
function revalidateTestimonials() {
  revalidatePath(TESTIMONIALS_PATH);
  revalidatePath("/");
}

/** Nombre saisi dans un champ de formulaire, ou `NaN` si la case est vide. */
function number(value: FormDataEntryValue | null): number {
  const raw = text(value);
  return raw === "" ? Number.NaN : Number(raw);
}

/**
 * Crée ou met à jour un témoignage.
 *
 * `testimonialId` vide vaut création. Comme pour un article, l'action redirige
 * vers l'éditeur de l'élément enregistré : un rechargement ne repropose donc
 * pas une nouvelle création.
 */
export async function saveTestimonial(
  _prevState: TestimonialFormState,
  formData: FormData
): Promise<TestimonialFormState> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const testimonialId = text(formData.get("testimonialId"));
  const rawPosition = text(formData.get("position"));

  const parsed = testimonialSchema.safeParse({
    authorName: text(formData.get("authorName")),
    role: text(formData.get("role")),
    rating: number(formData.get("rating")),
    quote: text(formData.get("quote")),
    // Champ facultatif : à la création, on place le témoignage en fin de liste
    // plutôt que de le mettre à égalité avec le premier.
    position: rawPosition === "" ? await nextPosition() : Number(rawPosition),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les champs du témoignage.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const existing = testimonialId
    ? await prisma.testimonial.findUnique({
        where: { id: testimonialId },
        select: { id: true },
      })
    : null;

  if (testimonialId && !existing) {
    return { ok: false, status: 404, message: "Ce témoignage n'existe plus." };
  }

  let saved: { id: string };

  try {
    saved = existing
      ? await prisma.testimonial.update({
          where: { id: existing.id },
          data: parsed.data,
          select: { id: true },
        })
      : await prisma.testimonial.create({
          data: parsed.data,
          select: { id: true },
        });
  } catch (error) {
    console.error("saveTestimonial a échoué", error);
    return { ok: false, message: "L'enregistrement a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "TESTIMONIAL_SAVED",
    target: parsed.data.authorName,
    detail: existing ? "modification" : "création",
  });

  revalidateTestimonials();

  // Hors du `try` : `redirect()` lève une exception interne qu'un bloc
  // d'erreur avalerait.
  redirect(`${TESTIMONIALS_PATH}/${saved.id}?enregistre=1`);
}

/** Publie un témoignage ou le repasse en brouillon. */
export async function setTestimonialPublished(
  testimonialId: string,
  published: boolean
): Promise<TestimonialActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = z.string().min(1).safeParse(testimonialId);
  if (!parsed.success) return { ok: false, message: "Témoignage inconnu." };

  const testimonial = await prisma.testimonial.findUnique({
    where: { id: parsed.data },
    select: { authorName: true, publishedAt: true },
  });

  if (!testimonial) {
    return { ok: false, status: 404, message: "Ce témoignage n'existe plus." };
  }

  if ((testimonial.publishedAt !== null) === published) {
    return {
      ok: false,
      status: 409,
      message: published
        ? "Ce témoignage est déjà publié."
        : "Ce témoignage est déjà un brouillon.",
    };
  }

  try {
    await prisma.testimonial.update({
      where: { id: parsed.data },
      data: { publishedAt: published ? new Date() : null },
    });
  } catch (error) {
    console.error("setTestimonialPublished a échoué", error);
    return { ok: false, message: "La mise à jour a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: published ? "TESTIMONIAL_PUBLISHED" : "TESTIMONIAL_UNPUBLISHED",
    target: testimonial.authorName,
  });

  revalidateTestimonials();

  return {
    ok: true,
    testimonialId: parsed.data,
    message: published
      ? "Témoignage publié."
      : "Témoignage repassé en brouillon.",
  };
}

/** Supprime définitivement un témoignage. */
export async function deleteTestimonial(
  testimonialId: string
): Promise<TestimonialActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = z.string().min(1).safeParse(testimonialId);
  if (!parsed.success) return { ok: false, message: "Témoignage inconnu." };

  const testimonial = await prisma.testimonial.findUnique({
    where: { id: parsed.data },
    select: { authorName: true },
  });

  if (!testimonial) {
    return { ok: false, status: 404, message: "Ce témoignage n'existe plus." };
  }

  try {
    await prisma.testimonial.delete({ where: { id: parsed.data } });
  } catch (error) {
    console.error("deleteTestimonial a échoué", error);
    return { ok: false, message: "La suppression a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "TESTIMONIAL_UNPUBLISHED",
    target: testimonial.authorName,
    detail: "témoignage supprimé",
  });

  revalidateTestimonials();

  return {
    ok: true,
    testimonialId: parsed.data,
    message: "Témoignage supprimé.",
  };
}
