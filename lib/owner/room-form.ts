import { rateField, ROOM_LIMITS } from "@/lib/rooms/schemas";

/**
 * Découpage du formulaire salle en trois étapes, et lecture de son avancement.
 *
 * Une trentaine de champs d'un seul tenant décourage : le propriétaire ne voit
 * ni où il en est, ni ce qu'il reste. Les étapes regroupent ce qui se remplit
 * ensemble — décrire la salle, en fixer le prix, montrer ce qu'elle offre — et
 * chacune tient dans un écran ou deux.
 *
 * Le formulaire reste **un seul `<form>` et un seul envoi** : les étapes non
 * affichées sont masquées, pas démontées, sinon leurs champs disparaîtraient du
 * `FormData` et l'action serveur recevrait une salle amputée.
 *
 * L'avancement se relit du `FormData` plutôt que d'un état React parallèle :
 * les champs restent non contrôlés, la progression ne peut donc pas diverger de
 * ce qui sera réellement envoyé, et un champ ajouté demain n'a rien à
 * resynchroniser.
 */

export type RoomFormStepId = "salle" | "tarifs" | "offre";

export interface RoomFormStep {
  id: RoomFormStepId;
  /** Libellé du fil d'étapes. */
  label: string;
  /** Ce que l'étape demande, affiché sous son titre. */
  description: string;
  /**
   * Champs du formulaire traités dans l'étape : sert à ranger une erreur
   * serveur sous la bonne étape, et à y ramener le propriétaire.
   */
  fields: readonly string[];
}

export const ROOM_FORM_STEPS: readonly RoomFormStep[] = [
  {
    id: "salle",
    label: "La salle",
    description:
      "Le nom, la description, l'adresse et la capacité : ce que les clients verront en premier.",
    fields: [
      "name",
      "description",
      "city",
      "categoryNames",
      "address",
      "capacityMin",
      "capacityMax",
    ],
  },
  {
    id: "tarifs",
    label: "Tarifs",
    description:
      "Le prix d'appel affiché sur la fiche, puis le détail de vos formules si vos tarifs varient selon le créneau.",
    fields: ["basePrice", "rates"],
  },
  {
    id: "offre",
    label: "Photos et prestations",
    description:
      "Les visuels de la salle, ses équipements et les services que vous pouvez organiser.",
    fields: ["photos", "equipments", "serviceNames"],
  },
] as const;

/** Identifiant HTML du panneau d'une étape. */
export function stepPanelId(id: RoomFormStepId): string {
  return `etape-${id}`;
}

/** Identifiant HTML du bouton d'une étape dans le fil. */
export function stepButtonId(id: RoomFormStepId): string {
  return `etape-${id}-onglet`;
}

/**
 * Libellés des champs, pour le résumé d'erreurs : « categoryNames » ne dit rien
 * à un propriétaire, « Catégories » le renvoie au champ qu'il a sous les yeux.
 */
export const ROOM_FIELD_LABELS: Record<string, string> = {
  name: "Nom de la salle",
  description: "Description",
  city: "Wilaya",
  categoryNames: "Catégories",
  address: "Adresse",
  capacityMin: "Capacité minimum",
  capacityMax: "Capacité maximum",
  basePrice: "Prix de base",
  rates: "Formules et créneaux",
  photos: "Photos",
  equipments: "Équipements",
  serviceNames: "Prestations",
};

/** Rang de l'étape qui traite ce champ, `null` s'il n'est rattaché à aucune. */
export function stepOfField(field: string): number | null {
  const index = ROOM_FORM_STEPS.findIndex((step) =>
    step.fields.includes(field)
  );
  return index === -1 ? null : index;
}

export interface StepProgress {
  /** Champs obligatoires renseignés. */
  filled: number;
  /** Champs obligatoires attendus par l'étape. */
  required: number;
  /** Éléments facultatifs saisis : photos, équipements, formules… */
  items: number;
}

