import { getCollection, type CollectionEntry, type DataEntryMap } from "astro:content";

import type { Configuration, EntryIndexRecord, ZendoCollectionConfig } from "../config";

export type { EntryLink, EntryIndexRecord, SearchResult } from "../config";

/** Any valid content collection id in the consuming Astro project. */
export type ZendoCollectionId = keyof DataEntryMap;
export type ZendoCollectionEntry<T extends ZendoCollectionId = ZendoCollectionId> = CollectionEntry<T>;

/**
 * The runtime helpers, bound to a consumer's configuration. `Ids` is the union of
 * the collection ids the garden manages (inferred from `collectionIds`), so
 * `getEntries()` etc. stay narrowly typed to the consumer's content schemas.
 */
export interface Garden<Ids extends ZendoCollectionId> {
  sortEntries<T extends Ids>(entries: CollectionEntry<T>[]): CollectionEntry<T>[];
  deduplicateEntries<T extends Ids>(entries: CollectionEntry<T>[]): CollectionEntry<T>[];
  getEntries<T extends Ids = Ids>(collections?: T[]): Promise<CollectionEntry<T>[]>;
  getEntry<T extends Ids>(collectionId: T, entryId: string): Promise<CollectionEntry<Ids> | null>;
  getEntryIndexRecord(entryId: string): EntryIndexRecord;
  getRelatedEntries(entry: CollectionEntry<Ids>): Promise<CollectionEntry<Ids>[]>;
  getCollectionConfig(entryTypeId: Ids): ZendoCollectionConfig;
}

/**
 * Creates the Astro-runtime helpers bound to a consumer's configuration and the
 * generated link index. Call this once (e.g. in `src/garden.ts`) and re-export
 * the returned helpers.
 *
 * @param config        The consumer's Zendo configuration.
 * @param index         The parsed link index (`import index from "./data/index.json"`).
 * @param collectionIds The collection ids queried by `getEntries()` when none are given.
 */
export function createGarden<Ids extends ZendoCollectionId>(
  config: Configuration<CollectionEntry<Ids>>,
  index: EntryIndexRecord[],
  collectionIds: readonly Ids[]
): Garden<Ids> {
  function sortEntries<T extends Ids>(entries: CollectionEntry<T>[]): CollectionEntry<T>[] {
    return entries.sort(config.sortEntriesFn);
  }

  function deduplicateEntries<T extends Ids>(entries: CollectionEntry<T>[]): CollectionEntry<T>[] {
    return Array.from(new Set(entries.map((entry) => `${entry.collection}:${entry.id}`)))
      .map((key) => {
        const [collection, id] = key.split(":");
        return entries.find((entry) => entry.collection === collection && entry.id === id);
      })
      .filter((entry): entry is CollectionEntry<T> => entry !== undefined);
  }

  async function getEntries<T extends Ids = Ids>(
    collections: T[] = [...collectionIds] as unknown as T[]
  ): Promise<CollectionEntry<T>[]> {
    const allEntries = await Promise.all(collections.map((collection) => getCollection(collection))).then((results) =>
      results.flat()
    );

    return sortEntries<T>(allEntries);
  }

  async function getEntry<T extends Ids>(collectionId: T, entryId: string): Promise<CollectionEntry<Ids> | null> {
    const entries = await getCollection(collectionId);
    return (entries.find((entry) => entry.id === entryId) as CollectionEntry<Ids> | undefined) ?? null;
  }

  function getEntryIndexRecord(entryId: string): EntryIndexRecord {
    const indexRecord = index.find((entry) => entry.slug === entryId || entry.ids.includes(entryId));

    if (!indexRecord) {
      throw new Error(`Index record not found for entry ${entryId}`);
    }

    return indexRecord;
  }

  async function getRelatedEntries(entry: CollectionEntry<Ids>): Promise<CollectionEntry<Ids>[]> {
    const indexRecord = getEntryIndexRecord(entry.id);

    if (!indexRecord) {
      return [];
    }

    const { outboundLinks, inboundLinks } = indexRecord;

    const allLinks = [...outboundLinks, ...inboundLinks];
    const uniqueLinks = Array.from(new Set(allLinks.map((link) => link.slug)))
      .map((slug) => allLinks.find((link) => link.slug === slug))
      .filter((link) => link !== undefined);

    const relatedEntries = (await Promise.all(uniqueLinks.map((link) => getEntry(link.type as Ids, link.slug)))).filter(
      (related) => related !== null
    ) as CollectionEntry<Ids>[];

    return sortEntries(relatedEntries);
  }

  function getCollectionConfig(entryTypeId: Ids): ZendoCollectionConfig {
    const entryTypeConfig = config.sources
      .flatMap((source) => source.entryTypes)
      .find((entryType) => entryType.id === entryTypeId);

    if (!entryTypeConfig) {
      throw new Error(`Entry type configuration not found for entry type ${String(entryTypeId)}`);
    }

    return entryTypeConfig as ZendoCollectionConfig;
  }

  return {
    sortEntries,
    deduplicateEntries,
    getEntries,
    getEntry,
    getEntryIndexRecord,
    getRelatedEntries,
    getCollectionConfig,
  };
}
