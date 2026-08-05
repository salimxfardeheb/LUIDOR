import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  FileSearch,
  Handshake,
  HeartHandshake,
  Mail,
  MapPin,
  MessagesSquare,
  Phone,
  Scale,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Contenu éditorial de la page « À propos ».
 *
 * Entièrement statique et centralisé ici : la page ne fait que le mettre en
 * page. Une correction de texte se fait donc dans ce seul fichier, sans
 * toucher au JSX.
 */

export const ABOUT_INTRO = {
  eyebrow: "Lieux d'Or",
  title: "La plateforme qui remet la confiance au centre de la réservation",
  description:
    "LIUDOR rassemble les salles des fêtes d'Algérie au même endroit : des fiches complètes, des propriétaires identifiés et des avis laissés par de vrais clients. Objectif : que réserver une salle devienne aussi simple et sûr que réserver un hôtel.",
} as const;

/** Chiffres d'ancrage affichés sous l'introduction. */
export interface AboutStat {
  value: string;
  label: string;
}

export const ABOUT_STATS: readonly AboutStat[] = [
  { value: "48 wilayas", label: "couvertes par la plateforme" },
  { value: "100 %", label: "des salles vérifiées avant publication" },
  { value: "24 h", label: "de délai de réponse de l'équipe" },
  { value: "0 DA", label: "de frais d'inscription pour les propriétaires" },
] as const;

export interface AboutPillar {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const MISSION = {
  title: "Notre mission",
  lead: "Rendre la recherche d'une salle des fêtes claire, comparable et sans mauvaise surprise.",
  paragraphs: [
    "Organiser un mariage, un baptême ou un séminaire commence presque toujours par la même épreuve : appeler une dizaine de salles, demander les mêmes informations, comparer des prix annoncés de mémoire. LIUDOR remplace ce parcours par des fiches homogènes — capacité, équipements, services, conditions d'annulation, disponibilités — où tout se compare d'un coup d'œil.",
    "Côté propriétaires, la plateforme offre une vitrine sérieuse et un espace de gestion : publication des salles, calendrier de disponibilités, suivi des demandes de réservation. Chacun garde la maîtrise de son agenda et de ses tarifs.",
  ],
  pillars: [
    {
      title: "Transparence",
      description:
        "Prix d'appel, capacité réelle et conditions d'annulation affichés sur chaque fiche, avant toute prise de contact.",
      icon: Scale,
    },
    {
      title: "Confiance",
      description:
        "Salles contrôlées par notre équipe et avis réservés aux clients ayant réellement réservé.",
      icon: ShieldCheck,
    },
    {
      title: "Proximité",
      description:
        "Une équipe algérienne, joignable, qui connaît les usages et accompagne les deux parties jusqu'à l'événement.",
      icon: HeartHandshake,
    },
  ] satisfies readonly AboutPillar[],
} as const;

export interface StoryMilestone {
  year: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const STORY = {
  title: "Notre histoire",
  lead: "Née d'un mariage mal préparé, devenue la référence des lieux de réception en Algérie.",
  milestones: [
    {
      year: "2023",
      title: "Le constat",
      description:
        "Après des semaines passées à courir les salles pour un mariage de famille, l'équipe fondatrice fait le même constat que tout le monde : aucune information fiable en ligne, aucun moyen de comparer.",
      icon: Sparkles,
    },
    {
      year: "2024",
      title: "Les premières salles",
      description:
        "Une trentaine de propriétaires d'Alger acceptent de jouer le jeu : photos, tarifs et disponibilités réels. Le format de la fiche salle LIUDOR est né de ces échanges.",
      icon: Building2,
    },
    {
      year: "2025",
      title: "La charte de vérification",
      description:
        "Formalisation du contrôle avant publication : documents du propriétaire, conformité des photos, cohérence des capacités annoncées.",
      icon: BadgeCheck,
    },
    {
      year: "2026",
      title: "Une couverture nationale",
      description:
        "Ouverture progressive à l'ensemble des wilayas, avec les réservations en ligne et le suivi des demandes depuis l'espace client.",
      icon: Handshake,
    },
  ] satisfies readonly StoryMilestone[],
} as const;

export interface VerificationStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const VERIFICATION = {
  title: "Notre processus de vérification des salles",
  lead: "Aucune salle n'apparaît au catalogue sans être passée par ces quatre étapes.",
  steps: [
    {
      title: "Identité du propriétaire",
      description:
        "Compte professionnel vérifié : pièce d'identité, coordonnées joignables et justificatif de gestion du lieu.",
      icon: FileSearch,
    },
    {
      title: "Contrôle de la fiche",
      description:
        "Photos réelles et récentes, capacité cohérente avec la surface annoncée, équipements et services conformes à la réalité du lieu.",
      icon: ScanSearch,
    },
    {
      title: "Conditions commerciales",
      description:
        "Tarifs, acompte, frais de ménage et politique d'annulation relus par l'équipe pour qu'aucun coût ne surgisse après la réservation.",
      icon: Scale,
    },
    {
      title: "Suivi après publication",
      description:
        "Avis clients surveillés, signalements traités et salle suspendue dès qu'un écart durable est constaté avec l'annonce.",
      icon: CalendarCheck,
    },
  ] satisfies readonly VerificationStep[],
  /** Engagements courts listés en regard des étapes. */
  commitments: [
    "Une salle non vérifiée n'est jamais publiée.",
    "Les avis proviennent uniquement de réservations confirmées.",
    "Aucune mise en avant payante ne modifie le classement des salles.",
    "Toute salle signalée est réexaminée sous 48 h.",
  ],
} as const;

export interface ContactChannel {
  title: string;
  value: string;
  /** Lien direct (`mailto:`, `tel:`) ou route interne ; `null` si non cliquable. */
  href: string | null;
  icon: LucideIcon;
}

export const ABOUT_CONTACT = {
  title: "Contact",
  lead: "Une question sur une salle, un partenariat ou votre compte ? L'équipe répond sous 24 h ouvrées.",
  channels: [
    {
      title: "Email",
      value: "contact@liudor.dz",
      href: "mailto:contact@liudor.dz",
      icon: Mail,
    },
    {
      title: "Téléphone",
      value: "+213 770 00 00 00",
      href: "tel:+213770000000",
      icon: Phone,
    },
    {
      title: "Adresse",
      value: "16 rue Didouche Mourad, Alger Centre",
      href: null,
      icon: MapPin,
    },
    {
      title: "Formulaire",
      value: "Écrire à l'équipe LIUDOR",
      href: "/contact",
      icon: MessagesSquare,
    },
  ] satisfies readonly ContactChannel[],
  /** Deux publics, deux points d'entrée. */
  actions: [
    {
      title: "Vous organisez un événement",
      description:
        "Parcourez les salles vérifiées et envoyez votre demande en quelques minutes.",
      href: "/salles",
      label: "Voir les salles",
      icon: Users,
    },
    {
      title: "Vous gérez une salle",
      description:
        "Publiez votre lieu gratuitement et recevez des demandes qualifiées.",
      href: "/inscription",
      label: "Devenir partenaire",
      icon: Building2,
    },
  ],
} as const;
