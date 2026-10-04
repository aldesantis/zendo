import { readFileSync } from "node:fs";

const WIKILINK_REGEX = /(?<!!)(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])/g;

// An opening `[[` with no closing `]]` after it in the same text node: the
// wikilink continues into the following siblings (e.g. `[[a|b _c_ d]]`).
const OPEN_WIKILINK_REGEX = /(?<!!)\[\[(?!.*\]\])/s;

/**
 * Resolves `[[wikilinks]]` against the generated link index and rewrites them as
 * `<Link>` elements.
 *
 * Labels may contain inline formatting (`[[slug|for whom power _was_ the
 * product]]`). Markdown splits such a wikilink across several sibling nodes, so
 * links are resolved per parent rather than per text node.
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

  const resolveUrl = (destination) => {
    const indexRecord = records.find((record) =>
      record.ids.some((id) => id.toLowerCase() === destination.toLowerCase())
    );

    return indexRecord ? buildUrl(indexRecord) : undefined;
  };

  // Builds the node(s) for one wikilink. `label` is a list of nodes, so it can
  // carry formatting; an unresolved link falls back to its label alone.
  const wikilinkNodes = (destination, label) => {
    const url = resolveUrl(destination.trim());

    if (!url) return label;

    return [
      {
        // Wikilinks sit inside a paragraph, so this has to be the inline JSX
        // node type, not the flow one.
        type: "mdxJsxTextElement",
        name: "Link",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "href",
            value: url,
          },
        ],
        children: label,
      },
    ];
  };

  // Rewrites the wikilinks fully contained in `value`.
  const textNodes = (value) => {
    const nodes = [];
    let lastIndex = 0;

    for (const match of value.matchAll(WIKILINK_REGEX)) {
      if (match.index > lastIndex) {
        nodes.push(text(value.slice(lastIndex, match.index)));
      }

      nodes.push(...wikilinkNodes(match[2], [text((match[3] || match[2]).trim())]));
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) {
      nodes.push(text(value.slice(lastIndex)));
    }

    return nodes;
  };

  // Rewrites a wikilink that spans several siblings. `parts` is the content
  // between `[[` and `]]`: strings for text, existing nodes for everything else.
  // The `|` must sit in the leading text, since a destination can't be formatted.
  const spanNodes = (parts, ctx) => {
    const [head, ...rest] = parts;
    const pipe = typeof head === "string" ? head.indexOf("|") : -1;

    const destination =
      pipe >= 0
        ? head.slice(0, pipe)
        : parts.map((part) => (typeof part === "string" ? part : ctx.textContent(part))).join("");

    const labelParts = pipe >= 0 ? [head.slice(pipe + 1), ...rest] : parts;

    // Trim the label's outer edges, as single-node wikilinks do.
    const last = labelParts.length - 1;
    const label = labelParts
      .map((part, i) => {
        if (typeof part !== "string") return part;
        if (i === 0) part = part.trimStart();
        if (i === last) part = part.trimEnd();
        return part ? text(part) : null;
      })
      .filter(Boolean);

    return wikilinkNodes(destination, label);
  };

  // Each parent is rewritten once, on the visit of its first text child.
  const visited = new WeakSet();

  return {
    name: "zendo-wiki-link",
    text(node, ctx) {
      const parent = ctx.parent(node);

      if (!parent || visited.has(parent)) return;

      visited.add(parent);

      if (!parent.children.some((child) => child.type === "text" && child.value.includes("[["))) return;

      const children = [];
      // The open wikilink's content so far, or null outside one.
      let span = null;

      for (const child of parent.children) {
        if (child.type !== "text") {
          if (span) span.push(child);
          else children.push(child);
          continue;
        }

        let value = child.value;

        if (span) {
          const close = value.indexOf("]]");

          if (close < 0) {
            span.push(value);
            continue;
          }

          span.push(value.slice(0, close));
          children.push(...spanNodes(span, ctx));
          span = null;
          value = value.slice(close + 2);
        }

        const open = value.match(OPEN_WIKILINK_REGEX);

        if (open) {
          children.push(...textNodes(value.slice(0, open.index)));
          span = [value.slice(open.index + 2)];
        } else {
          children.push(...textNodes(value));
        }
      }

      // A `[[` that never closed is plain text; restore what was consumed.
      if (span) {
        const [head, ...rest] = span;
        children.push(text(`[[${head}`), ...rest.map((part) => (typeof part === "string" ? text(part) : part)));
      }

      ctx.setProperty(parent, "children", mergeText(children));
    },
  };
}

const text = (value) => ({ type: "text", value });

// Joins adjacent text nodes, so the tree matches what the parser would produce.
// Every text node here is freshly built, so they can be replaced freely.
const mergeText = (nodes) =>
  nodes.reduce((merged, node) => {
    const previous = merged[merged.length - 1];

    if (node.type === "text" && previous?.type === "text") {
      merged[merged.length - 1] = text(previous.value + node.value);
    } else {
      merged.push(node);
    }

    return merged;
  }, []);
