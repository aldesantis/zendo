import fetchContent from "./fetch";
import indexContent from "./reindex";
import * as ui from "../ui";
import { execAsync } from "../utils/exec";
import type { ResolvedConfiguration } from "../utils/config";

async function buildSite(buildCommand: string): Promise<void> {
  await ui.withSpinner(
    "Building site...",
    async () => {
      return execAsync(buildCommand);
    },
    "Site built"
  );
}

/**
 * Main function to update content: fetch, index, and build
 */
export default async function buildCommand(config: ResolvedConfiguration): Promise<void> {
  await fetchContent(config);
  await indexContent(config);
  await buildSite(config.buildCommand);

  ui.success("All steps completed!");
}
