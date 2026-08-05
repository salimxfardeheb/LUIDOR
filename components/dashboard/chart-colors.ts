/**
 * Palette des graphiques, adossée aux jetons de la charte.
 *
 * Des chaînes CSS et non des classes Tailwind : ces couleurs partent dans des
 * attributs SVG (`fill`, `stroke`) où une classe utilitaire ne s'applique pas.
 */
export const CHART_COLORS = {
  gold: "rgb(var(--color-secondary))",
  goldLight: "rgb(var(--color-secondary-400))",
  navy: "rgb(var(--color-primary-900))",
  navyLight: "rgb(var(--color-primary-700))",
  accent: "rgb(var(--color-accent))",
  success: "rgb(var(--color-success))",
  warning: "rgb(var(--color-warning))",
  error: "rgb(var(--color-error))",
  info: "rgb(var(--color-info))",
  gray: "rgb(var(--color-gray-300))",
} as const;

/**
 * Ordre de passage pour une série sans couleur imposée (villes, catégories).
 * Contrasté d'un cran à l'autre pour rester lisible côte à côte.
 */
export const CHART_SERIES: readonly string[] = [
  CHART_COLORS.gold,
  CHART_COLORS.navy,
  CHART_COLORS.accent,
  CHART_COLORS.goldLight,
  CHART_COLORS.navyLight,
  CHART_COLORS.info,
  CHART_COLORS.gray,
];

/** Couleur d'un rang de série, en boucle si la série est plus longue. */
export function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/**
 * Équivalent graphique des variantes du `Badge`.
 *
 * Un statut garde ainsi la même couleur qu'il soit lu dans un tableau ou dans
 * un anneau de répartition.
 */
export const VARIANT_COLORS: Record<
  "neutral" | "success" | "warning" | "error" | "info",
  string
> = {
  neutral: CHART_COLORS.gray,
  success: CHART_COLORS.success,
  warning: CHART_COLORS.warning,
  error: CHART_COLORS.error,
  info: CHART_COLORS.info,
};

/** Couleur de chaque rôle, alignée sur le repli coloré de l'`Avatar`. */
export const ROLE_COLORS = {
  CLIENT: CHART_COLORS.navy,
  OWNER: CHART_COLORS.gold,
  ADMIN: CHART_COLORS.accent,
} as const;
