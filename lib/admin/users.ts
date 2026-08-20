import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import type { UserFilters } from "@/lib/admin/users-params";

/**
 * Lectures des pages comptes de l'administration.
 *
 * Un seul module pour les clients et les propriétaires : ce sont les mêmes
 * comptes, filtrés sur leur rôle et enrichis de l'activité qui compte pour
 * chacun — les réservations passées d'un côté, les salles publiées de l'autre.
 * Le `where` est construit une fois, ce qui garantit que la recherche et le
 * filtre de statut se comportent pareil sur les deux pages.
 */

interface AdminAccountRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  /** Date d'inscription, au format ISO. */
  createdAt: string;
  /** Date de suspension au format ISO, ou `null` pour un compte actif. */
  suspendedAt: string | null;
}

export interface AdminClientRow extends AdminAccountRow {
  /** Réservations déposées, tous statuts confondus. */
  bookingsCount: number;
  /** Réservations confirmées : l'activité réelle du compte. */
  confirmedBookingsCount: number;
  /** Total déjà encaissé en espèces sur ses réservations. */
  paidTotal: number;
  /** Date de la dernière demande, au format ISO. `null` si aucune. */
  lastBookingAt: string | null;
}

export interface AdminOwnerRow extends AdminAccountRow {
  /** Salles détenues, tous statuts confondus. */
  roomsCount: number;
  /** Salles publiées au catalogue. */
  activeRoomsCount: number;
  /** Dossiers en attente de validation. */
  pendingRoomsCount: number;
  /** Réservations reçues sur l'ensemble de ses salles. */
  receivedBookingsCount: number;
}

export interface AdminUserCounts {
  clients: number;
  owners: number;
  suspendedClients: number;
  suspendedOwners: number;
}

/** Traduit les filtres de l'URL en clause Prisma, pour un rôle donné. */
function whereFromFilters(
  filters: UserFilters,
  role: Role
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { role };

  if (filters.status) {
    where.suspendedAt = filters.status === "SUSPENDED" ? { not: null } : null;
  }

  if (filters.search) {
    // `insensitive` : chercher « belkacem » doit trouver « Belkacem ».
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

const accountSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  suspendedAt: true,
} as const;

function toAccountRow(account: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: Date;
  suspendedAt: Date | null;
}): AdminAccountRow {
  return {
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    phone: account.phone,
    avatarUrl: account.avatarUrl,
    role: account.role,
    createdAt: account.createdAt.toISOString(),
    suspendedAt: account.suspendedAt?.toISOString() ?? null,
  };
}

/**
 * Comptes clients et leur activité, du plus récent au plus ancien.
 *
 * Les réservations sont lues avec le compte plutôt que comptées par requêtes
 * séparées : la liste a besoin du statut de chacune (confirmées) et du montant
 * encaissé, deux informations qu'un `_count` ne sait pas donner.
 */
export async function listClients(
  filters: UserFilters
): Promise<AdminClientRow[]> {
  const clients = await prisma.user.findMany({
    where: whereFromFilters(filters, "CLIENT"),
    orderBy: { createdAt: "desc" },
    select: {
      ...accountSelect,
      bookings: {
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          createdAt: true,
          payment: { select: { amount: true, status: true } },
        },
      },
    },
  });

  return clients.map((client) => ({
    ...toAccountRow(client),
    bookingsCount: client.bookings.length,
    confirmedBookingsCount: client.bookings.filter(
      (booking) => booking.status === "CONFIRMEE"
    ).length,
    paidTotal: client.bookings.reduce(
      (sum, booking) =>
        booking.payment?.status === "PAID"
          ? sum + Number(booking.payment.amount)
          : sum,
      0
    ),
    lastBookingAt: client.bookings[0]?.createdAt.toISOString() ?? null,
  }));
}

/**
 * Propriétaires et leur activité.
 *
 * Les réservations reçues se comptent salle par salle puis se somment ici :
 * Prisma ne sait pas agréger à travers deux relations (`User → Room → Booking`)
 * en une seule clause `_count`.
 */
export async function listOwners(
  filters: UserFilters
): Promise<AdminOwnerRow[]> {
  const owners = await prisma.user.findMany({
    where: whereFromFilters(filters, "OWNER"),
    orderBy: { createdAt: "desc" },
    select: {
      ...accountSelect,
      rooms: {
        select: { status: true, _count: { select: { bookings: true } } },
      },
    },
  });

  return owners.map((owner) => ({
    ...toAccountRow(owner),
    roomsCount: owner.rooms.length,
    activeRoomsCount: owner.rooms.filter((room) => room.status === "ACTIVE")
      .length,
    pendingRoomsCount: owner.rooms.filter((room) => room.status === "PENDING")
      .length,
    receivedBookingsCount: owner.rooms.reduce(
      (sum, room) => sum + room._count.bookings,
      0
    ),
  }));
}

/** Répartition des comptes, affichée en résumé au-dessus des listes. */
export async function getUserCounts(): Promise<AdminUserCounts> {
  const [clients, owners, suspendedClients, suspendedOwners] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "OWNER" } }),
    prisma.user.count({ where: { role: "CLIENT", suspendedAt: { not: null } } }),
    prisma.user.count({ where: { role: "OWNER", suspendedAt: { not: null } } }),
  ]);

  return { clients, owners, suspendedClients, suspendedOwners };
}

/** Nom d'un propriétaire, pour intituler une liste filtrée sur ses salles. */
export async function getOwnerName(ownerId: string): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, role: "OWNER" },
    select: { fullName: true },
  });

  return owner?.fullName ?? null;
}
