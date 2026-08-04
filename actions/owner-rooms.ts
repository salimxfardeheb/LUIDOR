"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RoomStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession } from "@/lib/owner/guards";
import {
  parsePhotoFiles,
  parseRoomForm,
  type FieldErrors,
} from "@/lib/rooms/schemas";
import {
  deleteStoredPhoto,
  isStorageConfigured,
  saveRoomPhotos,
  StorageForbiddenError,
  StorageNotConfiguredError,
} from "@/lib/storage";

/**
 * Mutations du portail propriétaire.
 *
 * Chaque action revérifie la session et la propriété de la salle : une action
 * serveur est un point d'entrée HTTP public, le fait que l'UI ne l'expose qu'aux
 * propriétaires ne protège rien.
 */

export type RoomActionResult =
  | { ok: true; roomId: string; message: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      /** Renseigné pour les refus d'accès, afin que l'UI puisse les distinguer. */
      status?: 401 | 403 | 404;
    };

/**
 * État du formulaire salle, consommé par `useFormState`.
 *
 * En cas de succès l'action redirige : l'état ne transporte donc que les échecs,
 * plus `null` à l'état initial.
 */
export type RoomFormState = Extract<RoomActionResult, { ok: false }> | null;

const OWNER_ROOMS_PATH = "/owner/salles";

/** Session propriétaire, ou refus typé — voir `lib/owner/guards`. */
async function requireOwner(): Promise<
  { ok: true; ownerId: string } | { ok: false; result: RoomActionResult }
> {
  const session = await requireOwnerSession();

  if (!session.ok) {
    return { ok: false, result: { ok: false, ...session.refusal } };
  }

  return { ok: true, ownerId: session.ownerId };
}

/** Vérifie que la salle appartient bien au propriétaire connecté. */
async function requireOwnedRoom(
  roomId: string,
  ownerId: string
): Promise<
  { ok: true; photoCount: number } | { ok: false; result: RoomActionResult }
> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true, _count: { select: { photos: true } } },
  });

  if (!room) {
    return {
      ok: false,
      result: { ok: false, status: 404, message: "Cette salle n'existe pas." },
    };
  }

  if (room.ownerId !== ownerId) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 403,
        message: "Cette salle n'appartient pas à votre compte.",
      },
    };
  }

  return { ok: true, photoCount: room._count.photos };
}

/**
 * Crée une salle, puis redirige vers la liste avec le drapeau de confirmation.
 *
 * Signature `useFormState` : le formulaire reste soumissible sans JavaScript, et
 * les erreurs de validation reviennent dans l'état. La redirection est faite
 * hors du `try` : `redirect()` fonctionne en levant une exception interne, qu'un
 * `catch` avalerait.
 *
 * Le statut est forcé à `PENDING` : une salle n'est publique qu'après validation
 * par l'équipe LIUDOR, et le formulaire n'a aucun moyen d'influer sur ce point.
 */
export async function createRoom(
  _prevState: RoomFormState,
  formData: FormData
): Promise<RoomFormState> {
  const result = await create(formData);

  if (result.ok) {
    redirect(`${OWNER_ROOMS_PATH}?cree=${encodeURIComponent(result.roomId)}`);
  }

  return result;
}

