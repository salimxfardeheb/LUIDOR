import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Gabarit commun aux sections de la page « À propos » : titre, accroche et
 * contenu, dans la largeur du site public. `tone` alterne fond blanc et fond
 * gris clair pour marquer la séparation sans multiplier les bordures.
 */
export function AboutSection({
  id,
  title,
  lead,
  tone = "light",
  className,
  children,
}: {
  /** Identifiant du bloc : sert d'ancre et de cible à `aria-labelledby`. */
  id: string;
  title: string;
  lead?: string;
  tone?: "light" | "muted";
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-titre`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-24",
        tone === "muted" ? "bg-gray-50" : "bg-white",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-3xl">
          <h2
            id={headingId}
            className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
          >
            {title}
          </h2>
          {lead && (
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {lead}
            </p>
          )}
        </div>

        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
