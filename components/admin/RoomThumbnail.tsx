import Image from "next/image";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import { cn } from "@/lib/utils";

/**
 * Vignette d'une salle dans un tableau d'administration.
 *
 * `alt` vide et `aria-hidden` : le nom de la salle est déjà la cellule voisine,
 * répéter l'image ferait doublon dans un lecteur d'écran. Sans photo, on tombe
 * sur le motif de la charte plutôt que sur une image cassée.
 */
export function RoomThumbnail({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block h-11 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100",
        className
      )}
    >
      {src ? (
        <Image src={src} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <PhotoFallback />
      )}
    </span>
  );
}