async function create(formData: FormData): Promise<RoomActionResult> {
  const owner = await requireOwner();
  if (!owner.ok) return owner.result;

  const fields = parseRoomForm(formData);
  if (!fields.ok) return fields;

  const photos = parsePhotoFiles(formData);
  if (!photos.ok) return photos;

  // Contrôle avant écriture : inutile de créer une salle si les photos
  // demandées ne pourront pas être envoyées.
  if (photos.data.length > 0 && !isStorageConfigured()) {
    return storageUnavailable();
  }

  const { data } = fields;

  try {
    const room = await prisma.room.create({
      data: {
        name: data.name,
        description: data.description,
        city: data.city,
        address: data.address,
        capacityMin: data.capacityMin,
        capacityMax: data.capacityMax,
        basePrice: data.basePrice,
        status: "PENDING",
        owner: { connect: { id: owner.ownerId } },
        // La première catégorie cochée devient la principale ; toutes sont
        // rattachées, y compris celle-ci (invariant de `RoomCategory`).
        category: { connect: { id: data.categoryIds[0] } },
        categories: {
          create: data.categoryIds.map((categoryId) => ({ categoryId })),
        },
        equipments: {
          create: data.equipmentIds.map((equipmentId) => ({ equipmentId })),
        },
        services: {
          create: data.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      select: { id: true },
    });

    // Les photos sont envoyées après la salle : leur dossier porte son id. Si
    // l'envoi échoue, la salle tout juste créée est retirée — mieux vaut aucune
    // salle qu'une fiche vide que le propriétaire croit publiée.
    try {
      await attachPhotos(room.id, photos.data, 0);
    } catch (error) {
      await prisma.room.delete({ where: { id: room.id } });
      throw error;
    }

    revalidatePath(OWNER_ROOMS_PATH);

    return {
      ok: true,
      roomId: room.id,
      message: `« ${data.name} » a été enregistrée et attend la validation de l'équipe LIUDOR.`,
    };
  } catch (error) {
    return failure("création", error);
  }
}

/** Met à jour une salle du propriétaire connecté, puis redirige vers la liste. */
export async function updateRoom(
  _prevState: RoomFormState,
  formData: FormData
): Promise<RoomFormState> {
  const result = await update(formData);

  if (result.ok) {
    redirect(`${OWNER_ROOMS_PATH}?maj=${encodeURIComponent(result.roomId)}`);
  }

  return result;
}

async function update(formData: FormData): Promise<RoomActionResult> {
  const owner = await requireOwner();
  if (!owner.ok) return owner.result;

  const roomId =
    typeof formData.get("roomId") === "string"
      ? String(formData.get("roomId"))
      : "";
  if (!roomId) {
    return { ok: false, status: 404, message: "Salle introuvable." };
  }

  const owned = await requireOwnedRoom(roomId, owner.ownerId);
  if (!owned.ok) return owned.result;

  const fields = parseRoomForm(formData);
  if (!fields.ok) return fields;

  // Photos à retirer : elles libèrent de la place dans le quota.
  const removedIds = formData
    .getAll("removePhotoIds")
    .filter((value): value is string => typeof value === "string");

  const photos = parsePhotoFiles(
    formData,
    Math.max(0, owned.photoCount - removedIds.length)
  );
  if (!photos.ok) return photos;

  if (photos.data.length > 0 && !isStorageConfigured()) {
    return storageUnavailable();
  }

  const { data } = fields;

  try {
    if (removedIds.length > 0) {
      // `roomId` dans le `where` : on ne supprime que des photos de cette salle,
      // même si le formulaire renvoyait un id appartenant à une autre.
      const toDelete = await prisma.photo.findMany({
        where: { id: { in: removedIds }, roomId },
        select: { id: true, url: true, publicId: true },
      });

      await prisma.photo.deleteMany({
        where: { id: { in: toDelete.map((photo) => photo.id) } },
      });
      await Promise.all(toDelete.map((photo) => deleteStoredPhoto(photo)));
    }

    await prisma.$transaction([
      prisma.roomCategory.deleteMany({ where: { roomId } }),
      prisma.roomEquipment.deleteMany({ where: { roomId } }),
      prisma.roomService.deleteMany({ where: { roomId } }),
      prisma.room.update({
        where: { id: roomId },
        data: {
          name: data.name,
          description: data.description,
          city: data.city,
          address: data.address,
          capacityMin: data.capacityMin,
          capacityMax: data.capacityMax,
          basePrice: data.basePrice,
          category: { connect: { id: data.categoryIds[0] } },
          categories: {
            create: data.categoryIds.map((categoryId) => ({ categoryId })),
          },
          equipments: {
            create: data.equipmentIds.map((equipmentId) => ({ equipmentId })),
          },
          services: {
            create: data.serviceIds.map((serviceId) => ({ serviceId })),
          },
        },
      }),
    ]);

    const remaining = await prisma.photo.count({ where: { roomId } });
    await attachPhotos(roomId, photos.data, remaining);

    revalidatePath(OWNER_ROOMS_PATH);
    revalidatePath(`/owner/salles/${roomId}/modifier`);
    revalidatePath(`/salles/${roomId}`);

    return {
      ok: true,
      roomId,
      message: `Les modifications de « ${data.name} » ont été enregistrées.`,
    };
  } catch (error) {
    return failure("mise à jour", error);
  }
}

/**
 * Désactive ou réactive une salle.
 *
 * `SUSPENDED` est le seul statut « hors ligne » du modèle : il sert donc aussi
 * bien à la désactivation par le propriétaire qu'à une suspension décidée par un
 * administrateur. Les deux cas ne sont pas distinguables aujourd'hui — un champ
 * dédié (`suspendedBy`) serait nécessaire pour empêcher un propriétaire de lever
 * une suspension qu'il n'a pas décidée.
 *
 * Une salle `PENDING` ou `REJECTED` n'est pas concernée : elle n'est pas en ligne.
 */
export async function setRoomAvailability(
  roomId: string,
  active: boolean
): Promise<RoomActionResult> {
  const owner = await requireOwner();
  if (!owner.ok) return owner.result;

  const owned = await requireOwnedRoom(roomId, owner.ownerId);
  if (!owned.ok) return owned.result;

  try {
    const current = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      select: { name: true, status: true },
    });

    const expected: RoomStatus = active ? "SUSPENDED" : "ACTIVE";
    if (current.status !== expected) {
      return {
        ok: false,
        message: active
          ? "Cette salle n'est pas désactivée."
          : "Seule une salle en ligne peut être désactivée.",
      };
    }

    await prisma.room.update({
      where: { id: roomId },
      data: { status: active ? "ACTIVE" : "SUSPENDED" },
    });

    revalidatePath(OWNER_ROOMS_PATH);
    revalidatePath(`/salles/${roomId}`);

    return {
      ok: true,
      roomId,
      message: active
        ? `« ${current.name} » est de nouveau visible par les clients.`
        : `« ${current.name} » n'apparaît plus dans le catalogue public.`,
    };
  } catch (error) {
    return failure("changement de statut", error);
  }
}

