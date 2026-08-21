"use client";

import * as React from "react";
import { CheckCircle2, Send } from "lucide-react";
import { submitContactMessage } from "@/actions/contact";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormField, fieldAria } from "@/components/ui/FormField";
import { CONTACT_LIMITS, CONTACT_SUBJECTS } from "@/lib/contact/content";
import { cn } from "@/lib/utils";

/**
 * Champs du formulaire, dans l'ordre du DOM.
 *
 * L'ordre compte : le résumé d'erreurs le reprend, et un résumé qui liste les
 * champs dans un autre ordre que le formulaire fait chercher.
 */
const FIELDS = [
  { name: "fullName", label: "Nom complet" },
  { name: "email", label: "Adresse email" },
  { name: "subject", label: "Sujet" },
  { name: "message", label: "Message" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];
type FieldErrors = Partial<Record<FieldName, string>>;

/** Règles miroirs de la validation Zod de la Server Action (côté client). */
const RULES: Record<FieldName, (value: string) => string | null> = {
  fullName: (value) =>
    value.trim().length < 2 ? "Indiquez votre nom complet." : null,
  email: (value) =>
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? "Adresse email invalide."
      : null,
  subject: (value) =>
    value.trim().length < CONTACT_LIMITS.subject.min
      ? "Indiquez un sujet."
      : null,
  message: (value) =>
    value.trim().length < CONTACT_LIMITS.message.min
      ? "Décrivez votre demande en quelques mots."
      : null,
};

const SUBJECTS_LIST_ID = "contact-sujets";

export function ContactForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [sentEmail, setSentEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  /*
   * Aucune erreur n'est montrée avant la première tentative d'envoi : signaler
   * « nom trop court » à la deuxième lettre saisie punit une saisie en cours.
   * Passé cette tentative, chaque champ est revalidé à la sortie du focus, et
   * l'erreur corrigée disparaît immédiatement.
   */
  const [attempted, setAttempted] = React.useState(false);

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);

  /*
   * Compteur d'envois refusés, et non `error` : le résumé ne doit prendre le
   * focus qu'au refus d'un envoi. Deux refus de suite portant le même message
   * doivent le redonner, alors qu'une revalidation à la sortie d'un champ ne
   * doit surtout pas arracher le focus à la frappe en cours.
   */
  const [failures, setFailures] = React.useState(0);
  React.useEffect(() => {
    if (failures > 0) summaryRef.current?.focus();
  }, [failures]);

  /** Envoi accepté : la confirmation remplace le formulaire, focus dessus. */
  React.useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  function clearFieldError(name: string) {
    setFieldErrors((previous) => {
      if (!previous[name as FieldName]) return previous;
      const next = { ...previous };
      delete next[name as FieldName];
      return next;
    });
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    clearFieldError(event.currentTarget.name);
  }

  function handleBlur(
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    if (!attempted) return;

    const { name, value } = event.currentTarget;
    const message = RULES[name as FieldName]?.(value) ?? null;
    if (message) setFieldErrors((previous) => ({ ...previous, [name]: message }));
  }

  /** Le résumé renvoie au champ fautif : c'est ce qui le rend utile. */
  function focusField(name: FieldName) {
    const control = document.getElementById(name);
    control?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setError(null);
    setAttempted(true);
    setSubmitting(true);

    // Validation côté client : on bloque avant d'appeler le serveur.
    const data = new FormData(form);
    const clientErrors: FieldErrors = {};
    for (const { name } of FIELDS) {
      const message = RULES[name](String(data.get(name) ?? ""));
      if (message) clientErrors[name] = message;
    }

    if (Object.keys(clientErrors).length > 0) {
      setError("Vérifiez les informations saisies.");
      setFieldErrors(clientErrors);
      setFailures((count) => count + 1);
      setSubmitting(false);
      return;
    }

    setFieldErrors({});
    const result = await submitContactMessage(data);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors((result.fieldErrors ?? {}) as FieldErrors);
      setFailures((count) => count + 1);
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSentEmail(result.email);
    setSubmitting(false);
    form.reset();
  }

  if (sent) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        // `focus:` et non `focus-visible:` : la mise au point vient du code,
        // cas que l'heuristique de `focus-visible` ne retient pas.
        className="flex flex-col items-center gap-4 rounded-lg border border-success/30 bg-success/5 p-8 text-center focus:outline-none focus:ring-2 focus:ring-success/40"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 aria-hidden className="h-7 w-7 text-success" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Message envoyé
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            Merci pour votre message. L&apos;équipe LIUDOR vous répondra à{" "}
            <span className="font-medium text-gray-900">{sentEmail}</span> sous
            24 h ouvrées.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSent(false);
            setAttempted(false);
            setFailures(0);
          }}
        >
          Envoyer un autre message
        </Button>
      </div>
    );
  }

  const invalidFields = FIELDS.filter(({ name }) => fieldErrors[name]);

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting}
      className="flex flex-col gap-5"
      noValidate
    >
      {error && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          className="rounded-md focus:outline-none focus:ring-2 focus:ring-error/40"
        >
          <Alert variant="error" title={error}>
            {invalidFields.length > 0 && (
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                {invalidFields.map(({ name, label }) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => focusField(name)}
                      className="rounded-sm text-left underline underline-offset-2 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      {label} : {fieldErrors[name]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        </div>
      )}

      {/*
        Paire sur une ligne : les deux champs n'ont ni aide ni contenu variable
        au-dessus du contrôle, condition pour que les deux `<input>` partagent
        la même ligne de base. Une aide sur un seul des deux décalerait son
        contrôle d'une ligne — les messages d'erreur, eux, s'affichent sous le
        contrôle et ne dérangent pas cet alignement.
      */}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="fullName"
          label="Nom complet"
          required
          error={fieldErrors.fullName}
        >
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Mohammed Ben Mohammed"
            maxLength={120}
            required
            onChange={handleChange}
            onBlur={handleBlur}
            {...fieldAria("fullName", { error: fieldErrors.fullName })}
          />
        </FormField>

        <FormField
          id="email"
          label="Adresse email"
          required
          error={fieldErrors.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
            onChange={handleChange}
            onBlur={handleBlur}
            {...fieldAria("email", { error: fieldErrors.email })}
          />
        </FormField>
      </div>

      <FormField
        id="subject"
        label="Sujet"
        required
        hint="Choisissez une suggestion ou saisissez le vôtre."
        error={fieldErrors.subject}
      >
        <Input
          id="subject"
          name="subject"
          list={SUBJECTS_LIST_ID}
          autoComplete="off"
          placeholder="Réservation, partenariat, question…"
          maxLength={CONTACT_LIMITS.subject.max}
          required
          onChange={handleChange}
          onBlur={handleBlur}
          {...fieldAria("subject", { hint: true, error: fieldErrors.subject })}
        />
        {/*
          `<datalist>` natif : suggestions au clavier et à la souris, sans
          composant sur mesure ni JavaScript, et la saisie reste libre — le
          serveur n'attend qu'une chaîne.
        */}
        <datalist id={SUBJECTS_LIST_ID}>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject} />
          ))}
        </datalist>
      </FormField>

      <MessageField
        error={fieldErrors.message}
        onChange={handleChange}
        onBlur={handleBlur}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-gray-500">
          La réponse arrive à l&apos;adresse indiquée. Vos coordonnées servent
          uniquement à traiter votre demande.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? (
            "Envoi en cours…"
          ) : (
            <>
              <Send aria-hidden className="h-4 w-4" />
              Envoyer le message
            </>
          )}
        </Button>
      </div>

      {/*
        Région d'état : l'envoi ne change rien de visible pour qui n'a pas
        l'écran sous les yeux, le changement de libellé du bouton ne suffit pas.
      */}
      <p aria-live="polite" className="sr-only">
        {submitting ? "Envoi du message en cours…" : ""}
      </p>
    </form>
  );
}

