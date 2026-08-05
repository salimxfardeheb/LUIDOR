/** Forme des `searchParams` fournis par Next à une page serveur. */
export type SearchParamsInput = Record<string, string | string[] | undefined>;

/**
 * Traduction entre l'URL de `/blog` et l'état de la liste.
 *
 * Le blog n'a qu'un seul critère — la page —, mais il passe par les mêmes
 * règles que le catalogue : l'URL est la source de vérité, donc partageable et
 * indexable, et une valeur aberrante retombe sur la première page plutôt que
 * de renvoyer une liste vide.
 */

export function parseBlogPage(params: SearchParamsInput): number {
  const raw = (Array.isArray(params.page) ? params.page[0] : params.page)?.trim();
  if (!raw) return 1;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;

  return Math.floor(parsed);
}

/** URL d'une page de la liste — la première reste `/blog`, sans query string. */
export function blogHref(page: number): string {
  return page > 1 ? `/blog?page=${page}` : "/blog";
}
