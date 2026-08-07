import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { SIGN_IN_PATH, requiredRoleFor } from "@/lib/roles";
import { DEMO_MODE, isDemoBlocked } from "@/lib/demo";

/**
 * Protection des groupes de routes :
 * - (client) `/profil`, `/reservations`, `/favoris`, `/historique` : authentification requise
 * - (owner)  `/owner/*` : rôle OWNER
 * - (admin)  `/admin/*` : rôle ADMIN
 *
 * `withAuth` renvoie déjà vers /connexion?callbackUrl=… quand `authorized`
 * retourne false (visiteur non authentifié). Le handler ci-dessous ne traite
 * donc que le cas « authentifié mais rôle insuffisant ».
 */
const authMiddleware = withAuth(
  function middleware(request) {
    const { pathname, search } = request.nextUrl;
    const requiredRole = requiredRoleFor(pathname);
    const role = request.nextauth.token?.role;

    if (requiredRole && role !== requiredRole) {
      const signInUrl = new URL(SIGN_IN_PATH, request.url);
      signInUrl.searchParams.set("error", "AccessDenied");
      signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Seule la présence d'un token est vérifiée ici ; le contrôle de rôle a
      // lieu dans le handler pour pouvoir choisir la redirection.
      authorized: ({ token }) => Boolean(token),
    },
    pages: { signIn: SIGN_IN_PATH },
  }
);

/**
 * Seuls chemins du matcher qui n'exigent aucune authentification : ils n'y
 * figurent que pour pouvoir être coupés en mode démo (voir `lib/demo.ts`).
 * Les passer à `withAuth` renverrait /connexion vers lui-même.
 */
const DEMO_ONLY_PATHS: readonly string[] = [SIGN_IN_PATH, "/inscription"];

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  /*
   * La coupure démo passe avant l'authentification : un visiteur qui tape
   * /admin doit revenir à l'accueil, pas atterrir sur un écran de connexion
   * qui trahirait l'existence d'un back-office.
   */
  if (DEMO_MODE && isDemoBlocked(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (DEMO_ONLY_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  return authMiddleware(request as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/admin/:path*",
    "/profil/:path*",
    "/reservations/:path*",
    "/favoris/:path*",
    "/historique/:path*",
    // Coupés en mode démo uniquement — laissés passer sinon.
    "/connexion",
    "/inscription",
  ],
};
