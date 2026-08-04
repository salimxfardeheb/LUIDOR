import type { z } from "zod";

/**
 * Primitives partagées par les formulaires branchés sur une action serveur.
 *
 * Chaque action reçoit un `FormData` brut : ces helpers normalisent les entrées
 * avant validation et donnent une forme unique aux erreurs, pour que tous les
 * formulaires du projet les affichent de la même façon.
 */

/** Un message par champ : le premier suffit à corriger la saisie. */
export interface FieldErrors {
  [field: string]: string;
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors: FieldErrors };

/**
 * Un champ absent du FormData vaut `null` : on normalise en chaîne vide pour
 * obtenir un message métier plutôt qu'une erreur de type Zod.
 */
export function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Idem, sans `trim` : un mot de passe n'est jamais normalisé, sinon le hash
 * enregistré ne correspondrait plus à ce que compare `authorize()`.
 */
export function secret(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** Aplatit les problèmes Zod en un message par champ. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}
