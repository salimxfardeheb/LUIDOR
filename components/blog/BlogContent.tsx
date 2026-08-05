import { parseBlogContent, type BlogBlock } from "@/lib/blog/content";
import { cn } from "@/lib/utils";

/**
 * Corps d'un article.
 *
 * Le contenu est du texte : il est converti en blocs typés puis rendu par React
 * — aucune balise saisie en administration n'est interprétée, donc aucune
 * injection possible. La largeur de lecture est bornée (`max-w-[70ch]`) pour
 * rester confortable sur grand écran.
 */
export function BlogContent({ content }: { content: string }) {
  const blocks = parseBlogContent(content);

  return (
    <div className="max-w-[70ch] text-base leading-relaxed text-gray-600">
      {blocks.map((block, index) => (
        <Block key={index} block={block} first={index === 0} />
      ))}
    </div>
  );
}

function Block({ block, first }: { block: BlogBlock; first: boolean }) {
  // Le premier bloc ne prend pas de marge haute : l'espacement vient du parent.
  const spacing = first ? "" : "mt-5";

  switch (block.kind) {
    case "heading":
      return block.level === 2 ? (
        <h2
          className={cn(
            !first && "mt-10",
            "text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
          )}
        >
          {block.text}
        </h2>
      ) : (
        <h3
          className={cn(
            !first && "mt-8",
            "text-lg font-semibold tracking-tight text-gray-900"
          )}
        >
          {block.text}
        </h3>
      );

    case "list":
      return block.ordered ? (
        <ol
          className={cn(
            spacing,
            "list-decimal space-y-2 pl-5 marker:font-semibold marker:text-secondary"
          )}
        >
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul
          className={cn(spacing, "list-disc space-y-2 pl-5 marker:text-secondary")}
        >
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <blockquote
          className={cn(
            spacing,
            "border-l-4 border-secondary bg-gray-50 px-5 py-4 text-base italic text-gray-700"
          )}
        >
          {block.text}
        </blockquote>
      );

    default:
      return <p className={spacing}>{block.text}</p>;
  }
}
