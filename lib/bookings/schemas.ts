import { z } from "zod";
import { fieldErrorsFrom, text, type ParseResult } from "@/lib/forms";

/**
 * Validation de la demande de réservation envoyée depuis la fiche salle.
 *
 * Aucune réservation ne se prend en ligne : ce formulaire crée une demande
 * `EN_ATTENTE` que l'équipe LIUDOR reprend depuis /admin/reservations. Les
 * bornes sont exportées pour que le formulaire pose les mêmes attributs HTML
 * que ceux vérifiés ici — le serveur restant seul à faire autorité.
 */

export const BOOKING_REQUEST_LIMITS = {
  eventType: { min: 2, max: 60 },
  phone: { min: 6, max: 20 },
  guests: { min: 1, max: 5000 },
} as const;

/** `YYYY-MM-DD`, tel que produit par un `<input type="date">`. */
const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date de votre événement.");

export const bookingRequestSchema = z.object({
  roomId: z.string().min(1, "Salle introuvable."),
  eventType: z
    .string()
    .min(BOOKING_REQUEST_LIMITS.eventType.min, "Précisez le type d'événement.")
    .max(BOOKING_REQUEST_LIMITS.eventType.max, "Ce libellé est trop long."),
  eventDate: isoDateField,
  guestsCount: z
    .number()
    .int("Indiquez un nombre d'invités entier.")
    .min(BOOKING_REQUEST_LIMITS.guests.min, "Indiquez le nombre d'invités.")
    .max(BOOKING_REQUEST_LIMITS.guests.max, "Ce nombre d'invités est irréaliste."),
  // Obligatoire, contrairement au téléphone du profil : c'est par là que
  // l'équipe rappelle le client pour confirmer.
  contactPhone: z
    .string()
    .regex(/^[0-9+\s().-]{6,20}$/, "Numéro de téléphone invalide."),
  contactEmail: z.string().toLowerCase().email("Adresse email invalide."),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export function parseBookingRequestForm(
  formData: FormData
): ParseResult<BookingRequestInput> {
  const guests = text(formData.get("guestsCount"));

  const parsed = bookingRequestSchema.safeParse({
    roomId: text(formData.get("roomId")),
    eventType: text(formData.get("eventType")),
    eventDate: text(formData.get("eventDate")),
    // `Number("")` vaut 0 : on force un NaN pour obtenir le message métier.
    guestsCount: guests === "" ? Number.NaN : Number(guests),
    contactPhone: text(formData.get("contactPhone")),
    contactEmail: text(formData.get("contactEmail")),
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    message: "Vérifiez les informations saisies.",
    fieldErrors: fieldErrorsFrom(parsed.error),
  };
}
