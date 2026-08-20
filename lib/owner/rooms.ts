import type { RoomStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RateValue } from "@/lib/rooms/rates";

/**
 * Accès aux salles du portail propriétaire.
 *
 * Toutes les requêtes prennent `ownerId` et le poussent dans le `where` : le
 * cloisonnement ne dépend jamais du composant appelant. Le middleware garantit
 * déjà le rôle OWNER, il ne garantit pas *quel* propriétaire.
 */

export interface OwnerRoomListItem {
  id: string;
  name: string;
  city: string;
  basePrice: number;
  status: RoomStatus;
  photoUrl: string | null;
  categoryName: string;
  /** `null` quand la salle n'annonce pas de minimum. */
  capacityMin: number | null;
  capacityMax: number;
  photoCount: number;
  /** Réservations en cours : une salle réservée ne doit pas être désactivée à la légère. */
  activeBookingCount: number;
  createdAt: Date;
}

/** Salles du propriétaire, les plus récentes d'abord. */
export async function listOwnerRooms(
  ownerId: string
): Promise<OwnerRoomListItem[]> {
  const rooms = await prisma.room.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      basePrice: true,
      status: true,
      capacityMin: true,
      capacityMax: true,
      createdAt: true,
      category: { select: { name: true } },
      photos: { select: { url: true }, orderBy: { position: "asc" } },
      _count: {
        select: {
          bookings: {
            where: { status: { in: ["EN_ATTENTE", "EN_COURS_VERIFICATION", "CONFIRMEE"] } },
          },
        },
      },
    },
  });

  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    city: room.city,
    basePrice: Number(room.basePrice),
    status: room.status,
    photoUrl: room.photos[0]?.url ?? null,
    photoCount: room.photos.length,
    categoryName: room.category.name,
    capacityMin: room.capacityMin,
    capacityMax: room.capacityMax,
    activeBookingCount: room._count.bookings,
    createdAt: room.createdAt,
  }));
}

/** Salle telle qu'elle apparaît dans un sélecteur (calendrier, filtres). */
export interface OwnerRoomOption {
  id: string;
  name: string;
  city: string;
  status: RoomStatus;
}

/**
 * Salles du propriétaire, par ordre alphabétique, pour les sélecteurs.
 *
 * Toutes les salles sont proposées, y compris celles en attente de validation :
 * un propriétaire prépare ses disponibilités avant la mise en ligne.
 */
export async function listOwnerRoomOptions(
  ownerId: string
): Promise<OwnerRoomOption[]> {
  return prisma.room.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, status: true },
  });
}

/*
 * Le formulaire salle ne charge plus aucun référentiel : catégories,
 * équipements et prestations sont tenus dans le code (`lib/rooms/*.ts`) et
 * l'action serveur crée la ligne manquante au premier usage d'un libellé. Il
 * n'y a donc plus de `getRoomFormOptions()`.
 */

/** Valeurs de préremplissage du formulaire d'édition. */
export interface RoomFormValues {
  id: string;
  name: string;
  description: string;
  city: string;
  district: string | null;
  address: string;
  /** Libellés des catégories retenues ; le premier est la catégorie principale. */
  categoryNames: string[];
  /** `null` quand la salle n'annonce pas de minimum. */
  capacityMin: number | null;
  capacityMax: number;
  surfaceM2: number | null;
  spacesCount: number | null;
  basePrice: number;
  videoUrl: string | null;
  openingHours: string | null;
  musicPolicy: string | null;
  cancellationPolicy: string | null;
  cancellationTerms: string | null;
  depositAmount: number | null;
  cleaningFee: number | null;
  petsAllowed: boolean;
  status: RoomStatus;
  /** Équipements retenus, avec la précision saisie pour cette salle. */
  equipments: { name: string; detail: string | null }[];
  /** Prestations retenues et le tarif que la salle en demande. */
  services: { name: string; price: number | null }[];
  /** Grille tarifaire, dans l'ordre où le propriétaire l'a rangée. */
  rates: RateValue[];
  photos: { id: string; url: string }[];
}

export type OwnerRoomAccess =
  | { ok: true; room: RoomFormValues }
  /** La salle existe mais appartient à un autre propriétaire → 403. */
  | { ok: false; reason: "forbidden" }
  /** Aucune salle avec cet identifiant → 404. */
  | { ok: false; reason: "not-found" };

/**
 * Charge une salle pour édition en distinguant les deux refus possibles.
 *
 * La requête ne filtre volontairement pas sur `ownerId` : sans cette distinction
 * une salle appartenant à autrui serait indiscernable d'un identifiant inconnu,
 * et l'on ne pourrait pas répondre 403 comme demandé.
 */
export async function getOwnerRoomForEdit(
  roomId: string,
  ownerId: string
): Promise<OwnerRoomAccess> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      ownerId: true,
      name: true,
      description: true,
      city: true,
      district: true,
      address: true,
      category: { select: { name: true } },
      categories: { select: { category: { select: { name: true } } } },
      capacityMin: true,
      capacityMax: true,
      surfaceM2: true,
      spacesCount: true,
      basePrice: true,
      videoUrl: true,
      openingHours: true,
      musicPolicy: true,
      cancellationPolicy: true,
      cancellationTerms: true,
      depositAmount: true,
      cleaningFee: true,
      petsAllowed: true,
      status: true,
      equipments: {
        select: { detail: true, equipment: { select: { name: true } } },
        orderBy: { equipment: { name: "asc" } },
      },
      services: {
        select: { price: true, service: { select: { name: true } } },
        orderBy: { service: { name: "asc" } },
      },
      rates: {
        select: { label: true, detail: true, price: true, unit: true },
        orderBy: { position: "asc" },
      },
      photos: {
        select: { id: true, url: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!room) return { ok: false, reason: "not-found" };
  if (room.ownerId !== ownerId) return { ok: false, reason: "forbidden" };

  return {
    ok: true,
    room: {
      id: room.id,
      name: room.name,
      description: room.description,
      city: room.city,
      district: room.district,
      address: room.address,
      // La principale d'abord : l'ordre du formulaire détermine laquelle le
      // restera à l'enregistrement.
      categoryNames: [
        room.category.name,
        ...room.categories
          .map((link) => link.category.name)
          .filter((name) => name !== room.category.name),
      ],
      capacityMin: room.capacityMin,
      capacityMax: room.capacityMax,
      surfaceM2: room.surfaceM2,
      spacesCount: room.spacesCount,
      basePrice: Number(room.basePrice),
      videoUrl: room.videoUrl,
      openingHours: room.openingHours,
      musicPolicy: room.musicPolicy,
      cancellationPolicy: room.cancellationPolicy,
      cancellationTerms: room.cancellationTerms,
      // `Decimal` ne traverse pas la frontière serveur → client.
      depositAmount:
        room.depositAmount === null ? null : Number(room.depositAmount),
      cleaningFee: room.cleaningFee === null ? null : Number(room.cleaningFee),
      petsAllowed: room.petsAllowed,
      status: room.status,
      equipments: room.equipments.map((link) => ({
        name: link.equipment.name,
        detail: link.detail,
      })),
      services: room.services.map((link) => ({
        name: link.service.name,
        price: link.price === null ? null : Number(link.price),
      })),
      rates: room.rates.map((rate) => ({
        label: rate.label,
        detail: rate.detail,
        // `Decimal` ne traverse pas la frontière serveur → client : le
        // formulaire est un composant client.
        price: Number(rate.price),
        unit: rate.unit,
      })),
      photos: room.photos,
    },
  };
}
