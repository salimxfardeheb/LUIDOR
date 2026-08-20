import { normalizeText } from "@/lib/utils";

/**
 * Référentiel des prestations proposées au propriétaire, tenu dans le code.
 *
 * Le prix qui figure ici est **indicatif** : il vit sur la ligne `Service`,
 * partagée par toutes les salles, et ne vaut que comme ordre de grandeur. Le
 * formulaire s'en sert pour amorcer la saisie, et la fiche pour combler un
 * tarif que le propriétaire n'a pas fixé.
 *
 * Le tarif qui fait foi pour une salle donnée est celui de son rattachement
 * (`RoomService.price`), saisi prestation par prestation : le traiteur d'Alger
 * n'a pas à fixer le prix de celui d'Oran.
 *
 * Une prestation ajoutée par un propriétaire est créée à 0 au référentiel, ce
 * que la fiche affiche « Sur devis » tant qu'aucun tarif de salle ne la
 * couvre : inventer un prix commun à toute la plateforme à partir d'une saisie
 * individuelle serait faux.
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
