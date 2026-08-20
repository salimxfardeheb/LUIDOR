"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import {
  createRoom,
  updateRoom,
  type RoomFormState,
} from "@/actions/owner-rooms";
import { EquipmentField } from "@/components/owner/EquipmentField";
import { RateField } from "@/components/owner/RateField";
import { RoomFormSteps } from "@/components/owner/RoomFormSteps";
import { ServiceField } from "@/components/owner/ServiceField";
import {
  PhotoUploadField,
  type ExistingPhoto,
} from "@/components/owner/PhotoUploadField";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { fieldAria, FormField, FormSection } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  EMPTY_ROOM_FORM_PROGRESS,
  readRoomFormProgress,
  ROOM_FIELD_LABELS,
  ROOM_FORM_STEPS,
  sameProgress,
  stepButtonId,
  stepOfField,
  stepPanelId,
  type RoomFormProgress,
} from "@/lib/owner/room-form";
import type { RoomFormValues } from "@/lib/owner/rooms";
import { CATEGORY_OPTIONS } from "@/lib/rooms/categories";
import { ROOM_LIMITS, type FieldErrors } from "@/lib/rooms/schemas";
import { cn } from "@/lib/utils";
import { WILAYA_OPTIONS } from "@/lib/wilayas";

/**
 * Formulaire salle, commun à la création et à la modification.
 *
 * Une seule implémentation pour les deux écrans : seuls l'action appelée, le
 * préremplissage et les libellés changent.
 *
 * Le formulaire est branché directement sur l'action serveur via `useFormState`,
 * et la validation qui fait autorité reste celle du serveur (`parseRoomForm`) :
 * une action serveur est un point d'entrée HTTP, rien de ce qui se joue dans le
 * navigateur ne l'engage. En cas de succès, l'action redirige elle-même vers la
 * liste avec le drapeau de confirmation.
 *
 * Trois étapes, **un seul `<form>` et un seul envoi** : les étapes en retrait
 * sont masquées, jamais démontées, sinon leurs champs quitteraient le
 * `FormData` et la salle partirait amputée de tout ce qui n'est pas à l'écran.
 *
 * Le parcours par étapes exige JavaScript, ce que ce formulaire faisait déjà
 * par son champ de catégories (`MultiCombobox`). `noValidate` va dans le même
 * sens : le navigateur ne peut pas signaler un champ qu'il n'affiche pas — il
 * refuserait l'envoi sans rien dire — donc le contrôle natif est déclenché ici,
 * étape par étape.
 */
