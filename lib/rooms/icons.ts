import {
  Accessibility,
  Baby,
  BedDouble,
  Cake,
  Camera,
  CarFront,
  ChefHat,
  Disc3,
  Flower2,
  Music,
  ParkingCircle,
  Presentation,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Sun,
  UtensilsCrossed,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/**
 * Icônes des chips « Équipements » et « Services proposés ».
 *
 * Les clés reprennent les libellés stockés en base (`Equipment.name`,
 * `Service.name`). Un libellé inconnu — un propriétaire peut en ajouter —
 * retombe sur une icône neutre plutôt que de casser la grille.
 */
const EQUIPMENT_ICONS: Record<string, LucideIcon> = {
  Climatisation: Snowflake,
  "Parking privé": ParkingCircle,
  Sonorisation: Music,
  "Éclairage scénique": Sparkles,
  "Cuisine équipée": ChefHat,
  "Espace enfants": Baby,
  Wifi: Wifi,
  Vidéoprojecteur: Presentation,
  Terrasse: Sun,
  "Accès PMR": Accessibility,
  "Hébergement sur place": BedDouble,
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  Traiteur: UtensilsCrossed,
  "Décoration florale": Flower2,
  "DJ & animation": Disc3,
  Photographe: Camera,
  "Service de sécurité": ShieldCheck,
  Voiturier: CarFront,
  "Pâtisserie & gâteau": Cake,
  "Navette invités": CarFront,
};

export function equipmentIcon(name: string): LucideIcon {
  return EQUIPMENT_ICONS[name] ?? Sparkles;
}

export function serviceIcon(name: string): LucideIcon {
  return SERVICE_ICONS[name] ?? Sparkles;
}
