"use client";

import * as React from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Bandeau d'inscription à la newsletter.
 *
 * Aucun endpoint n'existe encore : la soumission est simulée mais l'ensemble
 * des états (chargement, succès, erreur de validation) est déjà câblé.
 */
export function Newsletter() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setMessage("Merci de saisir une adresse e-mail valide.");
      return;
    }

    setStatus("loading");
    setMessage("");

    // TODO: brancher sur l'action serveur d'inscription à la newsletter.
    await new Promise((resolve) => setTimeout(resolve, 600));

    setStatus("success");
    setMessage("Merci ! Votre inscription est enregistrée.");
    setEmail("");
  }

  return (
    <section aria-labelledby="newsletter-titre" className="bg-primary-900">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20">
              <Mail aria-hidden className="h-6 w-6 text-secondary-400" />
            </span>
            <div>
              <h2
                id="newsletter-titre"
                className="text-xl font-bold text-white sm:text-2xl"
              >
                Restez informé des nouvelles salles
              </h2>
              <p className="mt-1 max-w-xl text-sm text-gray-300">
                Nouveautés, disponibilités de dernière minute et conseils
                d&apos;organisation, une fois par mois. Désinscription en un clic.
              </p>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="w-full max-w-md shrink-0 lg:w-auto"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="newsletter-email" className="sr-only">
                  Adresse e-mail
                </label>
                <Input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (status !== "idle") {
                      setStatus("idle");
                      setMessage("");
                    }
                  }}
                  aria-invalid={status === "error"}
                  aria-describedby="newsletter-message"
                  className="h-11 border-transparent"
                />
              </div>
              <Button type="submit" size="lg" disabled={status === "loading"}>
                {status === "loading" ? "Envoi…" : "S'abonner"}
              </Button>
            </div>

            <p
              id="newsletter-message"
              role={status === "error" ? "alert" : "status"}
              aria-live="polite"
              className="mt-2 min-h-5 text-sm"
            >
              {message && (
                <span
                  className={
                    status === "error"
                      ? "text-error"
                      : "inline-flex items-center gap-1.5 text-success"
                  }
                >
                  {status === "success" && (
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                  )}
                  {message}
                </span>
              )}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
