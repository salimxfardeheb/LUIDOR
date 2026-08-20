/**
 * Styles partagés par les tables de l'administration.
 *
 * Des constantes plutôt qu'un composant `<Th>` : les cellules d'en-tête ont
 * besoin de leur `scope`, et une chaîne de classes garde le balisage du tableau
 * lisible tel quel, sans couche d'indirection.
 */
export const ADMIN_TH =
  "pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400";

export const ADMIN_TH_RIGHT =
  "pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400";

/** Lien d'action en bout de ligne, rendu sous forme d'icône. */
export const ADMIN_ROW_ACTION =
  "rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

/**
 * Conteneur de défilement horizontal d'un tableau.
 *
 * `relative` n'est pas décoratif : les libellés `sr-only` des cellules sont
 * positionnés en absolu, et sans bloc conteneur à l'intérieur du scroller ils
 * se rattachent à un ancêtre situé *hors* de lui. Ils échappent alors au
 * découpage du défilement et étirent la largeur du document — la page entière
 * défile latéralement alors que seul le tableau devrait le faire.
 */
export const ADMIN_TABLE_SCROLL = "relative overflow-x-auto";
