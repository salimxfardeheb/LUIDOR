import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AboutSection } from "@/components/about/AboutSection";
import { Button } from "@/components/ui/Button";
import { ABOUT_CONTACT } from "@/lib/about/content";

/**
 * Bloc contact : coordonnées de l'équipe et deux portes d'entrée selon le
 * profil du visiteur — organisateur d'événement ou propriétaire de salle.
 */
export function AboutContact() {
  return (
    <AboutSection
      id="contact"
      title={ABOUT_CONTACT.title}
      lead={ABOUT_CONTACT.lead}
      tone="muted"
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
        <ul className="grid gap-4 sm:grid-cols-2">
          {ABOUT_CONTACT.channels.map(({ title, value, href, icon: Icon }) => (
            <li
              key={title}
              className="flex gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-900 text-white">
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                {href ? (
                  <ContactLink href={href}>{value}</ContactLink>
                ) : (
                  <p className="mt-0.5 text-sm text-gray-500">{value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4">
          {ABOUT_CONTACT.actions.map(
            ({ title, description, href, label, icon: Icon }) => (
              <div
                key={href}
                className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                  <Icon aria-hidden className="h-5 w-5 text-secondary" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  {description}
                </p>
                <Link href={href} className="mt-4 self-start">
                  <Button variant="outline">
                    {label}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
        </div>
      </div>
    </AboutSection>
  );
}

/**
 * Les liens `mailto:` et `tel:` sortent de l'application : ils passent par une
 * ancre native, `next/link` ne servirait à rien.
 */
function ContactLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const className =
    "mt-0.5 block break-words text-sm text-gray-500 transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
