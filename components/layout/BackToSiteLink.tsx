import Link from "next/link";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sortie vers le site public depuis un portail (propriétaire, administration).
 *
 * Ces portails n'ont pas le header public : le logo de la colonne mène bien à
 * l'accueil, mais rien ne l'annonce. Ce lien explicite est donc leur chemin de
 * retour vers le site, visible depuis n'importe quelle page du tableau de bord.
 */
export function BackToSiteLink({
  onDark = false,
  className,
}: {
  /** Lien posé sur un fond marine (colonne d'administration). */
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        onDark
          ? "text-gray-200 hover:bg-white/10 hover:text-white"
          : "text-gray-700 hover:bg-gray-100 hover:text-primary-900",
        className
      )}
    >
      <Home aria-hidden className="h-4 w-4" />
      Retour au site
    </Link>
  );
}
