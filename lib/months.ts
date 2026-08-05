/**
 * Découpage du temps en mois, en UTC.
 *
 * Toutes les dates de la plateforme sont comparées en UTC (`eventDate` est un
 * `@db.Date` à minuit UTC) : calculer les bornes dans le fuseau du serveur
 * ferait basculer une réservation du 1er sur le mois précédent selon l'endroit
 * où l'application tourne. Ce module est la seule source de vérité pour ces
 * bornes, partagée par les tableaux de bord propriétaire et administrateur.
 */

const shortMonthFormatter = new Intl.DateTimeFormat("fr-DZ", {
  month: "short",
  timeZone: "UTC",
});

const longMonthFormatter = new Intl.DateTimeFormat("fr-DZ", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Clé de mois UTC « YYYY-MM », stable quel que soit le fuseau du visiteur. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Premier jour du mois, minuit UTC. */
export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Décale d'un nombre de mois (négatif pour reculer). */
export function addMonths(date: Date, delta: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1)
  );
}

/**
 * Bornes d'un mois : `start` inclus, `end` exclu (premier jour du mois suivant).
 * Utilisables telles quelles dans un filtre Prisma `{ gte: start, lt: end }`.
 */
export function monthRange(date: Date): { start: Date; end: Date } {
  const start = monthStart(date);
  return { start, end: addMonths(start, 1) };
}

/** Libellé court d'un mois : « janv. ». */
export function shortMonthLabel(date: Date): string {
  return shortMonthFormatter.format(date);
}

/** Libellé long d'un mois : « janvier 2026 ». */
export function longMonthLabel(date: Date): string {
  return longMonthFormatter.format(date);
}

/**
 * Lit une clé « YYYY-MM » venue de l'URL et renvoie le premier jour du mois.
 *
 * `null` si la valeur est absente ou mal formée : l'appelant retombe alors sur
 * le mois courant plutôt que de rendre une page vide sur une URL bricolée.
 */
export function parseMonthKey(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Les `count` derniers mois, du plus ancien au plus récent, `until` inclus.
 * Sert d'axe aux graphiques : les mois sans donnée doivent apparaître à zéro,
 * pas disparaître.
 */
export function lastMonths(
  count: number,
  until: Date = new Date()
): Array<{ key: string; label: string; date: Date }> {
  const anchor = monthStart(until);
  const result: Array<{ key: string; label: string; date: Date }> = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = addMonths(anchor, -offset);
    result.push({ key: monthKey(date), label: shortMonthLabel(date), date });
  }

  return result;
}
