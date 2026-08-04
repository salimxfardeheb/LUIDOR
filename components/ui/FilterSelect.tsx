"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export interface FilterSelectOption {
  value: string;
  label: string;
  /** Destination correspondant à ce choix, calculée côté serveur. */
  href: string;
}

/**
 * Sélecteur qui écrit son choix dans l'URL.
 *
 * Les destinations sont préparées par la page : le composant n'a aucune règle
 * de construction d'URL à connaître, ce qui lui permet de servir aussi bien au
 * choix d'une salle qu'au filtrage des réservations.
 *
 * `replace` plutôt que `push` : changer de filtre n'a pas à empiler un cran
 * d'historique par choix.
 */
export function OwnerFilterSelect({
  id,
  label,
  icon,
  value,
  options,
  className,
}: {
  id: string;
  label: string;
  /**
   * Icône déjà rendue (`<LayoutGrid className="h-4 w-4" />`) et non le
   * composant : une fonction ne franchit pas la frontière serveur → client,
   * un élément React si.
   */
  icon?: React.ReactNode;
  value: string;
  options: FilterSelectOption[];
  className?: string;
}) {
  const router = useRouter();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        {icon}
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(event) => {
          const option = options.find(
            (item) => item.value === event.target.value
          );
          if (option) router.replace(option.href, { scroll: false });
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
