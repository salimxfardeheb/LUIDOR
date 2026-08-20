import type { ModerationAction, RoomStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasEquipment, SUMMARY_EQUIPMENTS } from "@/lib/rooms/equipments";
import type { RateValue } from "@/lib/rooms/rates";

/**
 * Lectures de la file de validation des salles.
 *
 * La page `/admin/salles` ne montre que les dossiers à traiter (`PENDING`) et
 * le journal des décisions déjà prises : c'est un poste de travail, pas un
 * catalogue. Le catalogue complet reste celui du site public.
 */

/** Vignettes présentées dans la file d'attente, par dossier. */
const PREVIEW_PHOTOS = 4;

/** Décisions affichées dans l'historique. */
export const HISTORY_LIMIT = 20;

export interface PendingRoomOwner {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  /** Salles déjà en ligne du même propriétaire : un dossier n'arrive pas seul. */
  activeRoomsCount: number;
  suspended: boolean;
}

export interface PendingRoom {
  id: string;
  name: string;
  description: string;
  city: string;
  district: string | null;
  address: string;
  categoryName: string;
  /** `null` quand la salle n'annonce pas de minimum. */
  capacityMin: number | null;
  capacityMax: number;
  basePrice: number;
  /** Photos du dossier, dans l'ordre d'affichage. */
  photos: string[];
  photosCount: number;
  /** Date de dépôt du dossier, au format ISO. */
  createdAt: string;
  /** Nombre de jours écoulés depuis le dépôt. */
  waitingDays: number;
  owner: PendingRoomOwner;
  /** Motif du dernier rejet, si le dossier a déjà été refusé puis redéposé. */
  previousRejection: string | null;
}

export interface ModerationEntry {
  id: string;
  action: ModerationAction;
  reason: string | null;
  /** Horodatage ISO de la décision. */
  at: string;
  adminName: string | null;
  room: {
    id: string;
    name: string;
    city: string;
    /** Statut actuel de la salle, qui a pu changer depuis la décision. */
    status: RoomStatus;
    photoUrl: string | null;
    ownerName: string;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

/**
 * Dossiers en attente de validation, du plus ancien au plus récent.
 *
 * `ownerId` restreint la file à un propriétaire : c'est l'accès rapide « ses
 * salles » depuis la page des propriétaires.
 */
export async function listPendingRooms(
  ownerId?: string | null
): Promise<PendingRoom[]> {
  const rooms = await prisma.room.findMany({
    where: { status: "PENDING", ...(ownerId ? { ownerId } : {}) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      district: true,
      address: true,
      capacityMin: true,
      capacityMax: true,
      basePrice: true,
      createdAt: true,
      category: { select: { name: true } },
      photos: {
        select: { url: true },
        orderBy: { position: "asc" },
      },
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          suspendedAt: true,
          _count: { select: { rooms: true } },
        },
      },
      // Dernière décision connue : un dossier refusé puis corrigé revient en
      // attente, et le motif précédent évite de réinstruire à l'aveugle.
      moderations: {
        where: { action: "REJECTED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { reason: true },
      },
    },
  });

  // Le compteur Prisma porte sur *toutes* les salles du propriétaire : celles
  // déjà en ligne se comptent à part, en une requête groupée.
  const activeByOwner = await countActiveRoomsByOwner(
    rooms.map((room) => room.owner.id)
  );

  const now = new Date();

  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    city: room.city,
    district: room.district,
    address: room.address,
    categoryName: room.category.name,
    capacityMin: room.capacityMin,
    capacityMax: room.capacityMax,
    basePrice: Number(room.basePrice),
    photos: room.photos.slice(0, PREVIEW_PHOTOS).map((photo) => photo.url),
    photosCount: room.photos.length,
    createdAt: room.createdAt.toISOString(),
    waitingDays: daysSince(room.createdAt, now),
    owner: {
      id: room.owner.id,
      fullName: room.owner.fullName,
      email: room.owner.email,
      phone: room.owner.phone,
      avatarUrl: room.owner.avatarUrl,
      activeRoomsCount: activeByOwner.get(room.owner.id) ?? 0,
      suspended: room.owner.suspendedAt !== null,
    },
    previousRejection: room.moderations[0]?.reason ?? null,
  }));
}

