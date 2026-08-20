import { z } from "zod";

import { findCategory } from "@/lib/rooms/categories";
import { findEquipment } from "@/lib/rooms/equipments";
import { DEFAULT_RATE_UNIT, RATE_UNIT_VALUES } from "@/lib/rooms/rates";
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
  /** Quartier, affiché dans le fil d'Ariane. */
  district: { max: 80 },
  /** Superficie en m². */
  surface: { min: 1, max: 100_000 },
  /** Nombre d'espaces distincts (grande salle, mezzanine, jardin…). */
  spaces: { min: 1, max: 50 },
  /** Ligne d'information pratique : horaires, sonorisation, annulation. */
  shortText: { max: 120 },
  /** Conditions d'annulation complètes, ouvertes dans une modale. */
  terms: { max: 4000 },
  videoUrl: { max: 500 },
  categories: { max: 9 },
  equipments: { max: 30 },
  services: { max: 20 },
  /** Intitulé d'une formule tarifaire : « Dîner et demi-soirée pour les 2 salles ». */
  rateLabel: { min: 3, max: 70 },
  /** Lignes de la grille tarifaire d'une salle. */
  rates: { max: 12 },
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
 * Nom du champ portant le tarif d'une prestation.
 *
 * Même principe que `equipmentDetailField` : la clé dérive du libellé, jamais
 * de la position, pour qu'un envoi incomplet ne puisse pas coller le prix du
 * traiteur sur le photographe.
 */
export function servicePriceField(name: string): string {
  return `servicePrice:${name}`;
}

/**
 * Nom des champs d'une ligne de la grille tarifaire.
 *
 * Une ligne est identifiée par une clé opaque produite par le formulaire, et
 * non par sa position : les lignes s'ajoutent et se retirent librement, et un
 * envoi auquel il manque un champ ne doit pas décaler le tarif d'une formule
 * sur une autre. L'ordre d'affichage est porté à part, par les valeurs du champ
 * `rateKeys`.
 */
