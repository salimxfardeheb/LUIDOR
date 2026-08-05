import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { getBlogPost } from "@/lib/admin/blog";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { BlogPostActions } from "@/components/admin/BlogPostActions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/blog/[id] — éditeur d'article, protégée (ADMIN).
// `nouveau` n'est pas un identifiant : c'est le segment de création.
export const metadata: Metadata = { title: "Éditeur d'article" };

const NEW_POST_SEGMENT = "nouveau";

interface PageProps {
  params: { id: string };
  searchParams: { enregistre?: string };
}

export default async function Page({ params, searchParams }: PageProps) {
  await requireAdminPage(`/admin/blog/${params.id}`);

  const isNew = params.id === NEW_POST_SEGMENT;
  const post = isNew ? null : await getBlogPost(params.id);

  if (!isNew && !post) notFound();

  const published = post?.publishedAt != null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Retour aux articles
      </Link>

      <PageHeader
        title={isNew ? "Nouvel article" : "Modifier l'article"}
        description={
          isNew
            ? "L'article est créé en brouillon : vous le publierez quand il sera prêt."
            : post?.title
        }
      >
        {post && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={published ? "success" : "neutral"}>
              {published ? "Publié" : "Brouillon"}
            </Badge>
            <BlogPostActions
              postId={post.id}
              title={post.title}
              published={published}
              redirectOnDelete
            />
          </div>
        )}
      </PageHeader>

      {searchParams.enregistre && (
        <Alert variant="success" title="Article enregistré">
          Vos modifications ont été sauvegardées.
        </Alert>
      )}

      <BlogEditor post={post} />
    </div>
  );
}
