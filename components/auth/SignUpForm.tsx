"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { createUser } from "@/actions/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field, FormError } from "@/components/auth/AuthCard";
import { SubmitButton } from "@/components/auth/LoginForm";
import { homePathForRole } from "@/lib/roles";

export function SignUpForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await createUser(formData);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      setSubmitting(false);
      return;
    }

    // Compte créé : on connecte directement l'utilisateur.
    const signInResult = await signIn("credentials", {
      email: result.email,
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });

    if (!signInResult || signInResult.error) {
      // Le compte existe : on bascule sur la page de connexion.
      router.replace("/connexion");
      return;
    }

    router.replace(homePathForRole(result.role));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <FormError message={error} />}

      <Field id="fullName" label="Nom complet" error={fieldErrors.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Amina Belkacem"
          required
        />
      </Field>

      <Field id="email" label="Adresse email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
        />
      </Field>

      <Field
        id="phone"
        label="Téléphone (facultatif)"
        error={fieldErrors.phone}
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+213 6 00 00 00 00"
        />
      </Field>

      <Field id="role" label="Je suis" error={fieldErrors.role}>
        <Select id="role" name="role" defaultValue="CLIENT">
          <option value="CLIENT">Client — je cherche une salle</option>
          <option value="OWNER">Propriétaire — je propose une salle</option>
        </Select>
      </Field>

      <Field id="password" label="Mot de passe" error={fieldErrors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field
        id="confirmPassword"
        label="Confirmer le mot de passe"
        error={fieldErrors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton pending={submitting}>Créer mon compte</SubmitButton>
    </form>
  );
}
