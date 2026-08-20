"use client";

import * as React from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn, normalizeText } from "@/lib/utils";

export interface MultiComboboxOption {
  /** Libellé affiché et valeur soumise. */
  value: string;
  /** Complément affiché à droite de la ligne (tarif indicatif, par exemple). */
  hint?: string;
}

/**
 * Sélection multiple à saisie filtrante, avec création de valeurs.
 *
 * Chaque valeur retenue est soumise dans un champ caché portant le même `name`
 * (`formData.getAll(name)` côté serveur), comme le faisait la liste de cases à
 * cocher qu'elle remplace.
 *
 * Contrairement au `Combobox` simple, ce champ **exige JavaScript** : composer
 * une liste et créer une entrée ne se fait pas sans lui. C'est le seul champ du
 * formulaire salle dans ce cas.
 */
export function MultiCombobox({
  id,
  name,
  options,
  defaultValues = [],
  placeholder,
  max,
  emptyLabel = "Aucun résultat.",
  createLabel = (query: string) => `Ajouter « ${query} »`,
  primaryLabel,
  onValuesChange,
  className,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string;
  name: string;
  options: readonly MultiComboboxOption[];
  defaultValues?: string[];
  placeholder?: string;
  /** Nombre maximum de valeurs, aligné sur la validation serveur. */
  max?: number;
  emptyLabel?: string;
  /** Libellé de la ligne qui crée la valeur saisie. */
  createLabel?: (query: string) => string;
  /** Mention portée par la première puce (« principale », par exemple). */
  primaryLabel?: string;
  /**
   * Notifie le parent des valeurs retenues, sans rendre le champ contrôlé :
   * ce sont toujours les champs cachés ci-dessous qui sont soumis. Sert aux
   * champs qui dépendent de cette sélection — les formules tarifaires suggérées
   * découlent des catégories de la salle.
   */
  onValuesChange?: (values: string[]) => void;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [values, setValues] = React.useState<string[]>(defaultValues);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const full = max !== undefined && values.length >= max;
  const selected = React.useMemo(
    () => new Set(values.map(normalizeText)),
    [values]
  );

  /**
   * Les entrées déjà retenues restent dans la liste, cochées : les retirer
   * ferait sauter les lignes suivantes sous le curseur à chaque sélection.
   */
  const matches = React.useMemo(() => {
    const needle = normalizeText(query);
    if (!needle) return options;

    const startsWith: MultiComboboxOption[] = [];
    const contains: MultiComboboxOption[] = [];

    for (const option of options) {
      const label = normalizeText(option.value);
      if (label.startsWith(needle)) startsWith.push(option);
      else if (label.includes(needle)) contains.push(option);
    }

    return [...startsWith, ...contains];
  }, [options, query]);

  // La ligne de création n'apparaît que si la saisie ne correspond à rien
  // d'existant : sinon on proposerait de créer un doublon de « Mariage ».
  const creation = React.useMemo(() => {
    const label = query.trim();
    if (!label || full) return null;

    const needle = normalizeText(label);
    const known =
      selected.has(needle) ||
      options.some((option) => normalizeText(option.value) === needle);

    return known ? null : label;
  }, [full, options, query, selected]);

  const rows = React.useMemo(
    () => [...matches.map((option) => option.value), ...(creation ? [creation] : [])],
    [creation, matches]
  );

  const toggle = (value: string) => {
    const needle = normalizeText(value);

    setValues((current) => {
      if (current.some((entry) => normalizeText(entry) === needle)) {
        return current.filter((entry) => normalizeText(entry) !== needle);
      }
      if (max !== undefined && current.length >= max) return current;
      return [...current, value];
    });

    setQuery("");
    setHighlighted(0);
    inputRef.current?.focus();
  };

  const remove = (value: string) => {
    setValues((current) => current.filter((entry) => entry !== value));
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlighted(0);
          return;
        }
        if (rows.length === 0) return;
        setHighlighted((index) => {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          return (index + delta + rows.length) % rows.length;
        });
        break;
      case "Enter":
        // Sans ce `preventDefault`, Entrée soumettrait le formulaire au lieu de
        // retenir la ligne survolée.
        if (open && rows[highlighted]) {
          event.preventDefault();
          toggle(rows[highlighted]);
        }
        break;
      case "Backspace":
        // Retirer la dernière puce quand le champ de saisie est vide, comme
        // dans un champ de destinataires.
        if (query === "" && values.length > 0) {
          event.preventDefault();
          remove(values[values.length - 1]);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-highlighted="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  /*
   * La notification passe par une référence : sans elle, un parent qui redéfinit
   * son gestionnaire à chaque rendu — le cas courant — relancerait l'effet en
   * boucle alors que la sélection n'a pas bougé.
   */
  const notify = React.useRef(onValuesChange);
  React.useEffect(() => {
    notify.current = onValuesChange;
  });
  React.useEffect(() => {
    notify.current?.(values);
  }, [values]);

  const listboxId = `${id}-listbox`;

  return (
    <div className={cn("relative", className)}>
      {values.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      {/* Le conteneur imite le cadre d'un Input : les puces vivent à l'intérieur. */}
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border",
          "border-gray-300 bg-white px-2 py-1.5 pr-9 shadow-xs transition-colors",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40"
        )}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {values.map((value, index) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-md border border-secondary/30 bg-secondary/10 py-0.5 pl-2 pr-1 text-sm text-gray-900"
          >
            {value}
            {index === 0 && primaryLabel && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {primaryLabel}
              </span>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                remove(value);
              }}
              aria-label={`Retirer ${value}`}
              className="rounded-sm p-0.5 text-gray-500 transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          value={query}
          placeholder={values.length === 0 ? placeholder : undefined}
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && rows.length > 0 ? `${id}-option-${highlighted}` : undefined
          }
          aria-describedby={describedBy}
          aria-invalid={invalid}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setOpen(false);
            setQuery("");
          }}
          className="h-7 min-w-24 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      <button
        type="button"
        // Décoratif : le champ est déjà pilotable au clavier.
        tabIndex={-1}
        aria-hidden
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          inputRef.current?.focus();
          setOpen(true);
        }}
        className="absolute right-0 top-0 flex h-10 w-9 items-center justify-center text-gray-400"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable
          // Garde le focus dans le champ : sinon `onBlur` fermerait la liste
          // avant que le clic ne soit traité.
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto",
            "rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          )}
        >
          {rows.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-gray-500">
              {full ? `Maximum de ${max} atteint.` : emptyLabel}
            </li>
          ) : (
            rows.map((value, index) => {
              const isCreation = creation !== null && index === rows.length - 1;
              const hint = isCreation
                ? undefined
                : options.find((option) => option.value === value)?.hint;
              const checked = selected.has(normalizeText(value));
              const active = index === highlighted;
              const disabled = full && !checked && !isCreation;

              return (
                <li
                  key={isCreation ? `${value}-creation` : value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={checked}
                  aria-disabled={disabled}
                  data-highlighted={active}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => {
                    if (!disabled) toggle(value);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm",
                    disabled
                      ? "cursor-not-allowed text-gray-400"
                      : "cursor-pointer",
                    active && !disabled ? "bg-accent/10" : null,
                    !disabled && (isCreation ? "text-accent" : "text-gray-700")
                  )}
                >
                  {isCreation ? (
                    <>
                      <Plus aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {createLabel(value)}
                    </>
                  ) : (
                    <>
                      <Check
                        aria-hidden
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-accent",
                          checked ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{value}</span>
                      {hint && (
                        <span className="shrink-0 text-xs text-gray-400">
                          {hint}
                        </span>
                      )}
                    </>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
