"use client";

import * as React from "react";
import { RotateCcw, Trash2, Upload } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Role } from "@/lib/roles";
import { AVATAR_ACCEPT, AVATAR_LIMITS } from "@/lib/account/schemas";
import { cn } from "@/lib/utils";

/**
 * Champ avatar : aperçu de la photo actuelle, choix d'un nouveau fichier et
 * retrait de l'existant.
 *
 * Le contrôle reste un `<input type="file">` natif : la soumission passe donc
 * par le FormData de l'action serveur, sans état parallèle à resynchroniser.
 * Le retrait n'est pas appliqué ici — il part dans un champ caché et c'est
 * l'action qui tranche.
 */
export function AvatarUploadField({
  name,
  currentUrl,
  role,
  error,
}: {
  /** Nom complet, pour les initiales du repli. */
  name: string;
  currentUrl: string | null;
  /** Rôle du compte : donne sa couleur au repli, comme dans l'en-tête. */
  role: Role;
  error?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [removed, setRemoved] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // L'URL d'aperçu est révoquée au changement de fichier et au démontage.
  const previewUrl = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );
  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const picked = event.target.files?.[0] ?? null;

    if (!picked) return clearInput();

    if (!AVATAR_LIMITS.types.includes(picked.type as never)) {
      setLocalError(
        "Format non accepté : choisissez une image JPEG, PNG, WebP ou AVIF."
      );
      return clearInput();
    }

    if (picked.size > AVATAR_LIMITS.maxBytes) {
      setLocalError(
        `L'image dépasse ${AVATAR_LIMITS.maxBytes / (1024 * 1024)} Mo.`
      );
      return clearInput();
    }

    setRemoved(false);
    setFile(picked);
  };

  const message = error ?? localError;
  const showsCurrent = Boolean(currentUrl) && !removed && !previewUrl;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex justify-center sm:block">
        {previewUrl ? (
          // Aperçu local (blob:) : `next/image` n'optimise pas ces URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Aperçu de la nouvelle photo de profil"
            className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <Avatar
            name={name}
            src={showsCurrent ? currentUrl : null}
            role={role}
            size="lg"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <label
          htmlFor="avatar"
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-5 py-6 text-center transition-colors",
            message
              ? "border-error/50 bg-error/5"
              : "border-gray-300 bg-gray-50 hover:border-secondary/60 hover:bg-secondary/5"
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
            <Upload aria-hidden className="h-5 w-5 text-secondary" />
          </span>
          <span className="text-sm font-medium text-gray-900">
            {file ? file.name : "Choisir une photo"}
          </span>
          <span className="text-xs text-gray-500">
            JPEG, PNG, WebP ou AVIF ·{" "}
            {AVATAR_LIMITS.maxBytes / (1024 * 1024)} Mo maximum
          </span>
        </label>

        <input
          ref={inputRef}
          id="avatar"
          name="avatar"
          type="file"
          accept={AVATAR_ACCEPT}
          onChange={handleChange}
          aria-describedby={message ? "avatar-error" : undefined}
          aria-invalid={Boolean(message)}
          className="sr-only"
        />

        {message && (
          <p id="avatar-error" className="mt-2 text-xs font-medium text-error">
            {message}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-3">
          {file && (
            <button
              type="button"
              onClick={clearInput}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              Annuler le choix
            </button>
          )}

          {currentUrl && !file && (
            <button
              type="button"
              onClick={() => setRemoved((current) => !current)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                removed
                  ? "border-gray-300 text-gray-600 hover:bg-gray-100"
                  : "border-error/30 text-error hover:bg-error/5"
              )}
            >
              {removed ? (
                <>
                  <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                  Conserver la photo
                </>
              ) : (
                <>
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  Retirer la photo
                </>
              )}
            </button>
          )}
        </div>

        {removed && <input type="hidden" name="removeAvatar" value="1" />}

        {removed && (
          <p className="mt-2 text-xs text-gray-500">
            Votre photo sera retirée à l&apos;enregistrement ; vos initiales la
            remplaceront.
          </p>
        )}
      </div>
    </div>
  );
}
