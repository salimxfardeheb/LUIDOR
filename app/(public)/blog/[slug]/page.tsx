import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostMeta } from "@/components/blog/BlogCard";
import { BlogContent } from "@/components/blog/BlogContent";
import { BlogGrid, BlogGridSkeleton } from "@/components/blog/BlogGrid";
import { Button } from "@/components/ui/Button";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import {
  getPublishedPost,
  getRelatedPosts,
  RELATED_POSTS_COUNT,
} from "@/lib/blog/queries";

// Route /blog/[slug] — contenu d'un article publié.
// Un brouillon, un article programmé ou un slug inconnu donnent la même 404 :
// rien ne distingue de l'extérieur un article non publié d'un article inexistant.

interface PageProps {
  params: { slug: string };
}

/**
 * Page régénérée toutes les 5 minutes. La publication et la modification d'un
 * article appellent déjà `revalidatePath("/blog/<slug>")` (actions/admin-blog.ts) :
 * ce délai n'est qu'un filet de sécurité.
 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const post = await getPublishedPost(params.slug);

  if (!post) return { title: "Article introuvable" };

  const url = `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "LIUDOR",
      title: post.title,
      description: post.excerpt,
      url,
      publishedTime: post.publishedAt,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const post = await getPublishedPost(params.slug);

  if (!post) notFound();

  return (
    <article className="pb-16">
      {/* Couverture pleine largeur, hors de la grille du contenu. */}
      <div className="relative aspect-[16/9] w-full bg-primary-900 sm:aspect-[21/9]">
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <PhotoFallback />
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="mt-8 sm:mt-10">
          <BackToBlog className="mb-6" />

          <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
            {post.title}
          </h1>

          <PostMeta
            publishedAt={post.publishedAt}
            readingMinutes={post.readingMinutes}
            className="mt-4 text-sm"
          />
        </header>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <BlogContent content={post.content} />
        </div>

        <footer className="mt-10 border-t border-gray-200 pt-6">
          <BackToBlog />
        </footer>
      </div>

      <section
        aria-labelledby="articles-similaires-titre"
        className="mx-auto mt-14 max-w-7xl px-4 sm:px-6"
      >
        <h2
          id="articles-similaires-titre"
          className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
        >
          Articles similaires
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Les derniers conseils publiés par l&apos;équipe LIUDOR.
        </p>

        <div className="mt-6">
          <Suspense
            fallback={
              <BlogGridSkeleton
                count={RELATED_POSTS_COUNT}
                label="Chargement des articles similaires"
              />
            }
          >
            <RelatedPostsSection postId={post.id} />
          </Suspense>
        </div>
      </section>
    </article>
  );
}

function BackToBlog({ className }: { className?: string }) {
  return (
    <Link href="/blog" className={className}>
      <Button variant="outline" size="sm">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Retour aux articles
      </Button>
    </Link>
  );
}

async function RelatedPostsSection({ postId }: { postId: string }) {
  try {
    const posts = await getRelatedPosts(postId);

    // Article unique du blog : la section n'a rien à proposer, on la laisse
    // silencieuse plutôt que d'afficher une grille vide.
    if (posts.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
          Aucun autre article n&apos;est publié pour le moment.
        </p>
      );
    }

    return <BlogGrid posts={posts} />;
  } catch (error) {
    console.error("[article] chargement des articles similaires", error);
    return null;
  }
}
