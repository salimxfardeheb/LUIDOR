import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Catégories attendues par la page d'accueil (`lib/home/content.ts`). */
const CATEGORIES = [
  { name: "Mariage", iconSlug: "gem" },
  { name: "Anniversaire", iconSlug: "cake" },
  { name: "Fiançailles", iconSlug: "heart" },
  { name: "Conférence", iconSlug: "mic" },
  { name: "Séminaire", iconSlug: "presentation" },
  { name: "Baptême", iconSlug: "church" },
  { name: "Soirée privée", iconSlug: "party-popper" },
  { name: "Réception", iconSlug: "gift" },
  { name: "Événement pro", iconSlug: "landmark" },
];

/** Équipements proposés en cases à cocher par le panneau de filtres. */
const EQUIPMENTS = [
  "Climatisation",
  "Parking privé",
  "Sonorisation",
  "Éclairage scénique",
  "Cuisine équipée",
  "Espace enfants",
  "Wifi",
  "Vidéoprojecteur",
  "Terrasse",
  "Accès PMR",
];

const OWNERS = [
  { email: "proprietaire1@liudor.dz", fullName: "Yacine Boumediene" },
  { email: "proprietaire2@liudor.dz", fullName: "Nadia Cherif" },
];

/**
 * Un avis est unique par couple (salle, client) : il faut au moins autant de
 * clients que la salle la mieux notée n'a d'avis.
 */
const CLIENTS = [
  { email: "client1@liudor.dz", fullName: "Amina Belkacem" },
  { email: "client2@liudor.dz", fullName: "Karim Haddad" },
  { email: "client3@liudor.dz", fullName: "Lynda Meziane" },
  { email: "client4@liudor.dz", fullName: "Sofiane Bourenane" },
  { email: "client5@liudor.dz", fullName: "Rania Zerrouki" },
];

interface RoomSeed {
  name: string;
  city: string;
  address: string;
  category: string;
  capacityMin: number;
  capacityMax: number;
  basePrice: number;
  /** Notes des avis créés pour cette salle (1 à 5). */
  ratings: number[];
  /** Équipements de la salle, à choisir dans `EQUIPMENTS`. */
  equipments: string[];
}

const ROOMS: RoomSeed[] = [
  {
    name: "Palais El Djazair",
    city: "Alger",
    address: "12 boulevard Zighoud Youcef, Alger Centre",
    category: "Mariage",
    capacityMin: 200,
    capacityMax: 600,
    basePrice: 320000,
    ratings: [5, 5, 5, 4],
    equipments: [
      "Climatisation",
      "Parking privé",
      "Sonorisation",
      "Éclairage scénique",
      "Cuisine équipée",
      "Accès PMR",
    ],
  },
  {
    name: "Salle Les Jardins d'Or",
    city: "Alger",
    address: "Route de Chéraga, Dely Ibrahim",
    category: "Réception",
    capacityMin: 120,
    capacityMax: 400,
    basePrice: 240000,
    ratings: [5, 4, 5],
    equipments: [
      "Climatisation",
      "Parking privé",
      "Sonorisation",
      "Cuisine équipée",
      "Terrasse",
      "Espace enfants",
    ],
  },
  {
    name: "Espace Andalous",
    city: "Oran",
    address: "Front de mer, Aïn El Turck",
    category: "Mariage",
    capacityMin: 150,
    capacityMax: 500,
    basePrice: 280000,
    ratings: [5, 4, 4, 5],
    equipments: [
      "Climatisation",
      "Sonorisation",
      "Éclairage scénique",
      "Terrasse",
      "Wifi",
    ],
  },
  {
    name: "Le Grand Salon Rym",
    city: "Oran",
    address: "Rue Larbi Ben M'hidi, Oran",
    category: "Fiançailles",
    capacityMin: 80,
    capacityMax: 250,
    basePrice: 165000,
    ratings: [4, 4, 5],
    equipments: ["Climatisation", "Sonorisation", "Parking privé", "Wifi"],
  },
  {
    name: "Résidence Sirta",
    city: "Constantine",
    address: "Cité Zouaghi Slimane, Constantine",
    category: "Soirée privée",
    capacityMin: 60,
    capacityMax: 200,
    basePrice: 130000,
    ratings: [4, 5],
    equipments: ["Climatisation", "Sonorisation", "Terrasse", "Espace enfants"],
  },
  {
    name: "Centre de Congrès Numidia",
    city: "Constantine",
    address: "Nouvelle ville Ali Mendjeli, UV 15",
    category: "Séminaire",
    capacityMin: 100,
    capacityMax: 800,
    basePrice: 410000,
    ratings: [5, 4],
    equipments: [
      "Climatisation",
      "Wifi",
      "Vidéoprojecteur",
      "Sonorisation",
      "Parking privé",
      "Accès PMR",
    ],
  },
  {
    name: "Villa Corail",
    city: "Annaba",
    address: "Route de la Corniche, Seraïdi",
    category: "Anniversaire",
    capacityMin: 40,
    capacityMax: 150,
    basePrice: 95000,
    ratings: [4, 4],
    equipments: ["Terrasse", "Espace enfants", "Sonorisation", "Wifi"],
  },
  {
    name: "Salle Ain Fouara",
    city: "Sétif",
    address: "Avenue du 8 mai 1945, Sétif",
    category: "Baptême",
    capacityMin: 50,
    capacityMax: 180,
    basePrice: 110000,
    ratings: [4],
    equipments: ["Climatisation", "Cuisine équipée", "Parking privé"],
  },
  {
    name: "Espace Atlas Business",
    city: "Alger",
    address: "Pins Maritimes, Mohammadia",
    category: "Événement pro",
    capacityMin: 80,
    capacityMax: 350,
    basePrice: 260000,
    ratings: [3, 4],
    equipments: [
      "Climatisation",
      "Wifi",
      "Vidéoprojecteur",
      "Parking privé",
      "Accès PMR",
    ],
  },
  {
    name: "Le Patio Bleu",
    city: "Annaba",
    address: "Rue Bouzered Hocine, Annaba",
    category: "Conférence",
    capacityMin: 30,
    capacityMax: 120,
    basePrice: 85000,
    ratings: [],
    equipments: ["Wifi", "Vidéoprojecteur", "Climatisation"],
  },
];

