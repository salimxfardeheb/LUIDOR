import Link from "next/link";
import { AlertTriangle, Newspaper, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface StateAction {
  href: string;
  label: string;
}

/**
 * États non nominaux du blog : aucun article publié, ou base indisponible.
 *
 * Même langage visuel que `RoomsStates` — bloc pointillé pour un vide attendu,
 * bloc rouge pour une panne — afin qu'un visiteur reconnaisse immédiatement la
 * différence entre « il n'y a rien » et « ça n'a pas chargé ».
 */
export function BlogEmptyState({
  icon: Icon = Newspaper,
  title = "Aucun article publié pour le moment",
  description = "Les premiers conseils d'organisation et actualités LIUDOR arrivent bientôt. En attendant, explorez les salles disponibles.",
  action = { href: "/salles", label: "Découvrir les salles" },
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: StateAction;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
        <Icon aria-hidden className="h-6 w-6 text-secondary" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
      {action && (
        <Link href={action.href} className="mt-6">
          <Button variant="outline">{action.label}</Button>
        </Link>
      )}
    </div>
  );
}

export function BlogErrorState({
  description = "Le blog est momentanément indisponible. Réessayez dans quelques instants.",
  action = { href: "/blog", label: "Réessayer" },
}: {
  description?: string;
  action?: StateAction;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-error/30 bg-error/5 px-6 py-14 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle aria-hidden className="h-6 w-6 text-error" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-gray-900">
        Impossible de charger les articles
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
      {action && (
        <Link href={action.href} className="mt-6">
          <Button variant="outline">{action.label}</Button>
        </Link>
      )}
    </div>
  );
}