export function rateField(
  key: string,
  part: "label" | "detail" | "price" | "unit"
): string {
  return `rate:${key}:${part}`;
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

/**
 * Texte facultatif : vide vaut `null`, pour que la fiche masque la ligne au
 * lieu d'afficher un blanc.
 */
const optionalText = (subject: string, max: number) =>
  z
    .string()
    .max(max, `${subject} est limité à ${max} caractères.`)
    .transform((value) => (value === "" ? null : value));

/**
 * Entier facultatif : le champ laissé vide vaut `null`, et n'est contrôlé que
 * s'il porte une valeur.
 */
const optionalPositiveIntFromForm = (label: string) =>
  z
    .string()
    .transform((value) => (value === "" ? null : value))
    .pipe(
      z.union([z.null(), positiveIntFromForm(label)])
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
    /** Quartier : il complète le fil d'Ariane et l'adresse affichée. */
    district: optionalText("Le quartier", ROOM_LIMITS.district.max),
    surfaceM2: optionalPositiveIntFromForm("La superficie")
      .refine((value) => value === null || value >= ROOM_LIMITS.surface.min, {
        message: "La superficie doit être d'au moins 1 m².",
      })
      .refine((value) => value === null || value <= ROOM_LIMITS.surface.max, {
        message: "La superficie est irréaliste.",
      }),
    spacesCount: optionalPositiveIntFromForm("Le nombre d'espaces")
      .refine((value) => value === null || value >= ROOM_LIMITS.spaces.min, {
        message: "Une salle compte au moins un espace.",
      })
      .refine((value) => value === null || value <= ROOM_LIMITS.spaces.max, {
        message: `${ROOM_LIMITS.spaces.max} espaces au maximum.`,
      }),
    /**
     * Visite vidéo : une vignette de la galerie y renvoie. Le lien s'ouvre chez
     * un tiers (YouTube, Drive…), d'où le contrôle du protocole — `javascript:`
     * n'a rien à faire dans un href posé par un tiers.
     */
    videoUrl: optionalText("Le lien de la vidéo", ROOM_LIMITS.videoUrl.max)
      .refine((value) => value === null || /^https?:\/\//i.test(value), {
        message: "Le lien de la vidéo doit commencer par http:// ou https://.",
      })
      .refine(
        (value) => {
          if (value === null) return true;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        { message: "Le lien de la vidéo n'est pas une adresse valide." }
      ),
    openingHours: optionalText("Les horaires", ROOM_LIMITS.shortText.max),
    musicPolicy: optionalText(
      "La règle de sonorisation",
      ROOM_LIMITS.shortText.max
    ),
    cancellationPolicy: optionalText(
      "La politique d'annulation",
      ROOM_LIMITS.shortText.max
    ),
    cancellationTerms: optionalText(
      "Les conditions d'annulation",
      ROOM_LIMITS.terms.max
    ),
    depositAmount: optionalPositiveIntFromForm("La caution")
      .refine((value) => value === null || value >= ROOM_LIMITS.price.min, {
        message: "La caution doit être supérieure à 0.",
      })
      .refine((value) => value === null || value <= ROOM_LIMITS.price.max, {
        message: "La caution est irréaliste.",
      }),
    cleaningFee: optionalPositiveIntFromForm("Les frais de ménage")
      .refine((value) => value === null || value >= ROOM_LIMITS.price.min, {
        message: "Les frais de ménage doivent être supérieurs à 0.",
      })
      .refine((value) => value === null || value <= ROOM_LIMITS.price.max, {
        message: "Les frais de ménage sont irréalistes.",
      }),
    petsAllowed: z.boolean(),
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
    /**
     * Capacité minimum, **facultative** : une salle n'annonce le plus souvent
     * qu'un plafond. Une chaîne vide devient `null` — « aucun minimum » — et
     * non 1, qui ferait afficher une fourchette que personne n'a saisie.
     */
    capacityMin: optionalPositiveIntFromForm("La capacité minimum")
      .refine((value) => value === null || value >= ROOM_LIMITS.capacity.min, {
        message: "La capacité minimum doit être d'au moins 1 invité.",
      })
      .refine((value) => value === null || value <= ROOM_LIMITS.capacity.max, {
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
     * Prestations et le tarif que la salle en demande.
     *
     * Le propriétaire peut saisir une prestation absente du référentiel :
     * l'action serveur crée alors la ligne `Service` correspondante. Le prix,
     * lui, appartient au rattachement (`RoomService.price`) et non au
     * référentiel partagé — `null` quand il n'est pas fixé.
     */
    services: z
      .array(
        z.object({
          name: label("prestation"),
          price: optionalPositiveIntFromForm("Le tarif d'une prestation")
            .refine((value) => value === null || value >= ROOM_LIMITS.price.min, {
              message: "Le tarif d'une prestation doit être supérieur à 0.",
            })
            .refine((value) => value === null || value <= ROOM_LIMITS.price.max, {
              message: "Le tarif d'une prestation est irréaliste.",
            }),
        })
      )
      .max(
        ROOM_LIMITS.services.max,
        `${ROOM_LIMITS.services.max} prestations au maximum.`
      ),
    /**
     * Grille tarifaire : une ligne par formule proposée (« Location soirée,
     * 21h – 3h, 270 000 DA »).
     *
     * Facultative — beaucoup de salles s'en tiennent au prix de base — et sans
     * référentiel partagé : libellé comme tarif n'appartiennent qu'à cette
     * salle. L'ordre reçu est celui de la grille et devient `RoomRate.position`.
     */
    rates: z
      .array(
        z.object({
          label: z
            .string()
            .min(
              ROOM_LIMITS.rateLabel.min,
              `Un intitulé de formule doit contenir au moins ${ROOM_LIMITS.rateLabel.min} caractères.`
            )
            .max(
              ROOM_LIMITS.rateLabel.max,
              `Un intitulé de formule est limité à ${ROOM_LIMITS.rateLabel.max} caractères.`
            ),
          detail: z
            .string()
            .max(
              ROOM_LIMITS.detail.max,
              `Un créneau est limité à ${ROOM_LIMITS.detail.max} caractères.`
            )
            .nullable(),
          price: positiveIntFromForm("Le tarif de la formule")
            .refine((value) => value >= ROOM_LIMITS.price.min, {
              message: "Le tarif d'une formule doit être supérieur à 0.",
            })
            .refine((value) => value <= ROOM_LIMITS.price.max, {
              message: "Le tarif de la formule est irréaliste.",
            }),
          unit: z.enum(RATE_UNIT_VALUES, {
            error: "Choisissez une unité de facturation dans la liste.",
          }),
        })
      )
      .max(
        ROOM_LIMITS.rates.max,
        `${ROOM_LIMITS.rates.max} formules tarifaires au maximum.`
      ),
  })
  .refine(
    /*
     * Deux échappatoires avant la comparaison : `null` — aucun minimum annoncé,
     * il n'y a rien à comparer — et `NaN`, que produit une saisie non numérique.
     * Sans elles, une capacité minimum illisible ferait aussi accuser la
     * capacité maximum, qui n'y est pour rien.
     */
    (data) =>
      data.capacityMin === null ||
      Number.isNaN(data.capacityMin) ||
      data.capacityMin <= data.capacityMax,
    {
      path: ["capacityMax"],
      message: "La capacité maximum doit être supérieure ou égale au minimum.",
    }
  );

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

/**
 * Prestations retenues et leur tarif. Même nettoyage que `readLabels`, plus la
 * lecture du prix associé à chaque libellé — pris sur le libellé **brut**,
 * celui que le formulaire a envoyé, avant sa remise à l'orthographe du
 * référentiel.
 */
function readServices(formData: FormData): { name: string; price: string }[] {
  const seen = new Set<string>();
  const services: { name: string; price: string }[] = [];

  for (const entry of formData.getAll("serviceNames")) {
    const raw = text(entry).replace(/\s+/g, " ");
    if (!raw) continue;

    const name = findService(raw)?.name ?? raw;
    const key = normalizeText(name);
    if (seen.has(key)) continue;
    seen.add(key);

    services.push({ name, price: text(formData.get(servicePriceField(raw))) });
  }

  return services;
}

/**
 * Lignes de la grille tarifaire, dans l'ordre où le formulaire les a rangées.
 *
 * `rateKeys` porte l'ordre et la liste des lignes retenues ; les valeurs de
 * chaque ligne se lisent ensuite par clé (`rateField`). Une ligne entièrement
 * vide — le propriétaire a ouvert une formule puis changé d'avis — est ignorée
 * plutôt que refusée : elle ne dit rien, elle n'a pas à bloquer l'envoi.
 */
function readRates(formData: FormData): {
  label: string;
  detail: string | null;
  price: string;
  unit: string;
}[] {
  const seen = new Set<string>();
  const rates: {
    label: string;
    detail: string | null;
    price: string;
    unit: string;
  }[] = [];

  for (const entry of formData.getAll("rateKeys")) {
    const key = text(entry);
    // Une clé forgée en double ferait lire deux fois la même ligne.
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const label = text(formData.get(rateField(key, "label"))).replace(
      /\s+/g,
      " "
    );
    const price = text(formData.get(rateField(key, "price")));
    if (!label && !price) continue;

    const detail = text(formData.get(rateField(key, "detail"))).replace(
      /\s+/g,
      " "
    );
    const unit = text(formData.get(rateField(key, "unit"))) || DEFAULT_RATE_UNIT;

    rates.push({ label, detail: detail || null, price, unit });
  }

  return rates;
}

/** Extrait les champs « salle » d'un FormData et les valide. */
export function parseRoomForm(formData: FormData): ParseResult<RoomInput> {
  const equipments = readEquipments(formData);
  const services = readServices(formData);

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
    district: text(formData.get("district")),
    capacityMin: text(formData.get("capacityMin")),
    capacityMax: text(formData.get("capacityMax")),
    surfaceM2: text(formData.get("surfaceM2")),
    spacesCount: text(formData.get("spacesCount")),
    basePrice: text(formData.get("basePrice")),
    videoUrl: text(formData.get("videoUrl")),
    openingHours: text(formData.get("openingHours")),
    musicPolicy: text(formData.get("musicPolicy")),
    cancellationPolicy: text(formData.get("cancellationPolicy")),
    cancellationTerms: text(formData.get("cancellationTerms")),
    depositAmount: text(formData.get("depositAmount")),
    cleaningFee: text(formData.get("cleaningFee")),
    // Case à cocher : absente du FormData quand elle n'est pas cochée.
    petsAllowed: formData.get("petsAllowed") !== null,
    equipments,
    services,
    rates: readRates(formData),
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  /**
   * De quel élément d'un champ de liste parle l'erreur.
   *
   * Sans cette précision, « le tarif doit être supérieur à 0 » désignerait une
   * prestation parmi vingt sans dire laquelle. Les équipements et les
   * prestations se nomment — c'est ce que le propriétaire lit à l'écran ; la
   * grille tarifaire, elle, est une suite de lignes et se compte.
   */
  const subject = (field: string, row: number): string => {
    if (field === "equipments") return equipments[row]?.name ?? `Ligne ${row + 1}`;
    if (field === "services") return services[row]?.name ?? `Ligne ${row + 1}`;
    return `Ligne ${row + 1}`;
  };

  // Un seul message par champ : le premier suffit à corriger la saisie.
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || fieldErrors[field]) continue;

    const row = issue.path[1];
    fieldErrors[field] =
      typeof row === "number"
        ? `${subject(field, row)} : ${issue.message}`
        : issue.message;
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
