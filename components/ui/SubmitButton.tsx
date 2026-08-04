"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/Button";

/**
 * Bouton de soumission qui se désactive pendant l'envoi.
 *
 * `useFormStatus` doit être appelé dans un composant *enfant* du `<form>` : il
 * ne voit pas l'état depuis le composant qui rend le formulaire lui-même.
 */
export function SubmitButton({
  label,
  pendingLabel,
  children,
  ...props
}: Omit<ButtonProps, "type" | "disabled" | "children"> & {
  label: string;
  /** Libellé affiché pendant l'envoi, ex. « Enregistrement… ». */
  pendingLabel: string;
  /** Icône éventuelle, placée avant le libellé. */
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {children}
      {pending ? pendingLabel : label}
    </Button>
  );
}
