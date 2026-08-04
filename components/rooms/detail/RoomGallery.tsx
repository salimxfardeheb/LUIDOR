"use client";

import * as React from "react";
import Image from "next/image";
import { Images, Play } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PhotoFallback } from "@/components/ui/PhotoFallback";

/** Vignettes affichées dans la colonne de droite. */
const THUMBNAILS = 3;

/**
 * Galerie de la fiche salle : une grande photo principale et une colonne de
 * trois vignettes.
 *
 * - La photo principale porte le badge « Photos (N) » et ouvre la galerie complète.
 * - Si la salle a une visite vidéo, la première vignette porte un bouton play.
 * - La dernière vignette porte l'overlay « +N photos » dès qu'il reste des
 *   visuels non affichés.
 *
 * Tant qu'aucune photo n'est déposée, chaque emplacement affiche le dégradé de
 * marque (`PhotoFallback`) : la structure de la maquette reste lisible.
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

  const mainPhoto = photos[0] ?? null;
  const thumbnails = photos.slice(1, 1 + THUMBNAILS);
  // Emplacements vides comblés pour conserver la colonne de trois vignettes.
  const slots = Array.from(
    { length: THUMBNAILS },
    (_, index) => thumbnails[index] ?? null
  );
  const remaining = Math.max(0, photos.length - 1 - THUMBNAILS);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr] sm:grid-rows-3">
        {/* Photo principale */}
        <div className="relative overflow-hidden rounded-lg bg-primary-900 sm:row-span-3">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label={
              photos.length > 0
                ? `Voir les ${photos.length} photos de ${roomName}`
                : `Photos de ${roomName}`
            }
            className="group relative block aspect-[4/3] w-full sm:aspect-auto sm:h-full"
          >
            {mainPhoto ? (
              <Image
                src={mainPhoto}
                alt={`Salle ${roomName}`}
                fill
                priority
                sizes="(min-width: 640px) 66vw, 100vw"
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
        </div>

        {/* Colonne de vignettes */}
        {slots.map((photo, index) => {
          const isVideoSlot = index === 0 && videoUrl !== null;
          const isOverflowSlot = index === THUMBNAILS - 1 && remaining > 0;

          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-lg bg-primary-900"
            >
              <div className="relative aspect-[4/3] w-full sm:aspect-auto sm:h-full">
                {photo ? (
                  <Image
                    src={photo}
                    alt={`Salle ${roomName} — photo ${index + 2}`}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <PhotoFallback />
                )}

                {isVideoSlot && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Voir la visite vidéo de ${roomName} (nouvelle fenêtre)`}
                    className="absolute inset-0 flex items-center justify-center bg-primary-900/40 transition-colors hover:bg-primary-900/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-md">
                      <Play
                        aria-hidden
                        className="h-5 w-5 translate-x-0.5 fill-primary-900 text-primary-900"
                      />
                    </span>
                  </a>
                )}

                {isOverflowSlot && (
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(true)}
                    className="absolute inset-0 flex items-center justify-center bg-primary-900/60 text-sm font-semibold text-white transition-colors hover:bg-primary-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  >
                    +{remaining} photos
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
              <li
                key={photo}
                className="relative aspect-[4/3] overflow-hidden rounded-md bg-primary-900"
              >
                <Image
                  src={photo}
                  alt={`Salle ${roomName} — photo ${index + 1}`}
                  fill
                  sizes="(min-width: 640px) 45vw, 90vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
