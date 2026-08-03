import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Identifiant repris par `aria-labelledby` sur la <section> parente. */
  id: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}

/** Titre de section + lien « voir tout », commun aux blocs de l'accueil. */
export function SectionHeading({
  id,
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h2
          id={id}
          className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-gray-500">{description}</p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
        >
          {action.label}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
