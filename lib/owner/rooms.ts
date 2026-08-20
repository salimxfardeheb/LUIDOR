import type { RoomStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  capacityMin: number;
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

/**
 * Référentiels du formulaire salle chargés depuis la base.
 *
 * Les catégories n'en font plus partie : elles sont tenues dans le code
 * (`lib/rooms/categories.ts`) et le formulaire les affiche sans requête, ce qui
 * lui évite de dépendre de l'état de la base pour s'afficher.
 */
export interface RoomFormOptions {
  equipments: { id: string; name: string }[];
  services: { id: string; name: string; price: number }[];
}

/** Référentiels proposés par le formulaire salle. */
export async function getRoomFormOptions(): Promise<RoomFormOptions> {
  const [equipments, services] = await Promise.all([
    prisma.equipment.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    equipments,
    services: services.map((service) => ({
      ...service,
      price: Number(service.price),
    })),
  };
}

/** Valeurs de préremplissage du formulaire d'édition. */
export interface RoomFormValues {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  /** Libellés des catégories retenues ; le premier est la catégorie principale. */
  categoryNames: string[];
  capacityMin: number;
  capacityMax: number;
  basePrice: number;
  status: RoomStatus;
  equipmentIds: string[];
  serviceIds: string[];
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
      address: true,
      category: { select: { name: true } },
      categories: { select: { category: { select: { name: true } } } },
      capacityMin: true,
      capacityMax: true,
      basePrice: true,
      status: true,
      equipments: { select: { equipmentId: true } },
      services: { select: { serviceId: true } },
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
      basePrice: Number(room.basePrice),
      status: room.status,
      equipmentIds: room.equipments.map((link) => link.equipmentId),
      serviceIds: room.services.map((link) => link.serviceId),
      photos: room.photos,
    },
  };
}
