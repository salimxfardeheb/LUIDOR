import { prisma } from "@/lib/prisma";

/**
 * Référentiels partagés par tout le catalogue : catégories d'événement,
 * équipements et services proposés par les salles.
 *
 * Chaque entrée porte le nombre de salles qui l'utilisent : c'est ce qui
 * décide si une suppression est possible. Supprimer une catégorie encore
 * rattachée casserait les fiches concernées (`Room.categoryId` est obligatoire).
 */

export type CatalogKind = "category" | "equipment" | "service";

export interface CatalogItem {
  id: string;
  name: string;
  /** Nom d'icône lucide, pour une catégorie uniquement. */
  iconSlug?: string;
  /** Tarif indicatif, pour un service uniquement. */
  price?: number;
  /** Salles rattachées : au-delà de zéro, la suppression est refusée. */
  usageCount: number;
}

export interface CatalogData {
  categories: CatalogItem[];
  equipments: CatalogItem[];
  services: CatalogItem[];
}

export async function getCatalog(): Promise<CatalogData> {
  const [categories, equipments, services] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        iconSlug: true,
        _count: { select: { rooms: true } },
      },
    }),
    prisma.equipment.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { rooms: true } } },
    }),
    prisma.service.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        _count: { select: { rooms: true } },
      },
    }),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      iconSlug: category.iconSlug,
      usageCount: category._count.rooms,
    })),
    equipments: equipments.map((equipment) => ({
      id: equipment.id,
      name: equipment.name,
      usageCount: equipment._count.rooms,
    })),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      price: Number(service.price),
      usageCount: service._count.rooms,
    })),
  };
}
