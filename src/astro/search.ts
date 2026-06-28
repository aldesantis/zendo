import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import type { CollectionEntry } from "astro:content";

import type { Configuration, SearchResult, ZendoCollectionConfig } from "../config";
import type { Garden, ZendoCollectionId } from "./content";

type SearchResultResponse = SearchResult & {
  url: string;
};

export function createSearchAction<Ids extends ZendoCollectionId>(
  config: Configuration<CollectionEntry<Ids>>,
  garden: Garden<Ids>
) {
  async function applyCollectionFilters(
    entryTypes: ZendoCollectionConfig<CollectionEntry<Ids>>[],
    params: Record<string, unknown>
  ): Promise<ZendoCollectionConfig<CollectionEntry<Ids>>[]> {
    if (!config.filters) {
      return [];
    }

    const filters = config.filters.filter((filter) => filter.collectionFilterFn !== undefined);

    let filteredEntryTypes = entryTypes;
    for (const filter of filters) {
      const paramValue = params[filter.id];
      if (paramValue !== undefined && filter.collectionFilterFn) {
        filteredEntryTypes = await filter.collectionFilterFn(filteredEntryTypes, paramValue);
      }
    }

    return filteredEntryTypes;
  }

  async function applyContentFilters(
    entries: CollectionEntry<Ids>[],
    params: Record<string, unknown>
  ): Promise<CollectionEntry<Ids>[]> {
    if (!config.filters) {
      return [];
    }

    const filters = config.filters.filter((filter) => filter.entryFilterFn !== undefined);

    let filteredEntries = entries;
    for (const filter of filters) {
      const paramValue = params[filter.id];
      if (paramValue !== undefined && filter.entryFilterFn) {
        filteredEntries = await filter.entryFilterFn(filteredEntries, paramValue);
      }
    }

    return filteredEntries;
  }

  async function getResults(
    params: Record<string, unknown>,
    { limit }: { limit?: number }
  ): Promise<SearchResultResponse[]> {
    const searchableCollections = config.sources
      .flatMap((source) => source.entryTypes)
      .filter((entryType) => entryType.search);

    if (searchableCollections.length === 0 || !config.filters) {
      return [];
    }

    const collections = await applyCollectionFilters(searchableCollections, params);

    const searchResults: SearchResultResponse[] = await Promise.all(
      collections.map(async (collection) => {
        const entries = await garden.getEntries([collection.id as Ids]);
        const filteredEntries = await applyContentFilters(entries, params);

        return filteredEntries.map((entry) => ({
          ...collection.search!.buildSearchResultFn(entry),
          url: collection.search!.buildUrlFn(entry.id),
        }));
      })
    ).then((results) => results.flat());

    return searchResults.slice(0, limit);
  }

  return defineAction({
    input: z.looseObject({
      limit: z.number().optional(),
    }),
    handler: async (params) => {
      const { limit, ...filterParams } = params;
      const items = await getResults(filterParams, { limit });
      return { items };
    },
  });
}
