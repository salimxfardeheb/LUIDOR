import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Substitut affiché tant qu'aucune photo n'est disponible (visuel non encore
 * fourni, ou salle publiée sans image). Purement CSS : aucun fichier à charger,
 * donc aucun risque de 404 ni de saut de mise en page.
 */
export function PhotoFallback({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 bg-primary-900 bg-[radial-gradient(ellipse_at_50%_20%,rgb(var(--color-secondary)/0.28),transparent_60%),linear-gradient(160deg,rgb(var(--color-primary-700)/0.55),transparent_65%)]",
        className
      )}
    >
      <ImageIcon className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/15" />
    </div>
  );
}