/**
 * Message avec compteur de caractères.
 *
 * Le minimum de 10 caractères est une règle serveur : sans repère à la saisie,
 * on ne le découvre qu'au refus. Le compteur est `aria-hidden` — la contrainte
 * figure déjà dans l'aide du champ, reliée par `aria-describedby`, et un
 * lecteur d'écran n'a pas à entendre un décompte à chaque frappe.
 *
 * Composant à part pour que la frappe ne rende que lui : le formulaire entier
 * n'a aucune raison d'être recalculé à chaque caractère.
 */
function MessageField({
  error,
  onChange,
  onBlur,
}: {
  error?: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
}) {
  const [length, setLength] = React.useState(0);
  const { min, max } = CONTACT_LIMITS.message;
  const missing = Math.max(0, min - length);

  return (
    <FormField
      id="message"
      label="Message"
      required
      hint={`Ville, dates envisagées, nom de la salle — ${min} caractères minimum.`}
      error={error}
    >
      <Textarea
        id="message"
        name="message"
        rows={7}
        maxLength={max}
        placeholder="Décrivez votre demande : type d'événement, ville, dates envisagées, nombre d'invités…"
        required
        onChange={(event) => {
          setLength(event.target.value.length);
          onChange(event);
        }}
        onBlur={onBlur}
        {...fieldAria("message", { hint: true, error })}
      />
      {/*
        Rien tant que le champ est vierge : afficher « encore 10 caractères »
        avant la première frappe transforme une aide en reproche. La contrainte
        est déjà annoncée par l'aide du champ.
      */}
      {length > 0 && (
        <p
          aria-hidden
          className={cn(
            "text-right text-xs tabular-nums",
            missing > 0 ? "text-gray-400" : "text-gray-500"
          )}
        >
          {missing > 0
            ? `Encore ${missing} caractère${missing > 1 ? "s" : ""}`
            : `${length} / ${max} caractères`}
        </p>
      )}
    </FormField>
  );
}
