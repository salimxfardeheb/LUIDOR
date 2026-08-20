import Link from "next/link";
import { Pencil, Star } from "lucide-react";
import type { AdminTestimonial } from "@/lib/admin/testimonials";
import { TestimonialActions } from "@/components/admin/TestimonialActions";
import {
  ADMIN_ROW_ACTION,
  ADMIN_TABLE_SCROLL,
  ADMIN_TH,
  ADMIN_TH_RIGHT,
} from "@/components/admin/table";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Liste des témoignages, dans l'ordre où ils apparaissent sur l'accueil.
 *
 * La colonne « Ordre » affiche la valeur qui pilote ce classement : c'est le
 * seul endroit où l'équipe peut vérifier l'enchaînement sans ouvrir chaque
 * fiche. Les brouillons y figurent à leur place future.
 */
export function TestimonialsTable({
  testimonials,
}: {
  testimonials: AdminTestimonial[];
}) {
  return (
    <div className={ADMIN_TABLE_SCROLL}>
      <table className="w-full min-w-[860px] text-sm">
        <caption className="sr-only">
          Témoignages de la page d&apos;accueil, avec leur état de publication et
          leur ordre d&apos;affichage.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Ordre
            </th>
            <th scope="col" className={ADMIN_TH}>
              Auteur
            </th>
            <th scope="col" className={ADMIN_TH}>
              Témoignage
            </th>
            <th scope="col" className={ADMIN_TH}>
              Note
            </th>
            <th scope="col" className={ADMIN_TH}>
              État
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {testimonials.map((testimonial) => {
            const published = testimonial.publishedAt !== null;

            return (
              <tr key={testimonial.id}>
                <td className="py-3 pr-4 tabular-nums text-gray-500">
                  {testimonial.position}
                </td>
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-900 text-xs font-semibold text-white"
                    >
                      {formatInitials(testimonial.authorName)}
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/admin/temoignages/${testimonial.id}`}
                        className="block truncate text-gray-900 underline-offset-2 hover:underline"
                      >
                        {testimonial.authorName}
                      </Link>
                      <span className="block truncate text-xs font-normal text-gray-400">
                        {testimonial.role}
                      </span>
                    </span>
                  </span>
                </th>
                <td className="max-w-md py-3 pr-4 text-gray-600">
                  <span className="line-clamp-2">« {testimonial.quote} »</span>
                </td>
                <td className="py-3 pr-4">
                  <Rating value={testimonial.rating} />
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={published ? "success" : "neutral"}>
                    {published ? "Publié" : "Brouillon"}
                  </Badge>
                  {published && testimonial.publishedAt && (
                    <span className="mt-1 block text-xs text-gray-400">
                      le {formatDate(testimonial.publishedAt)}
                    </span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/temoignages/${testimonial.id}`}
                      title="Modifier le témoignage"
                      className={ADMIN_ROW_ACTION}
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                      <span className="sr-only">
                        Modifier le témoignage de {testimonial.authorName}
                      </span>
                    </Link>
                    <TestimonialActions
                      testimonialId={testimonial.id}
                      authorName={testimonial.authorName}
                      published={published}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <span className="sr-only">{value} étoiles sur 5</span>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden
          className={cn(
            "h-3.5 w-3.5",
            index < value ? "fill-secondary text-secondary" : "text-gray-300"
          )}
        />
      ))}
    </span>
  );
}
