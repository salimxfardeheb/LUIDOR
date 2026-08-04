"use client";

import * as React from "react";
import Image from "next/image";
import { Images, Play } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import { cn } from "@/lib/utils";

/** Vignettes affichées sous la photo (4 en mobile, 6 à partir de `sm`). */
const THUMBNAILS = 6;

/**
 * Galerie de la fiche salle : une grande photo en vision, et une bande de
 * petites vignettes juste en dessous.
 *
 * - Cliquer une vignette affiche la photo correspondante en grand ; la vignette
 *   active est cerclée.
 * - Le badge « Photos (N) » et la dernière vignette (« +N ») ouvrent la galerie
 *   complète en modale.
 * - La visite vidéo, si elle existe, est un bouton posé sur la grande photo.
 *
 * Tant qu'aucune photo n'est déposée, la zone principale affiche le dégradé de
 * marque (`PhotoFallback`) et la bande de vignettes est masquée.
 */
export function RoomGallery({
  roomName,
  photos,
  videoUrl,
}: {
  roomName: string;
  photos: string[];
  videoUrl: string | null;
}) {
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const activePhoto = photos[activeIndex] ?? photos[0] ?? null;
  const thumbnails = photos.slice(0, THUMBNAILS);
  // Visuels restants, signalés par l'overlay de la dernière vignette.
  const remaining = Math.max(0, photos.length - THUMBNAILS);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {/* Photo en vision : son format ancre la hauteur de la galerie. */}
        <div className="relative overflow-hidden rounded-lg bg-primary-900">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label={
              photos.length > 0
                ? `Voir les ${photos.length} photos de ${roomName}`
                : `Photos de ${roomName}`
            }
            className="group relative block aspect-[4/3] w-full sm:aspect-[3/2]"
          >
            {activePhoto ? (
              <Image
                src={activePhoto}
                alt={`Salle ${roomName}`}
                fill
                priority
                sizes="(min-width: 1024px) 53rem, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <PhotoFallback />
            )}

            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur transition-colors group-hover:bg-white">
              <Images aria-hidden className="h-4 w-4 text-secondary" />
              Photos ({photos.length})
            </span>
          </button>

          {videoUrl !== null && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Voir la visite vidéo de ${roomName} (nouvelle fenêtre)`}
              className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 py-1.5 pl-2 pr-3.5 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-900">
                <Play
                  aria-hidden
                  className="h-3 w-3 translate-x-px fill-white text-white"
                />
              </span>
              Voir la vidéo
            </a>
          )}
        </div>

        {/* Bande de vignettes — uniquement s'il existe d'autres visuels. */}
        {photos.length > 1 && (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {thumbnails.map((photo, index) => {
              const isOverflowSlot =
                index === thumbnails.length - 1 && remaining > 0;
              const isActive = !isOverflowSlot && index === activeIndex;

              return (
                <li key={photo} className="min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      isOverflowSlot
                        ? setGalleryOpen(true)
                        : setActiveIndex(index)
                    }
                    aria-label={
                      isOverflowSlot
                        ? `Voir les ${remaining} autres photos de ${roomName}`
                        : `Afficher la photo ${index + 1} de ${roomName}`
                    }
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-primary-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                      isActive
                        ? "ring-2 ring-secondary ring-offset-2"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={photo}
                      alt={`Salle ${roomName} — photo ${index + 1}`}
                      fill
                      sizes="(min-width: 640px) 9rem, 25vw"
                      className="object-cover"
                    />

                    {isOverflowSlot && (
                      <span className="absolute inset-0 flex items-center justify-center bg-primary-900/60 text-xs font-semibold text-white">
                        +{remaining}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={`Photos de ${roomName}`}
        description={
          photos.length > 0
            ? `${photos.length} ${photos.length > 1 ? "visuels" : "visuel"} fournis par le propriétaire.`
            : undefined
        }
        className="max-w-4xl"
      >
        {photos.length === 0 ? (
          <p className="text-sm text-gray-500">
            Le propriétaire n&apos;a pas encore déposé de photo pour cette salle.
            Contactez-le pour obtenir des visuels avant de réserver.
          </p>
        ) : (
          <ul className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
            {photos.map((photo, index) => (
              <li key={photo}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(index);
                    setGalleryOpen(false);
                  }}
                  aria-label={`Afficher la photo ${index + 1} de ${roomName} en grand`}
                  className="group relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                >
                  <Image
                    src={photo}
                    alt={`Salle ${roomName} — photo ${index + 1}`}
                    fill
                    sizes="(min-width: 640px) 45vw, 90vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
