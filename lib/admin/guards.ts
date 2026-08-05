import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/roles";

/**
 * Gardes du portail d'administration.
 *
 * Le middleware filtre déjà `/admin/*` sur le rôle ADMIN, mais il ne protège
 * que la navigation : une action serveur est un point d'entrée HTTP appelable
 * directement, sans passer par une page. Chaque mutation revérifie donc la
 * session ici, et les deux formes de contrôle — refus typé pour les actions,
 * redirection pour les pages — vivent au même endroit.
 */

export interface AdminRefusal {
  /** 401 non connecté, 403 rôle insuffisant, 404 introuvable, 409 état incompatible. */
  status: 401 | 403 | 404 | 409;
  message: string;
}

export type AdminSessionResult =
  | { ok: true; adminId: string }
  | { ok: false; refusal: AdminRefusal };

/** Session administrateur, ou refus typé. Destinée aux actions serveur. */
export async function requireAdminSession(): Promise<AdminSessionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      refusal: {
        status: 401,
        message: "Votre session a expiré. Reconnectez-vous pour continuer.",
      },
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      ok: false,
      refusal: {
        status: 403,
        message: "Action réservée aux administrateurs de la plateforme.",
      },
    };
  }

  return { ok: true, adminId: session.user.id };
}

export interface AdminPageSession {
  adminId: string;
  name: string;
}

/**
 * Session administrateur pour le rendu d'une page, ou redirection.
 *
 * Couvre le cas limite d'une session expirée entre le passage du middleware et
 * le rendu ; le `callbackUrl` ramène l'administrateur là où il allait.
 */
export async function requireAdminPage(
  callbackUrl?: string
): Promise<AdminPageSession> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    const params = new URLSearchParams();
    if (callbackUrl) params.set("callbackUrl", callbackUrl);
    const query = params.toString();
    redirect(query ? `${SIGN_IN_PATH}?${query}` : SIGN_IN_PATH);
  }

  return {
    adminId: session.user.id,
    name: session.user.name ?? "Administrateur",
  };
}
