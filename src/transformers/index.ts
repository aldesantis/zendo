import type { ZendoCollectionConfig } from "../config";

import addBasenameToAliases from "./addBasenameToAliases";
import normalizeFilename from "./normalizeFilename";
import escapeMdx from "./escapeMdx";
import removeFirstH1 from "./removeFirstH1";
import removeSection from "./removeSection";
import renameMdToMdx from "./renameMdToMdx";
import addContentTypeToMetadata from "./addContentTypeToMetadata";
import removeDrafts from "./removeDrafts";
import demoteHeadings from "./demoteHeadings";
import normalizeMetadata from "./normalizeMetadata";
import convertNotionLinksToWikilinks from "./convertNotionLinksToWikilinks";

export type TransformerResult = {
  path: string;
  content: string | Buffer;
} | null;

export type Transformer = (
  originalPath: string,
  originalContent: string | Buffer,
  contentType: ZendoCollectionConfig
) => Promise<TransformerResult>;

export async function applyTransformers(
  path: string,
  content: string | Buffer,
  contentType: ZendoCollectionConfig
): Promise<TransformerResult> {
  let currentResult: TransformerResult = {
    path,
    content,
  };

  for (const transformer of contentType.transformers) {
    if (currentResult === null) {
      return null;
    }

    currentResult = await transformer(currentResult.path, currentResult.content, contentType);
  }

  return currentResult;
}

export {
  addBasenameToAliases,
  normalizeFilename,
  escapeMdx,
  removeFirstH1,
  removeSection,
  renameMdToMdx,
  addContentTypeToMetadata,
  removeDrafts,
  demoteHeadings,
  normalizeMetadata,
  convertNotionLinksToWikilinks,
};