async function countActiveRoomsByOwner(
  ownerIds: string[]
): Promise<Map<string, number>> {
  if (ownerIds.length === 0) return new Map();

  const groups = await prisma.room.groupBy({
    by: ["ownerId"],
    where: { ownerId: { in: ownerIds }, status: "ACTIVE" },
    _count: { _all: true },
  });

  return new Map(groups.map((group) => [group.ownerId, group._count._all]));
}

/** Journal des décisions déjà prises, de la plus récente à la plus ancienne. */
export async function listModerationHistory(
  ownerId?: string | null,
  limit: number = HISTORY_LIMIT
): Promise<ModerationEntry[]> {
  const entries = await prisma.roomModeration.findMany({
    where: ownerId ? { room: { ownerId } } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      reason: true,
      createdAt: true,
      admin: { select: { fullName: true } },
      room: {
        select: {
          id: true,
          name: true,
          city: true,
          status: true,
          owner: { select: { fullName: true } },
          photos: {
            select: { url: true },
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    reason: entry.reason,
    at: entry.createdAt.toISOString(),
    adminName: entry.admin?.fullName ?? null,
    room: {
      id: entry.room.id,
      name: entry.room.name,
      city: entry.room.city,
      status: entry.room.status,
      photoUrl: entry.room.photos[0]?.url ?? null,
      ownerName: entry.room.owner.fullName,
    },
  }));
}

/**
 * Dossier complet d'une salle, pour `/admin/salles/[id]`.
 *
 * Contrairement à la file d'attente, cette lecture ne filtre pas sur le statut :
 * l'historique de modération renvoie vers des salles déjà validées, désactivées
 * ou refusées, et l'administrateur doit pouvoir les rouvrir.
 */
export interface AdminRoomDetail {
  id: string;
  name: string;
  description: string;
  status: RoomStatus;
  city: string;
  district: string | null;
  address: string;
  /** Catégorie principale, celle affichée sur les cartes et la fiche. */
  categoryName: string;
  /** Toutes les catégories, principale en tête. */
  categoryNames: string[];
  /** `null` quand la salle n'annonce pas de minimum. */
  capacityMin: number | null;
  capacityMax: number;
  basePrice: number;
  surfaceM2: number | null;
  spacesCount: number | null;
  hasParking: boolean;
  hasAccommodation: boolean;
  videoUrl: string | null;
  openingHours: string | null;
  musicPolicy: string | null;
  cancellationPolicy: string | null;
  cancellationTerms: string | null;
  depositAmount: number | null;
  cleaningFee: number | null;
  petsAllowed: boolean;
  wheelchairAccess: boolean;
  photos: string[];
  /** Équipements et la précision saisie par le propriétaire pour cette salle. */
  equipments: { name: string; detail: string | null }[];
  services: { name: string; price: number }[];
  /** Grille tarifaire du propriétaire, vide quand la salle n'en annonce pas. */
  rates: (RateValue & { id: string })[];
  /** Horodatages ISO. */
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  /** Jours écoulés depuis le dépôt : ne compte que tant que le dossier attend. */
  waitingDays: number;
  /** Ce que la salle porte déjà : une salle réservée ne se traite pas à la légère. */
  bookingsCount: number;
  reviewsCount: number;
  favoritesCount: number;
  owner: PendingRoomOwner;
  /** Toutes les décisions prises sur ce dossier, de la plus récente à la plus ancienne. */
  moderations: {
    id: string;
    action: ModerationAction;
    reason: string | null;
    at: string;
    adminName: string | null;
  }[];
}

export async function getAdminRoomDetail(
  roomId: string
): Promise<AdminRoomDetail | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      city: true,
      district: true,
      address: true,
      capacityMin: true,
      capacityMax: true,
      basePrice: true,
      surfaceM2: true,
      spacesCount: true,
      hasParking: true,
      hasAccommodation: true,
      videoUrl: true,
      openingHours: true,
      musicPolicy: true,
      cancellationPolicy: true,
      cancellationTerms: true,
      depositAmount: true,
      cleaningFee: true,
      petsAllowed: true,
      wheelchairAccess: true,
      createdAt: true,
      updatedAt: true,
      verifiedAt: true,
      category: { select: { name: true } },
      categories: { select: { category: { select: { name: true } } } },
      photos: { select: { url: true }, orderBy: { position: "asc" } },
      equipments: {
        select: { detail: true, equipment: { select: { name: true } } },
        orderBy: { equipment: { name: "asc" } },
      },
      services: {
        select: {
          price: true,
          service: { select: { name: true, price: true } },
        },
        orderBy: { service: { name: "asc" } },
      },
      rates: {
        select: { id: true, label: true, detail: true, price: true, unit: true },
        orderBy: { position: "asc" },
      },
      _count: { select: { bookings: true, reviews: true, favorites: true } },
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          suspendedAt: true,
        },
      },
      moderations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          reason: true,
          createdAt: true,
          admin: { select: { fullName: true } },
        },
      },
    },
  });

  if (!room) return null;

  const activeByOwner = await countActiveRoomsByOwner([room.owner.id]);

  const equipments = room.equipments.map((link) => ({
    name: link.equipment.name,
    detail: link.detail,
  }));

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    status: room.status,
    city: room.city,
    district: room.district,
    address: room.address,
    categoryName: room.category.name,
    // La principale en tête, les secondaires ensuite : c'est l'ordre dans
    // lequel le propriétaire les a saisies dans son formulaire.
    categoryNames: [
      room.category.name,
      ...room.categories
        .map((link) => link.category.name)
        .filter((name) => name !== room.category.name),
    ],
    capacityMin: room.capacityMin,
    capacityMax: room.capacityMax,
    basePrice: Number(room.basePrice),
    surfaceM2: room.surfaceM2,
    spacesCount: room.spacesCount,
    // Relus des équipements, comme sur la fiche publique : l'administrateur
    // doit voir exactement ce que verra le client.
    hasParking: hasEquipment(equipments, SUMMARY_EQUIPMENTS.parking),
    hasAccommodation: hasEquipment(
      equipments,
      SUMMARY_EQUIPMENTS.accommodation
    ),
    videoUrl: room.videoUrl,
    openingHours: room.openingHours,
    musicPolicy: room.musicPolicy,
    cancellationPolicy: room.cancellationPolicy,
    cancellationTerms: room.cancellationTerms,
    depositAmount: room.depositAmount === null ? null : Number(room.depositAmount),
    cleaningFee: room.cleaningFee === null ? null : Number(room.cleaningFee),
    petsAllowed: room.petsAllowed,
    wheelchairAccess: hasEquipment(equipments, SUMMARY_EQUIPMENTS.wheelchair),
    photos: room.photos.map((photo) => photo.url),
    equipments,
    services: room.services.map((link) => ({
      name: link.service.name,
      // Le tarif de la salle prime sur celui du référentiel.
      price: Number(link.price ?? link.service.price),
    })),
    rates: room.rates.map((rate) => ({
      id: rate.id,
      label: rate.label,
      detail: rate.detail,
      price: Number(rate.price),
      unit: rate.unit,
    })),
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
    verifiedAt: room.verifiedAt ? room.verifiedAt.toISOString() : null,
    waitingDays:
      room.status === "PENDING" ? daysSince(room.createdAt, new Date()) : 0,
    bookingsCount: room._count.bookings,
    reviewsCount: room._count.reviews,
    favoritesCount: room._count.favorites,
    owner: {
      id: room.owner.id,
      fullName: room.owner.fullName,
      email: room.owner.email,
      phone: room.owner.phone,
      avatarUrl: room.owner.avatarUrl,
      activeRoomsCount: activeByOwner.get(room.owner.id) ?? 0,
      suspended: room.owner.suspendedAt !== null,
    },
    moderations: room.moderations.map((entry) => ({
      id: entry.id,
      action: entry.action,
      reason: entry.reason,
      at: entry.createdAt.toISOString(),
      adminName: entry.admin?.fullName ?? null,
    })),
  };
}
