import { normalizeText } from "@/lib/utils";

/**
 * Référentiel des 58 wilayas d'Algérie (découpage administratif de 2019).
 *
 * L'ordre du tableau est celui des codes officiels : l'index 0 est la wilaya 01.
 * C'est l'ordre dans lequel les Algériens lisent une liste de wilayas, et il
 * évite de stocker le code à côté de chaque nom.
 *
 * La valeur retenue par l'application est le **nom** : `Room.city` reste une
 * chaîne, aucune migration n'est nécessaire, et les villes déjà en base
 * (Alger, Oran, Constantine, Annaba, Sétif) figurent toutes dans la liste.
 */

const WILAYA_NAMES = [
  "Adrar",
  "Chlef",
  "Laghouat",
  "Oum El Bouaghi",
  "Batna",
  "Béjaïa",
  "Biskra",
  "Béchar",
  "Blida",
  "Bouira",
  "Tamanrasset",
  "Tébessa",
  "Tlemcen",
  "Tiaret",
  "Tizi Ouzou",
  "Alger",
  "Djelfa",
  "Jijel",
  "Sétif",
  "Saïda",
  "Skikda",
  "Sidi Bel Abbès",
  "Annaba",
  "Guelma",
  "Constantine",
  "Médéa",
  "Mostaganem",
  "M'Sila",
  "Mascara",
  "Ouargla",
  "Oran",
  "El Bayadh",
  "Illizi",
  "Bordj Bou Arreridj",
  "Boumerdès",
  "El Tarf",
  "Tindouf",
  "Tissemsilt",
  "El Oued",
  "Khenchela",
  "Souk Ahras",
  "Tipaza",
  "Mila",
  "Aïn Defla",
  "Naâma",
  "Aïn Témouchent",
  "Ghardaïa",
  "Relizane",
  "Timimoun",
  "Bordj Badji Mokhtar",
  "Ouled Djellal",
  "Béni Abbès",
  "In Salah",
  "In Guezzam",
  "Touggourt",
  "Djanet",
  "El M'Ghair",
  "El Meniaa",
] as const;

export type WilayaName = (typeof WILAYA_NAMES)[number];

export interface Wilaya {
  /** Code officiel sur deux chiffres, tel qu'il s'écrit couramment (16, 31…). */
  code: string;
  name: WilayaName;
}

export const WILAYAS: readonly Wilaya[] = WILAYA_NAMES.map((name, index) => ({
  code: String(index + 1).padStart(2, "0"),
  name,
}));

/**
 * Options prêtes pour le sélecteur : la valeur soumise est le nom, le code sert
 * d'accélérateur de saisie (taper « 16 » trouve Alger).
 */
export const WILAYA_OPTIONS = WILAYAS.map((wilaya) => ({
  value: wilaya.name,
  hint: wilaya.code,
}));

/**
 * Renvoie le nom canonique de la wilaya correspondant à `value`, ou `null` si
 * aucune ne correspond. Utilisé par la validation serveur : le sélecteur est une
 * aide à la saisie, pas une garantie — une action serveur reste un point d'entrée
 * HTTP qui peut recevoir n'importe quelle chaîne.
 */
export function findWilaya(value: string): WilayaName | null {
  const needle = normalizeText(value);
  if (!needle) return null;

  const match = WILAYAS.find((wilaya) => normalizeText(wilaya.name) === needle);
  return match ? match.name : null;
}

/**
 * Coordonnées du chef-lieu de chaque wilaya.
 *
 * Sert de repli à la carte de la fiche salle : quand l'adresse n'a pas pu être
 * géocodée, on centre la carte sur la wilaya et on l'annonce comme approximative
 * plutôt que de laisser un cadre vide (voir `lib/rooms/geocode.ts`).
 *
 * Le type `Record<WilayaName, …>` est volontaire : ajouter une wilaya à
 * `WILAYA_NAMES` sans sa position ne compilera pas.
 */
