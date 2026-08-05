import Link from "next/link";
import { Bell, MessageSquare, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FilterSelect, type FilterSelectOption } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

export interface AdminHeaderProps {
  /** Nom complet de l'administrateur connecté. */
  name: string;
  avatarUrl: string | null;
  /** Titre de la page, ex. « Bonjour, Amina ». */
  title: string;
  subtitle: string;
  /** Salles en attente de validation, affichées sur la cloche. */
  pendingCount: number;
  /** Messages de contact non traités. */
  messagesCount: number;
  /** Mois consulté (`YYYY-MM`) et destinations du sélecteur. */
  month: string;
  monthOptions: FilterSelectOption[];
}

/**
 * En-tête de l'administration : identité de l'administrateur, recherche,
 * alertes et choix du mois analysé.
 *
 * La recherche est un formulaire `GET` classique vers la gestion des salles :
 * elle fonctionne sans JavaScript, et le terme saisi reste dans l'URL de la
 * page de destination.
 */
export function AdminHeader({
  name,
  avatarUrl,
  title,
  subtitle,
  pendingCount,
  messagesCount,
  month,
  monthOptions,
}: AdminHeaderProps) {
  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <form
          action="/admin/salles"
          method="get"
          role="search"
          className="relative min-w-0 flex-1 sm:max-w-md"
        >
          <label htmlFor="admin-search" className="sr-only">
            Rechercher une salle, un propriétaire ou une réservation
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <Input
            id="admin-search"
            name="q"
            type="search"
            placeholder="Rechercher une salle, un propriétaire…"
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-1">
          <IconLink
            href="/admin/verification"
            label="Salles en attente de vérification"
            count={pendingCount}
          >
            <Bell aria-hidden className="h-5 w-5" />
          </IconLink>
          <IconLink
            href="/admin/messages"
            label="Messages de contact non traités"
            count={messagesCount}
          >
            <MessageSquare aria-hidden className="h-5 w-5" />
          </IconLink>
        </div>

        <div className="flex items-center gap-3 border-gray-200 sm:border-l sm:pl-3">
          <Avatar name={name} src={avatarUrl} role="ADMIN" size="sm" />
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
            <p className="truncate text-xs text-gray-500">
              {ROLE_LABELS.ADMIN.label}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>
        </div>

        <FilterSelect
          id="admin-month"
          label="Période analysée"
          value={month}
          options={monthOptions}
          className="sm:w-56"
        />
      </div>
    </header>
  );
}

/**
 * Raccourci en icône avec pastille de compteur.
 *
 * Le compte est aussi dans le libellé accessible : la pastille visuelle ne
 * transmet rien à un lecteur d'écran.
 */
function IconLink({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-md p-2 text-gray-500 transition-colors",
        "hover:bg-gray-100 hover:text-primary-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      )}
    >
      {children}
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
      <span className="sr-only">
        {label}
        {count > 0 ? ` (${count})` : " (aucun)"}
      </span>
    </Link>
  );
}
