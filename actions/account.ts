"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserSession } from "@/lib/session";
import { recordAudit } from "@/lib/admin/audit";
import type { FieldErrors } from "@/lib/forms";
import {
  parseAvatarFile,
  parsePasswordForm,
  parseProfileForm,
} from "@/lib/account/schemas";
import {
  deleteStoredPhoto,
  isStorageConfigured,
  saveUserAvatar,
  StorageForbiddenError,
  StorageNotConfiguredError,
} from "@/lib/storage";

/**
 * Mutations du compte utilisateur.
 *
 * Chaque action repart de la session serveur pour déterminer *qui* est
 * modifié : aucun identifiant d'utilisateur ne transite par le formulaire, il
 * n'y a donc rien à falsifier pour écrire dans le compte d'un tiers.
 */

const BCRYPT_ROUNDS = 12;
const PROFILE_PATH = "/profil";

export type AccountFormState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors }
  | null;

/**
 * Met à jour nom, téléphone et avatar.
 *
 * L'ancien avatar n'est retiré du stockage qu'une fois le nouveau enregistré en
 * base : une panne à mi-chemin laisse au pire un fichier orphelin, jamais un
 * compte dont l'image pointe dans le vide.
 *
 * Signature `useFormState` : le formulaire reste soumissible sans JavaScript et
 * la confirmation revient dans l'état plutôt que par une redirection, pour
 * rester sur la page comme le demandent les maquettes.
 */
export async function updateProfile(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const session = await requireUserSession();
  if (!session.ok) return { ok: false, message: session.refusal.message };

  const fields = parseProfileForm(formData);
  if (!fields.ok) return fields;

  const avatar = parseAvatarFile(formData);
  if (!avatar.ok) return avatar;

  if (avatar.data && !isStorageConfigured()) {
    return storageUnavailable();
  }

  const removeAvatar = formData.get("removeAvatar") === "1";

  try {
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true, avatarPublicId: true },
    });

    if (!current) {
      return { ok: false, message: "Ce compte n'existe plus." };
    }

    const uploaded = avatar.data
      ? await saveUserAvatar(session.user.id, avatar.data)
      : null;

    // Trois cas : nouvel avatar, retrait explicite, ou avatar inchangé.
    const avatarFields = uploaded
      ? { avatarUrl: uploaded.url, avatarPublicId: uploaded.publicId }
      : removeAvatar
        ? { avatarUrl: null, avatarPublicId: null }
        : {};

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName: fields.data.fullName,
        phone: fields.data.phone || null,
        ...avatarFields,
      },
    });

    if ((uploaded || removeAvatar) && current.avatarPublicId) {
      await deleteStoredPhoto({ publicId: current.avatarPublicId });
    }

    revalidatePath(PROFILE_PATH);
    revalidatePath("/profil/modifier");

    return {
      ok: true,
      message: "Vos informations ont été mises à jour.",
    };
  } catch (error) {
    return failure("mise à jour du profil", error);
  }
}

/**
 * Change le mot de passe après vérification de l'actuel.
 *
 * La session n'est pas invalidée : Auth.js est en JWT, il n'existe pas de
 * registre de sessions à révoquer. C'est une limite connue de la configuration
 * actuelle, à traiter le jour où les sessions passent en base.
 */
export async function changePassword(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const session = await requireUserSession();
  if (!session.ok) return { ok: false, message: session.refusal.message };

  const fields = parsePasswordForm(formData);
  if (!fields.ok) return fields;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return { ok: false, message: "Ce compte n'existe plus." };
    }

    // Compte créé via un provider externe : il n'a pas de mot de passe local.
    if (!user.passwordHash) {
      return {
        ok: false,
        message:
          "Ce compte se connecte via un service externe : il n'a pas de mot de passe LIUDOR à modifier.",
      };
    }

    const matches = await bcrypt.compare(
      fields.data.currentPassword,
      user.passwordHash
    );

    if (!matches) {
      return {
        ok: false,
        message: "Le mot de passe n'a pas été modifié.",
        fieldErrors: {
          currentPassword: "Ce mot de passe ne correspond pas à votre compte.",
        },
      };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: await bcrypt.hash(fields.data.newPassword, BCRYPT_ROUNDS),
      },
    });

    // Seuls les comptes administrateur sont tracés : le journal sert la
    // surveillance de l'administration, pas le suivi des clients.
    if (session.user.role === "ADMIN") {
      await recordAudit({
        userId: session.user.id,
        action: "PASSWORD_CHANGED",
        detail: "mot de passe administrateur modifié",
      });
    }

    return {
      ok: true,
      message:
        "Votre mot de passe a été modifié. Utilisez-le à votre prochaine connexion.",
    };
  } catch (error) {
    return failure("changement de mot de passe", error);
  }
}

function storageUnavailable(): AccountFormState {
  const message =
    "L'envoi d'images est momentanément indisponible. Enregistrez vos informations sans photo, vous pourrez l'ajouter ensuite.";
  return { ok: false, message, fieldErrors: { avatar: message } };
}

function failure(operation: string, error: unknown): AccountFormState {
  console.error(`[compte] ${operation} a échoué`, error);

  if (error instanceof StorageNotConfiguredError) return storageUnavailable();

  if (error instanceof StorageForbiddenError) {
    return {
      ok: false,
      message: "Le service de stockage a refusé l'envoi de votre photo.",
      fieldErrors: {
        avatar:
          "Envoi refusé par le service de stockage. Réessayez sans photo, ou contactez le support.",
      },
    };
  }

  return {
    ok: false,
    message: `La ${operation} a échoué. Réessayez dans un instant.`,
  };
}