export function RoomForm({
  room,
}: {
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

  /*
   * Catégories retenues, suivies ici parce qu'un autre champ en dépend : les
   * formules tarifaires proposées ne sont pas les mêmes pour une salle des
   * fêtes et pour un espace de séminaire.
   */
  const [categoryNames, setCategoryNames] = React.useState<string[]>(
    room?.categoryNames ?? []
  );

  /*
   * La grille tarifaire n'expose qu'un bouton comme contrôle stable : seul
   * `aria-describedby` de `fieldAria` s'y applique, `aria-invalid` n'ayant pas
   * de sens sur un bouton.
   */
  const ratesDescribedBy = fieldAria("rates", {
    hint: true,
    error: error("rates"),
  })["aria-describedby"];

  /*
   * Les prestations n'exposent qu'un champ d'ajout comme contrôle stable : seul
   * `aria-describedby` s'y applique, la liste entière étant faite de cases.
   */
  const servicesDescribedBy = fieldAria("services", {
    hint: true,
    error: error("services"),
  })["aria-describedby"];

  const formRef = React.useRef<HTMLFormElement>(null);
  const existingPhotoCount = room?.photos.length ?? 0;
  const [progress, setProgress] = React.useState<RoomFormProgress>(
    EMPTY_ROOM_FORM_PROGRESS
  );

  /*
   * Avancement relu depuis le formulaire lui-même, à chaque frappe et à chaque
   * clic — un choix dans une liste ou l'ajout d'une formule n'émettent pas
   * d'événement `input`, d'où le `click`, différé d'une image pour laisser React
   * écrire ses champs cachés avant la lecture.
   *
   * La relecture est repoussée en `requestAnimationFrame` et le nouvel état
   * n'est posé que s'il diffère : une frappe qui ne change rien à la
   * progression ne provoque aucun rendu, et le formulaire reste réactif
   * (INP) même rempli.
   */
  React.useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    let frame = 0;
    const read = () => {
      const next = readRoomFormProgress(form, existingPhotoCount);
      setProgress((current) => (sameProgress(current, next) ? current : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };

    // Premier relevé sans attendre : en modification, le formulaire arrive
    // prérempli et le sommaire ne doit pas afficher un « 0 / 5 » démenti à
    // l'image suivante.
    read();

    form.addEventListener("input", schedule);
    form.addEventListener("change", schedule);
    form.addEventListener("click", schedule);

    return () => {
      cancelAnimationFrame(frame);
      form.removeEventListener("input", schedule);
      form.removeEventListener("change", schedule);
      form.removeEventListener("click", schedule);
    };
  }, [existingPhotoCount]);

  const [step, setStep] = React.useState(0);

  /**
   * Affiche une étape.
   *
   * Le rendu suivant est attendu (`requestAnimationFrame`) avant de toucher au
   * document : le panneau visé est encore masqué à l'instant du clic, on ne
   * peut ni le faire défiler ni y placer le focus.
   */
  const showStep = React.useCallback((index: number, after?: () => void) => {
    setStep(index);

    requestAnimationFrame(() => {
      if (after) {
        after();
        return;
      }

      // Retour en tête du formulaire : le fil d'étapes doit rester en vue,
      // c'est lui qui dit ce qui vient d'arriver.
      formRef.current?.scrollIntoView({ block: "start" });
      document
        .getElementById(stepPanelId(ROOM_FORM_STEPS[index].id))
        ?.focus({ preventScroll: true });
    });
  }, []);

  /** Amène au champ fautif, en révélant d'abord son étape. */
  const goToField = React.useCallback(
    (field: string) => {
      const target = document.getElementById(field);
      if (!target) return;

      const index = stepOfField(field);
      const focus = () => {
        target.scrollIntoView({ block: "center" });
        target.focus({ preventScroll: true });
      };

      if (index === null) focus();
      else showStep(index, focus);
    },
    [showStep]
  );

  /*
   * Envoi refusé par le serveur : le résumé prend le focus — défiler vers lui ne
   * servirait qu'aux voyants et laisserait le clavier à l'autre bout du
   * formulaire — et l'étape de la première erreur passe à l'écran, sans quoi le
   * résumé désignerait des champs invisibles.
   */
  const summaryRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!state) return;

    const errors = state.fieldErrors ?? {};
    const index = ROOM_FORM_STEPS.findIndex((entry) =>
      entry.fields.some((field) => errors[field] !== undefined)
    );
    if (index >= 0) setStep(index);

    summaryRef.current?.focus();
  }, [state]);

  /**
   * Premier contrôle refusé par la validation native dans `root`.
   *
   * Sert deux fois : à retenir « Suivant » sur une étape incomplète, et à
   * ramener à l'étape fautive au moment de publier.
   */
  const firstInvalid = (root: HTMLElement | null) => {
    if (!root) return null;

    const controls = root.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");

    for (const control of Array.from(controls)) {
      if (!control.checkValidity()) return control;
    }
    return null;
  };

  /** Passe à l'étape suivante, si l'étape courante est en règle. */
  const goNext = () => {
    const panel = document.getElementById(
      stepPanelId(ROOM_FORM_STEPS[step].id)
    );
    const invalid = firstInvalid(panel);

    if (invalid) {
      invalid.focus();
      invalid.reportValidity();
      return;
    }

    showStep(Math.min(step + 1, ROOM_FORM_STEPS.length - 1));
  };

  /**
   * Dernier filet avant l'envoi : un champ obligatoire laissé vide sur une
   * étape précédente ramène à celle-ci plutôt que de partir se faire refuser.
   * Le défaut du **clic** est annulé, pas celui de la soumission : c'est ce qui
   * empêche le navigateur d'envoyer le formulaire, sans dépendre de la façon
   * dont React enchaîne `onSubmit` et l'action serveur.
   */
  const guardSubmit = (event: React.MouseEvent<HTMLButtonElement>) => {
    const invalid = firstInvalid(formRef.current);
    if (!invalid) return;

    event.preventDefault();

    const panel = invalid.closest<HTMLElement>("[data-step]");
    const index = panel ? Number(panel.dataset.step) : step;

    showStep(index, () => {
      invalid.focus();
      invalid.reportValidity();
    });
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-6"
    >
      {isEdit && <input type="hidden" name="roomId" value={room.id} />}

      <RoomFormSteps
        current={step}
        onSelect={showStep}
        progress={progress}
        fieldErrors={fieldErrors}
      />

      {state && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          // `focus:` et non `focus-visible:` : la mise au point vient du code,
          // cas que l'heuristique de `focus-visible` ne retient pas.
          className="rounded-md focus:outline-none focus:ring-2 focus:ring-error/40"
        >
          <ErrorSummary
            message={state.message}
            fieldErrors={fieldErrors}
            onNavigate={goToField}
          />
        </div>
      )}

      <StepPanel index={0} current={step}>
        <FormSection
          id="bloc-informations"
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

            <DescriptionField
              defaultValue={room?.description ?? ""}
              error={error("description")}
            />

            {/*
              Wilaya choisie dans le référentiel plutôt que saisie librement : la
              recherche du catalogue filtre sur une égalité de chaîne, et « Alger »,
              « alger » et « Algers » y créaient jusqu'ici trois villes distinctes.
            */}
            <FormField
              id="city"
              label="Wilaya"
              required
              error={error("city")}
              hint="Tapez les premières lettres ou le numéro de la wilaya, puis choisissez dans la liste."
              className="sm:max-w-xs"
            >
              <Combobox
                id="city"
                name="city"
                options={WILAYA_OPTIONS}
                defaultValue={room?.city ?? ""}
                maxLength={ROOM_LIMITS.city.max}
                placeholder="Alger"
                emptyLabel="Aucune wilaya ne correspond."
                required
                {...fieldAria("city", { hint: true, error: error("city") })}
              />
            </FormField>

            {/*
              Sélection multiple : une salle peut convenir à plusieurs types
              d'événement, et elle ressort alors dans chacune des catégories du
              catalogue et de la recherche.

              La liste proposée vient du code (`lib/rooms/categories.ts`), pas de
              la base : le champ s'affiche toujours, même sur une base neuve. Un
              libellé absent de la liste peut être ajouté à la volée — l'action
              serveur crée la ligne `Category` correspondante.
            */}
            <FormField
              id="categoryNames"
              label="Catégories"
              required
              error={error("categoryNames")}
              hint={`Tapez pour filtrer, ou saisissez un type d'événement absent de la liste pour l'ajouter. ${ROOM_LIMITS.categories.max} au maximum, la première est la catégorie principale affichée sur votre fiche.`}
            >
              <MultiCombobox
                id="categoryNames"
                name="categoryNames"
                options={CATEGORY_OPTIONS}
                defaultValues={room?.categoryNames}
                onValuesChange={setCategoryNames}
                placeholder="Mariage, conférence…"
                max={ROOM_LIMITS.categories.max}
                primaryLabel="principale"
                emptyLabel="Aucune catégorie ne correspond."
                {...fieldAria("categoryNames", {
                  hint: true,
                  error: error("categoryNames"),
                })}
              />
            </FormField>

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
          id="bloc-capacite"
          title="Capacité"
          description="Le nombre d'invités que la salle peut accueillir : c'est ce qui la fait ressortir dans les recherches des clients. Le minimum ne sert qu'aux salles qui refusent les événements trop petits."
        >
          {/*
            Lignes partagées (`subgrid`) : libellés, aides et champs s'alignent
            ligne à ligne quelle que soit la longueur des textes. Sans cela,
            l'aide de la capacité minimum — plus longue d'une ligne — poussait
            son champ sous celui de la capacité maximum, et la paire penchait.
          */}
          <div className="grid gap-5 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto] sm:gap-y-1.5">
            <FormField
              id="capacityMax"
              label="Capacité maximum"
              required
              error={error("capacityMax")}
              hint="Le nombre d'invités maximum admis."
              className="sm:row-span-3 sm:grid sm:grid-rows-subgrid"
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

            {/*
              Minimum facultatif, et second : la plupart des salles n'annoncent
              qu'un plafond. Laissé vide, il ne paraît pas sur la fiche et
              n'écarte la salle d'aucune recherche.
            */}
            <FormField
              id="capacityMin"
              label="Capacité minimum"
              error={error("capacityMin")}
              hint="Facultatif, seulement si vous en imposez un."
              className="sm:row-span-3 sm:grid sm:grid-rows-subgrid"
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
                placeholder="Aucun minimum"
                {...fieldAria("capacityMin", {
                  hint: true,
                  error: error("capacityMin"),
                })}
              />
            </FormField>
          </div>
        </FormSection>

      </StepPanel>

      <StepPanel index={1} current={step}>
        <FormSection
          id="bloc-tarification"
          title="Tarification"
          description="Le prix d'appel affiché sur la fiche, puis le détail de vos formules si vos tarifs varient selon le créneau."
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

          {/*
            Grille détaillée, facultative : toutes les salles ne louent pas au
            créneau. Elle ne remplace pas le prix de base, qui reste ce que le
            catalogue affiche, trie et filtre — elle dit ce que le client paiera
            selon la formule qu'il retient.
          */}
          <div className="mt-6 border-t border-gray-200 pt-5">
            <FormField
              id="rates"
              label="Formules et créneaux"
              error={error("rates")}
              hint="Facultatif. Une ligne par formule que vous proposez : location après-midi, dîner par couvert, soirée… Le tarif est celui de votre salle, il n'est pas comparé à ceux des autres."
            >
              <RateField
                id="rates"
                defaultValues={room?.rates}
                categoryNames={categoryNames}
                aria-describedby={ratesDescribedBy}
              />
            </FormField>
          </div>
        </FormSection>

      </StepPanel>

      <StepPanel index={2} current={step}>
        <FormSection
          id="bloc-photos"
          title="Photos"
          badge="Recommandé"
          description="Les salles avec photos reçoivent nettement plus de demandes. La première photo sert de visuel principal."
        >
          <PhotoUploadField
            existing={room?.photos as ExistingPhoto[] | undefined}
            error={error("photos")}
          />
        </FormSection>

        <FormSection
          id="bloc-equipements"
          title="Équipements"
          badge="Facultatif"
          description="Ce que la salle met à disposition sans supplément. Précisez ce qui mérite de l'être : nombre de places de parking, surface de la terrasse…"
        >
          {/*
            Liste tenue dans le code (`lib/rooms/equipments.ts`) : les cases
            s'affichent sans dépendre de la table `equipments`, que l'action
            serveur alimente au premier usage de chaque libellé. Chaque équipement
            retenu peut porter une précision propre à la salle, et le propriétaire
            peut en ajouter qui ne figurent pas au référentiel.
          */}
          <EquipmentField defaultValues={room?.equipments} />
        </FormSection>

        <FormSection
          id="bloc-services"
          title="Services proposés"
          badge="Facultatif"
          description="Prestations facturées en supplément, que vous pouvez organiser pour le client."
        >
          <FormField
            id="services"
            label="Prestations"
            error={error("services")}
            hint="Cochez ce que vous proposez et fixez votre tarif — celui de votre salle, pas une moyenne. Laissez le montant vide pour l'afficher « sur devis ». Une prestation absente de la liste peut être ajoutée en bas."
          >
            <ServiceField
              id="services"
              defaultValues={room?.services}
              aria-describedby={servicesDescribedBy}
            />
          </FormField>
        </FormSection>

        {!isEdit && (
          <Alert variant="info">
            Votre salle sera enregistrée avec le statut{" "}
            <strong className="font-semibold">En attente de validation</strong> et
            contrôlée par l&apos;équipe LIUDOR avant sa mise en ligne.
          </Alert>
        )}
      </StepPanel>

      <FormActions
        isEdit={isEdit}
        step={step}
        progress={progress}
        onPrevious={() => showStep(step - 1)}
        onNext={goNext}
        onSubmitClick={guardSubmit}
      />
    </form>
  );
}

