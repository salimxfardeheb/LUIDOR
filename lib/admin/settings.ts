import { prisma } from "@/lib/prisma";
import { DEFAULT_PENDING_HOLD_HOURS } from "@/lib/bookings/availability";

/**
 * Réglages de la plateforme.
 *
 * Une seule ligne en base (`id = "platform"`). La lecture retombe sur les
 * valeurs par défaut si la ligne manque : une page de réglages ne doit jamais
 * planter parce que la configuration n'a pas encore été enregistrée, et une
 * lecture n'a pas à écrire pour se réparer.
 */

export const SETTINGS_ID = "platform";

export interface PlatformSettingsData {
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  /** Délai minimum, en jours, entre une demande et la date de l'événement. */
  bookingLeadTimeDays: number;
  /**
   * Durée, en heures, pendant laquelle une demande en attente retient sa date.
   *
   * Lue à la seule création de la demande, qui fige l'échéance obtenue dans
   * `Booking.expiresAt` : modifier ce réglage n'allonge ni ne raccourcit les
   * blocages déjà en cours.
   */
  pendingHoldHours: number;
  /** Un nouvel avis part-il en ligne sans passer par la modération ? */
  reviewAutoPublish: boolean;
  /** Coupe les nouvelles demandes de réservation le temps d'une intervention. */
  maintenanceMode: boolean;
  /** Dernière modification, au format ISO, ou `null` si jamais enregistrée. */
  updatedAt: string | null;
}

export const DEFAULT_SETTINGS: PlatformSettingsData = {
  siteName: "LIUDOR",
  tagline: "Lieux d'Or",
  contactEmail: "contact@liudor.dz",
  contactPhone: null,
  address: null,
  bookingLeadTimeDays: 2,
  pendingHoldHours: DEFAULT_PENDING_HOLD_HOURS,
  reviewAutoPublish: true,
  maintenanceMode: false,
  updatedAt: null,
};

export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) return DEFAULT_SETTINGS;

  return {
    siteName: settings.siteName,
    tagline: settings.tagline,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    address: settings.address,
    bookingLeadTimeDays: settings.bookingLeadTimeDays,
    pendingHoldHours: settings.pendingHoldHours,
    reviewAutoPublish: settings.reviewAutoPublish,
    maintenanceMode: settings.maintenanceMode,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

/**
 * Les avis doivent-ils être publiés d'emblée ?
 *
 * Isolé pour l'action de dépôt d'un avis, qui n'a besoin que de ce réglage et
 * ne doit pas dépendre de toute la configuration.
 */
export async function shouldAutoPublishReviews(): Promise<boolean> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { reviewAutoPublish: true },
  });

  return settings?.reviewAutoPublish ?? DEFAULT_SETTINGS.reviewAutoPublish;
}
