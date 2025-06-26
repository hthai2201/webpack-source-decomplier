import fs from "fs";
import path from "path";
import { Config } from "./types";

export function decompileMaps(config: Config) {
  const mapsDir: string = path.join(config.baseOutputDir, config.mapsDir);
  const decompiledDir: string = path.join(
    config.baseOutputDir,
    config.decompiledDir
  );

  function getAllMapFiles(dir: string): string[] {
    let results: string[] = [];
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        results = results.concat(getAllMapFiles(full));
      } else if (file.endsWith(".map")) {
        results.push(full);
      }
    }
    return results;
  }

  const mapFiles = getAllMapFiles(mapsDir);
  for (const mapPath of mapFiles) {
    let mapJson;
    try {
      mapJson = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    } catch {
      continue;
    }
    const sources: string[] = mapJson.sources || [];
    const sourcesContent: string[] = mapJson.sourcesContent || [];
    for (let i = 0; i < sources.length; i++) {
      const webpackPrefix = config.webpackPrefix || "_N_E";
      let srcPath = sources[i]
        .replace(new RegExp(`^webpack://${webpackPrefix}/`), "")
        .replace(/^webpack:\/\//, "")
        .replace(/^file:\/\//, "")
        .replace(/^\/+/, "")
        .split("/")
        .filter((segment) => segment !== "..")
        .join("/");
      srcPath = decodeURIComponent(srcPath);
      const content = sourcesContent[i] || "";
      const outPath = path.join(decompiledDir, srcPath);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, content, "utf8");
    }
  }
}
