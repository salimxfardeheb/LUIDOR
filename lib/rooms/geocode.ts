import { unstable_cache } from "next/cache";
import { normalizeText } from "@/lib/utils";
import { wilayaCenter } from "@/lib/wilayas";

/**
 * Position affichable d'une salle sur une carte.
 *
 * Aucune salle n'est enregistrée avec ses coordonnées : le formulaire
 * propriétaire ne demande qu'une adresse en toutes lettres. Ce module comble
 * l'écart côté serveur avec **OpenStreetMap / Nominatim** — gratuit, sans clé
 * d'API ni compte à créer, contrairement à Google Maps Geocoding.
 *
 * Trois niveaux de précision, du plus fin au plus vague :
 *   1. `exact`   — `Room.latitude/longitude` renseignés en base ;
 *   2. `address` — Nominatim a trouvé la rue (ou mieux) ;
 *   3. `area`    — commune, quartier, ou à défaut chef-lieu de wilaya. La fiche
 *                  l'annonce alors comme approximatif au lieu de faire passer
 *                  un centre-ville pour l'adresse de la salle.
 */

/** Conditions d'utilisation de Nominatim : les résultats doivent être mis en
 *  cache. Une requête par adresse et par mois, pas une par affichage de fiche. */
const GEOCODE_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Au-delà, la fiche s'affiche avec le repli wilaya : une carte centrée sur la
 *  ville vaut mieux qu'une page qui attend un service tiers. */
const GEOCODE_TIMEOUT_MS = 4_000;

/** Nombre d'adresses candidates essayées avant de renoncer (voir `buildQueries`).
 *  Chaque essai est un appel réseau : on s'arrête au premier résultat. */
const MAX_QUERIES = 3;

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

/** Nominatim exige un User-Agent identifiant l'application appelante. */
const USER_AGENT = `LIUDOR/1.0 (+${
  process.env.NEXTAUTH_URL ?? "http://localhost:3000"
})`;

/**
 * `place_rank` à partir duquel un résultat désigne une rue ou un bâtiment,
 * et non plus une commune ou un quartier (échelle Nominatim : 26 = rue,
 * 30 = numéro de voirie, 16 à 20 = ville, commune, faubourg).
 */
const STREET_LEVEL_RANK = 25;

/** Cadrage minimal (~900 m de côté) : une rue courte ne doit pas coller la
 *  carte à l'asphalte, on veut reconnaître le quartier autour. */
const MIN_SPAN = 0.004;

/** Cadrage maximal (~20 km de côté) : au-delà, la carte ne montre plus rien. */
const MAX_SPAN = 0.09;

/** Cadrage d'un simple centre de wilaya (~15 km de côté). */
const CITY_SPAN = 0.07;

export type LocationPrecision = "exact" | "address" | "area";

export interface RoomLocation {
  latitude: number;
  longitude: number;
  precision: LocationPrecision;
  /** Demi-côté du cadrage conseillé, en degrés : déduit de l'emprise du lieu
   *  trouvé, pour qu'une rue et une commune ne s'affichent pas au même zoom. */
  span: number;
  /** Zone sur laquelle la carte est centrée quand `precision` vaut `area` :
   *  nom de la commune trouvée, ou de la wilaya en dernier recours. */
  label: string | null;
}

