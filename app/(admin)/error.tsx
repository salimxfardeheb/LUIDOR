"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/**
 * Écran d'erreur des pages d'administration.
 *
 * Le message technique n'est pas affiché : il n'apporte rien d'actionnable et
 * peut divulguer des détails d'implémentation. Il part dans la console, où le
 * support peut le récupérer, et seul le `digest` reste visible pour rapprocher
 * l'incident des journaux serveur.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[admin] rendu impossible", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="error" title="Cette page n'a pas pu être chargée">
        Les données de la plateforme sont momentanément indisponibles. Réessayez
        dans un instant ; si le problème persiste, prévenez l&apos;équipe
        technique.
        {error.digest && (
          <span className="mt-1 block text-xs text-gray-500">
            Référence : {error.digest}
          </span>
        )}
      </Alert>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          <RotateCcw aria-hidden className="h-4 w-4" />
          Réessayer
        </Button>
        <Link href="/admin/dashboard">
          <Button variant="outline">Retour au tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
