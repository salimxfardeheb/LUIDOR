import { AboutSection } from "@/components/about/AboutSection";
import { STORY } from "@/lib/about/content";

/**
 * Notre histoire, en frise chronologique.
 *
 * La ligne verticale n'apparaît qu'à partir de `sm` : sur mobile, les jalons
 * s'empilent sans filet, ce qui laisse toute la largeur au texte.
 */
export function AboutStory() {
  return (
    <AboutSection id="histoire" title={STORY.title} lead={STORY.lead} tone="muted">
      <ol className="relative flex flex-col gap-8 sm:gap-10 sm:before:absolute sm:before:bottom-6 sm:before:left-6 sm:before:top-6 sm:before:w-px sm:before:bg-gray-300">
        {STORY.milestones.map(({ year, title, description, icon: Icon }) => (
          <li key={year} className="relative flex gap-5 sm:gap-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
              <Icon aria-hidden className="h-5 w-5 text-secondary" />
            </span>

            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                {year}
              </p>
              <h3 className="mt-1 text-base font-semibold text-gray-900">
                {title}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </AboutSection>
  );
}
