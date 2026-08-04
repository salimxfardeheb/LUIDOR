"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nombre de caractères au-delà duquel le texte est replié. */
const COLLAPSE_THRESHOLD = 420;

/**
 * Description de la salle, repliée au-delà de quelques lignes.
 *
 * Le texte complet est toujours dans le DOM — seul son affichage est tronqué :
 * il reste donc indexable et accessible aux lecteurs d'écran même replié.
 */
export function RoomDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const collapsible = description.length > COLLAPSE_THRESHOLD;

  const paragraphs = description
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div>
      <div
        id="description-salle"
        className={cn(
          "space-y-3 text-sm leading-relaxed text-gray-600",
          collapsible && !expanded && "line-clamp-5"
        )}
      >
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="description-salle"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
        >
          {expanded ? "Voir moins" : "Voir plus"}
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      )}
    </div>
  );
}
