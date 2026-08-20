import { z } from "zod";

import { findCategory } from "@/lib/rooms/categories";
import { normalizeText } from "@/lib/utils";
import { findWilaya } from "@/lib/wilayas";

/**
 * Validation d'une salle, partagée par la création et la modification.
 *
 * Source de vérité unique : les bornes servent aussi bien au schéma Zod côté
 * serveur qu'aux attributs `min`, `max` et `maxLength` du formulaire, pour que
 * le navigateur signale les mêmes limites que l'action serveur.
 */

export const ROOM_LIMITS = {
  name: { min: 3, max: 120 },
  description: { min: 60, max: 4000 },
  /** Wilaya : seule la borne haute sert encore, la valeur vient d'un référentiel fermé. */
  city: { max: 80 },
  address: { min: 5, max: 200 },
  /** Libellé d'une catégorie saisie à la main, et nombre de catégories par salle. */
  category: { min: 3, max: 40 },
  categories: { max: 9 },
  capacity: { min: 1, max: 100_000 },
  price: { min: 1, max: 100_000_000 },
} as const;

export const PHOTO_LIMITS = {
  /** Nombre total de photos conservées pour une salle. */
  maxCount: 8,
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp", "image/avif"] as const,
} as const;

/** Valeur de l'attribut `accept` de l'input fichier. */
export const PHOTO_ACCEPT = PHOTO_LIMITS.types.join(",");

/**
 * Un champ absent du FormData vaut `null` : on normalise en chaîne vide pour
 * obtenir un message métier plutôt qu'une erreur de type Zod.
 */
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

const positiveIntFromForm = (label: string) =>
  z
    .string()
    .min(1, `${label} est obligatoire.`)
    .transform((value) => Number(value.replace(/\s/g, "").replace(",", ".")))
    .refine((value) => Number.isFinite(value), {
      message: `${label} doit être un nombre.`,
    })
    .refine((value) => Number.isInteger(value), {
      message: `${label} doit être un nombre entier.`,
    });

export const roomInputSchema = z
  .object({
    name: z
      .string()
      .min(ROOM_LIMITS.name.min, "Le nom doit contenir au moins 3 caractères.")
      .max(ROOM_LIMITS.name.max, "Le nom est trop long (120 caractères max)."),
    description: z
      .string()
      .min(
        ROOM_LIMITS.description.min,
        "Décrivez la salle en 60 caractères minimum : espaces, ambiance, prestations incluses."
      )
      .max(
        ROOM_LIMITS.description.max,
        "La description est trop longue (4 000 caractères max)."
      ),
    /*
     * La wilaya est choisie dans le référentiel `lib/wilayas.ts`, pas saisie
     * librement. Le contrôle est refait ici parce qu'une action serveur est un
     * point d'entrée HTTP : le sélecteur du formulaire n'engage que le
     * navigateur. La valeur est ensuite ramenée à l'orthographe du référentiel,
     * pour que les filtres du catalogue — qui comparent des chaînes — ne voient
     * jamais « alger » et « Alger » comme deux villes différentes.
     */
    city: z
      .string()
      .min(1, "Choisissez la wilaya de la salle.")
      .max(ROOM_LIMITS.city.max, "Le nom de wilaya est trop long.")
      .refine((value) => findWilaya(value) !== null, {
        message: "Choisissez une wilaya dans la liste proposée.",
      })
      .transform((value) => findWilaya(value) ?? value),
    address: z
      .string()
      .min(ROOM_LIMITS.address.min, "Indiquez l'adresse complète.")
      .max(ROOM_LIMITS.address.max, "L'adresse est trop longue."),
    /**
     * Catégories de la salle, transmises par **libellé** et non par identifiant :
     * la liste proposée est tenue dans le code (`lib/rooms/categories.ts`) et un
     * propriétaire peut en saisir une absente du référentiel. C'est l'action
     * serveur qui retrouve ou crée la ligne `Category` correspondante.
     *
     * La première sert de catégorie principale : c'est elle qui s'affiche sur
     * les cartes et la fiche.
     */
    categoryNames: z
      .array(
        z
          .string()
          .min(
            ROOM_LIMITS.category.min,
            "Un nom de catégorie doit contenir au moins 3 caractères."
          )
          .max(
            ROOM_LIMITS.category.max,
            "Un nom de catégorie est limité à 40 caractères."
          )
      )
      .min(1, "Choisissez au moins une catégorie.")
      .max(
        ROOM_LIMITS.categories.max,
        `${ROOM_LIMITS.categories.max} catégories au maximum.`
      ),
    capacityMin: positiveIntFromForm("La capacité minimum")
      .refine((value) => value >= ROOM_LIMITS.capacity.min, {
        message: "La capacité minimum doit être d'au moins 1 invité.",
      })
      .refine((value) => value <= ROOM_LIMITS.capacity.max, {
        message: "La capacité minimum est irréaliste.",
      }),
    capacityMax: positiveIntFromForm("La capacité maximum")
      .refine((value) => value >= ROOM_LIMITS.capacity.min, {
        message: "La capacité maximum doit être d'au moins 1 invité.",
      })
      .refine((value) => value <= ROOM_LIMITS.capacity.max, {
        message: "La capacité maximum est irréaliste.",
      }),
    basePrice: positiveIntFromForm("Le prix de base")
      .refine((value) => value >= ROOM_LIMITS.price.min, {
        message: "Le prix de base doit être supérieur à 0.",
      })
      .refine((value) => value <= ROOM_LIMITS.price.max, {
        message: "Le prix de base est irréaliste.",
      }),
    equipmentIds: z.array(z.string().min(1)),
    serviceIds: z.array(z.string().min(1)),
  })
  .refine((data) => data.capacityMin <= data.capacityMax, {
    path: ["capacityMax"],
    message: "La capacité maximum doit être supérieure ou égale au minimum.",
  });

