"use client";

import * as React from "react";
import type { RateUnit } from "@prisma/client";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatPrice } from "@/lib/format";
import {
  DEFAULT_RATE_UNIT,
  RATE_UNITS,
  rateSuggestions,
  type RateSuggestion,
  type RateValue,
} from "@/lib/rooms/rates";
import { rateField, ROOM_LIMITS } from "@/lib/rooms/schemas";
import { normalizeText } from "@/lib/utils";

interface RateRow {
  /** Clé opaque : elle nomme les champs de la ligne, voir `rateField`. */
  key: string;
  label: string;
  detail: string;
  /** Saisi, donc gardé en chaîne : la validation du montant est côté serveur. */
  price: string;
  unit: RateUnit;
  /** Champ à focaliser au montage, quand la ligne vient d'être ajoutée. */
  focus?: "label" | "price";
}

/**
 * Grille tarifaire de la salle : une ligne par formule proposée.
 *
 * Le prix de base ne dit qu'un ordre de grandeur. Une salle des fêtes se loue
 * par créneau — après-midi, dîner, soirée — et parfois au couvert : ce champ
 * laisse le propriétaire écrire ces formules telles qu'il les annonce à ses
 * clients, plutôt que de les noyer dans la description.
 *
 * Les formules suggérées dépendent des catégories retenues plus haut dans le
 * formulaire (`lib/rooms/rates.ts`) et ne préremplissent que l'intitulé, le
 * créneau et l'unité : un tarif n'appartient qu'à la salle qui le pratique.
 *
 * Encodage des champs. Chaque ligne porte une clé, envoyée dans `rateKeys` — ce
 * champ donne à la fois la liste des lignes retenues et leur ordre — et ses
 * valeurs voyagent dans des champs nommés d'après cette clé (`rate:<clé>:price`).
 * Des tableaux parallèles auraient suffi tant que l'ordre est respecté, mais une
 * action serveur est un point d'entrée HTTP : un envoi forgé auquel il manque un
 * tarif décalerait toute la grille d'un cran.
 */
