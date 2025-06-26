import fs from "fs";
import path from "path";
import https from "https";
import { Config } from "./types";

export async function findAndDownloadMaps(
  config: Config,
  skipDownload = false
) {
  const inputDir: string = config.inputDir;
  const baseUrl: string = config.baseUrl;
  const mapsDir: string = path.join(config.baseOutputDir, config.mapsDir);
  const exts: string[] = config.exts;

  function getAllStyleFiles(dir: string, exts: string[]): string[] {
    let results: string[] = [];
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        results = results.concat(getAllStyleFiles(full, exts));
      } else if (exts.some((ext) => file.endsWith(ext))) {
        results.push(full);
      }
    }
    return results;
  }

  function download(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https
        .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
            return;
          }
          res.pipe(file);
          file.on("finish", () => file.close(() => resolve()));
        })
        .on("error", (err) => {
          if (fs.existsSync(dest)) {
            fs.unlink(dest, (unlinkErr) => reject(unlinkErr || err));
          } else {
            reject(err);
          }
        });
    });
  }

  const styleFiles = getAllStyleFiles(inputDir, exts);
  for (const styleFile of styleFiles) {
    const content = fs.readFileSync(styleFile, "utf8");
    const lines = content.split("\n").slice(-5);
    const match = lines.join("\n").match(/sourceMappingURL\s*=\s*([^\s]+)/);
    if (match) {
      let mapFileName = match[1]
        .replace(/[\\:*?"<>|]+/g, "")
        .replace(/\*+$/, "")
        .replace(/\/+$/, "");
      const mapFile = path.join(mapsDir, mapFileName);
      if (!fs.existsSync(mapFile)) {
        const url = baseUrl + mapFileName.replace(/^\/+/, "");
        if (skipDownload) {
          console.log(`Missing: ${mapFile} (would download from ${url})`);
          continue;
        }
        fs.mkdirSync(path.dirname(mapFile), { recursive: true });
        try {
          console.log(`Downloading ${url} ...`);
          await download(url, mapFile);
          console.log(`Downloaded: ${mapFile}`);
        } catch (err: any) {
          console.error(`Failed: ${url} -> ${err.message}`);
        }
      }
    }
  }
}
