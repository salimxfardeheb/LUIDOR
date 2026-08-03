"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field, FormError } from "@/components/auth/AuthCard";
import { resolveRedirect } from "@/lib/roles";

/** Messages d'erreur renvoyés soit par Auth.js, soit par le middleware. */
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email ou mot de passe incorrect.",
  AccessDenied: "Votre compte n'a pas accès à cette page.",
  SessionRequired: "Connectez-vous pour accéder à cette page.",
};

function errorMessage(code: string) {
  return ERROR_MESSAGES[code] ?? "La connexion a échoué. Réessayez.";
}

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const router = useRouter();
  // Reste à `true` après succès : la navigation prend le relais.
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? errorMessage(initialError) : null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });

    if (!result || result.error) {
      setError(errorMessage(result?.error ?? "CredentialsSignin"));
      setSubmitting(false);
      return;
    }

    // `redirect: false` ne renvoie pas le rôle : on relit la session fraîche
    // pour choisir la page d'atterrissage.
    const session = await getSession();
    router.replace(resolveRedirect(callbackUrl, session?.user?.role));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <FormError message={error} />}

      <Field id="email" label="Adresse email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
        />
      </Field>

      <Field id="password" label="Mot de passe">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton pending={submitting}>Se connecter</SubmitButton>
    </form>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" className="mt-2 w-full" disabled={pending}>
      {pending ? "Un instant…" : children}
    </Button>
  );
}
