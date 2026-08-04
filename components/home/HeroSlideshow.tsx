"use client";

import * as React from "react";
import Image from "next/image";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import { HERO_IMAGES } from "@/lib/home/content";
import { cn } from "@/lib/utils";

/** Durée d'affichage d'une photo avant l'enchaînement, en millisecondes. */
const SLIDE_DURATION_MS = 2000;

/** Durée du fondu enchaîné : plus court que l'affichage, sinon rien n'est net. */
const FADE_MS = 700;

/** Durée du zoom lent appliqué à la photo active. */
const ZOOM_MS = 3200;

/**
 * Diaporama de fond du hero : les photos s'enchaînent en fondu toutes les deux
 * secondes, avec un léger zoom sur la photo active.
 *
 * Toutes les photos sont empilées et superposées ; seule leur opacité change, ce
 * qui évite tout recalcul de mise en page à chaque transition. Les visiteurs
 * ayant demandé la réduction des animations (`prefers-reduced-motion`) voient
 * une seule photo fixe.
 */
export function HeroSlideshow() {
  const [index, setIndex] = React.useState(0);
  const [animated, setAnimated] = React.useState(false);

  // Le réglage système n'est lisible que côté client : on démarre sans
  // animation, puis on l'active si le visiteur ne l'a pas désactivée.
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimated(!query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    if (!animated || HERO_IMAGES.length < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, SLIDE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [animated]);

  if (HERO_IMAGES.length === 0) return <PhotoFallback />;

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {HERO_IMAGES.map((src, position) => {
        const active = position === index;

        return (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            // La première photo est visible au chargement : elle passe en
            // priorité, les suivantes se chargent pendant le premier cycle.
            priority={position === 0}
            sizes="100vw"
            className={cn(
              "object-cover",
              active ? "opacity-100" : "opacity-0",
              animated && active ? "scale-105" : "scale-100"
            )}
            style={
              animated
                ? {
                    transition: `opacity ${FADE_MS}ms ease-out, transform ${ZOOM_MS}ms ease-out`,
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
