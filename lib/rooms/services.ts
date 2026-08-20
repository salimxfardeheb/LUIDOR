import { normalizeText } from "@/lib/utils";

/**
 * Référentiel des prestations proposées au propriétaire, tenu dans le code.
 *
 * Le prix est **indicatif** : il n'est porté ni par la salle ni par le
 * rattachement (`RoomService` n'a pas de colonne de prix), mais par la ligne
 * `Service` elle-même, partagée par toutes les salles. Il sert donc de repère
 * d'affichage (« À partir de… ») et non d'un tarif négocié salle par salle.
 *
 * Une prestation ajoutée par un propriétaire est créée à 0, ce que la fiche
 * affiche « Sur devis » : inventer un tarif commun à toute la plateforme à
 * partir d'une saisie individuelle serait faux.
 */

export interface RoomService {
  name: string;
  /** Prix indicatif en dinars, 0 pour « sur devis ». */
  price: number;
}

export const ROOM_SERVICES: readonly RoomService[] = [
  { name: "Traiteur", price: 180000 },
  { name: "Décoration florale", price: 45000 },
  { name: "DJ & animation", price: 60000 },
  { name: "Photographe", price: 55000 },
  { name: "Service de sécurité", price: 30000 },
  { name: "Voiturier", price: 25000 },
  { name: "Pâtisserie & gâteau", price: 20000 },
  { name: "Navette invités", price: 35000 },
] as const;

/** Prix attribué à une prestation créée depuis le formulaire salle. */
export const CUSTOM_SERVICE_PRICE = 0;

/** Retrouve une prestation du référentiel, sans accents ni casse. */
export function findService(value: string): RoomService | null {
  const needle = normalizeText(value);
  if (!needle) return null;

  return (
    ROOM_SERVICES.find((service) => normalizeText(service.name) === needle) ??
    null
  );
}
