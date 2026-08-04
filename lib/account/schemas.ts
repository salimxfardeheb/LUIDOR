import { z } from "zod";
import {
  fieldErrorsFrom,
  secret,
  text,
  type ParseResult,
} from "@/lib/forms";

/**
 * Validation de l'espace compte.
 *
 * Les bornes sont exportées : le formulaire les reprend dans ses attributs
 * `minLength` / `maxLength`, pour que le navigateur signale exactement les
 * mêmes limites que l'action serveur, qui reste seule à faire autorité.
 */

export const PROFILE_LIMITS = {
  fullName: { min: 2, max: 120 },
  phone: { min: 6, max: 20 },
  password: { min: 8, max: 200 },
  comment: { min: 10, max: 2000 },
} as const;

export const AVATAR_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp", "image/avif"] as const,
} as const;

export const AVATAR_ACCEPT = AVATAR_LIMITS.types.join(",");

/** Téléphone facultatif : vide ou format international tolérant. */
const phoneField = z.union([
  z.literal(""),
  z
    .string()
    .regex(/^[0-9+\s().-]{6,20}$/, "Numéro de téléphone invalide."),
]);

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(PROFILE_LIMITS.fullName.min, "Indiquez votre nom complet.")
    .max(PROFILE_LIMITS.fullName.max, "Ce nom est trop long (120 caractères max)."),
  phone: phoneField,
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function parseProfileForm(formData: FormData): ParseResult<ProfileInput> {
  const parsed = profileSchema.safeParse({
    fullName: text(formData.get("fullName")),
    phone: text(formData.get("phone")),
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    message: "Vérifiez les informations saisies.",
    fieldErrors: fieldErrorsFrom(parsed.error),
  };
}

/**
 * Changement de mot de passe.
 *
 * Le mot de passe actuel est exigé : sans lui, une session volée suffirait à
 * verrouiller le compte de son propriétaire légitime.
 */
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel."),
    newPassword: z
      .string()
      .min(
        PROFILE_LIMITS.password.min,
        "Le nouveau mot de passe doit contenir au moins 8 caractères."
      )
      .max(PROFILE_LIMITS.password.max, "Ce mot de passe est trop long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "Le nouveau mot de passe doit être différent de l'actuel.",
  });

export type PasswordInput = z.infer<typeof passwordSchema>;

export function parsePasswordForm(
  formData: FormData
): ParseResult<PasswordInput> {
  const parsed = passwordSchema.safeParse({
    currentPassword: secret(formData.get("currentPassword")),
    newPassword: secret(formData.get("newPassword")),
    confirmPassword: secret(formData.get("confirmPassword")),
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    message: "Le mot de passe n'a pas été modifié.",
    fieldErrors: fieldErrorsFrom(parsed.error),
  };
}

export const reviewSchema = z.object({
  roomId: z.string().min(1, "Salle introuvable."),
  rating: z
    .number()
    .int()
    .min(1, "Choisissez une note de 1 à 5 étoiles.")
    .max(5, "Choisissez une note de 1 à 5 étoiles."),
  comment: z
    .string()
    .min(
      PROFILE_LIMITS.comment.min,
      "Détaillez votre avis en 10 caractères minimum."
    )
    .max(PROFILE_LIMITS.comment.max, "Votre avis est trop long (2 000 caractères max)."),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export function parseReviewForm(formData: FormData): ParseResult<ReviewInput> {
  const rawRating = text(formData.get("rating"));

  const parsed = reviewSchema.safeParse({
    roomId: text(formData.get("roomId")),
    rating: rawRating === "" ? Number.NaN : Number(rawRating),
    comment: text(formData.get("comment")),
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    message: "Votre avis n'a pas pu être publié.",
    fieldErrors: fieldErrorsFrom(parsed.error),
  };
}

/** Avatar envoyé par le formulaire : facultatif, un seul fichier. */
export function parseAvatarFile(formData: FormData): ParseResult<File | null> {
  const value = formData.get("avatar");
  const file = value instanceof File && value.size > 0 ? value : null;

  const reject = (message: string): ParseResult<File | null> => ({
    ok: false,
    message,
    fieldErrors: { avatar: message },
  });

  if (!file) return { ok: true, data: null };

  if (!AVATAR_LIMITS.types.includes(file.type as (typeof AVATAR_LIMITS.types)[number])) {
    return reject("Format non accepté : utilisez du JPEG, PNG, WebP ou AVIF.");
  }

  if (file.size > AVATAR_LIMITS.maxBytes) {
    return reject(
      `L'image dépasse ${AVATAR_LIMITS.maxBytes / (1024 * 1024)} Mo.`
    );
  }

  return { ok: true, data: file };
}
