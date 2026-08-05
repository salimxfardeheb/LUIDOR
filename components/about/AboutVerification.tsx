import { Check } from "lucide-react";
import { AboutSection } from "@/components/about/AboutSection";
import { VERIFICATION } from "@/lib/about/content";

/**
 * Charte de vérification : les quatre étapes numérotées du contrôle, puis les
 * engagements que LIUDOR tient une fois la salle publiée.
 */
export function AboutVerification() {
  return (
    <AboutSection
      id="verification"
      title={VERIFICATION.title}
      lead={VERIFICATION.lead}
    >
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {VERIFICATION.steps.map(({ title, description, icon: Icon }, index) => (
          <li
            key={title}
            className="relative flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <span className="absolute right-5 top-4 text-3xl font-bold text-gray-100">
              {index + 1}
            </span>

            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-900 text-white">
              <Icon aria-hidden className="h-5 w-5" />
            </span>

            <h3 className="mt-4 text-base font-semibold text-gray-900">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {description}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-lg border border-secondary/30 bg-secondary/5 p-6 sm:p-8">
        <h3 className="text-base font-semibold text-gray-900">
          Nos engagements
        </h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {VERIFICATION.commitments.map((commitment) => (
            <li key={commitment} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                <Check aria-hidden className="h-3.5 w-3.5 text-primary-900" />
              </span>
              <span className="text-sm text-gray-700">{commitment}</span>
            </li>
          ))}
        </ul>
      </div>
    </AboutSection>
  );
}
