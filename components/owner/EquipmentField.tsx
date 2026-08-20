"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import {
  CUSTOM_EQUIPMENT_PLACEHOLDER,
  ROOM_EQUIPMENTS,
  type RoomEquipment,
} from "@/lib/rooms/equipments";
import { equipmentDetailField, ROOM_LIMITS } from "@/lib/rooms/schemas";
import { cn, normalizeText } from "@/lib/utils";

export interface EquipmentValue {
  name: string;
  /** Précision propre à la salle, `null` quand le propriétaire n'en donne pas. */
  detail: string | null;
}

/**
 * Équipements de la salle : cases à cocher du référentiel, précision libre par
 * équipement, et ajout d'équipements hors référentiel.
 *
 * Encodage des champs. Le nom part dans `equipmentNames` (case à cocher : rien
 * n'est soumis quand elle est décochée) et la précision dans un champ dont le
 * *nom* dérive de l'équipement, `equipmentDetail:Parking privé`. Deux tableaux
 * parallèles auraient suffi tant que l'ordre est respecté — mais une action
 * serveur est un point d'entrée HTTP : un envoi forgé avec un tableau plus
 * court décalerait chaque précision d'un cran, et le parking de la salle se
 * retrouverait sur le wifi. La clé nommée rend ce décalage impossible.
 */
export function EquipmentField({
  defaultValues = [],
}: {
  defaultValues?: EquipmentValue[];
}) {
  /*
   * Les équipements ajoutés à la main sont conservés à part : ils s'affichent
   * après le référentiel et peuvent être retirés, ce que les entrées du
   * référentiel ne permettent pas (on les décoche).
   */
  const [extras, setExtras] = React.useState<RoomEquipment[]>(() =>
    defaultValues
      .filter((value) => !isReferenced(value.name))
      .map((value) => ({
        name: value.name,
        detailPlaceholder: CUSTOM_EQUIPMENT_PLACEHOLDER,
      }))
  );

  const [checked, setChecked] = React.useState<Set<string>>(
    () => new Set(defaultValues.map((value) => normalizeText(value.name)))
  );

  const [details, setDetails] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      defaultValues
        .filter((value) => value.detail)
        .map((value) => [normalizeText(value.name), value.detail as string])
    )
  );

  const [draft, setDraft] = React.useState("");

  const items = React.useMemo(
    () => [...ROOM_EQUIPMENTS, ...extras],
    [extras]
  );

  const toggle = (name: string, next: boolean) => {
    setChecked((current) => {
      const updated = new Set(current);
      if (next) updated.add(normalizeText(name));
      else updated.delete(normalizeText(name));
      return updated;
    });
  };

  const addDraft = () => {
    const name = draft.trim().replace(/\s+/g, " ");
    if (!name) return;

    const key = normalizeText(name);
    const known = items.find((item) => normalizeText(item.name) === key);

    // Un libellé déjà présent — dans le référentiel ou parmi les ajouts — est
    // coché plutôt que dupliqué.
    if (!known) {
      setExtras((current) => [
        ...current,
        { name, detailPlaceholder: CUSTOM_EQUIPMENT_PLACEHOLDER },
      ]);
    }

    setChecked((current) => new Set(current).add(key));
    setDraft("");
  };

  const removeExtra = (name: string) => {
    const key = normalizeText(name);
    setExtras((current) =>
      current.filter((item) => normalizeText(item.name) !== key)
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
          const isExtra = !isReferenced(item.name);

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
                    name="equipmentNames"
                    value={item.name}
                    checked={isChecked}
                    onChange={(event) => toggle(item.name, event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-gray-300 accent-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                  <span className="block min-w-0 truncate text-sm font-medium text-gray-900">
                    {item.name}
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
                Le champ de précision n'est rendu que si l'équipement est retenu :
                une précision saisie puis décochée ne doit pas partir avec le
                formulaire.
              */}
              {isChecked && (
                <Input
                  name={equipmentDetailField(item.name)}
                  value={details[key] ?? ""}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  maxLength={ROOM_LIMITS.detail.max}
                  placeholder={item.detailPlaceholder}
                  aria-label={`Précision — ${item.name}`}
                  className="mt-2 h-9 text-sm"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          // Cible de l'ancre du résumé d'erreurs : la section n'a pas d'autre
          // contrôle stable, les cases dépendant du référentiel affiché.
          id="equipments"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Entrée ajoute l'équipement au lieu de soumettre la salle.
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          maxLength={ROOM_LIMITS.label.max}
          placeholder="Autre équipement : piste de danse, générateur…"
          aria-label="Ajouter un équipement"
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

function isReferenced(name: string): boolean {
  const needle = normalizeText(name);
  return ROOM_EQUIPMENTS.some(
    (equipment) => normalizeText(equipment.name) === needle
  );
}
