"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Quote, Save, Star } from "lucide-react";
import {
  saveTestimonial,
  type TestimonialFormState,
} from "@/actions/admin-testimonials";
import {
  QUOTE_MAX_LENGTH,
  QUOTE_MIN_LENGTH,
  RATING_MAX,
  RATING_MIN,
  type AdminTestimonial,
} from "@/lib/admin/testimonials";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { fieldAria, FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Textarea";
import { formatInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const RATINGS = Array.from(
  { length: RATING_MAX - RATING_MIN + 1 },
  (_, index) => RATING_MAX - index
);

/**
 * Éditeur d'un témoignage, avec l'aperçu de la carte telle qu'elle paraîtra.
 *
 * L'aperçu n'est pas cosmétique : la carte de l'accueil tronque peu, mais elle
 * met la citation en avant, et une phrase qui semble courte dans un champ de
 * saisie peut déséquilibrer la rangée. Le voir pendant la frappe évite
 * l'aller-retour publier / regarder / corriger.
 */
export function TestimonialEditor({
  testimonial,
  /** Position proposée à la création : après le dernier témoignage existant. */
  suggestedPosition,
}: {
  testimonial: AdminTestimonial | null;
  suggestedPosition: number;
}) {
  const [state, formAction] = useFormState<TestimonialFormState, FormData>(
    saveTestimonial,
    null
  );

  const [authorName, setAuthorName] = React.useState(
    testimonial?.authorName ?? ""
  );
  const [role, setRole] = React.useState(testimonial?.role ?? "");
  const [rating, setRating] = React.useState(String(testimonial?.rating ?? 5));
  const [quote, setQuote] = React.useState(testimonial?.quote ?? "");

  const fieldErrors = state?.ok === false ? (state.fieldErrors ?? {}) : {};
  const remaining = QUOTE_MAX_LENGTH - quote.length;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {testimonial && (
        <input type="hidden" name="testimonialId" value={testimonial.id} />
      )}

      {state?.ok === false && (
        <Alert variant="error" title="Le témoignage n'a pas été enregistré">
          {state.message}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="authorName"
                label="Nom affiché"
                hint="Les initiales de l'avatar en sont dérivées."
                error={fieldErrors.authorName}
                required
              >
                <Input
                  id="authorName"
                  name="authorName"
                  maxLength={80}
                  value={authorName}
                  placeholder="Amina Belkacem"
                  onChange={(event) => setAuthorName(event.target.value)}
                  {...fieldAria("authorName", {
                    hint: true,
                    error: fieldErrors.authorName,
                  })}
                />
              </FormField>

              <FormField
                id="role"
                label="Contexte"
                hint="Type d'événement et ville, séparés par « · »."
                error={fieldErrors.role}
                required
              >
                <Input
                  id="role"
                  name="role"
                  maxLength={80}
                  value={role}
                  placeholder="Mariage · Alger"
                  onChange={(event) => setRole(event.target.value)}
                  {...fieldAria("role", { hint: true, error: fieldErrors.role })}
                />
              </FormField>
            </div>

            <FormField
              id="quote"
              label="Témoignage"
              hint={`De ${QUOTE_MIN_LENGTH} à ${QUOTE_MAX_LENGTH} caractères. Les guillemets sont ajoutés à l'affichage.`}
              error={fieldErrors.quote}
              required
            >
              <Textarea
                id="quote"
                name="quote"
                rows={6}
                maxLength={QUOTE_MAX_LENGTH}
                value={quote}
                placeholder="Nous avons trouvé et réservé notre salle en une soirée…"
                onChange={(event) => setQuote(event.target.value)}
                {...fieldAria("quote", { hint: true, error: fieldErrors.quote })}
              />
              <p
                aria-live="polite"
                className={cn(
                  "text-xs",
                  quote.length < QUOTE_MIN_LENGTH
                    ? "text-gray-500"
                    : "text-gray-400"
                )}
              >
                {quote.length < QUOTE_MIN_LENGTH
                  ? `Encore ${QUOTE_MIN_LENGTH - quote.length} caractère${
                      QUOTE_MIN_LENGTH - quote.length > 1 ? "s" : ""
                    } avant le minimum.`
                  : `${remaining} caractère${remaining > 1 ? "s" : ""} restant${
                      remaining > 1 ? "s" : ""
                    }.`}
              </p>
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="rating"
                label="Note affichée"
                error={fieldErrors.rating}
                required
              >
                <Select
                  id="rating"
                  name="rating"
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  {...fieldAria("rating", { error: fieldErrors.rating })}
                >
                  {RATINGS.map((value) => (
                    <option key={value} value={value}>
                      {value} étoile{value > 1 ? "s" : ""} sur {RATING_MAX}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                id="position"
                label="Ordre d'affichage"
                hint="Le plus petit apparaît en premier sur l'accueil."
                error={fieldErrors.position}
              >
                <Input
                  id="position"
                  name="position"
                  type="number"
                  min={0}
                  max={999}
                  step={1}
                  inputMode="numeric"
                  defaultValue={testimonial?.position ?? suggestedPosition}
                  {...fieldAria("position", {
                    hint: true,
                    error: fieldErrors.position,
                  })}
                />
              </FormField>
            </div>
          </Card>

          <div className="flex justify-end">
            <SubmitButton
              label={
                testimonial ? "Enregistrer les modifications" : "Créer le témoignage"
              }
              pendingLabel="Enregistrement…"
            >
              <Save aria-hidden className="h-4 w-4" />
            </SubmitButton>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Aperçu sur l&apos;accueil
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {testimonial?.publishedAt
                ? "Ce témoignage est en ligne : l'enregistrement met la carte à jour."
                : "Visible uniquement après publication."}
            </p>

            <Preview
              authorName={authorName}
              role={role}
              rating={Number(rating)}
              quote={quote}
            />
          </div>
        </div>
      </div>
    </form>
  );
}

/** Réplique de la carte de `TestimonialsCarousel`, alimentée par la saisie. */
function Preview({
  authorName,
  role,
  rating,
  quote,
}: {
  authorName: string;
  role: string;
  rating: number;
  quote: string;
}) {
  return (
    <figure className="mt-3 flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <Quote aria-hidden className="h-7 w-7 text-secondary/40" />

      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700">
        <p className={cn(!quote && "italic text-gray-400")}>
          {quote ? `« ${quote} »` : "Le témoignage apparaîtra ici."}
        </p>
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white"
        >
          {formatInitials(authorName) || "?"}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm font-semibold",
              authorName ? "text-gray-900" : "italic text-gray-400"
            )}
          >
            {authorName || "Nom affiché"}
          </span>
          <span
            className={cn(
              "block truncate text-xs",
              role ? "text-gray-500" : "italic text-gray-400"
            )}
          >
            {role || "Contexte"}
          </span>
          <span className="mt-1 flex items-center gap-0.5">
            <span className="sr-only">{rating} étoiles sur 5</span>
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                aria-hidden
                className={cn(
                  "h-3.5 w-3.5",
                  index < rating
                    ? "fill-secondary text-secondary"
                    : "text-gray-300"
                )}
              />
            ))}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
