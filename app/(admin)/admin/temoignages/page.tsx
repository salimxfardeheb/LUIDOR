import type { Metadata } from "next";
import Link from "next/link";
import { Eye, MessageSquareQuote, PenLine, Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import {
  getTestimonialCounts,
  listTestimonials,
} from "@/lib/admin/testimonials";
import { HOME_TESTIMONIALS_COUNT } from "@/lib/home/queries";
import { formatNumber } from "@/lib/format";
import { TestimonialsTable } from "@/components/admin/TestimonialsTable";
import { StatTiles } from "@/components/admin/StatTiles";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/temoignages — témoignages de l'accueil, protégée (ADMIN).
export const metadata: Metadata = { title: "Témoignages" };

export default async function Page() {
  await requireAdminPage("/admin/temoignages");

  const [testimonials, counts] = await Promise.all([
    listTestimonials(),
    getTestimonialCounts(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Témoignages de l'accueil"
        description="Les avis mis en avant sur la page d'accueil. Un brouillon reste invisible du public tant qu'il n'est pas publié."
      >
        <Link href="/admin/temoignages/nouveau">
          <Button>
            <Plus aria-hidden className="h-4 w-4" />
            Nouveau témoignage
          </Button>
        </Link>
      </PageHeader>

      <StatTiles
        className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-3"
        tiles={[
          {
            icon: MessageSquareQuote,
            label: "Témoignages au total",
            value: formatNumber(counts.total),
            tone: "primary",
          },
          {
            icon: Eye,
            label: "Publiés",
            value: formatNumber(counts.published),
            tone: "accent",
          },
          {
            icon: PenLine,
            label: "Brouillons",
            value: formatNumber(counts.drafts),
            tone: counts.drafts > 0 ? "warning" : "neutral",
          },
        ]}
      />

      {/*
        Au-delà de la capacité de la section, les derniers publiés ne sortent
        pas : le dire ici évite de chercher pourquoi un témoignage enregistré et
        publié reste introuvable sur l'accueil.
      */}
      {counts.published > HOME_TESTIMONIALS_COUNT && (
        <Alert variant="info" title="Tous ne sont pas affichés">
          L&apos;accueil montre les {HOME_TESTIMONIALS_COUNT} premiers
          témoignages publiés, dans l&apos;ordre d&apos;affichage ci-dessous.
          Les {counts.published - HOME_TESTIMONIALS_COUNT} suivants restent en
          réserve.
        </Alert>
      )}

      <p className="text-sm text-gray-500" aria-live="polite">
        {testimonials.length === 0
          ? "Aucun témoignage à afficher."
          : `${testimonials.length} témoignage${
              testimonials.length > 1 ? "s" : ""
            } affiché${testimonials.length > 1 ? "s" : ""}.`}
      </p>

      {testimonials.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="Aucun témoignage pour le moment"
          description="La section « Ils ont réservé avec LIUDOR » disparaît de l'accueil tant qu'aucun témoignage n'est publié."
          action={{
            href: "/admin/temoignages/nouveau",
            label: "Ajouter le premier témoignage",
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <TestimonialsTable testimonials={testimonials} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
