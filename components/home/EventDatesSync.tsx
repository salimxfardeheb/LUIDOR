"use client";

import { useEffect } from "react";

/**
 * Garde la date de fin de l'événement renseignée.
 *
 * La barre de recherche est un formulaire non contrôlé rendu côté serveur, et la
 * case « plusieurs jours » ne révèle la date de fin qu'en CSS : sans ce
 * complément, cocher la case fait apparaître un champ vide, et la période
 * saisie se réduit alors silencieusement à sa date de début.
 *
 * Ce composant ne rend rien — il ne fait que recopier la date de début dans la
 * date de fin dès que celle-ci est vide ou antérieure, y compris quand c'est
 * l'utilisateur qui vient de l'effacer. Il branche des écouteurs
 * sur les champs par leur `id` plutôt que de passer la barre entière côté
 * client : la recherche continue de fonctionner sans JavaScript, où le
 * préremplissage du rendu serveur et `parseRoomFilters` prennent le relais.
 */
export function EventDatesSync({
  startId,
  endId,
  toggleId,
}: {
  startId: string;
  endId: string;
  toggleId: string;
}) {
  useEffect(() => {
    const start = document.getElementById(startId);
    const end = document.getElementById(endId);
    const toggle = document.getElementById(toggleId);
    if (
      !(start instanceof HTMLInputElement) ||
      !(end instanceof HTMLInputElement) ||
      !(toggle instanceof HTMLInputElement)
    ) {
      return;
    }

    const fillEnd = () => {
      if (!start.value) return;
      // Le format ISO des champs `date` se compare comme du texte.
      if (!end.value || end.value < start.value) end.value = start.value;
    };

    // Au montage : la barre peut être rendue avec une date de début venue de
    // l'URL, et une date de fin qu'aucune saisie ne viendra remplir.
    fillEnd();
    // `change` et non `input` : les champs `date` passent par une valeur vide à
    // chaque segment saisi, et se corriger en cours de frappe serait pénible.
    const sources = [start, end, toggle];
    for (const field of sources) field.addEventListener("change", fillEnd);

    return () => {
      for (const field of sources) field.removeEventListener("change", fillEnd);
    };
  }, [startId, endId, toggleId]);

  return null;
}
