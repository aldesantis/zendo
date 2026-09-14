/**
 * Sätteri mdast plugin definitions. Kept structural so zendo doesn't need a
 * dependency on `satteri` itself; Astro validates the shape at build time.
 */
type SatteriMdastPlugin = {
  name: string;
  [key: string]: unknown;
};

/** Adds `readingTime` (minutes) to each document's frontmatter. */
export function satteriReadingTime(): SatteriMdastPlugin;

/** Resolves `![[image]]` / markdown images against `assetsPath`. */
export function satteriWikiImage(options: { assetsPath: string }): SatteriMdastPlugin;

/** Resolves `[[wikilinks]]` against the link index into `<Link>` elements. */
export function satteriWikiLink(options: {
  index?: unknown[];
  indexPath?: string;
  buildUrl: (link: { type: string; slug: string }) => string;
}): SatteriMdastPlugin;
