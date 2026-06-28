import path from "path";
import { existsSync } from "fs";
import { pathToFileURL } from "url";

import type { Configuration } from "../../config";

/**
 * Resolved configuration with engine defaults applied.
 */
export type ResolvedConfiguration = Configuration & {
  cacheDir: string;
  indexPath: string;
  buildCommand: string;
};

const CONFIG_BASENAMES = ["zendo.config.ts", "zendo.config.mts", "zendo.config.mjs", "zendo.config.js"];

/**
 * Loads the consumer's Zendo configuration from the current working directory.
 *
 * The config is imported dynamically (rather than statically) so the CLI's
 * module graph never references Astro virtual modules that the config's own
 * dependencies may touch via lazy/`import type` usage.
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<ResolvedConfiguration> {
  const basename = CONFIG_BASENAMES.find((name) => existsSync(path.join(cwd, name)));

  if (!basename) {
    throw new Error(`Could not find a Zendo config (looked for ${CONFIG_BASENAMES.join(", ")}) in ${cwd}`);
  }

  const configPath = path.join(cwd, basename);
  const imported = (await import(pathToFileURL(configPath).href)) as { default?: Configuration };
  const config = imported.default;

  if (!config) {
    throw new Error(`${basename} must have a default export`);
  }

  return {
    ...config,
    cacheDir: config.cacheDir ?? ".garden-source",
    indexPath: config.indexPath ?? path.join("src", "data", "index.json"),
    buildCommand: config.buildCommand ?? "npm run build",
  };
}