/** Champs d'adresse d'une salle : le sous-ensemble de `RoomDetail` utile ici. */
export interface RoomAddress {
  address: string;
  district: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

/** Adresse sur une ligne : « 12 rue X, Quartier, Wilaya ». */
export function formatRoomAddress(room: {
  address: string;
  district: string | null;
  city: string;
}): string {
  return [room.address, room.district, room.city].filter(Boolean).join(", ");
}

/**
 * Position à afficher pour une salle, ou `null` quand même la wilaya est
 * inconnue — la fiche montre alors un cadre neutre plutôt qu'une carte fausse.
 *
 * Ne lève jamais : une panne de Nominatim dégrade la précision, elle ne casse
 * pas la fiche.
 */
export async function resolveRoomLocation(
  room: RoomAddress
): Promise<RoomLocation | null> {
  if (room.latitude !== null && room.longitude !== null) {
    return {
      latitude: room.latitude,
      longitude: room.longitude,
      precision: "exact",
      span: MIN_SPAN * 2,
      label: null,
    };
  }

  for (const query of buildQueries(room)) {
    try {
      const place = await geocode(query);
      if (place) return toLocation(place);
    } catch (error) {
      // Réseau coupé, quota, service indisponible : inutile d'insister avec
      // les candidates suivantes, on retombe sur la wilaya.
      console.error("[géocodage] échec de la requête", query, error);
      break;
    }
  }

  const center = wilayaCenter(room.city);
  if (!center) return null;

  return {
    ...center,
    precision: "area",
    span: CITY_SPAN,
    label: room.city,
  };
}

/**
 * Adresses candidates, de la plus précise à la plus large.
 *
 * Nominatim ne pardonne pas les adresses approximatives, et c'est la norme ici :
 * « Route Ouled fayet, vers Chéraga, Alger » ne renvoie rien tel quel. On
 * redécoupe donc l'adresse autour des virgules et on réessaie :
 *
 *   1. l'adresse entière, seule chance d'obtenir un numéro de voirie ;
 *   2. son **premier** segment, qui porte la voie (« Route Ouled fayet ») ;
 *   3. son **dernier**, qui porte presque toujours la commune (« Bir El Djir »),
 *      connue d'OpenStreetMap quand la rue ne l'est pas.
 *
 * L'ordre compte : commencer par la fin ferait passer un repère vague avant la
 * rue elle-même, et « vers Chéraga » ramène une voie à l'autre bout d'Alger.
 */
function buildQueries(room: RoomAddress): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();
  const city = room.city.trim();

  const add = (...segments: (string | null)[]) => {
    const query = segments
      .map((segment) => segment?.trim())
      .filter((segment): segment is string => Boolean(segment))
      .join(", ");

    const key = normalizeText(query);
    if (!key || seen.has(key)) return;

    seen.add(key);
    queries.push(`${query}, Algérie`);
  };

  const segments = room.address
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment && normalizeText(segment) !== normalizeText(city));

  add(room.address, room.district, city);
  add(segments.at(0) ?? null, city);
  add(segments.at(-1) ?? null, city);
  add(room.district, city);

  return queries.slice(0, MAX_QUERIES);
}

interface NominatimPlace {
  name?: string;
  lat?: string;
  lon?: string;
  place_rank?: number;
  /** [sud, nord, ouest, est], en chaînes de caractères. */
  boundingbox?: [string, string, string, string];
}

/** Traduit un résultat Nominatim en position affichable. */
function toLocation(place: NominatimPlace): RoomLocation {
  const streetLevel = (place.place_rank ?? 0) >= STREET_LEVEL_RANK;

  return {
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    precision: streetLevel ? "address" : "area",
    span: spanFromBoundingBox(place.boundingbox),
    label: streetLevel ? null : (place.name ?? null),
  };
}

/**
 * Cadrage déduit de l'emprise renvoyée par Nominatim : une rue tient dans
 * quelques centaines de mètres, une commune dans plusieurs kilomètres, et la
 * carte doit suivre. Bornes de sécurité aux deux bouts — une impasse de 80 m
 * cadrée au plus près ne montrerait plus rien de reconnaissable.
 */
function spanFromBoundingBox(box: NominatimPlace["boundingbox"]): number {
  if (!box || box.length !== 4) return MIN_SPAN * 2;

  const [south, north, west, east] = box.map(Number);
  if (![south, north, west, east].every(Number.isFinite)) return MIN_SPAN * 2;

  const span = Math.max(north - south, east - west) / 2;
  return Math.min(Math.max(span, MIN_SPAN), MAX_SPAN);
}

/**
 * Appel Nominatim, mémorisé un mois par requête.
 *
 * La fonction **lève** en cas d'échec technique au lieu de renvoyer `null` :
 * `unstable_cache` ne mémorise pas une exception, et une coupure réseau
 * passagère ne fige donc pas la salle sur le centre de sa wilaya pour un mois.
 * Une adresse simplement introuvable, elle, est une réponse valide : le `null`
 * est mis en cache et les affichages suivants n'y reviennent pas.
 */
const geocode = unstable_cache(
  async (query: string): Promise<NominatimPlace | null> => {
    const url = `${NOMINATIM_ENDPOINT}?${new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1",
      countrycodes: "dz",
      "accept-language": "fr",
    })}`;

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Nominatim a répondu ${response.status}`);
    }

    const results = (await response.json()) as NominatimPlace[];
    const place = Array.isArray(results) ? results[0] : undefined;

    if (!place?.lat || !place?.lon) return null;
    if (!Number.isFinite(Number(place.lat))) return null;
    if (!Number.isFinite(Number(place.lon))) return null;

    return place;
  },
  ["room-geocode"],
  { revalidate: GEOCODE_TTL_SECONDS }
);
