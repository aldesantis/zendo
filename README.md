# Zendo

A source-agnostic content pipeline engine for [Astro](https://astro.build) digital
gardens. Zendo pulls content from a source (Git, Notion, …), runs it through a
transformer pipeline into Astro-ready MDX, builds a wikilink graph index, and exposes
runtime helpers + remark plugins to your Astro site.

Zendo sits **in front of** Astro — it is not a site generator. You bring the Astro
project, the content collections, and the styling; Zendo handles ingestion,
normalization, and the link graph.

## Architecture

Two halves, with a strict firewall between them:

- **Build-time CLI** (pure Node, run via `tsx`): `fetch` → `reindex` → `build`.
  Nothing here imports Astro virtual modules.
- **Astro-runtime helpers**: `createGarden()` (wraps `astro:content`),
  `createSearchAction()` (an `astro:actions` action), and remark plugins.

```
Sources ──▶ Transformers ──▶ src/content/*.mdx ──▶ Astro
                                   │
                              reindex ──▶ src/data/index.json (wikilink graph)
```

## Entry points

| Import                | Context     | Notes                                          |
| --------------------- | ----------- | ---------------------------------------------- |
| `zendo`               | anywhere    | Config + shared types (no runtime)             |
| `zendo/sources`       | Node only   | `gitSource`, `notionSource`                    |
| `zendo/transformers`  | Node only   | Built-in transformers + `applyTransformers`    |
| `zendo/cli`           | Node only   | The commander program                          |
| `zendo/remark`        | Node/Astro  | `remarkWikiLink`, `remarkWikiImage`, `remarkReadingTime` |
| `zendo/astro`         | Astro only  | `createGarden`                                 |
| `zendo/astro/actions` | Astro only  | `createSearchAction`                           |

> The Node-only entries never statically import `astro:*`. Keep your config (and its
> dependencies) likewise free of static `astro:*` imports — use dynamic `import()` or
> `import type` if you need them.

## Install (npm workspace, local)

```jsonc
// root package.json
{
  "workspaces": ["packages/*"],
  "dependencies": { "zendo": "*" }
}
```

The package ships as TypeScript source (no build step). Tell Astro/Vite to transpile it:

```js
// astro.config.mjs
export default defineConfig({
  vite: { ssr: { noExternal: ["zendo"] } },
});
```

## Wiring

**1. `zendo.config.ts`** (project root) — define sources, collections, transformers,
filters, sorting, and `buildUrl`:

```ts
import type { Configuration } from "zendo";
import { gitSource } from "zendo/sources";
import { renameMdToMdx, removeDrafts, addContentTypeToMetadata } from "zendo/transformers";

export const collectionIds = ["essays", "notes"] as const;

const config: Configuration = {
  contentDir: new URL("./src/content", import.meta.url).pathname,
  buildUrl: ({ type, slug }) => `/${type}/${slug}`,
  sortEntriesFn: (a, b) => (a.data.updatedAt > b.data.updatedAt ? -1 : 1),
  sources: [
    {
      id: "garden",
      source: gitSource({ repositoryUrl: "git@github.com:you/your-garden.git" }),
      entryTypes: [
        {
          id: "essays",
          basePath: "essays",
          pattern: "*.{md,mdx}",
          destinationPath: "essays",
          transformers: [renameMdToMdx(), removeDrafts(), addContentTypeToMetadata()],
        },
      ],
    },
  ],
};

export default config;
```

**2. `src/garden.ts`** — instantiate the runtime once and re-export the helpers:

```ts
import { createGarden } from "zendo/astro";
import config, { collectionIds } from "../zendo.config";
import index from "./data/index.json";

export const { getEntries, getEntry, getRelatedEntries, getEntryIndexRecord, sortEntries } =
  createGarden(config, index, collectionIds);

export const buildUrl = config.buildUrl;
export type { ZendoCollectionId, ZendoCollectionEntry, EntryLink } from "zendo/astro";
```

**3. `astro.config.mjs`** — wire the remark plugins (inject the index + URL builder):

```js
import index from "./src/data/index.json" with { type: "json" };
import { remarkReadingTime, remarkWikiLink, remarkWikiImage } from "zendo/remark";

markdown: {
  remarkPlugins: [
    remarkReadingTime,
    [remarkWikiLink, { index, buildUrl: ({ type, slug }) => `/${type}/${slug}` }],
    [remarkWikiImage, { assetsPath: "../assets" }],
  ],
}
```

**4. `src/actions/index.ts`** — register the search action:

```ts
import { createSearchAction } from "zendo/astro/actions";
import config from "../../zendo.config";
import * as garden from "../garden";

export const server = { search: createSearchAction(config, garden) };
```

## CLI

```jsonc
{
  "scripts": {
    "zendo:fetch": "tsx node_modules/zendo/src/cli/bin.ts fetch",
    "zendo:reindex": "tsx node_modules/zendo/src/cli/bin.ts reindex",
    "zendo:build": "tsx node_modules/zendo/src/cli/bin.ts build"
  }
}
```

The index is **build-time inlined** into your SSR bundle, so the order matters:
`reindex` → commit `src/data/index.json` → `astro build`. (`zendo build` chains them.)

## Configuration reference

| Field           | Required | Default                | Purpose                                       |
| --------------- | -------- | ---------------------- | --------------------------------------------- |
| `contentDir`    | yes      | —                      | Where transformed content is written          |
| `sources`       | yes      | —                      | Source adapters + their collections           |
| `sortEntriesFn` | yes      | —                      | Default entry ordering                         |
| `buildUrl`      | yes      | —                      | Maps `{ type, slug }` → URL                    |
| `filters`       | no       | —                      | Search/grid filters                            |
| `cacheDir`      | no       | `.garden-source`       | Source cache directory                         |
| `indexPath`     | no       | `src/data/index.json`  | Where the link index is written/read           |
| `buildCommand`  | no       | `npm run build`        | Command run by `zendo build`                   |

## License

MIT
