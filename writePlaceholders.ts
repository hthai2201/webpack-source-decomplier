import fs from "fs";
import path from "path";
import { Config } from "./types";

export function writeMissingPlaceholders(config: Config) {
  const decompiledDir: string = path.join(
    config.baseOutputDir,
    config.decompiledDir
  );
  const exts: string[] = config.exts;

  const importRegex =
    /(?:import\s+(?:.+?\s+from\s+)?|require\()\s*['"](\.\.?\/[^'"]+)['"]/g;

  function getAllSourceFiles(dir: string): string[] {
    let results: string[] = [];
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        results = results.concat(getAllSourceFiles(full));
      } else if (/\.[jt]sx?$/.test(file)) {
        results.push(full);
      }
    }
    return results;
  }

  function resolveImport(fromFile: string, importPath: string): string | null {
    const base = path.resolve(path.dirname(fromFile), importPath);
    for (const ext of exts) {
      if (fs.existsSync(base + ext)) return null;
    }
    if (fs.existsSync(base) && fs.statSync(base).isFile()) return null;
    for (const ext of exts) {
      if (fs.existsSync(path.join(base, "index" + ext))) return null;
    }
    for (const ext of exts) {
      if (!fs.existsSync(base + ext)) return base + ext;
    }
    for (const ext of exts) {
      const idx = path.join(base, "index" + ext);
      if (!fs.existsSync(idx)) return idx;
    }
    return null;
  }

  if (!fs.existsSync(decompiledDir)) return;
  const files = getAllSourceFiles(decompiledDir);
  const missing = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    let match;
    while ((match = importRegex.exec(content))) {
      const importPath = match[1];
      const missingFile = resolveImport(file, importPath);
      if (missingFile) missing.add(missingFile);
    }
  }
  for (const file of missing) {
    if (!fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      let stub = `// Placeholder for missing module: ${path.basename(file)}\n`;
      const fname = path.basename(file, path.extname(file));
      if (/^[a-z]/.test(fname)) {
        stub += `export function ${fname}() {}\nexport const ${fname}Var = undefined;\n`;
      } else {
        stub += `export default {};\n`;
      }
      fs.writeFileSync(file, stub);
      console.log("Created placeholder:", file);
    }
  }
}
