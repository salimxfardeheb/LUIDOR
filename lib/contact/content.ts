import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Search,
  type LucideIcon,
} from "lucide-react";

/**
 * Contenu éditorial de la page /contact.
 *
 * Centralisé ici comme pour `lib/about/content.ts` : la page ne fait que le
 * mettre en page. Les coordonnées reprennent volontairement celles de la page
 * « À propos » — deux pages qui affichent deux numéros différents coûtent la
 * confiance qu'elles cherchent à établir.
 */

export const CONTACT_INTRO = {
  eyebrow: "Nous écrire",
  title: "Une question ? L'équipe LIUDOR vous répond",
  lead: "Réservation, publication d'une salle, partenariat ou demande de remboursement : décrivez votre besoin, une personne de l'équipe reprend le dossier et vous répond sous 24 h ouvrées.",
} as const;

export interface ContactChannel {
  title: string;
  /** Ligne principale, mise en avant (adresse email, numéro…). */
  value: string;
  /** Précision affichée sous la valeur : horaires, délai, condition d'accès. */
  hint: string;
  /** Lien direct (`mailto:`, `tel:`, cartographie) ; `null` si non cliquable. */
  href: string | null;
  /** `true` pour les liens qui quittent le site (ouverture dans un onglet). */
  external?: boolean;
  icon: LucideIcon;
}

export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  {
    title: "Email",
    value: "contact@liudor.dz",
    hint: "Réponse sous 24 h ouvrées",
    href: "mailto:contact@liudor.dz",
    icon: Mail,
  },
  {
    title: "Téléphone",
    value: "+213 770 00 00 00",
    hint: "",
    href: "tel:+213770000000",
    icon: Phone,
  },
  {
    title: "Adresse",
    value: "16 rue Didouche Mourad, Alger Centre",
    hint: "Accueil sur rendez-vous",
    href: "",
    external: true,
    icon: MapPin,
  },
] as const;

export interface OpeningSlot {
  days: string;
  hours: string;
  /** `false` pour les jours de fermeture : affichés en gris, sans pastille. */
  open: boolean;
}

/**
 * Suggestions du champ « Sujet », proposées via un `<datalist>` natif : la
 * saisie reste libre — le serveur n'attend qu'une chaîne — mais les motifs les
 * plus fréquents se remplissent en un clic, au clavier comme à la souris.
 */
export const CONTACT_SUBJECTS: readonly string[] = [
  "Réservation d'une salle",
  "Publier ma salle",
  "Question sur mon compte",
  "Annulation ou remboursement",
  "Partenariat",
  "Signaler un problème",
] as const;

/** Limites miroirs du schéma Zod de `submitContactMessage`. */
export const CONTACT_LIMITS = {
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 5000 },
} as const;

export interface ContactShortcut {
  title: string;
  description: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Deux publics, deux raccourcis : beaucoup de messages n'ont pas lieu d'être. */
export const CONTACT_SHORTCUTS: readonly ContactShortcut[] = [
  {
    title: "Vous cherchez une salle",
    description:
      "Le catalogue filtre par wilaya, capacité et budget : la réponse y est souvent immédiate.",
    href: "/salles",
    label: "Parcourir les salles",
    icon: Search,
  },
  {
    title: "Vous gérez une salle",
    description:
      "Publication gratuite, calendrier de disponibilités et suivi des demandes dans votre espace.",
    href: "/proprietaires",
    label: "Devenir partenaire",
    icon: Building2,
  },
] as const;

export interface FaqEntry {
  question: string;
  answer: string;
}

export const CONTACT_FAQ: readonly FaqEntry[] = [
  {
    question: "Comment réserver une salle ?",
    answer:
      "Parcourez le catalogue, ouvrez la fiche d'une salle et utilisez le calendrier pour vérifier la disponibilité sur vos dates. La réservation ne se fait pas en ligne : contactez ensuite le propriétaire depuis la fiche, il vous recontacte pour finaliser les dates et le règlement.",
  },
  {
    question: "Je suis propriétaire, comment publier ma salle ?",
    answer:
      "Créez un compte Propriétaire puis accédez à votre espace pour soumettre votre salle. L'équipe LIUDOR la vérifie avant de la publier, d'habitude sous 48 h.",
  },
  {
    question: "La publication d'une salle est-elle payante ?",
    answer:
      "Non : l'inscription et la publication d'une salle sur LIUDOR sont gratuites, sans frais de dossier ni abonnement.",
  },
  {
    question: "Une annulation est-elle remboursée ?",
    answer:
      "Les conditions figurent sur chaque fiche salle. En cas de question sur un remboursement précis, écrivez-nous depuis ce formulaire en précisant la référence de votre réservation.",
  },
  {
    question: "Sous quel délai obtenez-vous une réponse ?",
    answer:
      "Sous 24 h ouvrées. L'équipe traite les messages du samedi au jeudi, de 9 h à 18 h : un message envoyé le vendredi est repris dès le samedi matin.",
  },
] as const;
