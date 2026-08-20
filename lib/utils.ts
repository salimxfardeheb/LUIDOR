import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Forme comparable d'un texte : sans accents, sans casse, sans espaces de
 * bordure. Sert aux recherches saisies à la main, où « setif », « Sétif » et
 * « SETIF » doivent trouver la même entrée.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
