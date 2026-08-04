import type { UserRole } from "@prisma/client";

/**
 * Import *type-only* de Prisma : ce module est chargé par middleware.ts, qui
 * tourne sur le runtime Edge où le client Prisma ne peut pas être embarqué.
 */
export type Role = UserRole;

/** Rôles qu'un visiteur peut choisir à l'inscription — ADMIN est attribué en base. */
export const SIGN_UP_ROLES = ["CLIENT", "OWNER"] as const satisfies readonly Role[];

export const SIGN_IN_PATH = "/connexion";

/** Comment présenter un rôle à l'utilisateur, dans son espace compte. */
export const ROLE_LABELS: Record<Role, { label: string; description: string }> = {
  CLIENT: {
    label: "Client",
    description: "Vous réservez des salles sur LIUDOR.",
  },
  OWNER: {
    label: "Propriétaire",
    description: "Vous publiez et gérez des salles sur LIUDOR.",
  },
  ADMIN: {
    label: "Administrateur",
    description: "Vous administrez la plateforme LIUDOR.",
  },
};

/** Page d'atterrissage après connexion, par rôle. */
export const HOME_PATH_BY_ROLE: Record<Role, string> = {
  CLIENT: "/profil",
  OWNER: "/owner/dashboard",
  ADMIN: "/admin/dashboard",
};

export function homePathForRole(role: Role | undefined | null): string {
  return role ? HOME_PATH_BY_ROLE[role] : "/";
}

/** Préfixes réservés à un rôle : tout autre rôle est refusé par le middleware. */
export const ROLE_PREFIXES: ReadonlyArray<{ prefix: string; role: Role }> = [
  { prefix: "/owner", role: "OWNER" },
  { prefix: "/admin", role: "ADMIN" },
];

/**
 * Rôle exigé pour accéder à un chemin, ou `null` si le chemin demande
 * seulement d'être authentifié (espace client).
 */
export function requiredRoleFor(pathname: string): Role | null {
  return (
    ROLE_PREFIXES.find(({ prefix }) => pathname.startsWith(prefix))?.role ?? null
  );
}

/**
 * Destination après connexion. Le `callbackUrl` vient de l'URL : on n'accepte
 * qu'un chemin interne (pas de redirection ouverte vers un autre domaine) et
 * on l'ignore s'il exige un rôle que l'utilisateur n'a pas — sinon le
 * middleware le renverrait aussitôt vers /connexion.
 */
export function resolveRedirect(
  callbackUrl: string | undefined,
  role: Role | undefined | null
): string {
  const isInternalPath =
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//");

  if (isInternalPath) {
    const requiredRole = requiredRoleFor(callbackUrl);
    if (!requiredRole || requiredRole === role) return callbackUrl;
  }

  return homePathForRole(role);
}
