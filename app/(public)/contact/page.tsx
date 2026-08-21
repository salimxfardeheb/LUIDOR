import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, ExternalLink, Mail, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  CONTACT_CHANNELS,
  CONTACT_FAQ,
  CONTACT_INTRO,
  CONTACT_SHORTCUTS,
} from "@/lib/contact/content";

// Route /contact — formulaire, coordonnées et FAQ courte. Contenu entièrement
// statique (lib/contact/content.ts) : la page est prérendue au build.

const TITLE = "Contact";
const DESCRIPTION =
  "Contactez l'équipe LIUDOR : formulaire, email, téléphone et réponses aux questions fréquentes sur la réservation d'une salle des fêtes en Algérie.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    siteName: "LIUDOR",
    title: `${TITLE} | LIUDOR`,
    description: DESCRIPTION,
    url: "/contact",
  },
};

/**
 * Données structurées de la FAQ : les mêmes questions que le bloc visible,
 * dérivées de la même constante — un balisage qui promet une réponse absente
 * de la page est une pénalité, pas un gain.
 */
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: CONTACT_FAQ.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export default function Page() {

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Bandeau d'introduction                                            */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-labelledby="contact-titre"
        className="relative isolate overflow-hidden bg-primary-900"
      >
        {/* Halo doré : rappel de la charte, purement décoratif. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(var(--color-secondary)/0.22),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary-400">
            {CONTACT_INTRO.eyebrow}
          </p>
          {/*
            `clamp()` plutôt qu'une pile de breakpoints : la taille suit la
            largeur du viewport en continu, sans palier visible entre deux
            tailles d'écran.
          */}
          <h1
            id="contact-titre"
            className="mt-4 max-w-3xl text-balance text-[clamp(1.875rem,1.35rem+2.3vw,3rem)] font-bold leading-[1.12] tracking-tight text-white"
          >
            {CONTACT_INTRO.title}
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-gray-300 sm:text-lg">
            {CONTACT_INTRO.lead}
          </p>

          {/*
            Deux sorties immédiates avant même le formulaire : sur mobile, un
            appel ou un mail coûte un geste, remplir cinq champs en coûte vingt.
          */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href="#formulaire"
              className={cn(
                buttonVariants({ size: "lg" }),
                "focus-visible:ring-offset-primary-900"
              )}
            >
              <Mail aria-hidden className="h-4 w-4" />
              Écrire à l&apos;équipe
            </a>
            <a
              href="tel:+213770000000"
              className={cn(
                buttonVariants({ variant: "outline-light", size: "lg" }),
                "focus-visible:ring-offset-primary-900"
              )}
            >
              <Phone aria-hidden className="h-4 w-4" />
              +213 770 00 00 00
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Formulaire + coordonnées                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        {/*
          Le formulaire occupe la colonne large et vient en premier dans le
          DOM : c'est l'action attendue de la page, l'ordre de lecture au
          clavier et à l'écran doit la refléter.
        */}
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
          <section
            id="formulaire"
            aria-labelledby="formulaire-titre"
            className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <h2
              id="formulaire-titre"
              className="text-xl font-semibold tracking-tight text-gray-900"
            >
              Envoyez-nous un message
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              Tous les champs sont obligatoires. Plus votre demande est précise
              (ville, dates, nom de la salle), plus la réponse le sera.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </section>

          <aside
            aria-labelledby="coordonnees-titre"
            className="flex flex-col gap-6"
          >
            <h2
              id="coordonnees-titre"
              className="text-xl font-semibold tracking-tight text-gray-900"
            >
              Autres moyens de nous joindre
            </h2>

            {/*
              `<address>` : l'élément dédié aux coordonnées de contact du
              document, exactement l'usage prévu par la spécification.
            */}
            <address className="not-italic">
              <ul className="flex flex-col gap-3">
                {CONTACT_CHANNELS.map(
                  ({ title, value, hint, href, external, icon: Icon }) => {
                    const body = (
                      <>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-white">
                          <Icon aria-hidden className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <span className="break-words">{value}</span>
                            {external && (
                              <ExternalLink
                                aria-hidden
                                className="h-3.5 w-3.5 shrink-0 text-gray-400"
                              />
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {hint}
                          </span>
                        </span>
                      </>
                    );

                    return (
                      <li key={title}>
                        {href ? (
                          <a
                            href={href}
                            {...(external
                              ? { target: "_blank", rel: "noreferrer noopener" }
                              : {})}
                            className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
                          >
                            {body}
                            {external && (
                              <span className="sr-only">
                                (ouvre un nouvel onglet)
                              </span>
                            )}
                          </a>
                        ) : (
                          <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                            {body}
                          </div>
                        )}
                      </li>
                    );
                  }
                )}
              </ul>
            </address>

            <ul className="flex flex-col gap-3">
              {CONTACT_SHORTCUTS.map(
                ({ title, description, href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Icon aria-hidden className="h-4 w-4 text-secondary" />
                        {title}
                      </span>
                      <span className="text-sm leading-relaxed text-gray-500">
                        {description}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary">
                        {label}
                        <ArrowRight
                          aria-hidden
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  </li>
                )
              )}
            </ul>
          </aside>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ                                                               */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="faq-titre" className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="text-center">
            <h2
              id="faq-titre"
              className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
            >
              Questions fréquentes
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-sm text-gray-500">
              La réponse est peut-être déjà ici — cela vous évite d&apos;attendre
              24 h.
            </p>
          </div>

          {/*
            `<details>` natif : ouverture, fermeture et navigation au clavier
            sont assurées par le navigateur, sans une ligne de JavaScript ni
            d'ARIA à maintenir. L'attribut `name` partagé n'en laisse qu'un
            ouvert à la fois ; les navigateurs qui l'ignorent les ouvrent tous,
            ce qui reste un comportement correct.
          */}
          <ul className="mt-10 flex flex-col gap-3">
            {CONTACT_FAQ.map(({ question, answer }) => (
              <li key={question}>
                <details
                  name="contact-faq"
                  className="group rounded-lg border border-gray-200 bg-white px-5 shadow-xs transition-shadow open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-gray-900 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                    {question}
                    <ChevronDown
                      aria-hidden
                      className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <p className="border-t border-gray-100 pb-5 pt-4 text-sm leading-relaxed text-gray-600">
                    {answer}
                  </p>
                </details>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-center text-sm text-gray-500">
            Votre question n&apos;y est pas ?{" "}
            <a
              href="#formulaire"
              className="rounded-sm font-semibold text-secondary underline-offset-4 transition-colors hover:text-primary-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
            >
              Posez-la dans le formulaire
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
