import {
  CalendarDays,
  MapPin,
  PartyPopper,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { EventDatesSync } from "@/components/home/EventDatesSync";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EVENT_TYPES } from "@/lib/home/content";
import { cn } from "@/lib/utils";

/** Valeurs de préremplissage, reprises des query params sur /salles/resultats. */
export interface SearchCardValues {
  ville?: string | null;
  /** Premier jour de l'événement. */
  date?: string | null;
  /** Dernier jour : vide pour un événement sur une seule journée. */
  dateFin?: string | null;
  invites?: number | null;
  type?: string | null;
}

/**
 * Barre de recherche du hero.
 *
 * Formulaire GET natif vers /salles/resultats : les critères arrivent en query
 * params (`ville`, `date`, `dateFin`, `invites`, `type`) et la recherche
 * fonctionne même sans JavaScript.
 *
 * L'événement tient sur une journée par défaut : un seul champ « Date de
 * l'événement » occupe alors la largeur du bloc de dates. Cocher « plusieurs
 * jours » le renomme « Date de début » et révèle « Date de fin » juste à côté,
 * en CSS seule (`:has()`), sans faire basculer le composant côté client. Le
 * sélecteur vise la case par son id : un simple `:has(:checked)` matcherait
 * aussi l'`<option>` sélectionnée du menu « type d'événement ».
 *
 * La date de fin n'est jamais laissée vide : elle est préremplie avec la date de
 * début, côté serveur au rendu puis par `EventDatesSync` à chaque saisie.
 *
 * Réutilisée telle quelle en haut de la page de résultats : `values` y réinjecte
 * les critères de l'URL pour que la barre reflète la recherche en cours. Comme
 * ce sont des champs non contrôlés, l'appelant doit passer une `key` dérivée de
 * l'URL pour forcer le remontage quand les critères changent.
 *
 * `noValidate` est volontaire : une date à moitié saisie ou un nombre d'invités
 * hors bornes suffisait à ce que le navigateur bloque la soumission en silence,
 * et « Rechercher » semblait alors ne rien faire. Le clic navigue désormais
 * toujours ; `parseRoomFilters` écarte les valeurs invalides et la page de
 * résultats indique lesquelles n'ont pas été retenues.
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
      noValidate
      aria-labelledby="recherche-titre"
      className={cn(
        "group rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6",
        className
      )}
    >
      <h2 id="recherche-titre" className="sr-only">
        Rechercher une salle des fêtes
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.1fr_1.6fr_0.7fr_1fr_auto] lg:items-end">
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

        <div className="grid grid-cols-2 items-end gap-2">
          <DateField
            id="date"
            label={
              <>
                <span className="group-has-[#plusieurs-jours:checked]:hidden">
                  Date de l&apos;événement
                </span>
                <span className="hidden group-has-[#plusieurs-jours:checked]:inline">
                  Date de début
                </span>
              </>
            }
            defaultValue={values?.date ?? ""}
            className="col-span-2 group-has-[#plusieurs-jours:checked]:col-span-1"
          />
          <DateField
            id="dateFin"
            label="Date de fin"
            // Une période rouverte depuis l'URL garde ses deux bornes ; une
            // journée unique voit sa date de fin retomber sur la date de début.
            defaultValue={values?.dateFin ?? values?.date ?? ""}
            className="hidden group-has-[#plusieurs-jours:checked]:block"
          />
        </div>

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

      <MultiDayField checked={values?.dateFin != null} />
      <EventDatesSync startId="date" endId="dateFin" toggleId="plusieurs-jours" />
    </form>
  );
}

/**
 * Case « plusieurs jours ».
 *
 * Elle ne fait que révéler « Au » : la bascule ne coûte donc pas un composant
 * client et fonctionne sans JavaScript. En contrepartie, une date de fin saisie
 * puis masquée reste soumise — c'est pourquoi `parseRoomFilters` ne la lit que
 * si `plusieursJours` est présent, ce que seule une case cochée envoie.
 */
function MultiDayField({ checked }: { checked: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <input
        id="plusieurs-jours"
        name="plusieursJours"
        type="checkbox"
        value="1"
        defaultChecked={checked}
        className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-gray-300 text-secondary accent-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      <label
        htmlFor="plusieurs-jours"
        className="cursor-pointer text-sm text-gray-700 transition-colors hover:text-gray-900"
      >
        Mon événement dure plusieurs jours
      </label>
    </div>
  );
}

/**
 * Une des deux bornes de la période.
 *
 * L'icône vit dans le libellé et non dans le champ : deux dates partagent ici
 * la largeur d'une seule colonne, et un padding interne suffisait à tronquer
 * « jj/mm/aaaa » avec le sélecteur natif du navigateur.
 *
 * Le libellé est un nœud : celui de la date de début change avec la case
 * « plusieurs jours ». Seule la variante visible entre dans le nom accessible du
 * champ, `display: none` excluant l'autre.
 *
 * Cocher la case teinte aussi les deux champs, qui reprennent la transition de
 * couleur d'`Input` : la période qui s'ouvre se remarque, au lieu d'un second
 * champ qui apparaîtrait sans crier gare. La règle `:has()` embarque la
 * spécificité d'un id et l'emporterait sur `focus-visible:border-accent` —
 * d'où le `!` qui rend au champ focalisé sa bordure pleine.
 */
function DateField({
  id,
  label,
  defaultValue,
  className,
}: {
  id: string;
  label: React.ReactNode;
  defaultValue: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        <CalendarDays aria-hidden className="h-3.5 w-3.5 shrink-0 text-secondary" />
        {label}
      </label>
      <Input
        id={id}
        name={id}
        type="date"
        defaultValue={defaultValue}
        className={cn(
          "group-has-[#plusieurs-jours:checked]:border-secondary/40",
          "group-has-[#plusieurs-jours:checked]:bg-secondary/5",
          "focus-visible:!border-secondary"
        )}
      />
    </div>
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
