// main.ts: Orchestrates the cleanup flow for all configs in sources/*.json

import fs from "fs";
import path from "path";
import { findAndDownloadMaps } from "./findAndDownloadMaps";
import { decompileMaps } from "./decompileMaps";
import { writeMissingPlaceholders } from "./writePlaceholders";
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
  writeMissingPlaceholders(config);
  console.log(`Finished: ${configFile}\n`);
}

async function main() {
  const skipDownload = process.argv.includes("--skip-download");
  const sourcesDir = "sources";
  const files = fs.readdirSync(sourcesDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const configPath = path.join(sourcesDir, file);
    const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    await processConfig(config, file, skipDownload);
  }
  console.log("All configs processed.");
}

main();
