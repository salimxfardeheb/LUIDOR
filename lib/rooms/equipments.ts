import { normalizeText } from "@/lib/utils";

/**
 * Référentiel des équipements proposés au propriétaire, tenu dans le code.
 *
 * Même principe que `lib/rooms/categories.ts` : le formulaire salle affiche
 * cette liste sans requête, donc il reste utilisable sur une base neuve. La
 * table `Equipment` garde son rôle de clé de rattachement (`RoomEquipment`) et
 * la ligne est créée au premier usage, `Equipment.name` étant unique.
 *
 * Le `detailPlaceholder` n'est qu'un exemple affiché en filigrane : la
 * précision réelle est saisie salle par salle et vit sur le rattachement
 * (`RoomEquipment.detail`), pas ici.
 */

export interface RoomEquipment {
  name: string;
  /** Exemple de précision attendue, affiché en filigrane du champ. */
  detailPlaceholder: string;
}

export const ROOM_EQUIPMENTS: readonly RoomEquipment[] = [
  { name: "Climatisation", detailPlaceholder: "Toutes les salles" },
  { name: "Parking privé", detailPlaceholder: "120 places" },
  { name: "Sonorisation", detailPlaceholder: "2 enceintes, micro sans fil" },
  { name: "Éclairage scénique", detailPlaceholder: "Jeux de lumière programmables" },
  { name: "Cuisine équipée", detailPlaceholder: "2 fours, chambre froide" },
  { name: "Espace enfants", detailPlaceholder: "Aire de jeux surveillée" },
  { name: "Wifi", detailPlaceholder: "Fibre 100 Mb/s" },
  { name: "Vidéoprojecteur", detailPlaceholder: "Full HD, écran de 3 m" },
  { name: "Terrasse", detailPlaceholder: "200 m² couverts" },
  { name: "Accès PMR", detailPlaceholder: "Rampe et sanitaires adaptés" },
] as const;

/** Filigrane du champ de précision d'un équipement ajouté à la main. */
export const CUSTOM_EQUIPMENT_PLACEHOLDER = "Nombre, surface, marque…";

/** Retrouve un équipement du référentiel, sans accents ni casse. */
export function findEquipment(value: string): RoomEquipment | null {
  const needle = normalizeText(value);
  if (!needle) return null;

  return (
    ROOM_EQUIPMENTS.find(
      (equipment) => normalizeText(equipment.name) === needle
    ) ?? null
  );
}
