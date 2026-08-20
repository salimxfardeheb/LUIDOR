import {
  Cake,
  Gem,
  Gift,
  Heart,
  Landmark,
  Mic,
  PartyPopper,
  Presentation,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { normalizeText } from "@/lib/utils";

/**
 * Référentiel des types d'événement, tenu dans le code et non en base.
 *
 * C'est la source unique : la grille de l'accueil, les filtres du catalogue et
 * le formulaire salle lisent tous ce tableau. Le formulaire n'a donc plus besoin
 * de la table `categories` pour s'afficher — une base neuve, un déploiement
 * avant le premier seed ou une page prérendue au build montrent la même liste.
 *
 * La table `Category` reste la clé de rattachement (`RoomCategory`) : à
 * l'enregistrement d'une salle, chaque nom retenu y est créé s'il en manque.
 * Une catégorie ajoutée à la main par un propriétaire vit donc en base sans
 * figurer ici, et c'est voulu : ce tableau décrit ce que la plateforme met en
 * avant, pas tout ce qui existe.
 */

export interface RoomCategory {
  /** Libellé affiché, et valeur écrite dans `Category.name`. */
  name: string;
  /** Valeur passée en query param (`/salles?categorie=…`). */
  slug: string;
  /** Nom d'icône conservé en base (`Category.iconSlug`). */
  iconSlug: string;
  icon: LucideIcon;
}

export const ROOM_CATEGORIES: readonly RoomCategory[] = [
  { name: "Mariage", slug: "mariage", iconSlug: "gem", icon: Gem },
  { name: "Anniversaire", slug: "anniversaire", iconSlug: "cake", icon: Cake },
  { name: "Fiançailles", slug: "fiancailles", iconSlug: "heart", icon: Heart },
  { name: "Conférence", slug: "conference", iconSlug: "mic", icon: Mic },
  {
    name: "Séminaire",
    slug: "seminaire",
    iconSlug: "presentation",
    icon: Presentation,
  },
  {
    name: "Soirée privée",
    slug: "soiree-privee",
    iconSlug: "party-popper",
    icon: PartyPopper,
  },
  { name: "Réception", slug: "reception", iconSlug: "gift", icon: Gift },
  {
    name: "Événement pro",
    slug: "evenement-pro",
    iconSlug: "landmark",
    icon: Landmark,
  },
] as const;

/** Icône attribuée à une catégorie créée depuis le formulaire salle. */
export const CUSTOM_CATEGORY_ICON_SLUG = "sparkles";
export const CustomCategoryIcon: LucideIcon = Sparkles;

/** Options prêtes pour le sélecteur du formulaire salle. */
export const CATEGORY_OPTIONS = ROOM_CATEGORIES.map((category) => ({
  value: category.name,
}));

/**
 * Retrouve une catégorie du référentiel à partir d'un libellé saisi, sans
 * accents ni casse : « mariage » et « MARIAGE » ne doivent pas créer une
 * deuxième ligne à côté de « Mariage ».
 */
export function findCategory(value: string): RoomCategory | null {
  const needle = normalizeText(value);
  if (!needle) return null;

  const match = ROOM_CATEGORIES.find(
    (category) => normalizeText(category.name) === needle
  );
  return match ?? null;
}
