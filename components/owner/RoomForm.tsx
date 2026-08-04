"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import {
  createRoom,
  updateRoom,
  type RoomFormState,
} from "@/actions/owner-rooms";
import { CheckboxCardGroup } from "@/components/owner/CheckboxCardGroup";
import {
  PhotoUploadField,
  type ExistingPhoto,
} from "@/components/owner/PhotoUploadField";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { fieldAria, FormField, FormSection } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatPrice } from "@/lib/format";
import type { RoomFormOptions, RoomFormValues } from "@/lib/owner/rooms";
import { ROOM_LIMITS, type FieldErrors } from "@/lib/rooms/schemas";

/**
 * Formulaire salle, commun à la création et à la modification.
 *
 * Une seule implémentation pour les deux écrans : seuls l'action appelée, le
 * préremplissage et les libellés changent.
 *
 * Le formulaire est branché directement sur l'action serveur via `useFormState`
 * : il fonctionne donc même sans JavaScript, et la validation qui fait autorité
 * est celle du serveur (`parseRoomForm`). Les contraintes HTML natives ne servent
 * qu'à signaler les erreurs évidentes avant l'envoi. En cas de succès, l'action
 * redirige elle-même vers la liste avec le drapeau de confirmation.
 */
export function RoomForm({
  options,
  room,
}: {
  options: RoomFormOptions;
  /** Absent en création. */
  room?: RoomFormValues;
}) {
  const isEdit = room !== undefined;

  const [state, formAction] = useFormState<RoomFormState, FormData>(
    isEdit ? updateRoom : createRoom,
    null
  );

  const fieldErrors: FieldErrors = state?.fieldErrors ?? {};
  const error = (field: string) => fieldErrors[field];

  // L'erreur globale est en tête de formulaire : on y ramène l'utilisateur.
  const alertRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (state) alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {isEdit && <input type="hidden" name="roomId" value={room.id} />}

      {state && (
        <div ref={alertRef}>
          <Alert variant="error">{state.message}</Alert>
        </div>
      )}

      <FormSection
        title="Informations générales"
        description="Ce que les clients verront en premier sur la fiche de votre salle."
      >
        <div className="grid gap-5">
          <FormField
            id="name"
            label="Nom de la salle"
            required
            error={error("name")}
            hint="Le nom commercial, tel qu'il apparaîtra dans le catalogue."
          >
            <Input
              id="name"
              name="name"
              defaultValue={room?.name ?? ""}
              maxLength={ROOM_LIMITS.name.max}
              placeholder="Palais El Djazair"
              required
              {...fieldAria("name", {
                hint: true,
                error: error("name"),
              })}
            />
          </FormField>

          <FormField
            id="description"
            label="Description"
            required
            error={error("description")}
            hint={`Espaces, ambiance, prestations incluses — ${ROOM_LIMITS.description.min} caractères minimum.`}
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={room?.description ?? ""}
              maxLength={ROOM_LIMITS.description.max}
              rows={7}
              placeholder="Décrivez la salle, ses espaces, sa capacité d'accueil et ce qui est inclus dans le tarif de base…"
              required
              {...fieldAria("description", {
                hint: true,
                error: error("description"),
              })}
            />
          </FormField>

          <FormField
            id="city"
            label="Ville"
            required
            error={error("city")}
            className="sm:max-w-xs"
          >
            <Input
              id="city"
              name="city"
              defaultValue={room?.city ?? ""}
              maxLength={ROOM_LIMITS.city.max}
              placeholder="Alger"
              autoComplete="address-level2"
              required
              {...fieldAria("city", { error: error("city") })}
            />
          </FormField>

          {/*
            Sélection multiple : une salle peut convenir à plusieurs types
            d'événement, et elle ressort alors dans chacune des catégories du
            catalogue et de la recherche.
          */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700">
              Catégories
              <span aria-hidden className="ml-0.5 text-error">
                *
              </span>
              <span className="sr-only"> (obligatoire)</span>
            </legend>
            <p id="categoryIds-hint" className="mt-1 text-xs text-gray-500">
              Cochez tous les types d&apos;événement que la salle accueille. La
              première catégorie de la liste sert de catégorie principale,
              affichée sur votre fiche.
            </p>

            <div className="mt-3">
              <CheckboxCardGroup
                name="categoryIds"
                options={options.categories.map((category) => ({
                  id: category.id,
                  label: category.name,
                }))}
                defaultSelected={room?.categoryIds}
                emptyLabel="Aucune catégorie n'est référencée pour le moment."
              />
            </div>

            {error("categoryIds") && (
              <p
                id="categoryIds-error"
                className="mt-2 text-xs font-medium text-error"
              >
                {error("categoryIds")}
              </p>
            )}
          </fieldset>

          <FormField
            id="address"
            label="Adresse"
            required
            error={error("address")}
            hint="Numéro, rue et quartier — utilisés pour situer la salle sur la carte."
          >
            <Input
              id="address"
              name="address"
              defaultValue={room?.address ?? ""}
              maxLength={ROOM_LIMITS.address.max}
              placeholder="12 boulevard Zighoud Youcef, Alger Centre"
              autoComplete="street-address"
              required
              {...fieldAria("address", {
                hint: true,
                error: error("address"),
              })}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Capacité"
        description="La fourchette d'invités que la salle peut accueillir : elle filtre les recherches des clients."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="capacityMin"
            label="Capacité minimum"
            required
            error={error("capacityMin")}
            hint="En dessous, la salle est trop grande pour l'événement."
          >
            <Input
              id="capacityMin"
              name="capacityMin"
              type="number"
              inputMode="numeric"
              min={ROOM_LIMITS.capacity.min}
              max={ROOM_LIMITS.capacity.max}
              step={1}
              defaultValue={room?.capacityMin ?? ""}
              placeholder="150"
              required
              {...fieldAria("capacityMin", {
                hint: true,
                error: error("capacityMin"),
              })}
            />
          </FormField>

          <FormField
            id="capacityMax"
            label="Capacité maximum"
            required
            error={error("capacityMax")}
            hint="Le nombre d'invités maximum admis."
          >
            <Input
              id="capacityMax"
              name="capacityMax"
              type="number"
              inputMode="numeric"
              min={ROOM_LIMITS.capacity.min}
              max={ROOM_LIMITS.capacity.max}
              step={1}
              defaultValue={room?.capacityMax ?? ""}
              placeholder="500"
              required
              {...fieldAria("capacityMax", {
                hint: true,
                error: error("capacityMax"),
              })}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Tarification"
        description="Le prix d'appel affiché sur la fiche. Les services optionnels sont facturés en plus."
      >
        <FormField
          id="basePrice"
          label="Prix de base par jour (DA)"
          required
          error={error("basePrice")}
          hint="Montant en dinars, sans espace ni symbole."
          className="sm:max-w-xs"
        >
          <Input
            id="basePrice"
            name="basePrice"
            type="number"
            inputMode="numeric"
            min={ROOM_LIMITS.price.min}
            /*
             * `step` doit rester à 1 : le navigateur n'accepte une valeur que si
             * (valeur − min) est un multiple du pas. Avec min=1 et step=1000,
             * seuls 1, 1001, 2001… passaient — un prix comme 240000 était refusé
             * par la validation native avant même l'envoi.
             */
            step={1}
            defaultValue={room?.basePrice ?? ""}
            placeholder="240000"
            required
            {...fieldAria("basePrice", {
              hint: true,
              error: error("basePrice"),
            })}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Photos"
        description="Les salles avec photos reçoivent nettement plus de demandes. La première photo sert de visuel principal."
      >
        <PhotoUploadField
          existing={room?.photos as ExistingPhoto[] | undefined}
          error={error("photos")}
        />
      </FormSection>

      <FormSection
        title="Équipements"
        description="Ce que la salle met à disposition sans supplément."
      >
        <CheckboxCardGroup
          name="equipmentIds"
          options={options.equipments.map((equipment) => ({
            id: equipment.id,
            label: equipment.name,
          }))}
          defaultSelected={room?.equipmentIds}
          emptyLabel="Aucun équipement n'est référencé pour le moment."
        />
      </FormSection>

      <FormSection
        title="Services proposés"
        description="Prestations facturées en supplément, que vous pouvez organiser pour le client."
      >
        <CheckboxCardGroup
          name="serviceIds"
          options={options.services.map((service) => ({
            id: service.id,
            label: service.name,
            detail:
              service.price > 0
                ? `À partir de ${formatPrice(service.price)}`
                : "Sur devis",
          }))}
          defaultSelected={room?.serviceIds}
          emptyLabel="Aucun service n'est référencé pour le moment."
        />
      </FormSection>

      {!isEdit && (
        <Alert variant="info">
          Votre salle sera enregistrée avec le statut{" "}
          <strong className="font-semibold">En attente de validation</strong> et
          contrôlée par l&apos;équipe LIUDOR avant sa mise en ligne.
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/owner/salles" className="sm:w-auto">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Annuler
          </Button>
        </Link>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}

/**
 * Bouton de soumission : `useFormStatus` doit être appelé dans un composant
 * enfant du `<form>`, il ne voit pas l'état depuis le composant qui rend le form.
 */
function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      <Save aria-hidden className="h-4 w-4" />
      {pending
        ? "Enregistrement…"
        : isEdit
          ? "Enregistrer les modifications"
          : "Publier la salle"}
    </Button>
  );
}
