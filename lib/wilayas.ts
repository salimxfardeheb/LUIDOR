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
