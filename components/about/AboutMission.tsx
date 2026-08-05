import { AboutSection } from "@/components/about/AboutSection";
import { MISSION } from "@/lib/about/content";

/** Notre mission : le texte de fond, puis les trois piliers de la plateforme. */
export function AboutMission() {
  return (
    <AboutSection id="mission" title={MISSION.title} lead={MISSION.lead}>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="space-y-5 text-base leading-relaxed text-gray-600">
          {MISSION.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        <ul className="flex flex-col gap-5">
          {MISSION.pillars.map(({ title, description, icon: Icon }) => (
            <li
              key={title}
              className="flex gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                <Icon aria-hidden className="h-5 w-5 text-secondary" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AboutSection>
  );
}
