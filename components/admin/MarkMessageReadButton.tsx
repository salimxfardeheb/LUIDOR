"use client";

import { useTransition } from "react";
import { CheckCircle2, MailOpen } from "lucide-react";
import { toggleContactMessageRead } from "@/actions/messages";
import { Button } from "@/components/ui/Button";

/** Bouton « marquer lu / non lu » d'un message du formulaire /contact. */
export function MarkMessageReadButton({
  messageId,
  read,
}: {
  messageId: string;
  read: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={read ? "outline" : "secondary"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void toggleContactMessageRead(messageId);
        })
      }
    >
      {read ? (
        <MailOpen aria-hidden className="h-4 w-4" />
      ) : (
        <CheckCircle2 aria-hidden className="h-4 w-4" />
      )}
      {read ? "Non lu" : "Marquer comme lu"}
    </Button>
  );
}
