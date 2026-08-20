import { z } from "zod";

import { findCategory } from "@/lib/rooms/categories";
import { findEquipment } from "@/lib/rooms/equipments";
import { findService } from "@/lib/rooms/services";
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
  /** Libellé choisi dans un référentiel ou saisi à la main. */
  label: { min: 3, max: 40 },
  /** Précision libre attachée à un équipement (« 120 places »). */
  detail: { max: 60 },
  categories: { max: 9 },
  equipments: { max: 30 },
  services: { max: 20 },
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

/**
 * Nom du champ portant la précision d'un équipement.
 *
 * La clé dérive du libellé plutôt que de la position, pour que les précisions
 * ne puissent pas se décaler d'un équipement à l'autre — le formulaire et
 * l'action se partagent donc cette fonction.
 */
export function equipmentDetailField(name: string): string {
  return `equipmentDetail:${name}`;
}

/**
 * Libellé de référentiel : catégorie, équipement ou prestation. Les trois
 * champs voyagent en clair — le formulaire n'envoie plus d'identifiants — donc
 * ils partagent les mêmes bornes.
 */
const label = (subject: string) =>
  z
    .string()
    .min(
      ROOM_LIMITS.label.min,
      `Un nom de ${subject} doit contenir au moins ${ROOM_LIMITS.label.min} caractères.`
    )
    .max(
      ROOM_LIMITS.label.max,
      `Un nom de ${subject} est limité à ${ROOM_LIMITS.label.max} caractères.`
    );

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
      .array(label("catégorie"))
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
    /**
     * Équipements et leur précision éventuelle. La précision appartient à la
     * salle (`RoomEquipment.detail`), pas à l'équipement : « 120 places » ne
     * vaut que pour ce parking-là.
     */
    equipments: z
      .array(
        z.object({
          name: label("équipement"),
          detail: z
            .string()
            .max(
              ROOM_LIMITS.detail.max,
              `Une précision est limitée à ${ROOM_LIMITS.detail.max} caractères.`
            )
            .nullable(),
        })
      )
      .max(
        ROOM_LIMITS.equipments.max,
        `${ROOM_LIMITS.equipments.max} équipements au maximum.`
      ),
    /**
     * Prestations : le propriétaire peut en saisir une absente du référentiel,
     * l'action serveur crée alors la ligne `Service` correspondante.
     */
    serviceNames: z
      .array(label("prestation"))
      .max(
        ROOM_LIMITS.services.max,
        `${ROOM_LIMITS.services.max} prestations au maximum.`
      ),
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
 * Libellés reçus du formulaire : espaces normalisés, orthographe ramenée à
 * celle du référentiel quand le libellé y figure, et dédoublonnage insensible à
 * la casse. Sans cela, « traiteur » et « Traiteur » produiraient deux
 * rattachements — et deux lignes distinctes en base.
 *
 * `canonical` renvoie la forme officielle d'un libellé connu, ou `null` pour
 * une saisie libre, qui est alors conservée telle quelle.
 */
function readLabels(
  formData: FormData,
  field: string,
  canonical: (value: string) => string | null
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const entry of formData.getAll(field)) {
    const raw = text(entry).replace(/\s+/g, " ");
    if (!raw) continue;

    const name = canonical(raw) ?? raw;
    const key = normalizeText(name);

    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

/**
 * Équipements retenus, avec leur précision. Même nettoyage que `readLabels`,
 * plus la lecture du champ de précision associé à chaque libellé — lu sur le
 * libellé **brut**, celui que le formulaire a effectivement envoyé, avant sa
 * remise à l'orthographe du référentiel.
 */
function readEquipments(
  formData: FormData
): { name: string; detail: string | null }[] {
  const seen = new Set<string>();
  const equipments: { name: string; detail: string | null }[] = [];

  for (const entry of formData.getAll("equipmentNames")) {
    const raw = text(entry).replace(/\s+/g, " ");
    if (!raw) continue;

    const name = findEquipment(raw)?.name ?? raw;
    const key = normalizeText(name);
    if (seen.has(key)) continue;
    seen.add(key);

    const detail = text(formData.get(equipmentDetailField(raw))).replace(
      /\s+/g,
      " "
    );

    equipments.push({ name, detail: detail || null });
  }

  return equipments;
}

/** Extrait les champs « salle » d'un FormData et les valide. */
export function parseRoomForm(formData: FormData): ParseResult<RoomInput> {
  const parsed = roomInputSchema.safeParse({
    name: text(formData.get("name")),
    description: text(formData.get("description")),
    city: text(formData.get("city")),
    address: text(formData.get("address")),
    categoryNames: readLabels(
      formData,
      "categoryNames",
      (value) => findCategory(value)?.name ?? null
    ),
    capacityMin: text(formData.get("capacityMin")),
    capacityMax: text(formData.get("capacityMax")),
    basePrice: text(formData.get("basePrice")),
    equipments: readEquipments(formData),
    serviceNames: readLabels(
      formData,
      "serviceNames",
      (value) => findService(value)?.name ?? null
    ),
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
