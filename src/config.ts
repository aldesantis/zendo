import type { Transformer } from "./transformers";
import type { Source } from "./sources";

/**
 * A resolved link between two entries in the content graph.
 */
export interface EntryLink {
  slug: string;
  type: string;
}

/**
 * A single record in the generated link index (`index.json`).
 */
export interface EntryIndexRecord {
  ids: string[];
  slug: string;
  type: string;
  outboundLinks: EntryLink[];
  inboundLinks: EntryLink[];
}

/**
 * A search result produced by a collection's `buildSearchResultFn`. The shape is
 * intentionally open: consumers may attach domain-specific fields (e.g. `status`)
 * and narrow the type on their side.
 */
export interface SearchResult {
  id: string;
  name: string;
  type: string;
  date?: string;
  [key: string]: unknown;
}

export type EntryFilterFn<Entry = unknown> = (entries: Entry[], value: unknown) => Promise<Entry[]>;
export type CollectionFilterFn<Entry = unknown> = (
  collections: ZendoCollectionConfig<Entry>[],
  value: unknown
) => Promise<ZendoCollectionConfig<Entry>[]>;

export interface FilterConfig<Entry = unknown> {
  id: string;
  ui?: {
    label: string;
    getItems: () => Promise<Array<{ id: string; label: string }>>;
  };
  entryFilterFn?: EntryFilterFn<Entry>;
  collectionFilterFn?: CollectionFilterFn<Entry>;
}

export interface ZendoCollectionConfig<Entry = unknown> {
  id: string;
  basePath?: string;
  pattern: string;
  destinationPath: string;
  transformers: Transformer[];
  search?: {
    label: string;
    buildSearchResultFn: (entry: Entry) => SearchResult;
    buildUrlFn: (slug: string) => string;
  };
}

export interface SourceConfig<Entry = unknown> {
  id: string;
  source: Source;
  entryTypes: ZendoCollectionConfig<Entry>[];
}

export type SortEntriesFn<Entry = unknown> = (a: Entry, b: Entry) => number;

export interface Configuration<Entry = unknown> {
  /** Absolute path to the directory where transformed content is written. */
  contentDir: string;
  sources: SourceConfig<Entry>[];
  filters?: FilterConfig<Entry>[];
  sortEntriesFn: SortEntriesFn<Entry>;
  /**
   * Builds the public URL for a content entry. Used to resolve wikilinks and
   * related-entry links. Lets consumers own their routing (e.g. pluralization).
   */
  buildUrl: (link: EntryLink) => string;
  /**
   * Directory (relative to cwd) where fetched source content is cached.
   * @default ".garden-source"
   */
  cacheDir?: string;
  /**
   * Path (relative to cwd) where the generated link index is written/read.
   * @default "src/data/index.json"
   */
  indexPath?: string;
  /**
   * Command run by the `build` CLI command after fetch + reindex.
   * @default "npm run build"
   */
  buildCommand?: string;
}
