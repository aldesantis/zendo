import getReadingTime from "reading-time";

/**
 * Adds `readingTime` (minutes, rounded up) to each document's frontmatter.
 *
 * Runs as an `after` hook so the whole tree is available. Place it first in
 * `mdastPlugins` to measure the document as authored, before wikilinks and
 * wiki images are rewritten.
 */
export function satteriReadingTime() {
  return {
    name: "zendo-reading-time",
    after(root, ctx) {
      const textOnPage = ctx.textContent(root, { includeImageAlt: true });
      const readingTime = getReadingTime(textOnPage);

      const astro = ctx.data.astro;

      if (astro?.frontmatter) {
        astro.frontmatter.readingTime = Math.ceil(readingTime.minutes);
      }
    },
  };
}
