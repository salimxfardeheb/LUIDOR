"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { TESTIMONIALS } from "@/lib/home/content";
import { cn } from "@/lib/utils";

/**
 * Carousel de témoignages.
 *
 * Les trois cartes sont visibles simultanément sur grand écran ; le carousel
 * ne s'active qu'en dessous, où une seule carte tient à l'écran.
 */
export function Testimonials() {
  const [index, setIndex] = React.useState(0);
  const count = TESTIMONIALS.length;

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <section
      aria-labelledby="temoignages-titre"
      aria-roledescription="carrousel"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="temoignages-titre"
            className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
          >
            Ils ont réservé avec LIUDOR
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Des avis laissés par des clients dont la réservation a été confirmée.
          </p>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ArrowButton label="Témoignage précédent" onClick={() => go(index - 1)}>
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </ArrowButton>
          <ArrowButton label="Témoignage suivant" onClick={() => go(index + 1)}>
            <ChevronRight aria-hidden className="h-5 w-5" />
          </ArrowButton>
        </div>
      </div>

      <div className="mt-8 overflow-hidden lg:overflow-visible">
        <ul
          className="flex transition-transform duration-300 ease-out lg:grid lg:grid-cols-3 lg:gap-6 lg:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {TESTIMONIALS.map((testimonial) => (
            <li key={testimonial.id} className="w-full shrink-0 px-0.5 lg:px-0">
              <figure className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <Quote aria-hidden className="h-7 w-7 text-secondary/40" />

                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700">
                  <p>« {testimonial.quote} »</p>
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white"
                  >
                    {testimonial.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {testimonial.name}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {testimonial.role}
                    </span>
                    <Rating value={testimonial.rating} />
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2.5 lg:hidden">
        <p aria-live="polite" className="sr-only">
          Témoignage {index + 1} sur {count}
        </p>
        {TESTIMONIALS.map((testimonial, i) => (
          <button
            key={testimonial.id}
            type="button"
            aria-current={i === index ? "true" : undefined}
            aria-label={`Afficher le témoignage de ${testimonial.name}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2",
              i === index ? "w-8 bg-secondary" : "w-2.5 bg-gray-300 hover:bg-gray-400"
            )}
          />
        ))}
      </div>
    </section>
  );
}

function ArrowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-xs transition-colors hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="mt-1 flex items-center gap-0.5">
      <span className="sr-only">{value} étoiles sur 5</span>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "h-3.5 w-3.5",
            i < value ? "fill-secondary text-secondary" : "text-gray-300"
          )}
        />
      ))}
    </span>
  );
}
