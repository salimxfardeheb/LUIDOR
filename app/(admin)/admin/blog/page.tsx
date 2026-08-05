import type { Metadata } from "next";
import Link from "next/link";
import { FileText, PenLine, Plus, Send } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import { getPostCounts, listBlogPosts } from "@/lib/admin/blog";
import { formatNumber } from "@/lib/format";
import { BlogPostsTable } from "@/components/admin/BlogPostsTable";
import { StatTiles } from "@/components/admin/StatTiles";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/blog — gestion des articles, protégée (ADMIN).
export const metadata: Metadata = { title: "Blog" };

export default async function Page() {
  await requireAdminPage("/admin/blog");

  const [posts, counts] = await Promise.all([listBlogPosts(), getPostCounts()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Articles du blog"
        description="Rédigez et publiez les articles du site. Un brouillon reste invisible du public tant qu'il n'est pas publié."
      >
        <Link href="/admin/blog/nouveau">
          <Button>
            <Plus aria-hidden className="h-4 w-4" />
            Nouvel article
          </Button>
        </Link>
      </PageHeader>

      <StatTiles
        className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-3"
        tiles={[
          {
            icon: FileText,
            label: "Articles au total",
            value: formatNumber(counts.total),
            tone: "primary",
          },
          {
            icon: Send,
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

      <p className="text-sm text-gray-500" aria-live="polite">
        {posts.length === 0
          ? "Aucun article à afficher."
          : `${posts.length} article${posts.length > 1 ? "s" : ""} affiché${
              posts.length > 1 ? "s" : ""
            }.`}
      </p>

      {posts.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="Aucun article pour le moment"
          description="Le blog alimente le référencement du site et répond aux questions des clients avant leur réservation."
          action={{ href: "/admin/blog/nouveau", label: "Rédiger le premier article" }}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <BlogPostsTable posts={posts} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
