import {
  BadgeCheck,
  CalendarClock,
  Headphones,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ROOM_CATEGORIES, type RoomCategory } from "@/lib/rooms/categories";

/**
 * Contenu éditorial de la page d'accueil.
 */

/**
 * Les catégories ne sont plus définies ici : elles viennent du référentiel
 * partagé `lib/rooms/categories.ts`, que le formulaire salle utilise aussi.
 * Une seule liste à tenir, donc aucune divergence possible entre la grille de
 * l'accueil, les filtres du catalogue et ce que les propriétaires peuvent
 * cocher.
 */
export type HomeCategory = RoomCategory;

export const CATEGORIES: readonly HomeCategory[] = ROOM_CATEGORIES;

/** Villes mises en avant. Le nombre de salles est calculé côté serveur. */
export interface HomeDestination {
  city: string;
  /**
   * Chemin de la photo dans /public, ou `null` tant qu'aucun visuel n'est
   * fourni : la carte affiche alors un dégradé de marque (`PhotoFallback`).
   * Format conseillé : portrait 3/4, ~800 × 1000 px.
   */
  image: string | null;
}

export const DESTINATIONS: readonly HomeDestination[] = [
  { city: "Alger", image: "/wilayas/alger.jpg" },
  { city: "Oran", image: "/wilayas/oran.jpg" },
  { city: "Constantine", image: "/wilayas/constantine.jpg" },
  { city: "Annaba", image: "/wilayas/annaba.jpg" },
  { city: "Sétif", image: "/wilayas/setif.jpg" },
] as const;

export interface HomeFeature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FEATURES: readonly HomeFeature[] = [
  {
    title: "Réservation rapide",
    description:
      "Comparez les disponibilités et envoyez votre demande en moins de trois minutes.",
    icon: Zap,
  },
  {
    title: "Paiement sécurisé",
    description:
      "Chaque règlement est vérifié et enregistré par l'équipe LIUDOR avant confirmation.",
    icon: ShieldCheck,
  },
  {
    title: "Avis vérifiés",
    description:
      "Seuls les clients ayant réellement réservé la salle peuvent laisser une note.",
    icon: BadgeCheck,
  },
  {
    title: "Annulation flexible",
    description:
      "Conditions claires affichées sur chaque salle, sans frais cachés de dernière minute.",
    icon: CalendarClock,
  },
  {
    title: "Support 7j/7",
    description:
      "Une équipe joignable tous les jours pour suivre votre dossier jusqu'à l'événement.",
    icon: Headphones,
  },
] as const;

/** Types d'événement proposés dans la barre de recherche. */
export const EVENT_TYPES: readonly string[] = CATEGORIES.map((c) => c.name);

/**
 * Photos de fond du hero, jouées en diaporama dans cet ordre.
 *
 * Déposer les fichiers dans /public/hero (paysage, ~1920 × 1080 px suffisent :
 * `next/image` réencode à la volée). Une seule entrée affiche une photo fixe,
 * une liste vide retombe sur le dégradé de marque.
 */
export const HERO_IMAGES: readonly string[] = [
  "/hero/wedding.jpg",
  "/hero/conference.jpg",
  "/hero/conference2.jpg",
] as const;
