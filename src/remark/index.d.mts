type RemarkTransformer = (tree: unknown, file: unknown) => void | Promise<void>;

/** Adds `readingTime` (minutes) to each document's frontmatter. */
export function remarkReadingTime(): RemarkTransformer;

/** Resolves `![[image]]` / markdown images against `assetsPath`. */
export function remarkWikiImage(options: { assetsPath: string }): RemarkTransformer;

/** Resolves `[[wikilinks]]` against the link index into `<Link>` elements. */
export function remarkWikiLink(options: {
  index?: unknown[];
  indexPath?: string;
  buildUrl: (link: { type: string; slug: string }) => string;
}): RemarkTransformer;
