/**
 * Filtres des pages comptes (`/admin/clients`, `/admin/proprietaires`), lus et
 * écrits dans l'URL.
 *
 * Le rôle n'est pas un filtre : chaque page en impose un, et la liste des
 * comptes administrateur ne se consulte pas depuis l'administration. Restent la
 * recherche et le statut, qui gardent le même sens sur les deux pages.
 *
 * Aucune dépendance à Prisma : la barre de filtres et les liens de
 * réinitialisation sont rendus côté client comme côté serveur, et une vue
 * filtrée reste partageable et rejouable après rechargement.
 */

export const CLIENTS_PATH = "/admin/clients";
export const OWNERS_PATH = "/admin/proprietaires";

export const USER_FILTER_PARAMS = {
  search: "q",
  status: "statut",
} as const;

/** Valeur du filtre « tous les statuts ». */
export const ALL_FILTER_VALUE = "tous";

/** Statut d'un compte, dérivé de `User.suspendedAt`. */
export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
};

/** Valeurs acceptées dans l'URL pour le filtre de statut. */
const STATUS_PARAM_VALUES: Record<string, AccountStatus> = {
  actif: "ACTIVE",
  suspendu: "SUSPENDED",
};

const STATUS_PARAM_BY_STATUS: Record<AccountStatus, string> = {
  ACTIVE: "actif",
  SUSPENDED: "suspendu",
};

export interface UserFilters {
  /** Terme recherché sur le nom et l'email, `null` si vide. */
  search: string | null;
  /** `null` = actifs et suspendus. */
  status: AccountStatus | null;
}

export const NO_USER_FILTERS: UserFilters = {
  search: null,
  status: null,
};

/** Longueur maximale du terme recherché, pour borner la requête `contains`. */
const MAX_SEARCH_LENGTH = 80;

export interface UserSearchParams {
  q?: string;
  statut?: string;
}

/**
 * Filtres validés à partir des paramètres d'URL.
 *
 * Une valeur inconnue est ignorée plutôt que transmise à la requête : une URL
 * bricolée retombe sur la liste complète, jamais sur un filtre fantôme affiché
 * dans l'interface.
 */
export function parseUserFilters(searchParams: UserSearchParams): UserFilters {
  const search = searchParams.q?.trim().slice(0, MAX_SEARCH_LENGTH);
  const status = searchParams.statut;

  return {
    search: search ? search : null,
    status: status ? (STATUS_PARAM_VALUES[status] ?? null) : null,
  };
}

/** Un filtre est-il actif ? */
export function hasActiveUserFilters(filters: UserFilters): boolean {
  return filters.search !== null || filters.status !== null;
}

/** Lien vers une liste filtrée ; les filtres vides disparaissent de l'URL. */
export function buildUsersHref(path: string, filters: UserFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set(USER_FILTER_PARAMS.search, filters.search);
  if (filters.status) {
    params.set(USER_FILTER_PARAMS.status, STATUS_PARAM_BY_STATUS[filters.status]);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
