import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Champ de formulaire : label, aide, contrôle et message d'erreur.
 *
 * Le contrôle reçoit `aria-describedby` et `aria-invalid` via `describedBy` /
 * `invalid` afin que l'erreur soit annoncée par les lecteurs d'écran.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  /** Précision affichée sous le label (format attendu, unité…). */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 text-error">
              *
            </span>
            <span className="sr-only"> (obligatoire)</span>
          </>
        )}
      </label>

      {hint && (
        <p id={`${id}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {children}

      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Attributs d'accessibilité à étaler sur le contrôle d'un `FormField` : relie
 * l'aide et l'erreur au champ, et marque le champ invalide le cas échéant.
 */
export function fieldAria(
  id: string,
  { hint = false, error }: { hint?: boolean; error?: string }
) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return { "aria-describedby": describedBy, "aria-invalid": Boolean(error) };
}

/** Bloc de formulaire : carte blanche, titre et description. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
