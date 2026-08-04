"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  PartyPopper,
  SlidersHorizontal,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EVENT_TYPES } from "@/lib/home/content";
import type { RoomFilterOptions } from "@/lib/rooms/queries";
import {
  countActiveFilters,
  DEFAULT_SORT,
  type RoomFilters,
} from "@/lib/rooms/search-params";
import { cn } from "@/lib/utils";

const RESULTS_PATH = "/salles/resultats";

/** Champs du formulaire dont une valeur vide signifie « filtre inactif ». */
const OPTIONAL_FIELDS = [
  "ville",
  "type",
  "capaciteMin",
  "capaciteMax",
  "prixMin",
  "prixMax",
  "date",
  "invites",
] as const;

/**
 * Panneau de filtres de la page de résultats.
 *
 * C'est un `<form method="get">` : sans JavaScript, la soumission produit déjà la
 * bonne URL. Avec JavaScript, on l'intercepte uniquement pour retirer les champs
 * vides et naviguer côté client — l'URL reste donc l'unique source de vérité, et
 * un lien de résultats filtrés est toujours partageable.
 *
 * `date`, `invites` et `tri` sont repris en champs cachés : ils appartiennent à
 * la barre de recherche et au sélecteur de tri, mais doivent survivre à
 * l'application d'un filtre.
 */
export function FilterPanel({
  filters,
  options,
}: {
  filters: RoomFilters;
  options: RoomFilterOptions;
}) {
  const router = useRouter();
  const activeCount = countActiveFilters(filters);
  /*
   * En mobile, le panneau est replié par défaut : sans cela, cinq groupes de
   * filtres repousseraient tous les résultats sous la ligne de flottaison.
   * À partir de `lg`, il est toujours visible dans la colonne de gauche.
   */
  const [openOnMobile, setOpenOnMobile] = React.useState(false);

  // Une ville saisie librement dans la barre de recherche peut ne pas figurer
  // parmi les villes ayant une salle publiée : on l'ajoute pour ne pas perdre
  // silencieusement le critère affiché dans l'URL.
  const cities = React.useMemo(() => {
    if (!filters.ville || options.cities.includes(filters.ville)) {
      return options.cities;
    }
    return [filters.ville, ...options.cities];
  }, [filters.ville, options.cities]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const field of OPTIONAL_FIELDS) {
      const value = data.get(field);
      if (typeof value === "string" && value.trim() !== "") {
        params.set(field, value.trim());
      }
    }

    for (const equipement of data.getAll("equipements")) {
      if (typeof equipement === "string") params.append("equipements", equipement);
    }

    const tri = data.get("tri");
    if (typeof tri === "string" && tri !== "" && tri !== DEFAULT_SORT) {
      params.set("tri", tri);
    }

    // Tout changement de filtre renvoie en page 1 : la page courante n'a aucun
    // sens sur un nouvel ensemble de résultats.
    const query = params.toString();
    router.push(query ? `${RESULTS_PATH}?${query}` : RESULTS_PATH);
  }

  return (
    <form
      action={RESULTS_PATH}
      method="get"
      onSubmit={handleSubmit}
      aria-labelledby="filtres-titre"
      /*
       * Sticky sous l'en-tête du site (4rem) et la barre de recherche
       * (~7,5rem) : les deux sont déjà collés en haut de la page de résultats.
       */
      className="space-y-4 lg:sticky lg:top-[11.5rem] lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:pb-2"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="filtres-titre"
          className="inline-flex items-center gap-2 text-base font-semibold text-gray-900"
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4 text-secondary" />
          Filtres
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-white">
              {activeCount}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <Link
              href={RESULTS_PATH}
              className="rounded-md text-sm font-medium text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
            >
              Réinitialiser
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpenOnMobile((open) => !open)}
            aria-expanded={openOnMobile}
            aria-controls="filtres-champs"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 lg:hidden"
          >
            {openOnMobile ? "Masquer" : "Afficher"}
          </button>
        </div>
      </div>

      {/* Replié en mobile : les champs cachés restent soumis avec le formulaire. */}
      <div
        id="filtres-champs"
        className={cn("space-y-4", !openOnMobile && "hidden lg:block")}
      >
        <FilterCard title="Ville" icon={MapPin} htmlFor="filtre-ville">
        <Select id="filtre-ville" name="ville" defaultValue={filters.ville ?? ""}>
          <option value="">Toutes les villes</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </FilterCard>

      <FilterCard
        title="Type d'événement"
        icon={PartyPopper}
        htmlFor="filtre-type"
      >
        <Select id="filtre-type" name="type" defaultValue={filters.type ?? ""}>
          <option value="">Tous les types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </FilterCard>

      <FilterCard title="Capacité" icon={Users}>
        <div className="grid grid-cols-2 gap-3">
          <RangeField
            id="filtre-capacite-min"
            name="capaciteMin"
            label="Min."
            placeholder="50"
            defaultValue={filters.capaciteMin}
          />
          <RangeField
            id="filtre-capacite-max"
            name="capaciteMax"
            label="Max."
            placeholder="500"
            defaultValue={filters.capaciteMax}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Nombre d&apos;invités que la salle doit pouvoir accueillir.
        </p>
      </FilterCard>

      <FilterCard title="Budget" icon={Wallet}>
        <div className="grid grid-cols-2 gap-3">
          <RangeField
            id="filtre-prix-min"
            name="prixMin"
            label="Min. (DA)"
            placeholder="80 000"
            defaultValue={filters.prixMin}
            step={1000}
          />
          <RangeField
            id="filtre-prix-max"
            name="prixMax"
            label="Max. (DA)"
            placeholder="400 000"
            defaultValue={filters.prixMax}
            step={1000}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Prix d&apos;appel de la salle, hors services optionnels.
        </p>
      </FilterCard>

      {options.equipments.length > 0 && (
        <FilterCard title="Équipements">
          <ul className="space-y-2.5">
            {options.equipments.map((equipment) => (
              <li key={equipment}>
                <EquipmentCheckbox
                  equipment={equipment}
                  checked={filters.equipements.includes(equipment)}
                />
              </li>
            ))}
          </ul>
        </FilterCard>
      )}

        <Button type="submit" className="w-full">
          Appliquer les filtres
        </Button>
      </div>

      {/* Critères pilotés ailleurs dans la page, préservés à la soumission. */}
      <input type="hidden" name="date" value={filters.date ?? ""} />
      <input
        type="hidden"
        name="invites"
        value={filters.invites !== null ? String(filters.invites) : ""}
      />
      <input type="hidden" name="tri" value={filters.tri} />
    </form>
  );
}

