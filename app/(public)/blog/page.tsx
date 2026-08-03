import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// Route /blog — index des articles.
export const metadata: Metadata = { title: "Blog" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Blog"
      description="Liste des articles publiés : conseils d'organisation d'événements et actualités LIUDOR."
    />
  );
}
