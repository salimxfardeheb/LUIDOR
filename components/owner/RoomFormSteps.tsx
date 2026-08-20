"use client";

import { AlertCircle, Check } from "lucide-react";
import {
  ROOM_FORM_STEPS,
  stepButtonId,
  stepPanelId,
  stepStatus,
  type RoomFormProgress,
  type RoomFormStep,
  type StepStatus,
} from "@/lib/owner/room-form";
import type { FieldErrors } from "@/lib/rooms/schemas";
import { cn } from "@/lib/utils";

/** Couleur du repère d'étape, du plus neutre au plus alarmant. */
const BAR: Record<StepStatus, string> = {
  done: "bg-success",
  partial: "bg-secondary",
  todo: "bg-gray-200",
  error: "bg-error",
};

const BADGE: Record<StepStatus, string> = {
  done: "border-success bg-success text-white",
  partial: "border-secondary bg-secondary/10 text-secondary",
  todo: "border-gray-300 bg-white text-gray-500",
  error: "border-error bg-error text-white",
};

/**
 * Fil des trois étapes du formulaire salle.
 *
 * Il dit deux choses à la fois : où l'on est, et ce que valent les autres
 * étapes — complétée, entamée, en erreur. Les étapes restent librement
 * accessibles d'un clic : le formulaire sert aussi à corriger une salle déjà
 * publiée, où interdire de revenir en arrière n'aurait aucun sens. Le bouton
 * « Suivant », lui, contrôle l'étape courante avant de passer à la suite.
 *
 * Ce sont des boutons et non des liens : ils changent l'affichage d'un même
 * formulaire, ils ne mènent nulle part. Chacun porte `aria-controls` vers le
 * panneau qu'il révèle, et l'étape courante `aria-current="step"`.
 */
export function RoomFormSteps({
  current,
  onSelect,
  progress,
  fieldErrors,
}: {
  /** Rang de l'étape affichée. */
  current: number;
  onSelect: (index: number) => void;
  progress: RoomFormProgress;
  fieldErrors: FieldErrors;
}) {
  return (
    <nav aria-label="Étapes du formulaire">
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {ROOM_FORM_STEPS.map((step, index) => {
          const errors = step.fields.filter(
            (field) => fieldErrors[field] !== undefined
          ).length;
          const status = stepStatus(progress[step.id], errors > 0);
          const active = index === current;

          return (
            <li key={step.id} className="min-w-0">
              <span
                aria-hidden
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  BAR[status],
                  active && status === "todo" && "bg-secondary/40"
                )}
              />

              <button
                type="button"
                id={stepButtonId(step.id)}
                aria-controls={stepPanelId(step.id)}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  "mt-2 flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                  active ? "bg-secondary/5" : "hover:bg-gray-100"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    BADGE[status]
                  )}
                >
                  {status === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : status === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>

                <span className="min-w-0">
                  <span className="sr-only">
                    Étape {index + 1} sur {ROOM_FORM_STEPS.length} :{" "}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-sm",
                      active
                        ? "font-semibold text-primary-900"
                        : "font-medium text-gray-700"
                    )}
                  >
                    {step.label}
                  </span>
                  {/* Le détail encombrerait un écran de téléphone : le repère
                      coloré et le libellé suffisent à s'y retrouver. */}
                  <span className="mt-0.5 hidden text-xs text-gray-500 sm:block">
                    {stepDetail(step, progress, errors)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Ligne d'état d'une étape : le rapport des champs obligatoires tant qu'il en
 * manque, puis ce que l'étape contient.
 */
function stepDetail(
  step: RoomFormStep,
  progress: RoomFormProgress,
  errors: number
): string {
  if (errors > 0) {
    return errors === 1 ? "1 erreur à corriger" : `${errors} erreurs à corriger`;
  }

  const { filled, required, items } = progress[step.id];

  if (required > 0 && filled < required) {
    return `${filled} / ${required} champ${required > 1 ? "s" : ""}`;
  }

  if (step.id === "tarifs") {
    return items > 0
      ? `${items} formule${items > 1 ? "s" : ""}`
      : "prix de base seul";
  }

  if (step.id === "offre") {
    return items > 0
      ? `${items} élément${items > 1 ? "s" : ""} ajouté${items > 1 ? "s" : ""}`
      : "facultatif";
  }

  return "complétée";
}
