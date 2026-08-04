import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

/**
 * Données du compte de l'utilisateur connecté.
 *
 * Toutes les requêtes de ce module prennent `userId` et le poussent dans le
 * `where` : aucune donnée d'un autre compte ne peut remonter, quel que soit
 * l'appelant.
 */

export interface AccountProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: Date;
  /**
   * `false` pour un compte créé par un provider externe : il n'a pas de mot de
   * passe à changer, le formulaire dédié le dit plutôt que d'échouer.
   */
  hasPassword: boolean;
}

export async function getAccountProfile(
  userId: string
): Promise<AccountProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user) return null;

  const { passwordHash, ...rest } = user;
  return { ...rest, hasPassword: passwordHash !== null };
}

/**
 * Indicateur affiché en carte KPI. La clé pilote l'icône côté page : la couche
 * données ne manipule aucun composant.
 */
export type AccountKpiKey =
  | "bookings"
  | "favorites"
  | "reviews"
  | "publishedRooms"
  | "receivedBookings"
  | "receivedReviews"
  | "roomsToApprove"
  | "bookingsToVerify"
  | "messagesToHandle";

export interface AccountKpi {
  key: AccountKpiKey;
  label: string;
  value: number;
  note: string;
}

/**
 * Résumé chiffré du compte, adapté au rôle.
 *
 * Client et propriétaire ne voient que leurs propres chiffres. L'administrateur
 * voit sa file de traitement (salles à valider, paiements à vérifier, messages
 * en attente) : c'est le périmètre que son rôle lui donne déjà dans /admin, et
 * aucun de ces indicateurs n'expose de donnée personnelle d'un tiers.
 *
 * Le langage visuel est le même pour tous : seules les valeurs changent.
 */
export async function getAccountKpis(
  userId: string,
  role: Role
): Promise<AccountKpi[]> {
  const [favorites, bookings, reviews] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.booking.count({ where: { clientId: userId } }),
    prisma.review.count({ where: { clientId: userId } }),
  ]);

  const personal: AccountKpi[] = [
    {
      key: "bookings",
      label: "Réservations",
      value: bookings,
      note: "demandes envoyées depuis votre compte",
    },
    {
      key: "favorites",
      label: "Favoris",
      value: favorites,
      note: "salles mises de côté",
    },
    {
      key: "reviews",
      label: "Avis publiés",
      value: reviews,
      note: "avis laissés après un événement",
    },
  ];

  if (role === "OWNER") {
    const [publishedRooms, receivedBookings, receivedReviews] =
      await Promise.all([
        prisma.room.count({ where: { ownerId: userId, status: "ACTIVE" } }),
        prisma.booking.count({ where: { room: { ownerId: userId } } }),
        prisma.review.count({ where: { room: { ownerId: userId } } }),
      ]);

    return [
      {
        key: "publishedRooms",
        label: "Salles publiées",
        value: publishedRooms,
        note: "salles en ligne dans le catalogue",
      },
      {
        key: "receivedBookings",
        label: "Réservations reçues",
        value: receivedBookings,
        note: "demandes reçues sur vos salles",
      },
      {
        key: "receivedReviews",
        label: "Avis reçus",
        value: receivedReviews,
        note: "avis publiés sur vos salles",
      },
      personal[1],
    ];
  }

  if (role === "ADMIN") {
    const [roomsToApprove, bookingsToVerify, messagesToHandle] =
      await Promise.all([
        prisma.room.count({ where: { status: "PENDING" } }),
        prisma.booking.count({ where: { status: "EN_COURS_VERIFICATION" } }),
        prisma.contactMessage.count({ where: { readAt: null } }),
      ]);

    return [
      {
        key: "roomsToApprove",
        label: "Salles à valider",
        value: roomsToApprove,
        note: "en attente de contrôle",
      },
      {
        key: "bookingsToVerify",
        label: "Paiements à vérifier",
        value: bookingsToVerify,
        note: "réservations en cours de vérification",
      },
      {
        key: "messagesToHandle",
        label: "Messages à traiter",
        value: messagesToHandle,
        note: "messages de contact non lus",
      },
      personal[1],
    ];
  }

  return personal;
}
