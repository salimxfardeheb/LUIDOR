import Link from "next/link";
import { AlertTriangle, SearchX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface StateAction {
  href: string;
  label: string;
}

/**
 * État vide partagé par le catalogue et les résultats de recherche : on explique
 * toujours *pourquoi* la liste est vide et on propose une porte de sortie.
 */
export function RoomsEmptyState({
  icon: Icon = SearchX,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  /** Rappel des critères appliqués, affiché sous la description. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
        <Icon aria-hidden className="h-6 w-6 text-secondary" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>

      {children}

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <Link href={primaryAction.href}>
              <Button>{primaryAction.label}</Button>
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href}>
              <Button variant="outline">{secondaryAction.label}</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Base indisponible : on le dit, plutôt que d'afficher « aucun résultat ». */
export function RoomsErrorState({
  description = "Le service est momentanément indisponible. Réessayez dans quelques instants.",
  action,
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
      <h3 className="mt-4 text-base font-semibold text-gray-900">
        Impossible de charger les salles
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
      {action && (
        <Link href={action.href} className="mt-6">
          <Button variant="outline">{action.label}</Button>
        </Link>
      )}
    </div>
  );
}
