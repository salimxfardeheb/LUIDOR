import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Note en étoiles, fractions comprises.
 *
 * Deux rangées superposées : les étoiles grises en fond, les dorées par-dessus
 * tronquées à la largeur correspondant à la note. Une note de 4,3 affiche donc
 * une quatrième étoile partiellement remplie, sans icône « demi-étoile ».
 */
export function Stars({
  value,
  size = "h-4 w-4",
  className,
  label,
}: {
  /** Note sur 5. */
  value: number;
  /** Classes de dimension appliquées à chaque étoile. */
  size?: string;
  className?: string;
  /** Libellé accessible ; par défaut « 4,3 sur 5 ». */
  label?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const stars = Array.from({ length: 5 }, (_, index) => index);

  return (
    <span
      role="img"
      aria-label={label ?? `${formatRating(value)} sur 5`}
      className={cn("relative inline-flex shrink-0", className)}
    >
      <span className="flex gap-0.5">
        {stars.map((index) => (
          <Star key={index} aria-hidden className={cn(size, "text-gray-300")} />
        ))}
      </span>

      <span
        aria-hidden
        style={{ width: `${percent}%` }}
        className="absolute left-0 top-0 overflow-hidden"
      >
        <span className="flex w-max gap-0.5">
          {stars.map((index) => (
            <Star
              key={index}
              className={cn(size, "fill-secondary text-secondary")}
            />
          ))}
        </span>
      </span>
    </span>
  );
}
