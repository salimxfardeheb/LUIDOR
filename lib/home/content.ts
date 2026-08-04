import {
  BadgeCheck,
  CalendarClock,
  Cake,
  Church,
  Gem,
  Gift,
  Headphones,
  Heart,
  Landmark,
  Mic,
  PartyPopper,
  Presentation,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Contenu éditorial de la page d'accueil.
 *
 * Les catégories reprennent les libellés attendus en base (`categories.name`) :
 * elles servent aussi bien à l'affichage qu'aux liens de filtrage `?categorie=`.
 */

export interface HomeCategory {
  /** Libellé affiché, aligné sur `Category.name`. */
  name: string;
  /** Valeur passée en query param (`/salles?categorie=…`). */
  slug: string;
  icon: LucideIcon;
}

export const CATEGORIES: readonly HomeCategory[] = [
  { name: "Mariage", slug: "mariage", icon: Gem },
  { name: "Anniversaire", slug: "anniversaire", icon: Cake },
  { name: "Fiançailles", slug: "fiancailles", icon: Heart },
  { name: "Conférence", slug: "conference", icon: Mic },
  { name: "Séminaire", slug: "seminaire", icon: Presentation },
  { name: "Baptême", slug: "bapteme", icon: Church },
  { name: "Soirée privée", slug: "soiree-privee", icon: PartyPopper },
  { name: "Réception", slug: "reception", icon: Gift },
  { name: "Événement pro", slug: "evenement-pro", icon: Landmark },
] as const;

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

export interface HomeTestimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
  /** Initiales affichées dans l'avatar (aucune photo réelle à ce stade). */
  initials: string;
}

export const TESTIMONIALS: readonly HomeTestimonial[] = [
  {
    id: "amina",
    name: "Amina Belkacem",
    role: "Mariage · Alger",
    rating: 5,
    quote:
      "Nous avons trouvé et réservé notre salle en une soirée. Les photos correspondaient exactement à la réalité, aucune mauvaise surprise le jour J.",
    initials: "AB",
  },
  {
    id: "karim",
    name: "Karim Haddad",
    role: "Séminaire · Oran",
    rating: 5,
    quote:
      "L'équipe a vérifié le paiement et confirmé la réservation en quelques heures. Un vrai gain de temps pour organiser notre séminaire annuel.",
    initials: "KH",
  },
  {
    id: "lynda",
    name: "Lynda Meziane",
    role: "Anniversaire · Constantine",
    rating: 4,
    quote:
      "Les avis des autres clients m'ont vraiment aidée à choisir. La salle était conforme et le propriétaire très réactif sur la plateforme.",
    initials: "LM",
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
