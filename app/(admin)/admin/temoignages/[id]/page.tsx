import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { getTestimonial, nextPosition } from "@/lib/admin/testimonials";
import { TestimonialEditor } from "@/components/admin/TestimonialEditor";
import { TestimonialActions } from "@/components/admin/TestimonialActions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/temoignages/[id] — éditeur, protégée (ADMIN).
// `nouveau` n'est pas un identifiant : c'est le segment de création.
export const metadata: Metadata = { title: "Éditeur de témoignage" };

const NEW_TESTIMONIAL_SEGMENT = "nouveau";

interface PageProps {
  params: { id: string };
  searchParams: { enregistre?: string };
}

export default async function Page({ params, searchParams }: PageProps) {
  await requireAdminPage(`/admin/temoignages/${params.id}`);

  const isNew = params.id === NEW_TESTIMONIAL_SEGMENT;
  const testimonial = isNew ? null : await getTestimonial(params.id);

  if (!isNew && !testimonial) notFound();

  // Une création se place en fin de liste ; une modification garde sa position,
  // et la valeur suggérée n'est alors pas utilisée.
  const suggestedPosition = isNew ? await nextPosition() : 0;
  const published = testimonial?.publishedAt != null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/temoignages"
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Retour aux témoignages
      </Link>

      <PageHeader
        title={isNew ? "Nouveau témoignage" : "Modifier le témoignage"}
        description={
          isNew
            ? "Le témoignage est créé en brouillon : vous le publierez quand il sera prêt."
            : testimonial?.authorName
        }
      >
        {testimonial && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={published ? "success" : "neutral"}>
              {published ? "Publié" : "Brouillon"}
            </Badge>
            <TestimonialActions
              testimonialId={testimonial.id}
              authorName={testimonial.authorName}
              published={published}
              redirectOnDelete
            />
          </div>
        )}
      </PageHeader>

      {searchParams.enregistre && (
        <Alert variant="success" title="Témoignage enregistré">
          Vos modifications ont été sauvegardées.
        </Alert>
      )}

      <TestimonialEditor
        testimonial={testimonial}
        suggestedPosition={suggestedPosition}
      />
    </div>
  );
}
