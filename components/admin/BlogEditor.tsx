"use client";

import * as React from "react";
import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
import { ImagePlus, Link2, Save, Trash2 } from "lucide-react";
import { saveBlogPost, type PostFormState } from "@/actions/admin-blog";
import type { AdminPost } from "@/lib/admin/blog";
import { slugify } from "@/lib/admin/blog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

const COVER_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_COVER_MB = 5;

/**
 * Éditeur d'article : titre, slug, contenu et image de couverture.
 *
 * Le slug affiché est calculé à la frappe pour montrer l'adresse à venir, mais
 * il n'est jamais envoyé : c'est le serveur qui l'établit et garantit son
 * unicité. Sur un article déjà enregistré, le slug est figé — le renommer
 * casserait les liens déjà partagés.
 */
export function BlogEditor({ post }: { post: AdminPost | null }) {
  const [state, formAction] = useFormState<PostFormState, FormData>(
    saveBlogPost,
    null
  );

  const [title, setTitle] = React.useState(post?.title ?? "");
  const [content, setContent] = React.useState(post?.content ?? "");
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverError, setCoverError] = React.useState<string | null>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  // L'URL d'aperçu est révoquée au changement de fichier et au démontage.
  const previewUrl = React.useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile]
  );
  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const slug = post?.slug ?? (slugify(title) || "…");
  const fieldErrors = state?.ok === false ? (state.fieldErrors ?? {}) : {};

  function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCoverError(null);
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_COVER_MB * 1024 * 1024) {
      setCoverError(`Image trop lourde : ${MAX_COVER_MB} Mo au maximum.`);
      if (coverInputRef.current) coverInputRef.current.value = "";
      setCoverFile(null);
      return;
    }

    setCoverFile(file);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {post && <input type="hidden" name="postId" value={post.id} />}

      {state?.ok === false && (
        <Alert variant="error" title="L'article n'a pas été enregistré">
          {state.message}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-gray-900">
                Titre
              </label>
              <Input
                id="title"
                name="title"
                required
                maxLength={160}
                value={title}
                placeholder="Ex. : Cinq questions à poser avant de réserver une salle"
                aria-invalid={fieldErrors.title ? true : undefined}
                aria-describedby={fieldErrors.title ? "title-erreur" : undefined}
                onChange={(event) => setTitle(event.target.value)}
              />
              {fieldErrors.title && (
                <p id="title-erreur" role="alert" className="text-sm text-error">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-900">
                Adresse de l&apos;article
              </span>
              <p className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                <Link2 aria-hidden className="h-4 w-4 shrink-0 text-secondary" />
                <span className="truncate">
                  /blog/<span className="font-semibold text-gray-900">{slug}</span>
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {post
                  ? "L'adresse est figée depuis la création : la modifier casserait les liens déjà partagés."
                  : "Générée à partir du titre, et rendue unique à l'enregistrement."}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="content" className="text-sm font-medium text-gray-900">
                Contenu
              </label>
              <Textarea
                id="content"
                name="content"
                required
                rows={18}
                maxLength={50_000}
                value={content}
                placeholder={"Rédigez l'article.\n\nUne ligne vide sépare deux paragraphes."}
                aria-invalid={fieldErrors.content ? true : undefined}
                aria-describedby={
                  fieldErrors.content ? "content-erreur" : "content-aide"
                }
                onChange={(event) => setContent(event.target.value)}
              />
              {fieldErrors.content ? (
                <p id="content-erreur" role="alert" className="text-sm text-error">
                  {fieldErrors.content}
                </p>
              ) : (
                <p id="content-aide" className="text-xs text-gray-500">
                  Aucune balise HTML n&apos;est enregistrée : la mise en forme
                  suit les conventions ci-contre.{" "}
                  <span className="tabular-nums">
                    {content.length.toLocaleString("fr-DZ")} caractères
                  </span>
                  .
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <FormattingHelp />

          <Card className="flex flex-col gap-4 p-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Image de couverture
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Affichée en tête de l&apos;article et sur la liste du blog.
              </p>
            </div>

            <CoverPreview
              previewUrl={previewUrl}
              currentUrl={post?.coverImageUrl ?? null}
              title={title || "Article sans titre"}
            />

            <input
              ref={coverInputRef}
              id="cover"
              name="cover"
              type="file"
              accept={COVER_ACCEPT}
              onChange={handleCoverChange}
              className={cn(
                "block w-full text-sm text-gray-600",
                "file:mr-3 file:rounded-md file:border-0 file:bg-primary-900 file:px-3 file:py-2",
                "file:text-sm file:font-medium file:text-white hover:file:bg-primary-700"
              )}
            />

            {(coverError || fieldErrors.cover) && (
              <p role="alert" className="text-sm text-error">
                {coverError ?? fieldErrors.cover}
              </p>
            )}

            {coverFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (coverInputRef.current) coverInputRef.current.value = "";
                  setCoverFile(null);
                  setCoverError(null);
                }}
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                Retirer l&apos;image choisie
              </Button>
            )}

            <p className="text-xs text-gray-400">
              JPEG, PNG, WebP ou AVIF · {MAX_COVER_MB} Mo au maximum.
            </p>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-sm font-semibold text-gray-900">Publication</h2>
            <p className="text-xs text-gray-500">
              {post?.publishedAt
                ? "Cet article est en ligne. Vos modifications seront visibles dès l'enregistrement."
                : "Cet article est un brouillon : il n'apparaîtra sur le site qu'une fois publié depuis la liste des articles."}
            </p>
            <SubmitButton isEdit={Boolean(post)} />
          </Card>
        </div>
      </div>
    </form>
  );
}

/**
 * Conventions de mise en forme reconnues à l'affichage.
 *
 * Le rendu public (`lib/blog/content.ts`) interprète ces marqueurs : sans ce
 * rappel, un rédacteur ne peut pas deviner qu'ils existent et l'article
 * ressortirait en un seul bloc de paragraphes.
 */
function FormattingHelp() {
  const rules: Array<{ syntax: string; effect: string }> = [
    { syntax: "## Titre", effect: "Sous-titre" },
    { syntax: "### Titre", effect: "Sous-titre secondaire" },
    { syntax: "- élément", effect: "Liste à puces" },
    { syntax: "1. élément", effect: "Liste numérotée" },
    { syntax: "> citation", effect: "Citation en exergue" },
    { syntax: "ligne vide", effect: "Nouveau paragraphe" },
  ];

  return (
    <Card className="flex flex-col gap-3 p-6">
      <h2 className="text-sm font-semibold text-gray-900">Mise en forme</h2>
      <dl className="flex flex-col gap-2 text-xs">
        {rules.map((rule) => (
          <div key={rule.syntax} className="flex items-center justify-between gap-3">
            <dt className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
              {rule.syntax}
            </dt>
            <dd className="text-gray-500">{rule.effect}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Aperçu : l'image choisie prime sur celle déjà enregistrée. */
function CoverPreview({
  previewUrl,
  currentUrl,
  title,
}: {
  previewUrl: string | null;
  currentUrl: string | null;
  title: string;
}) {
  const source = previewUrl ?? currentUrl;

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50">
      {source ? (
        previewUrl ? (
          // Aperçu local d'un fichier choisi : `next/image` ne sait pas
          // optimiser une URL `blob:`, la balise native évite un aperçu cassé.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Aperçu de la couverture de ${title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={source}
            alt={`Couverture de ${title}`}
            fill
            sizes="(min-width: 1024px) 320px, 100vw"
            className="object-cover"
          />
        )
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
          <ImagePlus aria-hidden className="h-8 w-8" />
          <p className="text-xs">Aucune couverture</p>
        </div>
      )}
    </div>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Save aria-hidden className="h-4 w-4" />
      {pending
        ? "Enregistrement…"
        : isEdit
          ? "Enregistrer les modifications"
          : "Créer l'article"}
    </Button>
  );
}
