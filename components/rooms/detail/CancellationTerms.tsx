"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";

/**
 * Politique d'annulation du tableau « Informations pratiques ».
 *
 * Le libellé court est cliquable dès que le propriétaire a saisi des conditions
 * détaillées ; sinon il reste un simple texte, sans lien mort.
 */
export function CancellationTerms({
  policy,
  terms,
}: {
  policy: string;
  terms: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  if (!terms) return <span>{policy}</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-sm font-medium text-secondary underline underline-offset-4 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
      >
        {policy}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Conditions d'annulation"
        description={`Politique ${policy.toLowerCase()}`}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
          {terms}
        </p>
      </Modal>
    </>
  );
}
