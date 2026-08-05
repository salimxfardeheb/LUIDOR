"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import { uniqueSlug } from "@/lib/admin/blog";
import { fieldErrorsFrom, text, type FieldErrors } from "@/lib/forms";
import {
  deleteStoredPhoto,
  isStorageConfigured,
  saveBlogCover,
  StorageForbiddenError,
  StorageNotConfiguredError,
} from "@/lib/storage";

/**
 * Rédaction et publication des articles du blog.
 *
 * Le slug n'est jamais saisi à la main : il est dérivé du titre et rendu unique
 * côté serveur. Une URL d'article est publique et durable — la laisser à la
 * frappe exposerait à des doublons et à des caractères invalides.
 */

export type PostActionResult =
  | { ok: true; postId: string; message: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      status?: AdminRefusal["status"];
    };

/** État consommé par `useFormState` : seuls les échecs y transitent. */
export type PostFormState = Extract<PostActionResult, { ok: false }> | null;

const BLOG_PATH = "/admin/blog";

/** Taille maximale d'une couverture : au-delà, l'envoi est refusé côté serveur. */
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const postSchema = z.object({
  title: z
    .string()
    .min(5, "Le titre doit faire au moins 5 caractères.")
    .max(160, "Titre trop long : 160 caractères au maximum."),
  content: z
    .string()
    .min(50, "L'article doit faire au moins 50 caractères.")
    .max(50_000, "Article trop long : 50 000 caractères au maximum."),
});

function revalidatePost(slug?: string) {
  revalidatePath(BLOG_PATH);
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
}

/**
 * Crée ou met à jour un article.
 *
 * `postId` vide vaut création. L'action redirige vers l'éditeur de l'article
 * enregistré, pour qu'un rechargement ne repropose pas une nouvelle création.
 */
export async function saveBlogPost(
  _prevState: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const postId = text(formData.get("postId"));
  const parsed = postSchema.safeParse({
    title: text(formData.get("title")),
    content: text(formData.get("content")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez le titre et le contenu de l'article.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const cover = formData.get("cover");
  const hasCover = cover instanceof File && cover.size > 0;

  if (hasCover) {
    if (!COVER_TYPES.includes(cover.type)) {
      return {
        ok: false,
        message: "Format d'image non pris en charge.",
        fieldErrors: { cover: "Utilisez un fichier JPEG, PNG, WebP ou AVIF." },
      };
    }
    if (cover.size > MAX_COVER_BYTES) {
      return {
        ok: false,
        message: "Image trop lourde.",
        fieldErrors: { cover: "5 Mo au maximum." },
      };
    }
    if (!isStorageConfigured()) {
      return {
        ok: false,
        message:
          "L'envoi d'images n'est pas configuré sur cet environnement. Enregistrez l'article sans couverture.",
      };
    }
  }

  const existing = postId
    ? await prisma.blogPost.findUnique({
        where: { id: postId },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          coverImagePublicId: true,
        },
      })
    : null;

  if (postId && !existing) {
    return { ok: false, status: 404, message: "Cet article n'existe plus." };
  }

  // Le slug ne suit le titre que tant que l'article n'est pas enregistré : le
  // renommer ensuite casserait les liens déjà partagés.
  const slug = existing
    ? existing.slug
    : await uniqueSlug(parsed.data.title);

  let saved: { id: string; slug: string };

  try {
    saved = existing
      ? await prisma.blogPost.update({
          where: { id: existing.id },
          data: { title: parsed.data.title, content: parsed.data.content },
          select: { id: true, slug: true },
        })
      : await prisma.blogPost.create({
          data: { title: parsed.data.title, content: parsed.data.content, slug },
          select: { id: true, slug: true },
        });
  } catch (error) {
    console.error("saveBlogPost a échoué", error);
    return { ok: false, message: "L'enregistrement a échoué. Réessayez." };
  }

  if (hasCover) {
    try {
      const stored = await saveBlogCover(saved.id, cover);
      await prisma.blogPost.update({
        where: { id: saved.id },
        data: {
          coverImageUrl: stored.url,
          coverImagePublicId: stored.publicId,
        },
      });

      // L'ancienne image ne part qu'une fois la nouvelle enregistrée : un échec
      // d'envoi laisse l'article avec sa couverture précédente.
      if (existing?.coverImagePublicId) {
        await deleteStoredPhoto({ publicId: existing.coverImagePublicId });
      }
    } catch (error) {
      console.error("saveBlogCover a échoué", error);
      const message =
        error instanceof StorageForbiddenError ||
        error instanceof StorageNotConfiguredError
          ? "L'article est enregistré, mais le service d'images a refusé l'envoi."
          : "L'article est enregistré, mais la couverture n'a pas pu être envoyée.";
      return { ok: false, message, fieldErrors: { cover: message } };
    }
  }

  await recordAudit({
    userId: session.adminId,
    action: "POST_SAVED",
    target: parsed.data.title,
    detail: existing ? "modification" : "création",
  });

  revalidatePost(saved.slug);

  // Hors du `try` : `redirect()` lève une exception interne qu'un bloc
  // d'erreur avalerait.
  redirect(`${BLOG_PATH}/${saved.id}?enregistre=1`);
}

/** Publie un article ou le repasse en brouillon. */
export async function setPostPublished(
  postId: string,
  published: boolean
): Promise<PostActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = z.string().min(1).safeParse(postId);
  if (!parsed.success) return { ok: false, message: "Article inconnu." };

  const post = await prisma.blogPost.findUnique({
    where: { id: parsed.data },
    select: { title: true, slug: true, publishedAt: true, content: true },
  });

  if (!post) {
    return { ok: false, status: 404, message: "Cet article n'existe plus." };
  }

  if ((post.publishedAt !== null) === published) {
    return {
      ok: false,
      status: 409,
      message: published
        ? "Cet article est déjà publié."
        : "Cet article est déjà un brouillon.",
    };
  }

  try {
    await prisma.blogPost.update({
      where: { id: parsed.data },
      data: { publishedAt: published ? new Date() : null },
    });
  } catch (error) {
    console.error("setPostPublished a échoué", error);
    return { ok: false, message: "La mise à jour a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: published ? "POST_PUBLISHED" : "POST_UNPUBLISHED",
    target: post.title,
  });

  revalidatePost(post.slug);

  return {
    ok: true,
    postId: parsed.data,
    message: published ? "Article publié." : "Article repassé en brouillon.",
  };
}

/** Supprime un article et sa couverture. */
export async function deleteBlogPost(
  postId: string
): Promise<PostActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = z.string().min(1).safeParse(postId);
  if (!parsed.success) return { ok: false, message: "Article inconnu." };

  const post = await prisma.blogPost.findUnique({
    where: { id: parsed.data },
    select: { title: true, slug: true, coverImagePublicId: true },
  });

  if (!post) {
    return { ok: false, status: 404, message: "Cet article n'existe plus." };
  }

  try {
    await prisma.blogPost.delete({ where: { id: parsed.data } });
  } catch (error) {
    console.error("deleteBlogPost a échoué", error);
    return { ok: false, message: "La suppression a échoué. Réessayez." };
  }

  await deleteStoredPhoto({ publicId: post.coverImagePublicId });

  await recordAudit({
    userId: session.adminId,
    action: "POST_UNPUBLISHED",
    target: post.title,
    detail: "article supprimé",
  });

  revalidatePost(post.slug);

  return { ok: true, postId: parsed.data, message: "Article supprimé." };
}
