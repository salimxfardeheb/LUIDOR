"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import {
  updatePlatformSettings,
  type SettingsFormState,
} from "@/actions/admin-settings";
import type { PlatformSettingsData } from "@/lib/admin/settings";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

/**
 * Réglages généraux de la plateforme.
 *
 * Formulaire natif branché sur une action serveur : la saisie survit à un
 * rechargement, et les erreurs reviennent champ par champ sans état parallèle
 * à resynchroniser.
 */
export function SettingsForm({ settings }: { settings: PlatformSettingsData }) {
  const [state, formAction] = useFormState<SettingsFormState, FormData>(
    updatePlatformSettings,
    null
  );

  const fieldErrors = state?.ok === false ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.ok === true && (
        <Alert variant="success" title="Réglages enregistrés">
          {state.message}
        </Alert>
      )}
      {state?.ok === false && (
        <Alert variant="error" title="Les réglages n'ont pas été enregistrés">
          {state.message}
        </Alert>
      )}

      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Identité de la plateforme
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Nom et signature utilisés dans les communications de LIUDOR.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="siteName"
            label="Nom de la plateforme"
            defaultValue={settings.siteName}
            error={fieldErrors.siteName}
            required
            maxLength={60}
          />
          <Field
            id="tagline"
            label="Signature"
            defaultValue={settings.tagline}
            error={fieldErrors.tagline}
            maxLength={120}
            help="Affichée sous le nom, ex. « Lieux d'Or »."
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Coordonnées</h3>
          <p className="mt-1 text-sm text-gray-500">
            Point de contact de l&apos;équipe, communiqué aux clients et aux
            propriétaires.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="contactEmail"
            label="Email de contact"
            type="email"
            defaultValue={settings.contactEmail}
            error={fieldErrors.contactEmail}
            required
          />
          <Field
            id="contactPhone"
            label="Téléphone"
            type="tel"
            defaultValue={settings.contactPhone ?? ""}
            error={fieldErrors.contactPhone}
            maxLength={30}
          />
          <Field
            id="address"
            label="Adresse"
            defaultValue={settings.address ?? ""}
            error={fieldErrors.address}
            maxLength={200}
            className="sm:col-span-2"
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Paramètres principaux
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Règles de fonctionnement appliquées à l&apos;ensemble de la
            plateforme.
          </p>
        </div>

        <Field
          id="bookingLeadTimeDays"
          label="Délai minimum de réservation (jours)"
          type="number"
          min={0}
          max={365}
          defaultValue={String(settings.bookingLeadTimeDays)}
          error={fieldErrors.bookingLeadTimeDays}
          required
          help="Nombre de jours minimum entre une demande et la date de l'événement."
          className="sm:max-w-xs"
        />

        <Toggle
          id="reviewAutoPublish"
          label="Publier les avis automatiquement"
          description="Décoché, chaque nouvel avis attend une relecture dans « Avis & commentaires » avant de paraître sur la fiche salle."
          defaultChecked={settings.reviewAutoPublish}
        />

        <Toggle
          id="maintenanceMode"
          label="Mode maintenance"
          description="Signale une intervention en cours à l'équipe. À activer le temps d'une opération sur la plateforme."
          defaultChecked={settings.maintenanceMode}
        />
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  help,
  error,
  className,
  ...props
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-gray-900">
        {label}
      </label>
      <Input
        id={id}
        name={id}
        className="mt-1.5"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : help ? `${id}-aide` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-erreur`} role="alert" className="mt-1 text-sm text-error">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-aide`} className="mt-1 text-xs text-gray-500">
            {help}
          </p>
        )
      )}
    </div>
  );
}

/** Case à cocher présentée en ligne, avec son explication. */
function Toggle({
  id,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-md bg-gray-50 p-4 text-sm"
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-gray-300 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      <span>
        <span className="block font-medium text-gray-900">{label}</span>
        <span className="mt-0.5 block text-gray-500">{description}</span>
      </span>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <Save aria-hidden className="h-4 w-4" />
      {pending ? "Enregistrement…" : "Enregistrer les réglages"}
    </Button>
  );
}