/**
 * Enregistre les fichiers et crée les lignes `Photo` correspondantes.
 * `startPosition` conserve l'ordre d'affichage après les photos existantes.
 */
async function attachPhotos(
  roomId: string,
  files: File[],
  startPosition: number
): Promise<void> {
  if (files.length === 0) return;

  const stored = await saveRoomPhotos(roomId, files);

  await prisma.photo.createMany({
    data: stored.map((photo, index) => ({
      roomId,
      url: photo.url,
      publicId: photo.publicId,
      position: startPosition + index,
    })),
  });
}

/** Stockage non configuré : message actionnable plutôt qu'échec opaque. */
function storageUnavailable(): RoomActionResult {
  return {
    ok: false,
    fieldErrors: {
      photos:
        "L'envoi de photos est momentanément indisponible. Enregistrez la salle sans photo, vous pourrez les ajouter ensuite.",
    },
    message: "Le service de stockage des photos n'est pas disponible.",
  };
}

function failure(operation: string, error: unknown): RoomActionResult {
  console.error(`[owner/salles] ${operation} a échoué`, error);

  if (error instanceof StorageNotConfiguredError) return storageUnavailable();

  // Refus permanent de Cloudinary : le message doit pointer la cause réelle,
  // sinon le propriétaire réessaie indéfiniment une opération qui échouera.
  if (error instanceof StorageForbiddenError) {
    return {
      ok: false,
      fieldErrors: {
        photos:
          "Le service de stockage a refusé l'envoi. Les autres informations n'ont pas été enregistrées : réessayez sans photo, ou contactez le support.",
      },
      message:
        "Envoi des photos refusé par le service de stockage (permissions insuffisantes sur la clé API).",
    };
  }

  return {
    ok: false,
    message: `La ${operation} a échoué. Réessayez dans un instant.`,
  };
}