/**
 * Panneau d'une étape.
 *
 * Masqué, jamais démonté : ses champs doivent rester dans le `FormData`, la
 * salle partant en un seul envoi. L'attribut `hidden` le retire de l'arbre
 * d'accessibilité et de l'ordre de tabulation ; la classe fait le reste, car
 * une utilitaire d'affichage (`flex`) l'emporterait sur le `display: none` que
 * l'attribut seul apporte.
 *
 * `data-step` permet de remonter d'un champ refusé jusqu'à l'étape qui le
 * porte, au moment de publier.
 */
function StepPanel({
  index,
  current,
  children,
}: {
  index: number;
  current: number;
  children: React.ReactNode;
}) {
  const step = ROOM_FORM_STEPS[index];
  const active = index === current;

  return (
    <div
      id={stepPanelId(step.id)}
      role="group"
      // Nommé par son onglet dans le fil : le titre de l'étape n'est écrit
      // qu'une fois, et le panneau ne le répète pas à l'écran.
      aria-labelledby={stepButtonId(step.id)}
      data-step={index}
      tabIndex={-1}
      hidden={!active}
      className={cn(
        "flex-col gap-6 focus:outline-none",
        active ? "flex" : "hidden"
      )}
    >
      <p className="text-sm text-gray-500">{step.description}</p>
      {children}
    </div>
  );
}