const COMMENTS = [
  "Salle impeccable, équipe très professionnelle du début à la fin.",
  "Bon rapport qualité-prix, la décoration était conforme aux photos.",
  "Accueil chaleureux et propreté irréprochable. Je recommande.",
  "Très bonne expérience, quelques détails à améliorer sur le parking.",
  "Le jour J s'est déroulé sans le moindre accroc, merci !",
];

async function main() {
  const passwordHash = await bcrypt.hash("Liudor2026!", 10);

  const categories = new Map<string, string>();
  for (const category of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: { iconSlug: category.iconSlug },
      create: category,
    });
    categories.set(created.name, created.id);
  }

  const equipments = new Map<string, string>();
  for (const name of EQUIPMENTS) {
    const created = await prisma.equipment.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    equipments.set(created.name, created.id);
  }

  const owners = await Promise.all(
    OWNERS.map((owner) =>
      prisma.user.upsert({
        where: { email: owner.email },
        update: {},
        create: { ...owner, role: "OWNER", passwordHash },
      })
    )
  );

  const clients = await Promise.all(
    CLIENTS.map((client) =>
      prisma.user.upsert({
        where: { email: client.email },
        update: {},
        create: { ...client, role: "CLIENT", passwordHash },
      })
    )
  );

  for (let index = 0; index < ROOMS.length; index++) {
    const room = ROOMS[index];
    const categoryId = categories.get(room.category);
    if (!categoryId) throw new Error(`Catégorie inconnue : ${room.category}`);

    const data: Prisma.RoomCreateInput = {
      name: room.name,
      description: `${room.name} accueille vos événements à ${room.city}. Espace modulable, sonorisation, éclairage et parking privatif inclus.`,
      city: room.city,
      address: room.address,
      capacityMin: room.capacityMin,
      capacityMax: room.capacityMax,
      basePrice: room.basePrice,
      status: "ACTIVE",
      owner: { connect: { id: owners[index % owners.length].id } },
      category: { connect: { id: categoryId } },
      equipments: {
        create: room.equipments.map((name) => {
          const equipmentId = equipments.get(name);
          if (!equipmentId) throw new Error(`Équipement inconnu : ${name}`);
          return { equipment: { connect: { id: equipmentId } } };
        }),
      },
    };

    // Pas de contrainte unique sur `name` : on repart d'une base propre pour
    // que le seed reste rejouable sans dupliquer les salles.
    await prisma.room.deleteMany({ where: { name: room.name } });
    const created = await prisma.room.create({ data });

    // Aucune photo créée : les cartes affichent le dégradé de marque tant que
    // les visuels réels ne sont pas déposés dans /public.

    await Promise.all(
      room.ratings.slice(0, clients.length).map((rating, reviewIndex) =>
        prisma.review.create({
          data: {
            roomId: created.id,
            clientId: clients[reviewIndex].id,
            rating,
            comment: COMMENTS[(index + reviewIndex) % COMMENTS.length],
          },
        })
      )
    );
  }

  console.log(
    `Seed terminé : ${CATEGORIES.length} catégories, ${EQUIPMENTS.length} équipements, ${ROOMS.length} salles, ${owners.length + clients.length} comptes de démonstration.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