const WILAYA_CENTERS: Record<WilayaName, WilayaCenter> = {
  Adrar: { latitude: 27.8743, longitude: -0.2939 },
  Chlef: { latitude: 36.165, longitude: 1.3345 },
  Laghouat: { latitude: 33.8, longitude: 2.865 },
  "Oum El Bouaghi": { latitude: 35.8753, longitude: 7.1135 },
  Batna: { latitude: 35.556, longitude: 6.1741 },
  Béjaïa: { latitude: 36.7509, longitude: 5.0567 },
  Biskra: { latitude: 34.85, longitude: 5.7333 },
  Béchar: { latitude: 31.6167, longitude: -2.2167 },
  Blida: { latitude: 36.4703, longitude: 2.8277 },
  Bouira: { latitude: 36.3739, longitude: 3.902 },
  Tamanrasset: { latitude: 22.785, longitude: 5.5228 },
  Tébessa: { latitude: 35.4042, longitude: 8.1244 },
  Tlemcen: { latitude: 34.8828, longitude: -1.3167 },
  Tiaret: { latitude: 35.3711, longitude: 1.317 },
  "Tizi Ouzou": { latitude: 36.7118, longitude: 4.0455 },
  Alger: { latitude: 36.7538, longitude: 3.0588 },
  Djelfa: { latitude: 34.6703, longitude: 3.263 },
  Jijel: { latitude: 36.819, longitude: 5.7667 },
  Sétif: { latitude: 36.1898, longitude: 5.4108 },
  Saïda: { latitude: 34.8303, longitude: 0.1517 },
  Skikda: { latitude: 36.8761, longitude: 6.9094 },
  "Sidi Bel Abbès": { latitude: 35.1878, longitude: -0.6308 },
  Annaba: { latitude: 36.9, longitude: 7.7667 },
  Guelma: { latitude: 36.4611, longitude: 7.4261 },
  Constantine: { latitude: 36.365, longitude: 6.6147 },
  Médéa: { latitude: 36.2675, longitude: 2.7539 },
  Mostaganem: { latitude: 35.9315, longitude: 0.0894 },
  "M'Sila": { latitude: 35.705, longitude: 4.542 },
  Mascara: { latitude: 35.3968, longitude: 0.14 },
  Ouargla: { latitude: 31.9497, longitude: 5.3252 },
  Oran: { latitude: 35.6969, longitude: -0.6331 },
  "El Bayadh": { latitude: 33.68, longitude: 1.02 },
  Illizi: { latitude: 26.4833, longitude: 8.4667 },
  "Bordj Bou Arreridj": { latitude: 36.0731, longitude: 4.7614 },
  Boumerdès: { latitude: 36.766, longitude: 3.4772 },
  "El Tarf": { latitude: 36.7672, longitude: 8.3139 },
  Tindouf: { latitude: 27.6711, longitude: -8.1478 },
  Tissemsilt: { latitude: 35.6072, longitude: 1.8106 },
  "El Oued": { latitude: 33.3683, longitude: 6.8517 },
  Khenchela: { latitude: 35.4361, longitude: 7.1436 },
  "Souk Ahras": { latitude: 36.2864, longitude: 7.9511 },
  Tipaza: { latitude: 36.5894, longitude: 2.4483 },
  Mila: { latitude: 36.4503, longitude: 6.2644 },
  "Aïn Defla": { latitude: 36.2639, longitude: 1.9678 },
  Naâma: { latitude: 33.2667, longitude: -0.3167 },
  "Aïn Témouchent": { latitude: 35.2978, longitude: -1.14 },
  Ghardaïa: { latitude: 32.49, longitude: 3.67 },
  Relizane: { latitude: 35.7372, longitude: 0.5556 },
  Timimoun: { latitude: 29.2639, longitude: 0.2306 },
  "Bordj Badji Mokhtar": { latitude: 21.3287, longitude: 0.955 },
  "Ouled Djellal": { latitude: 34.4167, longitude: 5.0667 },
  "Béni Abbès": { latitude: 30.1333, longitude: -2.1667 },
  "In Salah": { latitude: 27.1936, longitude: 2.4606 },
  "In Guezzam": { latitude: 19.5686, longitude: 5.7722 },
  Touggourt: { latitude: 33.1, longitude: 6.0667 },
  Djanet: { latitude: 24.554, longitude: 9.4843 },
  "El M'Ghair": { latitude: 33.95, longitude: 5.9167 },
  "El Meniaa": { latitude: 30.5833, longitude: 2.8833 },
};

export interface WilayaCenter {
  latitude: number;
  longitude: number;
}

/**
 * Position du chef-lieu de la wilaya écrite dans `Room.city`, ou `null` si la
 * valeur ne correspond à aucune wilaya connue (donnée saisie avant le
 * sélecteur, import manuel…).
 */
export function wilayaCenter(city: string): WilayaCenter | null {
  const name = findWilaya(city);
  return name ? WILAYA_CENTERS[name] : null;
}
