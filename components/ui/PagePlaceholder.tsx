import * as React from "react";
import { cn } from "@/lib/utils";

interface PagePlaceholderProps {
  /** Titre affiché en h1 — sert à valider le routing et le layout. */
  title: string;
  /** Rôle de la page, à remplacer par le contenu réel lors du développement. */
  description?: string;
  className?: string;
}

/**
 * Bloc temporaire utilisé par toutes les pages tant que leur contenu
 * n'est pas développé. À supprimer page par page.
 */
export function PagePlaceholder({
  title,
  description,
  className,
}: PagePlaceholderProps) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-12 sm:px-6", className)}>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-gray-500">{description}</p>
      )}
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
        Contenu à développer
      </div>
    </section>
  );
}
