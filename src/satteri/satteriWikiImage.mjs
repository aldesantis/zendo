const WIKILINK_IMAGE_REGEX = /!\[\[([^|\]]+)(?:\|([^|\]]+))?\]\]/g;
const MARKDOWN_IMAGE_REGEX = /!\[([^|\]]+)(?:\|([^|\]]+))?\]\(([^)]+)\)/g;

function isRemoteUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function resolveImagePath(imagePath, altText, assetsPath) {
  if (isRemoteUrl(imagePath)) {
    return {
      path: imagePath,
      alt: altText || imagePath.split("/").pop(),
    };
  }

  if (imagePath.includes("/")) {
    return {
      path: `${assetsPath}/${imagePath}`,
      alt: altText || imagePath.split("/").pop(),
    };
  }

  return {
    path: `${assetsPath}/${imagePath}`,
    alt: altText || imagePath,
  };
}

/**
 * Resolves `![[image]]` / markdown images left in text against `assetsPath`.
 *
 * @param {object} options
 * @param {string} options.assetsPath Prefix prepended to local image paths.
 */
export function satteriWikiImage(options) {
  const { assetsPath } = options ?? {};

  if (typeof assetsPath !== "string") {
    throw new Error("satteriWikiImage requires an assetsPath option");
  }

  return {
    name: "zendo-wiki-image",
    text(node, ctx) {
      // Both syntaxes are collected in one pass and replayed in source order,
      // so a text node mixing them splits correctly.
      const matches = [
        ...node.value.matchAll(WIKILINK_IMAGE_REGEX),
        ...node.value.matchAll(MARKDOWN_IMAGE_REGEX),
      ].sort((a, b) => a.index - b.index);

      if (!matches.length) return;

      const children = [];
      let lastIndex = 0;

      for (const match of matches) {
        const startIndex = match.index;

        // A wikilink image is also a markdown-image near-miss; skip anything
        // already consumed by an earlier, overlapping match.
        if (startIndex < lastIndex) continue;

        const [fullMatch, first, second, third] = match;
        // `![[path|alt]]` has no third group; `![alt](url)` puts the URL there.
        const [imagePath, altText] = third === undefined ? [first, second] : [third, first];

        if (startIndex > lastIndex) {
          children.push({
            type: "text",
            value: node.value.slice(lastIndex, startIndex),
          });
        }

        const { path: imageUrl, alt } = resolveImagePath(imagePath, altText, assetsPath);

        children.push({
          type: "image",
          url: imageUrl,
          alt: alt || "",
          title: null,
        });

        lastIndex = startIndex + fullMatch.length;
      }

      if (!children.length) return;

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
