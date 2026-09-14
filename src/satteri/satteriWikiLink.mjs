import { readFileSync } from "node:fs";

const WIKILINK_REGEX = /(?<!!)(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])/g;

/**
 * Resolves `[[wikilinks]]` against the generated link index and rewrites them as
 * `<Link>` elements.
 *
 * @param {object} options
 * @param {Array} [options.index]      The parsed link index (`index.json`).
 * @param {string} [options.indexPath] Path to `index.json`, read if `index` is omitted.
 * @param {(link: { type: string, slug: string }) => string} options.buildUrl
 *   Builds the URL for a resolved entry. Owns routing (e.g. pluralization).
 */
export function satteriWikiLink({ index, indexPath, buildUrl } = {}) {
  if (typeof buildUrl !== "function") {
    throw new Error("satteriWikiLink requires a buildUrl option");
  }

  const records = Array.isArray(index) ? index : indexPath ? JSON.parse(readFileSync(indexPath, "utf8")) : null;

  if (!Array.isArray(records)) {
    throw new Error("satteriWikiLink requires an { index } array or an { indexPath }");
  }

  return {
    name: "zendo-wiki-link",
    text(node, ctx) {
      const matches = Array.from(node.value.matchAll(WIKILINK_REGEX));

      if (!matches.length) return;

      const children = [];
      let lastIndex = 0;

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        if (!match) continue;

        // Read the destination and label off this match, so an `![[image]]`
        // earlier in the same text node can't shift the pairing.
        const wikilink = {
          linkDestination: match[2].trim(),
          displayText: (match[3] || match[2]).trim(),
        };

        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;

        // Text before the wikilink.
        if (startIndex > lastIndex) {
          children.push({
            type: "text",
            value: node.value.slice(lastIndex, startIndex),
          });
        }

        const indexRecord = records.find((record) =>
          record.ids.some((id) => id.toLowerCase() === wikilink.linkDestination.toLowerCase())
        );

        let newChild;

        if (indexRecord) {
          const url = buildUrl(indexRecord);

          if (url) {
            newChild = {
              // Wikilinks sit inside a paragraph, so this has to be the inline
              // JSX node type, not the flow one.
              type: "mdxJsxTextElement",
              name: "Link",
              attributes: [
                {
                  type: "mdxJsxAttribute",
                  name: "href",
                  value: url,
                },
              ],
              children: [
                {
                  type: "text",
                  value: wikilink.displayText,
                },
              ],
            };
          }
        }

        if (!newChild) {
          newChild = {
            type: "text",
            value: wikilink.displayText,
          };
        }

        children.push(newChild);
        lastIndex = endIndex;
      }

      if (!children.length) return;

      // Remaining text after the last wikilink.
      if (lastIndex < node.value.length) {
        children.push({
          type: "text",
          value: node.value.slice(lastIndex),
        });
      }

      ctx.replaceNode(node, children);
    },
  };
}
