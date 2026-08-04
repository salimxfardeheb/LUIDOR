"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFormState } from "react-dom";
import { Save } from "lucide-react";
import { updateProfile, type AccountFormState } from "@/actions/account";
import { AvatarUploadField } from "@/components/account/AvatarUploadField";
import { Alert } from "@/components/ui/Alert";
import { fieldAria, FormField, FormSection } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PROFILE_LIMITS } from "@/lib/account/schemas";
import type { AccountProfile } from "@/lib/account/profile";

/**
 * Formulaire d'identité : nom, téléphone et avatar.
 *
 * Branché directement sur l'action serveur via `useFormState` : il fonctionne
 * sans JavaScript, et la validation qui fait autorité est celle du serveur. Les
 * contraintes HTML ne signalent que les erreurs évidentes avant l'envoi.
 *
 * Après un succès, la session est rafraîchie (`update()`) : le nom et l'avatar
 * sont gravés dans le JWT, sans cela l'en-tête continuerait d'afficher les
 * anciennes valeurs jusqu'à la prochaine connexion.
 */
export function ProfileForm({ profile }: { profile: AccountProfile }) {
  const [state, formAction] = useFormState<AccountFormState, FormData>(
    updateProfile,
    null
  );
  const { update } = useSession();
  const router = useRouter();
  const alertRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!state) return;

    alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (state.ok) {
      void update();
      router.refresh();
    }
  }, [state, update, router]);

  const fieldError = (field: string) =>
    state && !state.ok ? state.fieldErrors?.[field] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && (
        <div ref={alertRef}>
          <Alert
            variant={state.ok ? "success" : "error"}
            title={state.ok ? "Profil mis à jour" : undefined}
          >
            {state.message}
          </Alert>
        </div>
      )}

      <FormSection
        title="Informations personnelles"
        description="Le nom affiché sur vos demandes de réservation et vos avis."
      >
        <div className="grid gap-5">
          <FormField
            id="fullName"
            label="Nom complet"
            required
            error={fieldError("fullName")}
          >
            <Input
              id="fullName"
              name="fullName"
              defaultValue={profile.fullName}
              minLength={PROFILE_LIMITS.fullName.min}
              maxLength={PROFILE_LIMITS.fullName.max}
              autoComplete="name"
              required
              {...fieldAria("fullName", { error: fieldError("fullName") })}
            />
          </FormField>

          <FormField
            id="phone"
            label="Téléphone"
            hint="Facultatif. Utilisé par le propriétaire pour vous joindre au sujet d'une réservation."
            error={fieldError("phone")}
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ""}
              maxLength={PROFILE_LIMITS.phone.max}
              placeholder="0555 12 34 56"
              autoComplete="tel"
              {...fieldAria("phone", { hint: true, error: fieldError("phone") })}
            />
          </FormField>

          <FormField
            id="email-lecture"
            label="Adresse email"
            hint="L'email identifie votre compte : contactez le support pour le modifier."
          >
            <Input
              id="email-lecture"
              value={profile.email}
              readOnly
              disabled
              {...fieldAria("email-lecture", { hint: true })}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Photo de profil"
        description="Visible par les propriétaires des salles que vous contactez."
      >
        <AvatarUploadField
          name={profile.fullName}
          currentUrl={profile.avatarUrl}
          role={profile.role}
          error={fieldError("avatar")}
        />
      </FormSection>

      <div className="flex justify-end">
        <SubmitButton
          label="Enregistrer les modifications"
          pendingLabel="Enregistrement…"
          className="w-full sm:w-auto"
        >
          <Save aria-hidden className="h-4 w-4" />
        </SubmitButton>
      </div>
    </form>
  );
}
