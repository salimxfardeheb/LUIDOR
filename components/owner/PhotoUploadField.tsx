"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, RotateCcw, Trash2, Upload } from "lucide-react";
import { PHOTO_ACCEPT, PHOTO_LIMITS } from "@/lib/rooms/schemas";
import { cn } from "@/lib/utils";

export interface ExistingPhoto {
  id: string;
  url: string;
}

/**
 * Champ photos : envoi multiple, aperçu avant soumission, et retrait des photos
 * déjà enregistrées.
 *
 * Les fichiers choisis sont maintenus dans un `DataTransfer` recopié dans
 * l'`input` : c'est le seul moyen de retirer un fichier d'une sélection tout en
 * conservant un `<input type="file">` natif, donc une soumission classique par
 * FormData sans état parallèle à resynchroniser.
 *
 * Les photos existantes ne sont pas supprimées ici : leur identifiant part dans
 * un champ caché `removePhotoIds` et c'est l'action serveur qui tranche.
 */
export function PhotoUploadField({
  existing = [],
  error,
}: {
  existing?: ExistingPhoto[];
  error?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [removedIds, setRemovedIds] = React.useState<Set<string>>(new Set());
  const [localError, setLocalError] = React.useState<string | null>(null);

  const keptExisting = existing.filter((photo) => !removedIds.has(photo.id));
  const total = keptExisting.length + files.length;
  const remaining = PHOTO_LIMITS.maxCount - total;

  // Les URLs d'aperçu sont révoquées au démontage pour ne pas fuiter en mémoire.
  const previews = React.useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );
  React.useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews]
  );

  /** Recopie la liste dans l'input pour que la soumission reste native. */
  const syncInput = (next: File[]) => {
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFiles(next);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const picked = Array.from(event.target.files ?? []);

    const accepted: File[] = [];
    for (const file of picked) {
      if (!PHOTO_LIMITS.types.includes(file.type as never)) {
        setLocalError(
          `« ${file.name} » n'est pas une image acceptée (JPEG, PNG, WebP ou AVIF).`
        );
        continue;
      }
      if (file.size > PHOTO_LIMITS.maxBytes) {
        setLocalError(
          `« ${file.name} » dépasse ${PHOTO_LIMITS.maxBytes / (1024 * 1024)} Mo.`
        );
        continue;
      }
      accepted.push(file);
    }

    const room = PHOTO_LIMITS.maxCount - keptExisting.length;
    if (accepted.length > room) {
      setLocalError(
        `${PHOTO_LIMITS.maxCount} photos maximum par salle : seules les ${room} premières ont été retenues.`
      );
    }

    syncInput(accepted.slice(0, room));
  };

  const removeFile = (target: File) =>
    syncInput(files.filter((file) => file !== target));

  const toggleExisting = (id: string) =>
    setRemovedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const message = error ?? localError;

  return (
    <div>
      {/* Zone de sélection */}
      <label
        htmlFor="photos"
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          message
            ? "border-error/50 bg-error/5"
            : "border-gray-300 bg-gray-50 hover:border-secondary/60 hover:bg-secondary/5"
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10">
          <Upload aria-hidden className="h-5 w-5 text-secondary" />
        </span>
        <span className="text-sm font-medium text-gray-900">
          Choisir des photos
        </span>
        <span className="text-xs text-gray-500">
          JPEG, PNG, WebP ou AVIF · {PHOTO_LIMITS.maxBytes / (1024 * 1024)} Mo
          par fichier · {PHOTO_LIMITS.maxCount} photos maximum
          {total > 0 && ` · ${remaining} emplacement${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
        </span>
      </label>

      <input
        ref={inputRef}
        id="photos"
        name="photos"
        type="file"
        multiple
        accept={PHOTO_ACCEPT}
        onChange={handleChange}
        aria-describedby={message ? "photos-error" : undefined}
        aria-invalid={Boolean(message)}
        className="sr-only"
      />

      {message && (
        <p id="photos-error" className="mt-2 text-xs font-medium text-error">
          {message}
        </p>
      )}

      {/* Photos déjà enregistrées */}
      {existing.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Photos actuelles ({keptExisting.length})
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {existing.map((photo) => {
              const removed = removedIds.has(photo.id);

              return (
                <li key={photo.id} className="relative">
                  <div
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-md border bg-primary-900",
                      removed ? "border-error/40 opacity-40" : "border-gray-200"
                    )}
                  >
                    <Image
                      src={photo.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 20vw, 45vw"
                      className="object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExisting(photo.id)}
                    className={cn(
                      "mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                      removed
                        ? "border-gray-300 text-gray-600 hover:bg-gray-100"
                        : "border-error/30 text-error hover:bg-error/5"
                    )}
                  >
                    {removed ? (
                      <>
                        <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                        Annuler
                      </>
                    ) : (
                      <>
                        <Trash2 aria-hidden className="h-3.5 w-3.5" />
                        Retirer
                      </>
                    )}
                  </button>

                  {removed && (
                    <input type="hidden" name="removePhotoIds" value={photo.id} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Aperçu des fichiers à envoyer */}
      {previews.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            À ajouter ({previews.length})
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {previews.map(({ file, url }) => (
              <li key={url}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-secondary/40 bg-primary-900">
                  {/* Aperçu local (blob:) : `next/image` n'optimise pas ces URLs. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  Enlever
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {total === 0 && (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <ImagePlus aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
          Sans photo, la salle affichera un visuel de remplacement dans le
          catalogue. Vous pourrez en ajouter plus tard.
        </p>
      )}
    </div>
  );
}
