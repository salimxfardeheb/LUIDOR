import { CATEGORIES, EVENT_TYPES } from "@/lib/home/content";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

/**
 * Traduction entre l'URL et les filtres du catalogue / de la recherche.
 *
 * L'URL est la seule source de vérité : les pages sont des composants serveur
 * qui lisent ces query params, et le `FilterPanel` ne fait que réécrire l'URL.
 * Un lien de résultats est donc toujours partageable et rechargeable.
 */

/** Forme des `searchParams` fournis par Next à une page serveur. */
export type SearchParamsInput = Record<string, string | string[] | undefined>;

export const SORT_OPTIONS = [
  { value: "pertinence", label: "Les plus récentes" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
  { value: "note", label: "Meilleures notes" },
  { value: "capacite", label: "Capacité d'accueil" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const SORT_KEYS = SORT_OPTIONS.map((option) => option.value) as readonly string[];

export const DEFAULT_SORT: SortKey = "pertinence";

/** Critères de recherche normalisés : `null` = filtre inactif. */
export interface RoomFilters {
  /** Ville ou quartier saisi (recherche partielle, insensible à la casse). */
  ville: string | null;
  /** Date de l'événement au format `YYYY-MM-DD`. */
  date: string | null;
  /** Nombre d'invités : la salle doit pouvoir les accueillir. */
  invites: number | null;
  /** Type d'événement, aligné sur `Category.name`. */
  type: string | null;
  capaciteMin: number | null;
  capaciteMax: number | null;
  prixMin: number | null;
  prixMax: number | null;
  /** Noms d'équipements (`Equipment.name`) : la salle doit les avoir tous. */
  equipements: string[];
  tri: SortKey;
  page: number;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter(
    (item) => item.trim() !== ""
  );
}

function text(value: string | string[] | undefined): string | null {
  const raw = first(value)?.trim();
  return raw ? raw : null;
}

/** Entier strictement positif, ou `null` si la valeur est absente ou invalide. */
function positiveInt(value: string | string[] | undefined): number | null {
  const raw = first(value)?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

/** Date calendaire `YYYY-MM-DD` réellement valide, sinon `null`. */
function isoDate(value: string | string[] | undefined): string | null {
  const raw = first(value)?.trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return Number.isNaN(Date.parse(`${raw}T00:00:00.000Z`)) ? null : raw;
}

/**
 * Une valeur hors liste (URL bricolée, catégorie renommée) est ignorée plutôt
 * que de renvoyer zéro résultat sans explication.
 */
function oneOf(
  value: string | string[] | undefined,
  allowed: readonly string[]
): string | null {
  const raw = text(value);
  return raw !== null && allowed.includes(raw) ? raw : null;
}

export function parseRoomFilters(params: SearchParamsInput): RoomFilters {
  const capaciteMin = positiveInt(params.capaciteMin);
  const capaciteMax = positiveInt(params.capaciteMax);
  const prixMin = positiveInt(params.prixMin);
  const prixMax = positiveInt(params.prixMax);

  // Fourchettes inversées par l'utilisateur : on les remet dans l'ordre au lieu
  // de renvoyer un ensemble vide.
  const [capaMin, capaMax] = orderRange(capaciteMin, capaciteMax);
  const [budgetMin, budgetMax] = orderRange(prixMin, prixMax);

  const tri = oneOf(params.tri, SORT_KEYS) as SortKey | null;

  return {
    ville: text(params.ville),
    date: isoDate(params.date),
    invites: positiveInt(params.invites),
    type: oneOf(params.type, EVENT_TYPES),
    capaciteMin: capaMin,
    capaciteMax: capaMax,
    prixMin: budgetMin,
    prixMax: budgetMax,
    equipements: all(params.equipements),
    tri: tri ?? DEFAULT_SORT,
    page: positiveInt(params.page) ?? 1,
  };
}

function orderRange(
  min: number | null,
  max: number | null
): [number | null, number | null] {
  if (min !== null && max !== null && min > max) return [max, min];
  return [min, max];
}

/**
 * Sérialise des filtres en query string, en omettant tout ce qui est inactif
 * ou à sa valeur par défaut : les URLs restent courtes et comparables.
 */
export function buildRoomsQuery(
  filters: RoomFilters,
  overrides: Partial<RoomFilters> = {}
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (merged.ville) params.set("ville", merged.ville);
  if (merged.date) params.set("date", merged.date);
  if (merged.invites) params.set("invites", String(merged.invites));
  if (merged.type) params.set("type", merged.type);
  if (merged.capaciteMin) params.set("capaciteMin", String(merged.capaciteMin));
  if (merged.capaciteMax) params.set("capaciteMax", String(merged.capaciteMax));
  if (merged.prixMin) params.set("prixMin", String(merged.prixMin));
  if (merged.prixMax) params.set("prixMax", String(merged.prixMax));
  for (const equipement of merged.equipements) {
    params.append("equipements", equipement);
  }
  if (merged.tri !== DEFAULT_SORT) params.set("tri", merged.tri);
  if (merged.page > 1) params.set("page", String(merged.page));

  return params.toString();
}

/** Nombre de critères actifs, hors tri et pagination (badge « filtres »). */
export function countActiveFilters(filters: RoomFilters): number {
  return (
    (filters.ville ? 1 : 0) +
    (filters.date ? 1 : 0) +
    (filters.invites ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.capaciteMin ? 1 : 0) +
    (filters.capaciteMax ? 1 : 0) +
    (filters.prixMin ? 1 : 0) +
    (filters.prixMax ? 1 : 0) +
    filters.equipements.length
  );
}

/**
 * Libellés lisibles des critères actifs, pour le rappel affiché en tête des
 * résultats et dans l'état vide (« aucune salle pour … »).
 */
export function describeRoomFilters(filters: RoomFilters): string[] {
  const labels: string[] = [];

  if (filters.type) labels.push(filters.type);
  if (filters.ville) labels.push(filters.ville);
  if (filters.date) labels.push(formatDate(filters.date));
  if (filters.invites) labels.push(`${formatNumber(filters.invites)} invités`);

  const capacity = describeRange(
    filters.capaciteMin,
    filters.capaciteMax,
    formatNumber
  );
  if (capacity) labels.push(`Capacité ${capacity}`);

  const budget = describeRange(filters.prixMin, filters.prixMax, formatPrice);
  if (budget) labels.push(`Budget ${budget}`);

  labels.push(...filters.equipements);

  return labels;
}

function describeRange(
  min: number | null,
  max: number | null,
  format: (value: number) => string
): string | null {
  if (min !== null && max !== null) return `${format(min)} – ${format(max)}`;
  if (min !== null) return `à partir de ${format(min)}`;
  if (max !== null) return `jusqu'à ${format(max)}`;
  return null;
}

/**
 * Catégorie du catalogue : le slug de l'URL (`/salles?categorie=mariage`) est
 * résolu vers le `Category.name` attendu en base.
 */
export function resolveCategorySlug(
  params: SearchParamsInput
): { slug: string; name: string } | null {
  const slug = text(params.categorie);
  if (slug === null) return null;
  const category = CATEGORIES.find((item) => item.slug === slug);
  return category ? { slug: category.slug, name: category.name } : null;
}

export function parseCatalogPage(params: SearchParamsInput): number {
  return positiveInt(params.page) ?? 1;
}

/** Query string du catalogue (`categorie` + `page`). */
export function buildCatalogQuery(
  categorySlug: string | null,
  page: number
): string {
  const params = new URLSearchParams();
  if (categorySlug) params.set("categorie", categorySlug);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}
