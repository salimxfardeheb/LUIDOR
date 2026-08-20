"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn, normalizeText } from "@/lib/utils";

export interface ComboboxOption {
  /** Valeur affichée dans le champ et soumise avec le formulaire. */
  value: string;
  /** Complément affiché à droite (code de wilaya…). Il entre aussi dans la recherche. */
  hint?: string;
}

/**
 * Liste déroulante avec saisie filtrante.
 *
 * Le champ visible porte lui-même le `name` du formulaire : sans JavaScript, il
 * reste un champ texte ordinaire que l'action serveur valide comme avant. La
 * liste n'est qu'une aide à la saisie — la validation qui fait autorité reste
 * celle du serveur, puisqu'une action serveur est un point d'entrée HTTP qui
 * peut recevoir n'importe quelle chaîne.
 *
 * Le rapprochement se fait sans accents ni casse (`normalizeText`) : « setif »
 * trouve « Sétif ». Les correspondances par début de mot passent avant les
 * correspondances internes, pour que trois lettres suffisent en général.
 */
export function Combobox({
  id,
  name,
  options,
  defaultValue = "",
  placeholder,
  required,
  maxLength,
  emptyLabel = "Aucun résultat.",
  className,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string;
  name: string;
  options: readonly ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  /** Message affiché quand la saisie ne correspond à aucune entrée. */
  emptyLabel?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  /*
   * Le filtrage ne s'applique qu'à partir du moment où l'utilisateur tape.
   * Rouvrir la liste sur une valeur déjà choisie doit montrer toutes les
   * entrées, pas la seule qui corresponde exactement au texte présent.
   */
  const [filtering, setFiltering] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const matches = React.useMemo(() => {
    const query = filtering ? normalizeText(value) : "";
    if (!query) return options;

    const startsWith: ComboboxOption[] = [];
    const contains: ComboboxOption[] = [];

    for (const option of options) {
      const label = normalizeText(option.value);
      const hint = option.hint ? normalizeText(option.hint) : "";

      if (label.startsWith(query) || hint.startsWith(query)) startsWith.push(option);
      else if (label.includes(query) || hint.includes(query)) contains.push(option);
    }

    return [...startsWith, ...contains];
  }, [filtering, options, value]);

  const openList = React.useCallback(() => {
    const current = options.findIndex(
      (option) => normalizeText(option.value) === normalizeText(value)
    );
    setHighlighted(current === -1 ? 0 : current);
    setFiltering(false);
    setOpen(true);
  }, [options, value]);

  const commit = (option: ComboboxOption) => {
    setValue(option.value);
    setFiltering(false);
    setOpen(false);
    inputRef.current?.focus();
  };

  const move = (delta: number) => {
    if (!open) {
      openList();
      return;
    }
    if (matches.length === 0) return;
    setHighlighted(
      (index) => (index + delta + matches.length) % matches.length
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Enter":
        // Sans ce `preventDefault`, la touche Entrée soumettrait le formulaire
        // au lieu de valider l'entrée survolée dans la liste.
        if (open && matches[highlighted]) {
          event.preventDefault();
          commit(matches[highlighted]);
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

  const handleBlur = () => {
    setOpen(false);
    setFiltering(false);

    // Une saisie manuelle reconnue est ramenée à l'orthographe du référentiel :
    // « setif » part en base comme « Sétif », sinon deux villes identiques se
    // retrouveraient sous deux libellés différents dans les filtres du catalogue.
    const exact = options.find(
      (option) => normalizeText(option.value) === normalizeText(value)
    );
    if (exact && exact.value !== value) setValue(exact.value);
  };

  // Le survol clavier doit rester visible quand la liste défile.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-highlighted="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  const listboxId = `${id}-listbox`;

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        role="combobox"
        value={value}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck={false}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches.length > 0 ? `${id}-option-${highlighted}` : undefined
        }
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onChange={(event) => {
          setValue(event.target.value);
          setFiltering(true);
          setHighlighted(0);
          setOpen(true);
        }}
        onClick={() => {
          if (!open) openList();
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="pr-9"
      />

      <button
        type="button"
        // Décoratif : le champ est déjà entièrement pilotable au clavier.
        tabIndex={-1}
        aria-hidden
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          inputRef.current?.focus();
          openList();
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
          // Empêche le champ de perdre le focus avant que le clic ne soit traité :
          // sans cela, `onBlur` refermerait la liste et le clic tomberait dans le vide.
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto",
            "rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          )}
        >
          {matches.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-gray-500">
              {emptyLabel}
            </li>
          ) : (
            matches.map((option, index) => {
              const active = index === highlighted;
              const selected =
                normalizeText(option.value) === normalizeText(value);

              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  data-highlighted={active}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => commit(option)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                    active ? "bg-accent/10 text-gray-900" : "text-gray-700"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Check
                      aria-hidden
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-accent",
                        selected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.value}
                  </span>
                  {option.hint && (
                    <span className="shrink-0 text-xs text-gray-400">
                      {option.hint}
                    </span>
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
