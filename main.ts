// main.ts: Orchestrates the cleanup flow for all configs in sources/*.json

import fs from "fs";
import path from "path";
import { ArgumentParser } from "argparse";
import { findAndDownloadMaps } from "./findAndDownloadMaps";
import { decompileMaps } from "./decompileMaps";
import { Config } from "./types";

async function processConfig(
  config: Config,
  configFile: string,
  skipDownload: boolean
) {
  console.log(`Processing config: ${configFile}`);
  if (!skipDownload) {
    await findAndDownloadMaps(config, false);
  }
  decompileMaps(config);
  console.log(`Finished: ${configFile}\n`);
}

async function main() {
  const sourcesDir = "sources";
  const parser = new ArgumentParser({
    description: "Webpack Source Decompiler",
  });
  parser.add_argument("--source", {
    help: "Config file(s) to process (relative to sources/ or absolute path)",
    nargs: "*",
    default: [],
  });
  parser.add_argument("--skip-download", {
    help: "Skip downloading source maps",
    action: "store_true",
  });

  const args = parser.parse_args();
  let files: string[];
  if (args.source && args.source.length > 0) {
    files = args.source.map((f: string) =>
      path.isAbsolute(f) ? f : path.join(sourcesDir, f)
    );
  } else {
    files = fs
      .readdirSync(sourcesDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(sourcesDir, f));
  }
  for (const configPath of files) {
    const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    await processConfig(
      config,
      path.basename(configPath),
      args["skip_download"]
    );
  }
  console.log("All configs processed.");
  process.exit(0);
}

main();
