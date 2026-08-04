"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxOption {
  id: string;
  label: string;
  /** Précision affichée sous le libellé (tarif d'un service, par exemple). */
  detail?: string;
}

/**
 * Sélection multiple en cases à cocher, présentées comme des cartes cliquables.
 *
 * Utilisé pour les équipements et les services : même gabarit, même nom de champ
 * répété (`name`), donc `formData.getAll(name)` côté serveur. L'état local sert
 * uniquement au retour visuel ; la valeur soumise reste celle des cases.
 */
export function CheckboxCardGroup({
  name,
  options,
  defaultSelected = [],
  emptyLabel = "Aucune option disponible.",
  columns = 3,
}: {
  name: string;
  options: CheckboxOption[];
  defaultSelected?: string[];
  emptyLabel?: string;
  columns?: 2 | 3;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(defaultSelected)
  );

  if (options.length === 0) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>;
  }

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <ul
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3"
      )}
    >
      {options.map((option) => {
        const checked = selected.has(option.id);

        return (
          <li key={option.id}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                checked
                  ? "border-secondary bg-secondary/5"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option.id}
                checked={checked}
                onChange={(event) => toggle(option.id, event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-gray-300 accent-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">
                  {option.label}
                </span>
                {option.detail && (
                  <span className="block text-xs text-gray-500">
                    {option.detail}
                  </span>
                )}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
