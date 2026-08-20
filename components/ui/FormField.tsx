import * as React from "react";
import { AlertCircle } from "lucide-react";
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

      {/*
        L'icône double la couleur : un message d'erreur signalé par le seul rouge
        échoue au critère WCAG 1.4.1 pour qui ne distingue pas les teintes.
      */}
      {error && (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-xs font-medium text-error"
        >
          <AlertCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
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

/**
 * Bloc de formulaire : carte blanche, titre et description.
 *
 * Le `id` fait de la section une cible d'ancre — un formulaire long se navigue
 * par sommaire, et le résumé d'erreurs y renvoie. `scroll-mt` réserve la place
 * de l'en-tête collant : sans lui, l'ancre dépose le titre sous la barre.
 *
 * `aria-labelledby` plutôt qu'un `aria-label` recopié : le titre visible et le
 * nom accessible de la région restent le même texte, quoi qu'il advienne de
 * l'un.
 */
export function FormSection({
  id,
  title,
  description,
  badge,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  /** Mention affichée à côté du titre : « Facultatif », « Recommandé ». */
  badge?: string;
  children: React.ReactNode;
}) {
  const titleId = id ? `${id}-titre` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {badge && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
