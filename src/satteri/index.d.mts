/**
 * Sätteri mdast plugin definitions. Kept structural so zendo doesn't need a
 * dependency on `satteri` itself; Astro validates the shape at build time.
 *
 * Each plugin type names the visitor it registers: Sätteri requires a plugin
 * definition to declare at least one visitor or hook, so a bare
 * `{ name: string }` shape no longer type-checks against `mdastPlugins`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type SatteriMdastHook = (root: any, ctx: any) => void | Promise<void>;
type SatteriMdastVisitor = (node: any, ctx: any) => any;

type SatteriMdastAfterPlugin = { name: string; after: SatteriMdastHook };
type SatteriMdastTextPlugin = { name: string; text: SatteriMdastVisitor };

/** Adds `readingTime` (minutes) to each document's frontmatter. */
export function satteriReadingTime(): SatteriMdastAfterPlugin;

/** Resolves `![[image]]` / markdown images against `assetsPath`. */
export function satteriWikiImage(options: { assetsPath: string }): SatteriMdastTextPlugin;

/** Resolves `[[wikilinks]]` against the link index into `<Link>` elements. */
export function satteriWikiLink(options: {
  index?: unknown[];
  indexPath?: string;
  buildUrl: (link: { type: string; slug: string }) => string;
}): SatteriMdastTextPlugin;
