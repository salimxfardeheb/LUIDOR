import { Suspense } from "react";
import type { Metadata } from "next";
import { BlogGrid, BlogGridSkeleton } from "@/components/blog/BlogGrid";
import { BlogEmptyState, BlogErrorState } from "@/components/blog/BlogStates";
import { Pagination } from "@/components/ui/Pagination";
import {
  blogHref,
  parseBlogPage,
  type SearchParamsInput,
} from "@/lib/blog/params";
import { getPublishedPosts, POSTS_PER_PAGE } from "@/lib/blog/queries";
import { formatNumber } from "@/lib/format";

// Route /blog — index des articles publiés.

const TITLE = "Blog & conseils";
const DESCRIPTION =
  "Conseils d'organisation d'événements, guides de choix de salle et actualités LIUDOR.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    siteName: "LIUDOR",
    title: `${TITLE} | LIUDOR`,
    description: DESCRIPTION,
  },
};

interface PageProps {
  searchParams: SearchParamsInput;
}

export default function Page({ searchParams }: PageProps) {
  const page = parseBlogPage(searchParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {TITLE}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Nos guides pour organiser un mariage, un séminaire ou une réception en
          Algérie : budget, capacité, prestataires et retours d&apos;expérience.
        </p>
      </header>

      {/*
        Le squelette est remonté à chaque changement de page : la `key` recrée
        la frontière Suspense, donc l'utilisateur voit un état de chargement
        plutôt qu'une grille figée.
      */}
      <div className="mt-10">
        <Suspense key={page} fallback={<BlogGridSkeleton count={POSTS_PER_PAGE} />}>
          <PostsSection page={page} />
        </Suspense>
      </div>
    </div>
  );
}

/** Section serveur : une page d'articles publiés, du plus récent au plus ancien. */
async function PostsSection({ page: requestedPage }: { page: number }) {
  try {
    const { posts, total, page, pageCount } =
      await getPublishedPosts(requestedPage);

    if (posts.length === 0) return <BlogEmptyState />;

    return (
      <>
        <p aria-live="polite" className="mb-6 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">
            {formatNumber(total)}
          </span>{" "}
          {total > 1 ? "articles publiés" : "article publié"}
        </p>

        <BlogGrid posts={posts} />

        <Pagination
          page={page}
          pageCount={pageCount}
          buildHref={blogHref}
          label="Pagination des articles"
        />
      </>
    );
  } catch (error) {
    console.error("[blog] chargement des articles", error);
    return <BlogErrorState />;
  }
}
