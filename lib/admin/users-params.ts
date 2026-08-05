import type { Role } from "@/lib/roles";

/**
 * Filtres des pages comptes (`/admin/utilisateurs`, `/admin/proprietaires`),
 * lus et écrits dans l'URL.
 *
 * Aucune dépendance à Prisma (import *type-only*) : la barre de filtres et les
 * liens de réinitialisation sont rendus côté client comme côté serveur, et une
 * vue filtrée reste partageable et rejouable après rechargement.
 */

export const USERS_PATH = "/admin/utilisateurs";
export const OWNERS_PATH = "/admin/proprietaires";

export const USER_FILTER_PARAMS = {
  search: "q",
  role: "role",
  status: "statut",
} as const;

/** Valeur des filtres « tous les rôles » / « tous les statuts ». */
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

export const ROLES = ["CLIENT", "OWNER", "ADMIN"] as const satisfies readonly Role[];

export interface UserFilters {
  /** Terme recherché sur le nom et l'email, `null` si vide. */
  search: string | null;
  /** `null` = tous les rôles. Toujours `OWNER` sur la page propriétaires. */
  role: Role | null;
  /** `null` = actifs et suspendus. */
  status: AccountStatus | null;
}

export const NO_USER_FILTERS: UserFilters = {
  search: null,
  role: null,
  status: null,
};

/** Longueur maximale du terme recherché, pour borner la requête `contains`. */
const MAX_SEARCH_LENGTH = 80;

export interface UserSearchParams {
  q?: string;
  role?: string;
  statut?: string;
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Filtres validés à partir des paramètres d'URL.
 *
 * Une valeur inconnue est ignorée plutôt que transmise à la requête : une URL
 * bricolée retombe sur la liste complète, jamais sur un filtre fantôme affiché
 * dans l'interface.
 */
export function parseUserFilters(
  searchParams: UserSearchParams,
  /** Rôle imposé par la page, le cas échéant (page propriétaires). */
  forcedRole?: Role
): UserFilters {
  const search = searchParams.q?.trim().slice(0, MAX_SEARCH_LENGTH);
  const role = searchParams.role;
  const status = searchParams.statut;

  return {
    search: search ? search : null,
    role: forcedRole ?? (role && isRole(role) ? role : null),
    status: status ? (STATUS_PARAM_VALUES[status] ?? null) : null,
  };
}

/** Un filtre autre que le rôle imposé par la page est-il actif ? */
export function hasActiveUserFilters(
  filters: UserFilters,
  { ignoreRole = false }: { ignoreRole?: boolean } = {}
): boolean {
  return (
    filters.search !== null ||
    filters.status !== null ||
    (!ignoreRole && filters.role !== null)
  );
}

/** Lien vers une liste filtrée ; les filtres vides disparaissent de l'URL. */
export function buildUsersHref(path: string, filters: UserFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set(USER_FILTER_PARAMS.search, filters.search);
  // Le rôle est implicite sur /admin/proprietaires : l'écrire en double dans
  // l'URL n'apporterait rien et rendrait le lien de réinitialisation bavard.
  if (filters.role && path !== OWNERS_PATH) {
    params.set(USER_FILTER_PARAMS.role, filters.role);
  }
  if (filters.status) {
    params.set(USER_FILTER_PARAMS.status, STATUS_PARAM_BY_STATUS[filters.status]);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
