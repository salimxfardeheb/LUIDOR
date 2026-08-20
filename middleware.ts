import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { SIGN_IN_PATH, requiredRoleFor } from "@/lib/roles";

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

export default authMiddleware;

export const config = {
  matcher: [
    "/owner/:path*",
    "/admin/:path*",
    "/profil/:path*",
    "/reservations/:path*",
    "/favoris/:path*",
    "/historique/:path*",
  ],
};