export type RoomInput = z.infer<typeof roomInputSchema>;

export interface FieldErrors {
  [field: string]: string;
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors: FieldErrors };

/**
 * Libellés de catégories reçus du formulaire : espaces normalisés, orthographe
 * ramenée à celle du référentiel quand le libellé y figure, et dédoublonnage
 * insensible à la casse. Sans lui, « mariage » et « Mariage » créeraient deux
 * rattachements — et deux lignes `Category` distinctes.
 */
function readCategoryNames(formData: FormData): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const entry of formData.getAll("categoryNames")) {
    const raw = text(entry).replace(/\s+/g, " ");
    if (!raw) continue;

    const known = findCategory(raw);
    const name = known ? known.name : raw;
    const key = normalizeText(name);

    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

/** Extrait les champs « salle » d'un FormData et les valide. */
export function parseRoomForm(formData: FormData): ParseResult<RoomInput> {
  const parsed = roomInputSchema.safeParse({
    name: text(formData.get("name")),
    description: text(formData.get("description")),
    city: text(formData.get("city")),
    address: text(formData.get("address")),
    categoryNames: readCategoryNames(formData),
    capacityMin: text(formData.get("capacityMin")),
    capacityMax: text(formData.get("capacityMax")),
    basePrice: text(formData.get("basePrice")),
    equipmentIds: formData
      .getAll("equipmentIds")
      .filter((value): value is string => typeof value === "string"),
    serviceIds: formData
      .getAll("serviceIds")
      .filter((value): value is string => typeof value === "string"),
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  // Un seul message par champ : le premier suffit à corriger la saisie.
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return {
    ok: false,
    message: "Certains champs sont incomplets ou invalides.",
    fieldErrors,
  };
}

/**
 * Valide les fichiers envoyés par le champ photos.
 *
 * `existingCount` permet de contrôler le total après ajout : la limite porte sur
 * le nombre de photos de la salle, pas sur le nombre d'envois.
 */
export function parsePhotoFiles(
  formData: FormData,
  existingCount: number = 0
): ParseResult<File[]> {
  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const reject = (message: string): ParseResult<File[]> => ({
    ok: false,
    message,
    fieldErrors: { photos: message },
  });

  if (existingCount + files.length > PHOTO_LIMITS.maxCount) {
    return reject(
      `Une salle ne peut pas dépasser ${PHOTO_LIMITS.maxCount} photos (${existingCount} déjà enregistrées).`
    );
  }

  for (const file of files) {
    if (!PHOTO_LIMITS.types.includes(file.type as (typeof PHOTO_LIMITS.types)[number])) {
      return reject(
        `Format non accepté pour « ${file.name} » : utilisez du JPEG, PNG, WebP ou AVIF.`
      );
    }
    if (file.size > PHOTO_LIMITS.maxBytes) {
      return reject(
        `« ${file.name} » dépasse ${PHOTO_LIMITS.maxBytes / (1024 * 1024)} Mo.`
      );
    }
  }

  return { ok: true, data: files };
}
