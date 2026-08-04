"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/**
 * Écran d'erreur des pages du compte.
 *
 * Le message technique n'est pas affiché : il ne dit rien d'actionnable à
 * l'utilisateur et peut divulguer des détails d'implémentation. Il part dans la
 * console du navigateur, où le support peut le récupérer.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[compte] rendu impossible", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="error" title="Cette page n'a pas pu être chargée">
        Une erreur est survenue de notre côté. Réessayez dans un instant ; si le
        problème persiste, contactez le support.
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
        <Link href="/">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </div>
    </div>
  );
}
