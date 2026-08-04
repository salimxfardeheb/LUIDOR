"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitContactMessage } from "@/actions/contact";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field, FormError } from "@/components/auth/AuthCard";

/** Règles miroirs de la validation Zod de la Server Action (côté client). */
const RULES: Record<string, (value: string) => string | null> = {
  fullName: (value) =>
    value.trim().length < 2 ? "Indiquez votre nom complet." : null,
  email: (value) =>
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? "Adresse email invalide."
      : null,
  subject: (value) =>
    value.trim().length < 3 ? "Indiquez un sujet." : null,
  message: (value) =>
    value.trim().length < 10
      ? "Décrivez votre demande en quelques mots."
      : null,
};

function validateField(name: string, value: string): string | null {
  return RULES[name]?.(value) ?? null;
}

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name } = event.currentTarget;
    // Un champ corrigé efface son erreur ; on ne valide qu'à l'envoi.
    setFieldErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    // Validation côté client : on bloque avant d'appeler le serveur.
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const clientErrors: Record<string, string> = {};
    for (const name of Object.keys(RULES)) {
      const message = validateField(name, String(values[name] ?? ""));
      if (message) clientErrors[name] = message;
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setSubmitting(false);
      return;
    }

    const result = await submitContactMessage(new FormData(form));

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSentEmail(result.email);
    form.reset();
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 aria-hidden className="h-12 w-12 text-success" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Message envoyé !
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Merci pour votre message. L&apos;équipe LIUDOR vous répondra à{" "}
            <span className="font-medium text-gray-900">{sentEmail}</span> dans
            les meilleurs délais.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSent(false)}
        >
          Envoyer un autre message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && <FormError message={error} />}

      <Field id="fullName" label="Nom complet" error={fieldErrors.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Amina Belkacem"
          onChange={handleChange}
        />
      </Field>

      <Field id="email" label="Adresse email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          onChange={handleChange}
        />
      </Field>

      <Field id="subject" label="Sujet" error={fieldErrors.subject}>
        <Input
          id="subject"
          name="subject"
          autoComplete="off"
          placeholder="Réservation, partenariat, question…"
          maxLength={120}
          onChange={handleChange}
        />
      </Field>

      <Field id="message" label="Message" error={fieldErrors.message}>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={5000}
          placeholder="Décrivez votre demande en quelques mots."
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
            text-gray-900 placeholder:text-gray-400 shadow-xs
            transition-colors focus-visible:outline-none focus-visible:border-accent
            focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </Field>

      <Button type="submit" className="mt-2" disabled={submitting}>
        {submitting ? "Envoi en cours…" : "Envoyer le message"}
      </Button>
    </form>
  );
}
