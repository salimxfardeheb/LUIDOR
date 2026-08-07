/**
 * Mode démo : ne laisse accessible que le site public.
 *
 * Activé par `NEXT_PUBLIC_DEMO_MODE="1"` dans `.env`, il sert à présenter une
 * partie du site sans exposer le reste. Deux effets complémentaires :
 *
 * - le middleware renvoie vers l'accueil toute requête vers une zone coupée,
 *   pour qu'une URL tapée à la main ne donne rien ;
 * - l'en-tête, le pied de page et les états vides masquent les liens qui y
 *   mènent, pour qu'aucune impasse ne soit visible.
 *
 * Le préfixe `NEXT_PUBLIC_` est nécessaire : `DEMO_MODE` est lu aussi bien par
 * le middleware que par des composants client (en-tête, bouton favori).
 *
 * Repasser la variable à `"0"` restaure le site complet, sans autre changement.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/**
 * Zones coupées en démo : les trois espaces authentifiés, plus les deux pages
 * d'authentification qui n'auraient plus de destination.
 */
const BLOCKED_PREFIXES = [
  "/owner",
  "/admin",
  "/profil",
  "/reservations",
  "/favoris",
  "/historique",
  "/connexion",
  "/inscription",
] as const;

/**
 * Un chemin tombe-t-il dans une zone coupée ?
 *
 * Accepte aussi bien un `pathname` qu'un `href` de lien : la chaîne de requête
 * est ignorée, `/salles?categorie=mariage` reste donc autorisé.
 */
export function isDemoBlocked(pathname: string): boolean {
  const path = pathname.split("?")[0];

  return BLOCKED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/**
 * Un lien doit-il rester affiché ? Hors démo, tous le sont — la fonction est
 * donc sûre à appeler dans n'importe quelle liste de liens.
 */
export function isDemoVisible(href: string): boolean {
  return !DEMO_MODE || !isDemoBlocked(href);
}
