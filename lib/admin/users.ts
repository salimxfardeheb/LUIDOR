import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import type { UserFilters } from "@/lib/admin/users-params";

/**
 * Lectures des pages comptes de l'administration.
 *
 * Un seul module pour les utilisateurs et les propriétaires : ces derniers sont
 * les mêmes comptes, filtrés sur `role = OWNER` et enrichis de leur activité.
 * Le `where` est donc construit une fois, ce qui garantit que la recherche et
 * les filtres se comportent pareil sur les deux pages.
 */

export interface AdminUserRow {
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
  /** Salles détenues (rôle propriétaire). */
  roomsCount: number;
  /** Réservations passées en tant que client. */
  bookingsCount: number;
}

export interface AdminOwnerRow extends AdminUserRow {
  /** Salles publiées au catalogue. */
  activeRoomsCount: number;
  /** Dossiers en attente de validation. */
  pendingRoomsCount: number;
  /** Réservations reçues sur l'ensemble de ses salles. */
  receivedBookingsCount: number;
}

export interface AdminUserCounts {
  total: number;
  byRole: Record<Role, number>;
  suspended: number;
}

/** Traduit les filtres de l'URL en clause Prisma. */
function whereFromFilters(filters: UserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (filters.role) where.role = filters.role;

  if (filters.status) {
    where.suspendedAt = filters.status === "SUSPENDED" ? { not: null } : null;
  }

  if (filters.search) {
    // `insensitive` : chercher « belkacem » doit trouver « Belkacem ».
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

const userRowSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  suspendedAt: true,
  _count: { select: { rooms: true, bookings: true } },
} as const;

/** Comptes correspondant aux filtres, du plus récent au plus ancien. */
export async function listUsers(filters: UserFilters): Promise<AdminUserRow[]> {
  const users = await prisma.user.findMany({
    where: whereFromFilters(filters),
    orderBy: { createdAt: "desc" },
    select: userRowSelect,
  });

  return users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    roomsCount: user._count.rooms,
    bookingsCount: user._count.bookings,
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
    where: { ...whereFromFilters(filters), role: "OWNER" },
    orderBy: { createdAt: "desc" },
    select: {
      ...userRowSelect,
      rooms: {
        select: { status: true, _count: { select: { bookings: true } } },
      },
    },
  });

  return owners.map((owner) => ({
    id: owner.id,
    fullName: owner.fullName,
    email: owner.email,
    phone: owner.phone,
    avatarUrl: owner.avatarUrl,
    role: owner.role,
    createdAt: owner.createdAt.toISOString(),
    suspendedAt: owner.suspendedAt?.toISOString() ?? null,
    roomsCount: owner._count.rooms,
    bookingsCount: owner._count.bookings,
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
  const [roleGroups, suspended] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
  ]);

  const byRole: Record<Role, number> = { CLIENT: 0, OWNER: 0, ADMIN: 0 };
  let total = 0;
  for (const group of roleGroups) {
    byRole[group.role] = group._count._all;
    total += group._count._all;
  }

  return { total, byRole, suspended };
}
