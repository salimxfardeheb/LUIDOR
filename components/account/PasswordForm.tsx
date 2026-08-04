"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { KeyRound } from "lucide-react";
import { changePassword, type AccountFormState } from "@/actions/account";
import { Alert } from "@/components/ui/Alert";
import { fieldAria, FormField, FormSection } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PROFILE_LIMITS } from "@/lib/account/schemas";

/**
 * Changement de mot de passe, indépendant du formulaire d'identité : les deux
 * s'enregistrent séparément, on ne perd pas une modification de nom parce que
 * le mot de passe actuel a été mal saisi.
 *
 * Le formulaire est réinitialisé après un succès pour ne pas laisser les mots
 * de passe en clair dans les champs.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction] = useFormState<AccountFormState, FormData>(
    changePassword,
    null
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (!hasPassword) {
    return (
      <FormSection
        title="Mot de passe"
        description="Sécurité de votre connexion à LIUDOR."
      >
        <Alert variant="info">
          Votre compte se connecte via un service externe : il n&apos;a pas de
          mot de passe LIUDOR à modifier.
        </Alert>
      </FormSection>
    );
  }

  const fieldError = (field: string) =>
    state && !state.ok ? state.fieldErrors?.[field] : undefined;

  return (
    <form ref={formRef} action={formAction}>
      <FormSection
        title="Mot de passe"
        description={`Au moins ${PROFILE_LIMITS.password.min} caractères. Votre mot de passe actuel est demandé pour confirmer que c'est bien vous.`}
      >
        <div className="flex flex-col gap-5">
          {state && (
            <Alert
              variant={state.ok ? "success" : "error"}
              title={state.ok ? "Mot de passe modifié" : undefined}
            >
              {state.message}
            </Alert>
          )}

          <FormField
            id="currentPassword"
            label="Mot de passe actuel"
            required
            error={fieldError("currentPassword")}
          >
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              {...fieldAria("currentPassword", {
                error: fieldError("currentPassword"),
              })}
            />
          </FormField>

          <FormField
            id="newPassword"
            label="Nouveau mot de passe"
            required
            error={fieldError("newPassword")}
          >
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={PROFILE_LIMITS.password.min}
              maxLength={PROFILE_LIMITS.password.max}
              autoComplete="new-password"
              required
              {...fieldAria("newPassword", {
                error: fieldError("newPassword"),
              })}
            />
          </FormField>

          <FormField
            id="confirmPassword"
            label="Confirmer le nouveau mot de passe"
            required
            error={fieldError("confirmPassword")}
          >
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={PROFILE_LIMITS.password.min}
              maxLength={PROFILE_LIMITS.password.max}
              autoComplete="new-password"
              required
              {...fieldAria("confirmPassword", {
                error: fieldError("confirmPassword"),
              })}
            />
          </FormField>

          <div className="flex justify-end">
            <SubmitButton
              label="Modifier le mot de passe"
              pendingLabel="Modification…"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <KeyRound aria-hidden className="h-4 w-4" />
            </SubmitButton>
          </div>
        </div>
      </FormSection>
    </form>
  );
}
