import { formatPrice } from "@/lib/format";
import { rateUnitSuffix, type RateValue } from "@/lib/rooms/rates";

/**
 * Grille tarifaire de la salle, telle que le propriétaire l'annonce.
 *
 * Le prix affiché en tête de fiche est un prix d'appel : il permet de comparer
 * deux salles, pas de savoir ce que coûtera la soirée. Cette grille répond à la
 * question suivante — le créneau retenu, et son tarif.
 *
 * Rendue en liste et non en `<table>` : chaque ligne n'a que deux valeurs, et
 * une liste passe l'étroitesse du mobile sans défilement horizontal.
 *
 * Partagée par la fiche publique et l'écran de modération : l'administrateur
 * qui valide une salle lit la grille exactement comme le client la lira.
 */
export function RateTable({
  rates,
}: {
  rates: readonly (RateValue & { id: string })[];
}) {
  return (
    <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      {rates.map((rate) => {
        const suffix = rateUnitSuffix(rate.unit);

        return (
          <li
            key={rate.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">
                {rate.label}
              </span>
              {rate.detail && (
                <span className="block text-xs text-gray-500">
                  {rate.detail}
                </span>
              )}
            </span>

            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold text-gray-900">
                {formatPrice(rate.price)}
              </span>
              {suffix && (
                <span className="block text-xs text-gray-500">{suffix}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
