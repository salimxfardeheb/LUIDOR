/**
 * Mise en forme du contenu des articles.
 *
 * `BlogPost.content` est saisi dans un simple champ texte par l'administration
 * et stocké tel quel : aucun HTML n'est enregistré (voir lib/admin/blog.ts).
 * Le rendu public transforme donc ce texte en blocs typés, interprétés côté
 * React — un article ne peut pas injecter de balise, et le texte reste
 * lisible en base comme dans l'éditeur.
 *
 * Conventions reconnues, volontairement proches de Markdown :
 *   `## Titre`     → sous-titre de niveau 2
 *   `### Titre`    → sous-titre de niveau 3
 *   `- élément`    → liste à puces (aussi `*`)
 *   `1. élément`   → liste numérotée (aussi `1)`)
 *   `> citation`   → citation mise en exergue
 *   tout le reste  → paragraphe (les lignes consécutives sont réunies)
 */

export type BlogBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string };

const HEADING = /^(#{2,3})\s+(.*)$/;
const BULLET = /^[-*•]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;

/** Découpe le contenu brut en blocs prêts à être rendus. */
export function parseBlogContent(content: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];

  // Groupe en cours de constitution : les lignes consécutives de même nature
  // sont réunies (un paragraphe sur trois lignes reste un seul paragraphe).
  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (quote.length > 0) {
      blocks.push({ kind: "quote", text: quote.join(" ") });
      quote = [];
    }
    if (list) {
      blocks.push({ kind: "list", ...list });
      list = null;
    }
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({
        kind: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);

    if (bullet || numbered) {
      const ordered = numbered !== null;
      const item = (bullet?.[1] ?? numbered?.[1] ?? "").trim();

      // Passer d'une liste à puces à une liste numérotée ouvre une nouvelle
      // liste : mélanger les deux dans un même `<ul>` serait incohérent.
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      if (item) list.items.push(item);
      continue;
    }

    const quoted = QUOTE.exec(line);
    if (quoted) {
      if (paragraph.length > 0 || list) flush();
      quote.push(quoted[1].trim());
      continue;
    }

    if (quote.length > 0 || list) flush();
    paragraph.push(line);
  }

  flush();

  return blocks;
}

/** Contenu débarrassé de ses marqueurs, sur une seule ligne. */
function toPlainText(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(HEADING, "$2")
        .replace(BULLET, "$1")
        .replace(NUMBERED, "$1")
        .replace(QUOTE, "$1")
    )
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Longueur par défaut d'un extrait : trois lignes environ sur une carte. */
const EXCERPT_LENGTH = 180;

/**
 * Extrait affiché sur les cartes et repris en meta description.
 *
 * La coupe se fait sur un mot entier : « … la salle des » vaut mieux que
 * « … la salle de la co ».
 */
export function excerptFrom(
  content: string,
  maxLength: number = EXCERPT_LENGTH
): string {
  const plain = toPlainText(content);
  if (plain.length <= maxLength) return plain;

  const truncated = plain.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return `${(lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated).replace(/[,;:.\s]+$/, "")}…`;
}

/** Vitesse de lecture retenue pour l'estimation affichée sous le titre. */
const WORDS_PER_MINUTE = 200;

/** Durée de lecture en minutes, jamais inférieure à 1. */
export function readingMinutes(content: string): number {
  const words = toPlainText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
