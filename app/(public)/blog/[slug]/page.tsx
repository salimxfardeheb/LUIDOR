import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /blog/[slug] — contenu d'un article publié.
export const metadata: Metadata = { title: "Article" };

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <PagePlaceholder
      title="Article"
      description={`Image de couverture, contenu de l'article, date de publication et articles liés. Article demandé : « ${params.slug} ».`}
    />
  );
}