export function RateField({
  id,
  defaultValues = [],
  categoryNames,
  "aria-describedby": describedBy,
}: {
  /**
   * Porté par le bouton d'ajout, seul contrôle stable du champ : c'est lui que
   * désigne le `<label>` du `FormField`, les lignes allant et venant.
   */
  id: string;
  defaultValues?: RateValue[];
  /** Catégories retenues : elles décident des formules suggérées. */
  categoryNames: string[];
  /**
   * Relie l'aide et le message d'erreur du `FormField`. Pas d'`aria-invalid`
   * ici : l'attribut n'a pas de sens sur un bouton, et l'erreur porte sur la
   * grille entière, pas sur ce contrôle.
   */
  "aria-describedby"?: string;
}) {
  const nextKey = React.useRef(defaultValues.length);

  const [rows, setRows] = React.useState<RateRow[]>(() =>
    defaultValues.map((value, index) => ({
      key: `r${index}`,
      label: value.label,
      detail: value.detail ?? "",
      price: String(value.price),
      unit: value.unit,
    }))
  );

  const full = rows.length >= ROOM_LIMITS.rates.max;

  /*
   * Une formule déjà dans la grille n'est plus proposée : la suggestion sert à
   * composer la grille, pas à la dupliquer.
   */
  const used = React.useMemo(
    () => new Set(rows.map((row) => normalizeText(row.label))),
    [rows]
  );
  const suggestions = React.useMemo(
    () =>
      rateSuggestions(categoryNames).filter(
        (suggestion) => !used.has(normalizeText(suggestion.label))
      ),
    [categoryNames, used]
  );

  const addRow = (suggestion?: RateSuggestion) => {
    if (full) return;

    const key = `r${nextKey.current++}`;
    setRows((current) => [
      ...current,
      {
        key,
        label: suggestion?.label ?? "",
        detail: suggestion?.detail ?? "",
        price: "",
        unit: suggestion?.unit ?? DEFAULT_RATE_UNIT,
        // Une ligne préremplie n'attend plus que son tarif.
        focus: suggestion ? "price" : "label",
      },
    ]);
  };

  const update = (key: string, patch: Partial<RateRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <>
          {/* En-tête de colonnes : sur mobile, les champs portent leur propre
              libellé accessible et le filigrane suffit à s'y retrouver. */}
          <div className="hidden gap-2 px-1 text-xs font-medium text-gray-500 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_7.5rem_9rem_2rem]">
            <span>Formule</span>
            <span>Créneau ou précision</span>
            <span>Tarif (DA)</span>
            <span>Facturation</span>
            <span className="sr-only">Retirer</span>
          </div>

          <ul className="flex flex-col gap-2">
            {rows.map((row, index) => {
              const position = `formule ${index + 1}`;

              return (
                <li
                  key={row.key}
                  className="rounded-lg border border-gray-200 bg-white p-2 sm:border-0 sm:bg-transparent sm:p-0"
                >
                  <input type="hidden" name="rateKeys" value={row.key} />

                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_7.5rem_9rem_2rem] sm:items-center">
                    <Input
                      name={rateField(row.key, "label")}
                      value={row.label}
                      onChange={(event) =>
                        update(row.key, { label: event.target.value })
                      }
                      maxLength={ROOM_LIMITS.rateLabel.max}
                      placeholder="Location soirée"
                      aria-label={`Intitulé — ${position}`}
                      autoFocus={row.focus === "label"}
                      className="h-9 text-sm"
                    />

                    <Input
                      name={rateField(row.key, "detail")}
                      value={row.detail}
                      onChange={(event) =>
                        update(row.key, { detail: event.target.value })
                      }
                      maxLength={ROOM_LIMITS.detail.max}
                      placeholder="21h – 3h"
                      aria-label={`Créneau — ${position}`}
                      className="h-9 text-sm"
                    />

                    <Input
                      name={rateField(row.key, "price")}
                      type="number"
                      inputMode="numeric"
                      min={ROOM_LIMITS.price.min}
                      // `step` à 1 : avec un pas plus large, le navigateur
                      // refuse tout montant qui n'en est pas un multiple.
                      step={1}
                      value={row.price}
                      onChange={(event) =>
                        update(row.key, { price: event.target.value })
                      }
                      placeholder="270000"
                      aria-label={`Tarif — ${position}`}
                      autoFocus={row.focus === "price"}
                      className="h-9 text-sm"
                    />

                    <Select
                      name={rateField(row.key, "unit")}
                      value={row.unit}
                      onChange={(event) =>
                        update(row.key, {
                          unit: event.target.value as RateUnit,
                        })
                      }
                      aria-label={`Facturation — ${position}`}
                      className="h-9 text-sm"
                    >
                      {RATE_UNITS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>

                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      aria-label={`Retirer la ${position}`}
                      className="inline-flex h-9 w-8 items-center justify-center justify-self-end rounded-md text-gray-400 transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <X aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {suggestions.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">
            {rows.length === 0
              ? "Formules courantes pour ce type de salle :"
              : "Ajouter :"}
          </span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => addRow(suggestion)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:border-secondary hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Plus aria-hidden className="h-3 w-3" />
              {suggestion.label}
              {suggestion.detail && (
                <span className="text-gray-400">{suggestion.detail}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          id={id}
          type="button"
          onClick={() => addRow()}
          disabled={full}
          aria-describedby={describedBy}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Ajouter une formule
        </button>

        <p className="text-xs text-gray-500">
          {full
            ? `Maximum de ${ROOM_LIMITS.rates.max} formules atteint.`
            : `Exemple : « Dîner par couvert, 18h – 22h, ${formatPrice(3500)} ».`}
        </p>
      </div>
    </div>
  );
}
