import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const EXCLUDED_DIRS = new Set(["generated", "node_modules"]);

export function walkSourceFiles(rootDir: string, dir = rootDir): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkSourceFiles(rootDir, fullPath));
      continue;
    }

    const ext = entry.slice(entry.lastIndexOf("."));
    if (SOURCE_EXTENSIONS.has(ext) && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

export function readSource(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

export function toRepoRelativePath(rootDir: string, filePath: string): string {
  return relative(rootDir, filePath).split("\\").join("/");
}
