"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteCatalogItem, saveCatalogItem } from "@/actions/admin-catalog";
import type { CatalogItem, CatalogKind } from "@/lib/admin/catalog";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/format";

/**
 * CRUD d'un référentiel : catégories, équipements ou services.
 *
 * Un seul composant pour les trois : ils ne diffèrent que par leurs champs
 * (icône pour une catégorie, tarif pour un service), et les gestes — ajouter,
 * renommer, supprimer — sont identiques. Une entrée utilisée par des salles
 * n'offre pas de bouton de suppression : le refus vient aussi du serveur, mais
 * l'interface évite de proposer un geste voué à échouer.
 */
export function CatalogManager({
  kind,
  title,
  description,
  items,
  addLabel,
}: {
  kind: CatalogKind;
  title: string;
  description: string;
  items: CatalogItem[];
  addLabel: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function remove(item: CatalogItem) {
    setPendingId(item.id);
    setError(null);
    setMessage(null);

    const result = await deleteCatalogItem(kind, item.id);
    setPendingId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`« ${item.name} » a été supprimé.`);
    router.refresh();
  }

  function handleSaved(text: string) {
    setMessage(text);
    setError(null);
    setEditingId(null);
    setAdding(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Badge variant="neutral">{items.length}</Badge>
      </div>

      {message && (
        <Alert variant="success" className="text-sm">
          {message}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="text-sm">
          {error}
        </Alert>
      )}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Aucune entrée pour le moment.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="py-3">
                <CatalogItemForm
                  kind={kind}
                  item={item}
                  onCancel={() => setEditingId(null)}
                  onSaved={handleSaved}
                />
              </li>
            ) : (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                    {item.iconSlug && <span>icône : {item.iconSlug}</span>}
                    {item.price !== undefined && (
                      <span>{formatPrice(item.price)}</span>
                    )}
                    <span>
                      {item.usageCount === 0
                        ? "aucune salle"
                        : `${item.usageCount} salle${item.usageCount > 1 ? "s" : ""}`}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(item.id);
                      setAdding(false);
                      setError(null);
                    }}
                  >
                    <Pencil aria-hidden className="h-4 w-4" />
                    <span className="sr-only">Modifier {item.name}</span>
                  </Button>

                  {item.usageCount === 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === item.id}
                      onClick={() => remove(item)}
                    >
                      <Trash2 aria-hidden className="h-4 w-4 text-error" />
                      <span className="sr-only">Supprimer {item.name}</span>
                    </Button>
                  ) : (
                    <span className="px-2 text-xs text-gray-400">
                      Utilisé
                      <span className="sr-only">
                        {" "}
                        par des salles : suppression impossible
                      </span>
                    </span>
                  )}
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {adding ? (
        <CatalogItemForm
          kind={kind}
          item={null}
          onCancel={() => setAdding(false)}
          onSaved={handleSaved}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
            setError(null);
          }}
        >
          <Plus aria-hidden className="h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </Card>
  );
}

/** Formulaire d'ajout ou de renommage d'une entrée. */
function CatalogItemForm({
  kind,
  item,
  onCancel,
  onSaved,
}: {
  kind: CatalogKind;
  item: CatalogItem | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const result = await saveCatalogItem(new FormData(event.currentTarget));
    setPending(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setError(result.fieldErrors ? null : result.message);
      return;
    }

    onSaved(result.message);
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
    >
      <input type="hidden" name="kind" value={kind} />
      {item && <input type="hidden" name="id" value={item.id} />}

      {error && (
        <Alert variant="error" className="text-sm">
          {error}
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`name-${kind}-${item?.id ?? "new"}`}
            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Nom
          </label>
          <Input
            id={`name-${kind}-${item?.id ?? "new"}`}
            name="name"
            required
            maxLength={60}
            defaultValue={item?.name ?? ""}
            className="mt-1"
            aria-invalid={fieldErrors.name ? true : undefined}
          />
          {fieldErrors.name && (
            <p role="alert" className="mt-1 text-sm text-error">
              {fieldErrors.name}
            </p>
          )}
        </div>

        {kind === "category" && (
          <div className="sm:w-52">
            <label
              htmlFor={`icon-${item?.id ?? "new"}`}
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Icône lucide
            </label>
            <Input
              id={`icon-${item?.id ?? "new"}`}
              name="iconSlug"
              required
              maxLength={40}
              placeholder="party-popper"
              defaultValue={item?.iconSlug ?? ""}
              className="mt-1"
              aria-invalid={fieldErrors.iconSlug ? true : undefined}
            />
            {fieldErrors.iconSlug && (
              <p role="alert" className="mt-1 text-sm text-error">
                {fieldErrors.iconSlug}
              </p>
            )}
          </div>
        )}

        {kind === "service" && (
          <div className="sm:w-40">
            <label
              htmlFor={`price-${item?.id ?? "new"}`}
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Tarif (DA)
            </label>
            <Input
              id={`price-${item?.id ?? "new"}`}
              name="price"
              type="number"
              min="0"
              step="100"
              required
              defaultValue={item?.price ?? 0}
              className="mt-1"
              aria-invalid={fieldErrors.price ? true : undefined}
            />
            {fieldErrors.price && (
              <p role="alert" className="mt-1 text-sm text-error">
                {fieldErrors.price}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Check aria-hidden className="h-4 w-4" />
          {pending ? "Enregistrement…" : item ? "Enregistrer" : "Ajouter"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          <X aria-hidden className="h-4 w-4" />
          Annuler
        </Button>
      </div>
    </form>
  );
}
