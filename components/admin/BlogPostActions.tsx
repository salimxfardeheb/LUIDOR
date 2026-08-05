"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteBlogPost, setPostPublished } from "@/actions/admin-blog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Publication et suppression d'un article.
 *
 * Publier et dépublier sont réversibles et s'appliquent directement ; la
 * suppression, elle, emporte le contenu et sa couverture, donc elle se
 * confirme.
 */
export function BlogPostActions({
  postId,
  title,
  published,
  /** `true` sur la page d'édition : la suppression y renvoie à la liste. */
  redirectOnDelete = false,
  layout = "row",
}: {
  postId: string;
  title: string;
  published: boolean;
  redirectOnDelete?: boolean;
  layout?: "row" | "column";
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function togglePublished() {
    setPending(true);
    setError(null);

    const result = await setPostPublished(postId, !published);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  async function remove() {
    setPending(true);
    setError(null);

    const result = await deleteBlogPost(postId);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirmOpen(false);

    if (redirectOnDelete) {
      router.push("/admin/blog");
      return;
    }

    router.refresh();
  }

  return (
    <div
      className={
        layout === "column"
          ? "flex flex-col gap-2"
          : "flex flex-col items-end gap-2"
      }
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant={published ? "outline" : "primary"}
          size="sm"
          disabled={pending}
          onClick={togglePublished}
        >
          {published ? (
            <EyeOff aria-hidden className="h-4 w-4" />
          ) : (
            <Eye aria-hidden className="h-4 w-4" />
          )}
          {pending ? "Un instant…" : published ? "Dépublier" : "Publier"}
          <span className="sr-only"> l&apos;article {title}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          <span className="sr-only">Supprimer l&apos;article {title}</span>
        </Button>
      </div>

      {error && !confirmOpen && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => (pending ? undefined : setConfirmOpen(false))}
        title="Supprimer cet article ?"
        description={`« ${title} » et son image de couverture seront définitivement supprimés.`}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          {published && (
            <Alert variant="warning" title="Article en ligne">
              Cet article est publié : son adresse ne renverra plus rien après
              la suppression.
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={remove}
            >
              {pending ? "Suppression…" : "Supprimer l'article"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
