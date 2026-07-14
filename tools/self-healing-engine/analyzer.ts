/**
 * Scans the frontend codebase for the issue-detector. Reuses the existing
 * skill-compiler-v2 file walker (both live under tools/, neither touches
 * src/ at runtime) instead of duplicating directory-walking logic.
 */
import { readSource, toRepoRelativePath, walkSourceFiles } from "../skill-compiler-v2/scan";

export interface SourceFile {
  path: string;
  source: string;
}

export function loadSourceFiles(rootDir: string, srcDir: string): SourceFile[] {
  return walkSourceFiles(srcDir).map((filePath) => ({
    path: toRepoRelativePath(rootDir, filePath),
    source: readSource(filePath),
  }));
}

const MIN_SIGNATURE_TAGS = 6;

function jsxTagSignature(source: string): string {
  const tags = source.match(/<([A-Za-z][A-Za-z0-9.]*)/g) ?? [];
  return tags.join(",");
}

/**
 * Cross-file check: files whose JSX tag sequence is identical are flagged as
 * a duplicated UI pattern. A minimum tag count avoids flagging trivial
 * wrapper files that would coincidentally share a short signature.
 */
export function findDuplicateUiPatterns(files: SourceFile[]): Map<string, string[]> {
  const bySignature = new Map<string, string[]>();
  for (const file of files) {
    const signature = jsxTagSignature(file.source);
    const tagCount = signature ? signature.split(",").length : 0;
    if (tagCount < MIN_SIGNATURE_TAGS) continue;
    const group = bySignature.get(signature) ?? [];
    group.push(file.path);
    bySignature.set(signature, group);
  }

  const duplicates = new Map<string, string[]>();
  for (const [signature, paths] of bySignature) {
    if (paths.length > 1) duplicates.set(signature, paths);
  }
  return duplicates;
}

function exportedComponentNames(source: string): string[] {
  const names: string[] = [];
  const re = /export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    names.push(match[1]);
  }
  return names;
}

/** Cross-file check: the same component name exported from more than one file. */
export function findDuplicateComponentDefinitions(files: SourceFile[]): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  for (const file of files) {
    for (const name of exportedComponentNames(file.source)) {
      const group = byName.get(name) ?? [];
      group.push(file.path);
      byName.set(name, group);
    }
  }

  const duplicates = new Map<string, string[]>();
  for (const [name, paths] of byName) {
    const uniquePaths = [...new Set(paths)];
    if (uniquePaths.length > 1) duplicates.set(name, uniquePaths);
  }
  return duplicates;
}
