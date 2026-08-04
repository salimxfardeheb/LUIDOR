import {
  CalendarDays,
  MapPin,
  PartyPopper,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EVENT_TYPES } from "@/lib/home/content";
import { cn } from "@/lib/utils";

/** Valeurs de préremplissage, reprises des query params sur /salles/resultats. */
export interface SearchCardValues {
  ville?: string | null;
  date?: string | null;
  invites?: number | null;
  type?: string | null;
}

/**
 * Barre de recherche du hero.
 *
 * Formulaire GET natif vers /salles/resultats : les critères arrivent en query
 * params (`ville`, `date`, `invites`, `type`) et la recherche fonctionne même
 * sans JavaScript.
 *
 * Réutilisée telle quelle en haut de la page de résultats : `values` y réinjecte
 * les critères de l'URL pour que la barre reflète la recherche en cours. Comme
 * ce sont des champs non contrôlés, l'appelant doit passer une `key` dérivée de
 * l'URL pour forcer le remontage quand les critères changent.
 */
export function SearchCard({
  className,
  values,
}: {
  className?: string;
  values?: SearchCardValues;
}) {
  return (
    <form
      action="/salles/resultats"
      method="get"
      aria-labelledby="recherche-titre"
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6",
        className
      )}
    >
      <h2 id="recherche-titre" className="sr-only">
        Rechercher une salle des fêtes
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.9fr_1.1fr_auto] lg:items-end">
        <Field id="ville" label="Où" icon={MapPin}>
          <Input
            id="ville"
            name="ville"
            type="text"
            placeholder="Ville ou quartier"
            autoComplete="address-level2"
            defaultValue={values?.ville ?? ""}
            className="pl-9"
          />
        </Field>

        <Field id="date" label="Date de l'événement" icon={CalendarDays}>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={values?.date ?? ""}
            className="pl-9"
          />
        </Field>

        <Field id="invites" label="Invités" icon={Users}>
          <Input
            id="invites"
            name="invites"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="150"
            defaultValue={values?.invites ?? ""}
            className="pl-9"
          />
        </Field>

        <Field id="type" label="Type d'événement" icon={PartyPopper}>
          <Select
            id="type"
            name="type"
            defaultValue={values?.type ?? ""}
            className="pl-9"
          >
            <option value="">Tous les types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" size="lg" className="w-full lg:w-auto">
          <Search aria-hidden className="h-4 w-4" />
          Rechercher
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-secondary"
        />
        {children}
      </div>
    </div>
  );
}
