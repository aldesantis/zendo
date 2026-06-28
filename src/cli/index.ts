import { Command } from "commander";
import fetchCommand from "./commands/fetch";
import reindexCommand from "./commands/reindex";
import buildCommand from "./commands/build";
import { loadConfig } from "./utils/config";
import * as ui from "./ui";

const program = new Command();

program.name("zendo").description(ui.colors.brand("Your digital garden toolkit")).version("0.1.0").configureHelp({
  helpWidth: 100,
  sortSubcommands: true,
});

// Each command resolves the consumer's config from the current working directory.
program
  .command("fetch")
  .description("Fetch all content from your sources")
  .action(async () => {
    await fetchCommand(await loadConfig());
  });

program
  .command("reindex")
  .description("Rebuild the content index")
  .action(async () => {
    await reindexCommand(await loadConfig());
  });

program
  .command("build")
  .description("Fetch, reindex, and build your garden")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async () => {
    await buildCommand(await loadConfig());
  });

export default program;