/**
 * Description avec compteur de caractères.
 *
 * Le minimum de 60 caractères est une règle serveur : sans repère à la saisie,
 * on ne le découvre qu'au refus, après avoir rempli trente champs. Le compteur
 * est `aria-hidden` — la contrainte est déjà dans l'aide du champ, reliée par
 * `aria-describedby`, et un lecteur d'écran n'a pas à entendre un décompte à
 * chaque frappe.
 *
 * Composant à part pour que la frappe ne rende que lui : le formulaire entier
 * n'a aucune raison d'être recalculé à chaque caractère.
 */
function DescriptionField({
  defaultValue,
  error,
}: {
  defaultValue: string;
  error?: string;
}) {
  const [length, setLength] = React.useState(defaultValue.length);
  const { min, max } = ROOM_LIMITS.description;
  const missing = Math.max(0, min - length);

  return (
    <FormField
      id="description"
      label="Description"
      required
      error={error}
      hint={`Espaces, ambiance, prestations incluses — ${min} caractères minimum.`}
    >
      <Textarea
        id="description"
        name="description"
        defaultValue={defaultValue}
        onChange={(event) => setLength(event.target.value.length)}
        maxLength={max}
        rows={7}
        placeholder="Décrivez la salle, ses espaces, sa capacité d'accueil et ce qui est inclus dans le tarif de base…"
        required
        {...fieldAria("description", { hint: true, error })}
      />
      <p
        aria-hidden
        className={cn(
          "text-right text-xs tabular-nums",
          missing > 0 ? "text-gray-400" : "text-success"
        )}
      >
        {missing > 0
          ? `Encore ${missing} caractère${missing > 1 ? "s" : ""}`
          : `${length} / ${max} caractères`}
      </p>
    </FormField>
  );
}

