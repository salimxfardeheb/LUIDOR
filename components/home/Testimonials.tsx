import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { getHomeTestimonials } from "@/lib/home/queries";

/**
 * Section serveur : les témoignages publiés depuis /admin/temoignages.
 *
 * Rien à afficher — aucun témoignage publié, ou base indisponible — signifie
 * ici ne rien afficher du tout. Contrairement aux salles populaires, une
 * vitrine de citations n'a pas d'état vide utile : un titre « Ils ont réservé
 * avec LIUDOR » suivi d'un encart d'excuses ferait plus de mal que son absence.
 */
export async function Testimonials() {
  try {
    const testimonials = await getHomeTestimonials();
    if (testimonials.length === 0) return null;

    return <TestimonialsCarousel testimonials={testimonials} />;
  } catch (error) {
    console.error("[accueil] chargement des témoignages", error);
    return null;
  }
}
