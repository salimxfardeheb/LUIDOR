import { PrismaClient, type Prisma, type RateUnit } from "@prisma/client";
import {
  DEFAULT_PENDING_HOLD_HOURS,
  holdExpiryFrom,
} from "../../lib/bookings/availability";
import {
  hasEquipment,
  SUMMARY_EQUIPMENTS,
} from "../../lib/rooms/equipments";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Catégories attendues par la page d'accueil (`lib/home/content.ts`). */
const CATEGORIES = [
  { name: "Mariage", iconSlug: "gem" },
  { name: "Anniversaire", iconSlug: "cake" },
  { name: "Fiançailles", iconSlug: "heart" },
  { name: "Conférence", iconSlug: "mic" },
  { name: "Séminaire", iconSlug: "presentation" },
  { name: "Soirée privée", iconSlug: "party-popper" },
  { name: "Réception", iconSlug: "gift" },
  { name: "Événement pro", iconSlug: "landmark" },
];

/**
 * Témoignages de la page d'accueil.
 *
 * Contenu éditorial, modifiable ensuite depuis /admin/temoignages. Les `id`
 * sont fixés pour que rejouer le seed mette à jour les mêmes lignes au lieu
 * d'empiler des doublons.
 */
const TESTIMONIALS = [
  {
    id: "temoignage-amina",
    authorName: "Amina Belkacem",
    role: "Mariage · Alger",
    rating: 5,
    quote:
      "Nous avons trouvé et réservé notre salle en une soirée. Les photos correspondaient exactement à la réalité, aucune mauvaise surprise le jour J.",
    position: 1,
  },
  {
    id: "temoignage-karim",
    authorName: "Karim Haddad",
    role: "Séminaire · Oran",
    rating: 5,
    quote:
      "L'équipe a vérifié le paiement et confirmé la réservation en quelques heures. Un vrai gain de temps pour organiser notre séminaire annuel.",
    position: 2,
  },
  {
    id: "temoignage-lynda",
    authorName: "Lynda Meziane",
    role: "Anniversaire · Constantine",
    rating: 4,
    quote:
      "Les avis des autres clients m'ont vraiment aidée à choisir. La salle était conforme et le propriétaire très réactif sur la plateforme.",
    position: 3,
  },
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
  "Hébergement sur place",
];

/** Services optionnels proposés par les propriétaires, avec leur tarif. */
const SERVICES = [
  { name: "Traiteur", price: 180000 },
  { name: "Décoration florale", price: 45000 },
  { name: "DJ & animation", price: 60000 },
  { name: "Photographe", price: 55000 },
  { name: "Service de sécurité", price: 30000 },
  { name: "Voiturier", price: 25000 },
  { name: "Pâtisserie & gâteau", price: 20000 },
  { name: "Navette invités", price: 35000 },
];

/** Coordonnées approximatives des villes, pour la mini carte de la fiche salle. */
const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  Alger: { latitude: 36.7538, longitude: 3.0588 },
  Oran: { latitude: 35.6969, longitude: -0.6331 },
  Constantine: { latitude: 36.365, longitude: 6.6147 },
  Annaba: { latitude: 36.9, longitude: 7.7667 },
  Sétif: { latitude: 36.1898, longitude: 5.4108 },
};