/**
 * Résumé des erreurs renvoyées par le serveur.
 *
 * Un simple « certains champs sont invalides » oblige à parcourir trois étapes
 * à la recherche du texte rouge. La liste nomme chaque champ fautif et y mène,
 * en révélant au passage l'étape qui le porte : c'est le motif « error
 * summary » des pratiques WAI-ARIA, et le seul moyen de traiter un refus au
 * clavier sans chercher.
 *
 * Les entrées suivent l'ordre du formulaire, pas celui — indifférent — dans
 * lequel le validateur a rencontré les problèmes.
 */
function ErrorSummary({
  message,
  fieldErrors,
  onNavigate,
}: {
  message: string;
  fieldErrors: FieldErrors;
  /** Révèle l'étape du champ fautif et y place le focus. */
  onNavigate: (field: string) => void;
}) {
  const entries = ROOM_FORM_STEPS.flatMap((step) =>
    step.fields
      .filter((field) => fieldErrors[field] !== undefined)
      .map((field) => ({ field, message: fieldErrors[field] }))
  );

  /*
   * Le saut est repris à la main : le champ visé dort peut-être dans une étape
   * masquée, où l'ancre du navigateur ne mènerait à rien de visible.
   */
  const focusField =
    (field: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onNavigate(field);
    };

  return (
    <Alert variant="error" title={message}>
      {entries.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.field}>
              <a
                href={`#${entry.field}`}
                onClick={focusField(entry.field)}
                className="rounded-sm underline decoration-error/40 underline-offset-2 hover:decoration-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
              >
                <span className="font-medium text-gray-900">
                  {ROOM_FIELD_LABELS[entry.field] ?? entry.field}
                </span>{" "}
                — {entry.message}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Alert>
  );
}

