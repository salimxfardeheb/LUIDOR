"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/format";
import { ROOM_LIMITS, servicePriceField } from "@/lib/rooms/schemas";
import { findService, ROOM_SERVICES } from "@/lib/rooms/services";
import { cn, normalizeText } from "@/lib/utils";

export interface ServiceValue {
  name: string;
  /** Tarif demandé par la salle, `null` quand il n'est pas fixé. */
  price: number | null;
}

/**
 * Prestations proposées par la salle, et leur tarif.
 *
 * Cases à cocher plutôt qu'une liste de puces : chaque prestation retenue porte
 * son prix, et un champ de saisie par ligne demande une ligne pour s'afficher.
 * Le tarif appartient à la salle (`RoomService.price`) — le référentiel
 * (`lib/rooms/services.ts`) ne donne qu'un ordre de grandeur, proposé par
 * défaut à la première coche et modifiable ensuite. Laissé vide, il fait
 * afficher « Sur devis » ou, pour une prestation du référentiel, le tarif
 * indicatif de la plateforme.
 *
 * Encodage des champs, identique à celui des équipements : le nom part dans
 * `serviceNames` (case à cocher : rien n'est soumis quand elle est décochée) et
 * le tarif dans un champ nommé d'après le libellé, `servicePrice:Traiteur`. Un
 * envoi forgé auquel il manquerait un prix ne peut donc pas décaler les tarifs
 * d'une prestation sur l'autre.
 */
export function ServiceField({
  id,
  defaultValues = [],
  "aria-describedby": describedBy,
}: {
  /**
   * Porté par le champ d'ajout, seul contrôle stable de la liste : c'est lui
   * que désigne le `<label>` du `FormField`.
   */
  id: string;
  defaultValues?: ServiceValue[];
  "aria-describedby"?: string;
}) {
  const [extras, setExtras] = React.useState<string[]>(() =>
    defaultValues
      .filter((value) => findService(value.name) === null)
      .map((value) => value.name)
  );

  const [checked, setChecked] = React.useState<Set<string>>(
    () => new Set(defaultValues.map((value) => normalizeText(value.name)))
  );

  const [prices, setPrices] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      defaultValues
        .filter((value) => value.price !== null)
        .map((value) => [normalizeText(value.name), String(value.price)])
    )
  );

  const [draft, setDraft] = React.useState("");

  const items = React.useMemo(
    () => [
      ...ROOM_SERVICES.map((service) => ({
        name: service.name,
        suggested: service.price,
      })),
      ...extras.map((name) => ({ name, suggested: 0 })),
    ],
    [extras]
  );

  const toggle = (name: string, suggested: number, next: boolean) => {
    const key = normalizeText(name);

    setChecked((current) => {
      const updated = new Set(current);
      if (next) updated.add(key);
      else updated.delete(key);
      return updated;
    });

    // Le tarif indicatif sert d'amorce à la première coche : le propriétaire
    // part d'un ordre de grandeur plutôt que d'un champ vide, et le corrige.
    if (next && suggested > 0) {
      setPrices((current) =>
        current[key] ? current : { ...current, [key]: String(suggested) }
      );
    }
  };

  const addDraft = () => {
    const name = draft.trim().replace(/\s+/g, " ");
    if (!name) return;

    const key = normalizeText(name);
    const known = items.find((item) => normalizeText(item.name) === key);

    // Un libellé déjà présent — au référentiel ou parmi les ajouts — est coché
    // plutôt que dupliqué.
    if (!known) setExtras((current) => [...current, name]);

    setChecked((current) => new Set(current).add(key));
    setDraft("");
  };

  const removeExtra = (name: string) => {
    const key = normalizeText(name);
    setExtras((current) =>
      current.filter((entry) => normalizeText(entry) !== key)
    );
    setChecked((current) => {
      const updated = new Set(current);
      updated.delete(key);
      return updated;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const key = normalizeText(item.name);
          const isChecked = checked.has(key);
          const isExtra = findService(item.name) === null;

          return (
            <li
              key={item.name}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isChecked
                  ? "border-secondary bg-secondary/5"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div className="flex items-start gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="serviceNames"
                    value={item.name}
                    checked={isChecked}
                    onChange={(event) =>
                      toggle(item.name, item.suggested, event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-gray-300 accent-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                  <span className="block min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {item.name}
                    </span>
                    {!isChecked && item.suggested > 0 && (
                      <span className="block text-xs text-gray-400">
                        Habituellement {formatPrice(item.suggested)}
                      </span>
                    )}
                  </span>
                </label>

                {isExtra && (
                  <button
                    type="button"
                    onClick={() => removeExtra(item.name)}
                    aria-label={`Retirer ${item.name}`}
                    className="rounded-sm p-0.5 text-gray-400 transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/*
                Le tarif n'est rendu que si la prestation est retenue : un prix
                saisi puis décoché ne doit pas partir avec le formulaire.
              */}
              {isChecked && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    name={servicePriceField(item.name)}
                    type="number"
                    inputMode="numeric"
                    min={ROOM_LIMITS.price.min}
                    // `step` à 1 : avec un pas plus large, le navigateur refuse
                    // tout montant qui n'en est pas un multiple.
                    step={1}
                    value={prices[key] ?? ""}
                    onChange={(event) =>
                      setPrices((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder="Sur devis"
                    aria-label={`Tarif — ${item.name}`}
                    className="h-9 text-sm"
                  />
                  <span className="shrink-0 text-xs text-gray-500">DA</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Entrée ajoute la prestation au lieu de soumettre la salle.
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          maxLength={ROOM_LIMITS.label.max}
          placeholder="Autre prestation : feu d'artifice, baby-sitting…"
          aria-label="Ajouter une prestation"
          aria-describedby={describedBy}
          className="sm:max-w-xs"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={draft.trim().length === 0}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Ajouter
        </button>
      </div>
    </div>
  );
}