const OWNERS = [
  {
    email: "proprietaire1@liudor.dz",
    fullName: "Yacine Boumediene",
    languages: ["Arabe", "Français", "Anglais"],
    responseTimeHours: 2,
  },
  {
    email: "proprietaire2@liudor.dz",
    fullName: "Nadia Cherif",
    languages: ["Arabe", "Français", "Kabyle"],
    responseTimeHours: 5,
  },
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

/**
 * Informations pratiques par défaut : la plupart des salles partagent les mêmes
 * règles, chaque salle peut en surcharger une partie via `practical`.
 */
const DEFAULT_PRACTICAL = {
  openingHours: "08:00 – 02:00",
  musicPolicy: "Sonorisation autorisée jusqu'à 2h00",
  cancellationPolicy: "Flexible",
  cancellationTerms:
    "Annulation gratuite jusqu'à 30 jours avant l'événement : la totalité des sommes versées est remboursée. Entre 30 et 15 jours, la caution est conservée et le reste est remboursé. À moins de 15 jours de l'événement, aucun remboursement n'est possible, sauf cas de force majeure justifié et validé par l'équipe LIUDOR.",
  depositAmount: 50000,
  cleaningFee: 15000,
  petsAllowed: false,
};

type Practical = typeof DEFAULT_PRACTICAL;

interface RoomSeed {
  name: string;
  city: string;
  /** Quartier, affiché dans le fil d'Ariane de la fiche. */
  district: string;
  address: string;
  category: string;
  /**
   * Capacité minimum, facultative comme dans le formulaire : une salle qui
   * n'en annonce pas s'affiche « Jusqu'à N invités » et ne disparaît d'aucune
   * recherche. Deux salles du jeu de données en sont dépourvues, pour que ce
   * cas soit visible sans le provoquer à la main.
   */
  capacityMin?: number;
  capacityMax: number;
  basePrice: number;
  surfaceM2: number;
  spacesCount: number;
  /** Salle contrôlée par l'équipe : affiche le badge « Vérifiée ». */
  verified: boolean;
  videoUrl?: string;
  /** Notes des avis créés pour cette salle (1 à 5). */
  ratings: number[];
  /** Équipements de la salle, à choisir dans `EQUIPMENTS`. */
  equipments: string[];
  /** Services optionnels, à choisir dans `SERVICES`. */
  services: string[];
  /**
   * Grille tarifaire détaillée, quand la salle se loue au créneau plutôt qu'à
   * un prix unique. Absente pour la plupart des salles : la fiche masque alors
   * la section, ce que le seed doit aussi savoir montrer.
   */
  rates?: {
    label: string;
    detail?: string;
    price: number;
    /** `FORFAIT` par défaut : le créneau, quel que soit l'effectif. */
    unit?: RateUnit;
  }[];
  practical?: Partial<Practical>;
}

/**
 * Effectif d'une réservation de démonstration : le minimum annoncé par la
 * salle, ou la moitié de sa capacité pour celles qui n'en annoncent pas.
 */
function demoGuests(room: RoomSeed): number {
  return room.capacityMin ?? Math.round(room.capacityMax / 2);
}

const ROOMS: RoomSeed[] = [
  {
    name: "Palais El Djazair",
    city: "Alger",
    district: "Alger Centre",
    address: "12 boulevard Zighoud Youcef, Alger Centre",
    category: "Mariage",
    capacityMin: 200,
    capacityMax: 600,
    basePrice: 320000,
    surfaceM2: 950,
    spacesCount: 4,
    verified: true,
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    ratings: [5, 5, 5, 4],
    equipments: [
      "Climatisation",
      "Parking privé",
      "Sonorisation",
      "Éclairage scénique",
      "Cuisine équipée",
      "Accès PMR",
      "Hébergement sur place",
    ],
    services: [
      "Traiteur",
      "Décoration florale",
      "DJ & animation",
      "Photographe",
      "Voiturier",
    ],
    rates: [
      {
        label: "Location déjeuner",
        detail: "Petite et grande salle",
        price: 350000,
      },
      { label: "Location après-midi", detail: "14h – 19h", price: 200000 },
      {
        label: "Dîner et demi-soirée",
        detail: "17h – minuit, les 2 salles",
        price: 400000,
      },
      { label: "Location soirée", detail: "21h – 3h", price: 270000 },
      {
        label: "Dîner par couvert",
        detail: "18h – 22h",
        price: 3500,
        unit: "COUVERT",
      },
    ],
    practical: { depositAmount: 80000, cleaningFee: 25000 },
  },
  {
    name: "Salle Les Jardins d'Or",
    city: "Alger",
    district: "Dely Ibrahim",
    address: "Route de Chéraga, Dely Ibrahim",
    category: "Réception",
    capacityMin: 120,
    capacityMax: 400,
    basePrice: 240000,
    surfaceM2: 620,
    spacesCount: 3,
    verified: true,
    ratings: [5, 4, 5],
    equipments: [
      "Climatisation",
      "Parking privé",
      "Sonorisation",
      "Cuisine équipée",
      "Terrasse",
      "Espace enfants",
    ],
    services: ["Traiteur", "Décoration florale", "Pâtisserie & gâteau"],
    rates: [
      { label: "Location après-midi", detail: "14h – 19h", price: 160000 },
      { label: "Location soirée", detail: "21h – 3h", price: 240000 },
      {
        label: "Dîner par couvert",
        detail: "18h – 22h",
        price: 2800,
        unit: "COUVERT",
      },
    ],
    practical: { petsAllowed: true },
  },
  {
    name: "Espace Andalous",
    city: "Oran",
    district: "Aïn El Turck",
    address: "Front de mer, Aïn El Turck",
    category: "Mariage",
    capacityMin: 150,
    capacityMax: 500,
    basePrice: 280000,
    surfaceM2: 780,
    spacesCount: 3,
    verified: true,
    ratings: [5, 4, 4, 5],
    equipments: [
      "Parking privé",
      "Climatisation",
      "Sonorisation",
      "Éclairage scénique",
      "Terrasse",
      "Wifi",
      "Hébergement sur place",
    ],
    services: ["Traiteur", "DJ & animation", "Photographe", "Navette invités"],
  },
  {
    name: "Le Grand Salon Rym",
    city: "Oran",
    district: "Sidi El Houari",
    address: "Rue Larbi Ben M'hidi, Oran",
    category: "Fiançailles",
    capacityMin: 80,
    capacityMax: 250,
    basePrice: 165000,
    surfaceM2: 380,
    spacesCount: 2,
    verified: true,
    ratings: [4, 4, 5],
    equipments: ["Climatisation", "Sonorisation", "Parking privé", "Wifi"],
    services: ["Décoration florale", "Pâtisserie & gâteau"],
  },
  {
    name: "Résidence Sirta",
    city: "Constantine",
    district: "Zouaghi Slimane",
    address: "Cité Zouaghi Slimane, Constantine",
    category: "Soirée privée",
    capacityMin: 60,
    capacityMax: 200,
    basePrice: 130000,
    surfaceM2: 300,
    spacesCount: 2,
    verified: false,
    ratings: [4, 5],
    equipments: ["Climatisation", "Sonorisation", "Terrasse", "Espace enfants"],
    services: ["DJ & animation", "Pâtisserie & gâteau"],
    practical: {
      openingHours: "10:00 – 00:00",
      musicPolicy: "Sonorisation autorisée jusqu'à minuit",
      cancellationPolicy: "Modérée",
    },
  },
  {
    name: "Centre de Congrès Numidia",
    city: "Constantine",
    district: "Ali Mendjeli",
    address: "Nouvelle ville Ali Mendjeli, UV 15",
    category: "Séminaire",
    capacityMax: 800,
    basePrice: 410000,
    surfaceM2: 1400,
    spacesCount: 6,
    verified: true,
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    ratings: [5, 4],
    equipments: [
      "Climatisation",
      "Wifi",
      "Vidéoprojecteur",
      "Sonorisation",
      "Parking privé",
      "Accès PMR",
      "Hébergement sur place",
    ],
    services: ["Traiteur", "Service de sécurité", "Navette invités"],
    rates: [
      { label: "Demi-journée", detail: "8h – 13h", price: 120000 },
      { label: "Journée complète", detail: "8h – 18h", price: 190000 },
      {
        label: "Pause-café",
        detail: "Accueil et collation",
        price: 900,
        unit: "PERSONNE",
      },
      {
        label: "Déjeuner d'affaires",
        detail: "12h – 14h",
        price: 2600,
        unit: "PERSONNE",
      },
    ],
    practical: {
      openingHours: "07:00 – 23:00",
      musicPolicy: "Sonorisation limitée aux plages de conférence",
      cancellationPolicy: "Stricte",
      depositAmount: 120000,
      cleaningFee: 40000,
    },
  },
  {
    name: "Villa Corail",
    city: "Annaba",
    district: "Seraïdi",
    address: "Route de la Corniche, Seraïdi",
    category: "Anniversaire",
    capacityMin: 40,
    capacityMax: 150,
    basePrice: 95000,
    surfaceM2: 240,
    spacesCount: 3,
    verified: false,
    ratings: [4, 4],
    equipments: [
      "Parking privé",
      "Terrasse",
      "Espace enfants",
      "Sonorisation",
      "Wifi",
      "Hébergement sur place",
    ],
    services: ["Pâtisserie & gâteau", "Photographe"],
    practical: { petsAllowed: true, depositAmount: 30000, cleaningFee: 8000 },
  },
  {
    name: "Salle Ain Fouara",
    city: "Sétif",
    district: "Centre-ville",
    address: "Avenue du 8 mai 1945, Sétif",
    category: "Réception",
    capacityMin: 50,
    capacityMax: 180,
    basePrice: 110000,
    surfaceM2: 260,
    spacesCount: 2,
    verified: true,
    ratings: [4],
    equipments: ["Climatisation", "Cuisine équipée", "Parking privé"],
    services: ["Traiteur", "Pâtisserie & gâteau"],
  },
  {
    name: "Espace Atlas Business",
    city: "Alger",
    district: "Mohammadia",
    address: "Pins Maritimes, Mohammadia",
    category: "Événement pro",
    capacityMin: 80,
    capacityMax: 350,
    basePrice: 260000,
    surfaceM2: 520,
    spacesCount: 5,
    verified: true,
    ratings: [3, 4],
    equipments: [
      "Climatisation",
      "Wifi",
      "Vidéoprojecteur",
      "Parking privé",
      "Accès PMR",
    ],
    services: ["Traiteur", "Service de sécurité", "Voiturier"],
    practical: {
      openingHours: "07:30 – 22:00",
      musicPolicy: "Sonorisation réservée aux plénières",
      cancellationPolicy: "Modérée",
    },
  },
  {
    name: "Le Patio Bleu",
    city: "Annaba",
    district: "Centre-ville",
    address: "Rue Bouzered Hocine, Annaba",
    category: "Conférence",
    capacityMax: 120,
    basePrice: 85000,
    surfaceM2: 180,
    spacesCount: 2,
    verified: false,
    ratings: [],
    equipments: ["Wifi", "Vidéoprojecteur", "Climatisation"],
    services: ["Traiteur"],
    practical: { openingHours: "08:00 – 20:00" },
  },
];

const COMMENTS = [
  "Salle impeccable, équipe très professionnelle du début à la fin.",
  "Bon rapport qualité-prix, la décoration était conforme aux photos.",
  "Accueil chaleureux et propreté irréprochable. Je recommande.",
  "Très bonne expérience, quelques détails à améliorer sur le parking.",
  "Le jour J s'est déroulé sans le moindre accroc, merci !",
];

/** Nombre de jours de disponibilités générés à partir d'aujourd'hui. */
const CALENDAR_DAYS = 120;

/** Date du jour ramenée à minuit UTC, comme les colonnes `@db.Date`. */
function today(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

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

  // Publiés d'emblée : la section « Ils ont réservé avec LIUDOR » disparaît de
  // l'accueil tant qu'aucun témoignage n'est en ligne.
  for (const testimonial of TESTIMONIALS) {
    const { id, ...fields } = testimonial;
    await prisma.testimonial.upsert({
      where: { id },
      update: fields,
      create: { id, ...fields, publishedAt: new Date() },
    });
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

  // `Service.name` n'est pas unique en base : on cherche avant de créer pour que
  // le seed reste rejouable sans dupliquer les services.
  const services = new Map<string, string>();
  for (const service of SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    const created = existing
      ? await prisma.service.update({
          where: { id: existing.id },
          data: { price: service.price },
        })
      : await prisma.service.create({ data: service });
    services.set(created.name, created.id);
  }

  const owners = await Promise.all(
    OWNERS.map((owner) =>
      prisma.user.upsert({
        where: { email: owner.email },
        update: {
          languages: owner.languages,
          responseTimeHours: owner.responseTimeHours,
        },
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

  const startDate = today();

  for (let index = 0; index < ROOMS.length; index++) {
    const room = ROOMS[index];
    const categoryId = categories.get(room.category);
    if (!categoryId) throw new Error(`Catégorie inconnue : ${room.category}`);

    const practical: Practical = { ...DEFAULT_PRACTICAL, ...room.practical };
    const equipmentList = room.equipments.map((name) => ({ name }));
    const coords = CITY_COORDS[room.city] ?? null;

    const data: Prisma.RoomCreateInput = {
      name: room.name,
      description: `${room.name} accueille vos événements à ${room.city}. Espace modulable de ${room.surfaceM2} m² réparti en ${room.spacesCount} espaces distincts, avec sonorisation, éclairage et personnel d'accueil.\n\nLa salle est livrée nettoyée et décorée selon la formule choisie. L'équipe sur place vous accompagne du repérage des lieux jusqu'au rangement, et peut coordonner les prestataires extérieurs que vous souhaitez faire intervenir. Un état des lieux contradictoire est réalisé à l'arrivée et au départ, et la caution est restituée sous 72 heures si aucun dommage n'est constaté.`,
      city: room.city,
      district: room.district,
      address: room.address,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      capacityMin: room.capacityMin ?? null,
      capacityMax: room.capacityMax,
      basePrice: room.basePrice,
      surfaceM2: room.surfaceM2,
      spacesCount: room.spacesCount,
      // Déduits des équipements, comme le fait l'action du formulaire salle :
      // la fiche ne peut donc pas annoncer « Parking : non » au-dessus d'une
      // liste où figure « Parking privé ».
      hasParking: hasEquipment(equipmentList, SUMMARY_EQUIPMENTS.parking),
      hasAccommodation: hasEquipment(
        equipmentList,
        SUMMARY_EQUIPMENTS.accommodation
      ),
      verifiedAt: room.verified ? new Date() : null,
      videoUrl: room.videoUrl ?? null,
      openingHours: practical.openingHours,
      musicPolicy: practical.musicPolicy,
      cancellationPolicy: practical.cancellationPolicy,
      cancellationTerms: practical.cancellationTerms,
      depositAmount: practical.depositAmount,
      cleaningFee: practical.cleaningFee,
      petsAllowed: practical.petsAllowed,
      wheelchairAccess: hasEquipment(
        equipmentList,
        SUMMARY_EQUIPMENTS.wheelchair
      ),
      status: "ACTIVE",
      owner: { connect: { id: owners[index % owners.length].id } },
      category: { connect: { id: categoryId } },
      // La catégorie principale figure toujours dans `room_categories` : c'est
      // sur cette table que reposent les filtres du catalogue et de la recherche.
      categories: { create: [{ category: { connect: { id: categoryId } } }] },
      equipments: {
        create: room.equipments.map((name) => {
          const equipmentId = equipments.get(name);
          if (!equipmentId) throw new Error(`Équipement inconnu : ${name}`);
          return { equipment: { connect: { id: equipmentId } } };
        }),
      },
      services: {
        create: room.services.map((name) => {
          const serviceId = services.get(name);
          if (!serviceId) throw new Error(`Service inconnu : ${name}`);
          return { service: { connect: { id: serviceId } } };
        }),
      },
      // L'ordre du tableau est celui de la grille affichée sur la fiche.
      rates: {
        create: (room.rates ?? []).map((rate, position) => ({
          label: rate.label,
          detail: rate.detail ?? null,
          price: rate.price,
          unit: rate.unit ?? "FORFAIT",
          position,
        })),
      },
    };

    // Pas de contrainte unique sur `name` : on repart d'une base propre pour
    // que le seed reste rejouable sans dupliquer les salles. Les réservations
    // sont supprimées d'abord (`Booking.room` est en `onDelete: Restrict`).
    await prisma.booking.deleteMany({ where: { room: { name: room.name } } });
    await prisma.room.deleteMany({ where: { name: room.name } });
    const created = await prisma.room.create({ data });

    // Aucune photo créée : les cartes affichent le dégradé de marque tant que
    // les visuels réels ne sont pas déposés dans /public.

    /*
     * Disponibilités des 120 prochains jours. Le motif est déterministe (dérivé
     * de l'index de la salle et du jour) pour que le calendrier de la fiche
     * montre toujours un mélange réaliste de dates libres et bloquées, sans
     * changer à chaque exécution du seed.
     */
    await prisma.availability.createMany({
      data: Array.from({ length: CALENDAR_DAYS }, (_, day) => ({
        roomId: created.id,
        date: addDays(startDate, day),
        status:
          (day * 7 + index * 3) % 11 < 2
            ? ("BLOCKED" as const)
            : ("AVAILABLE" as const),
      })),
    });

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

    /*
     * Les trois premières salles portent des réservations de démonstration, une
     * par état visible du calendrier : confirmée (« réservée »), en cours de
     * vérification et en attente (« en attente de confirmation »).
     *
     * Trois dates distinctes, et c'est nécessaire : l'index unique partiel
     * `bookings_active_slot_key` interdit deux réservations vivantes sur la
     * même salle au même jour.
     */
    if (index < 3) {
      await prisma.booking.create({
        data: {
          clientId: clients[index % clients.length].id,
          roomId: created.id,
          eventType: room.category,
          eventDate: addDays(startDate, 12 + index),
          guestsCount: demoGuests(room),
          contactPhone: "0555 00 00 0" + index,
          contactEmail: clients[index % clients.length].email,
          status: "CONFIRMEE",
        },
      });
      await prisma.booking.create({
        data: {
          clientId: clients[(index + 1) % clients.length].id,
          roomId: created.id,
          eventType: room.category,
          eventDate: addDays(startDate, 20 + index),
          guestsCount: demoGuests(room),
          contactPhone: "0555 11 11 1" + index,
          contactEmail: clients[(index + 1) % clients.length].email,
          status: "EN_COURS_VERIFICATION",
        },
      });
      // Demande en attente, blocage encore actif : c'est elle qui rend la date
      // orange sur la fiche et interdit à un autre client de la demander.
      await prisma.booking.create({
        data: {
          clientId: clients[(index + 2) % clients.length].id,
          roomId: created.id,
          eventType: room.category,
          eventDate: addDays(startDate, 28 + index),
          guestsCount: demoGuests(room),
          contactPhone: "0555 22 22 2" + index,
          contactEmail: clients[(index + 2) % clients.length].email,
          status: "EN_ATTENTE",
          expiresAt: holdExpiryFrom(new Date(), DEFAULT_PENDING_HOLD_HOURS),
        },
      });
    }
  }

  console.log(
    `Seed terminé : ${CATEGORIES.length} catégories, ${TESTIMONIALS.length} témoignages, ${EQUIPMENTS.length} équipements, ${SERVICES.length} services, ${ROOMS.length} salles (disponibilités sur ${CALENDAR_DAYS} jours), ${owners.length + clients.length} comptes de démonstration.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