export type RoomFormProgress = Record<RoomFormStepId, StepProgress>;

export type StepStatus = "error" | "done" | "partial" | "todo";

/** Avancement d'un formulaire encore vierge, avant tout relevé côté client. */
export const EMPTY_ROOM_FORM_PROGRESS: RoomFormProgress = {
  salle: { filled: 0, required: 6, items: 0 },
  tarifs: { filled: 0, required: 1, items: 0 },
  offre: { filled: 0, required: 0, items: 0 },
};

function trimmed(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Un montant ou un effectif compte comme renseigné s'il est strictement positif. */
function positive(value: string): boolean {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0;
}

/**
 * Relit l'état du formulaire.
 *
 * Les seuils repris ici sont ceux de la validation serveur (`ROOM_LIMITS`) et
 * non de simples « champ non vide » : une description de dix caractères sera
 * refusée, la marquer comme faite serait mentir au propriétaire.
 *
 * `existingPhotoCount` vient de la salle en cours de modification : les photos
 * déjà enregistrées ne sont pas dans le `FormData`, seuls leurs retraits le sont.
 */
export function readRoomFormProgress(
  form: HTMLFormElement,
  existingPhotoCount: number
): RoomFormProgress {
  const data = new FormData(form);

  // La capacité minimum n'y figure pas : elle est facultative, l'exiger dans le
  // décompte laisserait l'étape éternellement incomplète.
  const salle = [
    trimmed(data, "name").length >= ROOM_LIMITS.name.min,
    trimmed(data, "description").length >= ROOM_LIMITS.description.min,
    trimmed(data, "city").length > 0,
    data.getAll("categoryNames").length > 0,
    trimmed(data, "address").length >= ROOM_LIMITS.address.min,
    positive(trimmed(data, "capacityMax")),
  ];

  // Même règle que l'action serveur : une ligne tarifaire encore vide ne compte
  // pas, elle sera ignorée à l'envoi.
  const rates = data.getAll("rateKeys").filter((key) => {
    if (typeof key !== "string") return false;
    return (
      trimmed(data, rateField(key, "label")) !== "" ||
      trimmed(data, rateField(key, "price")) !== ""
    );
  }).length;

  const addedPhotos = data
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .length;
  const removedPhotos = data.getAll("removePhotoIds").length;
  const photos = addedPhotos + Math.max(0, existingPhotoCount - removedPhotos);

  return {
    salle: {
      filled: salle.filter(Boolean).length,
      required: salle.length,
      items: 0,
    },
    tarifs: {
      filled: positive(trimmed(data, "basePrice")) ? 1 : 0,
      required: 1,
      items: rates,
    },
    offre: {
      filled: 0,
      required: 0,
      items:
        photos +
        data.getAll("equipmentNames").length +
        data.getAll("serviceNames").length,
    },
  };
}

/** État d'une étape, l'erreur serveur primant sur l'avancement de la saisie. */
export function stepStatus(
  progress: StepProgress,
  hasError: boolean
): StepStatus {
  if (hasError) return "error";

  if (progress.required > 0) {
    if (progress.filled >= progress.required) return "done";
    return progress.filled > 0 ? "partial" : "todo";
  }

  return progress.items > 0 ? "done" : "todo";
}

/**
 * Deux relevés identiques ?
 *
 * Le formulaire est relu à chaque frappe : sans cette comparaison, chaque
 * caractère saisi provoquerait un rendu complet du formulaire et de son fil
 * d'étapes, pour un affichage inchangé neuf fois sur dix.
 */
export function sameProgress(
  a: RoomFormProgress,
  b: RoomFormProgress
): boolean {
  return ROOM_FORM_STEPS.every((step) => {
    const left = a[step.id];
    const right = b[step.id];
    return (
      left.filled === right.filled &&
      left.required === right.required &&
      left.items === right.items
    );
  });
}
