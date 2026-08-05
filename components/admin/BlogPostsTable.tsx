import Image from "next/image";
import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import type { AdminPostRow } from "@/lib/admin/blog";
import { BlogPostActions } from "@/components/admin/BlogPostActions";
import { ADMIN_ROW_ACTION, ADMIN_TH, ADMIN_TH_RIGHT } from "@/components/admin/table";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatNumber } from "@/lib/format";

/** Liste des articles : brouillons en tête, puis publications récentes. */
export function BlogPostsTable({ posts }: { posts: AdminPostRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <caption className="sr-only">
          Articles du blog, avec leur état de publication et leur adresse.
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th scope="col" className={ADMIN_TH}>
              Article
            </th>
            <th scope="col" className={ADMIN_TH}>
              État
            </th>
            <th scope="col" className={ADMIN_TH}>
              Longueur
            </th>
            <th scope="col" className={ADMIN_TH}>
              Dernière modification
            </th>
            <th scope="col" className={ADMIN_TH_RIGHT}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {posts.map((post) => {
            const published = post.publishedAt !== null;

            return (
              <tr key={post.id}>
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  <span className="flex items-center gap-3">
                    <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {post.coverImageUrl ? (
                        <Image
                          src={post.coverImageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <FileText
                          aria-hidden
                          className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-gray-300"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="block truncate text-gray-900 underline-offset-2 hover:underline"
                      >
                        {post.title}
                      </Link>
                      <span className="block truncate text-xs font-normal text-gray-400">
                        /blog/{post.slug}
                      </span>
                    </span>
                  </span>
                </th>
                <td className="py-3 pr-4">
                  <Badge variant={published ? "success" : "neutral"}>
                    {published ? "Publié" : "Brouillon"}
                  </Badge>
                  {published && post.publishedAt && (
                    <span className="mt-1 block text-xs text-gray-400">
                      le {formatDate(post.publishedAt)}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 tabular-nums text-gray-600">
                  {formatNumber(post.contentLength)} car.
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-gray-600">
                  {formatDate(post.updatedAt)}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      title="Modifier l'article"
                      className={ADMIN_ROW_ACTION}
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                      <span className="sr-only">Modifier {post.title}</span>
                    </Link>
                    <BlogPostActions
                      postId={post.id}
                      title={post.title}
                      published={published}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
