import { Suspense } from "react";
import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { Categories } from "@/components/home/Categories";
import {
  PopularRooms,
  PopularRoomsSkeleton,
} from "@/components/home/PopularRooms";
import { Destinations } from "@/components/home/Destinations";
import { WhyLiudor } from "@/components/home/WhyLiudor";
import { Testimonials } from "@/components/home/Testimonials";
import { Newsletter } from "@/components/home/Newsletter";

// Route / — page d'entrée du site public.
export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Trouvez et réservez la salle des fêtes idéale pour votre mariage, anniversaire ou événement professionnel partout en Algérie.",
};

/**
 * Page prérendue puis régénérée toutes les 5 minutes : les salles mises en
 * avant changent rarement, inutile d'interroger la base à chaque visite.
 */
export const revalidate = 300;

/**
 * Les sections alimentées par Prisma sont enveloppées dans `<Suspense>` :
 * le hero et les catégories s'affichent immédiatement, sans attendre la base.
 */
export default function Page() {
  return (
    <>
      <Hero />
      <Categories />

      <Suspense fallback={<PopularRoomsSkeleton />}>
        <PopularRooms />
      </Suspense>

      <Suspense fallback={null}>
        <Destinations />
      </Suspense>

      <WhyLiudor />

      <Suspense fallback={null}>
        <Testimonials />
      </Suspense>

      <Newsletter />
    </>
  );
}