/** Carte blanche à bordure fine, gabarit commun à tous les groupes de filtres. */
function FilterCard({
  title,
  icon: Icon,
  htmlFor,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  /** Renseigné quand le groupe ne contient qu'un seul champ. */
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const heading = (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
      {Icon && <Icon aria-hidden className="h-4 w-4 text-secondary" />}
      {title}
    </span>
  );

  return (
    <fieldset className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <legend className="sr-only">{title}</legend>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="mb-2 block">
          {heading}
        </label>
      ) : (
        <p className="mb-2">{heading}</p>
      )}
      {children}
    </fieldset>
  );
}

function RangeField({
  id,
  name,
  label,
  placeholder,
  defaultValue,
  step = 1,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  defaultValue: number | null;
  step?: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-gray-500"
      >
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type="number"
        min={1}
        step={step}
        inputMode="numeric"
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

/**
 * Case à cocher contrôlée : l'état vient de l'URL, et la coche reste visible
 * immédiatement pendant que la navigation se termine.
 */
function EquipmentCheckbox({
  equipment,
  checked,
}: {
  equipment: string;
  checked: boolean;
}) {
  const [isChecked, setIsChecked] = React.useState(checked);

  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 transition-colors hover:text-gray-900">
      <input
        type="checkbox"
        name="equipements"
        value={equipment}
        checked={isChecked}
        onChange={(event) => setIsChecked(event.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-gray-300 text-secondary accent-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      {equipment}
    </label>
  );
}
