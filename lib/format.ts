const currencyFormatter = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("fr-DZ");

/** Prix en dinars, sans décimales : « 120 000 DA ». */
export function formatPrice(value: number): string {
  return currencyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Note moyenne sur 5, une décimale : « 4,8 ». */
export function formatRating(value: number): string {
  return value.toLocaleString("fr-DZ", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

const dateFormatter = new Intl.DateTimeFormat("fr-DZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // Les dates d'événement sont stockées en `@db.Date` (minuit UTC) : formater
  // en UTC évite de basculer sur la veille selon le fuseau du visiteur.
  timeZone: "UTC",
});

/** Date d'événement : « 12 juin 2026 ». Accepte une chaîne `YYYY-MM-DD`. */
export function formatDate(value: string | Date): string {
  const date =
    typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value;
  return dateFormatter.format(date);
}

/** Fourchette de capacité : « 150 – 400 invités ». */
export function formatCapacity(min: number, max: number): string {
  return min === max
    ? `${formatNumber(max)} invités`
    : `${formatNumber(min)} – ${formatNumber(max)} invités`;
}