/**
 * Pied de formulaire : où l'on en est, et par où continuer.
 *
 * Collant en bas de la colonne : les actions ne doivent pas se mériter au
 * défilement. `useFormStatus` est appelé ici parce qu'il ne renseigne que les
 * composants enfants du `<form>`.
 *
 * En création, publier n'est proposé qu'à la dernière étape — le parcours guide
 * jusqu'au bout. En modification, l'enregistrement est offert à chaque étape :
 * corriger un prix ne doit pas obliger à traverser le formulaire entier.
 */
function FormActions({
  isEdit,
  step,
  progress,
  onPrevious,
  onNext,
  onSubmitClick,
}: {
  isEdit: boolean;
  step: number;
  progress: RoomFormProgress;
  onPrevious: () => void;
  onNext: () => void;
  onSubmitClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();

  const total = ROOM_FORM_STEPS.length;
  const last = step === total - 1;
  const current = ROOM_FORM_STEPS[step];
  const { filled, required } = progress[current.id];
  const missing = Math.max(0, required - filled);

  const message = pending
    ? "Enregistrement en cours…"
    : missing > 0
      ? `${missing} champ${missing > 1 ? "s" : ""} à renseigner sur cette étape`
      : `Étape ${step + 1} sur ${total} · ${current.label}`;

  return (
    <div className="sticky bottom-4 z-10 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/*
          Zone vivante : l'avancement et la mise en attente sont annoncés au
          lecteur d'écran sans lui voler le focus.
        */}
        <p aria-live="polite" className="px-1 text-sm text-gray-500">
          {message}
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {step === 0 ? (
            <Link href="/owner/salles">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              className="w-full sm:w-auto"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Précédent
            </Button>
          )}

          {!last && (
            <Button type="button" onClick={onNext} className="w-full sm:w-auto">
              Suivant
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Button>
          )}

          {(last || isEdit) && (
            <Button
              type="submit"
              disabled={pending}
              /*
               * Le contrôle se fait sur le clic : annuler son défaut suffit à
               * retenir la soumission, sans dépendre de la manière dont React
               * enchaîne `onSubmit` et l'action serveur.
               */
              onClick={onSubmitClick}
              // Hors dernière étape (modification seule), l'enregistrement est
              // une sortie possible, pas l'action attendue : il reste discret.
              variant={last ? "primary" : "outline"}
              className="w-full sm:w-auto"
            >
              <Save aria-hidden className="h-4 w-4" />
              {pending
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer"
                  : "Publier la salle"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
