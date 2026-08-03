"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SIGN_UP_ROLES, type Role } from "@/lib/roles";

const BCRYPT_ROUNDS = 12;

/**
 * Un champ absent du formulaire vaut `null` côté FormData : on normalise en
 * chaîne vide pour que Zod produise un message métier plutôt que « expected
 * string », et pour que le téléphone facultatif reste facultatif.
 */
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Idem, sans `trim` : un mot de passe n'est jamais normalisé, sinon le hash
 * enregistré ici ne correspondrait plus à ce que compare `authorize()`. */
function secret(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Indiquez votre nom complet."),
    email: z.string().toLowerCase().email("Adresse email invalide."),
    phone: z.union([
      z.literal(""),
      z.string().regex(/^[0-9+\s().-]{6,20}$/, "Numéro de téléphone invalide."),
    ]),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z.string(),
    // ADMIN est volontairement exclu : il ne s'obtient pas par inscription.
    role: z.enum(SIGN_UP_ROLES, { message: "Choisissez un type de compte." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  });

export type SignUpResult =
  | { ok: true; email: string; role: Role }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Crée un compte CLIENT ou OWNER : validation, hachage bcrypt du mot de passe
 * puis insertion via Prisma. La connexion est déclenchée côté client une fois
 * le compte créé.
 */
export async function createUser(formData: FormData): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse({
    fullName: text(formData.get("fullName")),
    email: text(formData.get("email")),
    phone: text(formData.get("phone")),
    password: secret(formData.get("password")),
    confirmPassword: secret(formData.get("confirmPassword")),
    role: text(formData.get("role")),
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

  const { fullName, email, phone, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone: phone || null,
        passwordHash,
        role,
      },
      select: { email: true, role: true },
    });

    return { ok: true, email: user.email, role: user.role };
  } catch (error) {
    // P2002 : violation de la contrainte d'unicité sur `email`.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "Un compte existe déjà avec cette adresse email.",
        fieldErrors: { email: "Cette adresse est déjà utilisée." },
      };
    }

    console.error("createUser a échoué", error);
    return {
      ok: false,
      message: "La création du compte a échoué. Réessayez dans un instant.",
    };
  }
}
