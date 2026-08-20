import { normalizeText } from "@/lib/utils";

/**
 * Référentiel des équipements proposés au propriétaire, tenu dans le code.
 *
 * Même principe que `lib/rooms/categories.ts` : le formulaire salle affiche
 * cette liste sans requête, donc il reste utilisable sur une base neuve. La
 * table `Equipment` garde son rôle de clé de rattachement (`RoomEquipment`) et
 * la ligne est créée au premier usage, `Equipment.name` étant unique.
 */

export const ROOM_EQUIPMENTS: readonly string[] = [
  "Climatisation",
  "Parking privé",
  "Sonorisation",
  "Éclairage scénique",
  "Cuisine équipée",
  "Espace enfants",
  "Wifi",
  "Vidéoprojecteur",
  "Terrasse",
  "Accès PMR",
] as const;

/** Retrouve un équipement du référentiel, sans accents ni casse. */
export function findEquipment(value: string): string | null {
  const needle = normalizeText(value);
  if (!needle) return null;

  return (
    ROOM_EQUIPMENTS.find((name) => normalizeText(name) === needle) ?? null
  );
}
