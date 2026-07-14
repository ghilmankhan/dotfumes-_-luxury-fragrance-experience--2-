/**
 * Skill Compiler OS v2 — compile-time-only static analysis.
 *
 * Never shipped, never imported by src/ (blocked by the no-restricted-imports
 * ESLint rule on tools/*), never invoked at runtime. Unlike
 * tools/skill-compiler/compile.ts, this does not call the local kernel — it
 * is pure static analysis over this repo's own src/ tree (regex-based rules
 * in rules.ts), so it has no external dependency and is safe to run in any
 * environment (local, CI, Vercel) without a no-op guard.
 *
 * Writes three artifacts under src/generated/, which is the only place
 * src/ is allowed to read skill/UX data from:
 *   - ai-skill-plan.json  (skills mapped to each page)
 *   - ux-report.json      (UX/UI/logic issues found per file)
 *   - refactor-map.json   (files ranked by refactor priority)
 *
 * Run: npm run skill:compile-v2
 */
import { dirname, join } from "path";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { readSource, toRepoRelativePath, walkSourceFiles } from "./scan";
import { runRules } from "./rules";
import { deriveSkillsForPage } from "./skillMap";
import { buildRefactorEntry } from "./refactorMap";
import type { FileReport, RefactorEntry, SkillMapEntry } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const srcDir = join(repoRoot, "src");
const generatedDir = join(srcDir, "generated");
const pagesDir = join(srcDir, "pages");

function writeJson(fileName: string, data: unknown): void {
  const outPath = join(generatedDir, fileName);
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`skill-compiler-v2: wrote ${toRepoRelativePath(repoRoot, outPath)}`);
}

function main(): void {
  const allFiles = walkSourceFiles(srcDir);

  const fileReports: FileReport[] = [];
  const refactorEntries: RefactorEntry[] = [];
  const skillMapEntries: SkillMapEntry[] = [];

  for (const filePath of allFiles) {
    const source = readSource(filePath);
    const relPath = toRepoRelativePath(repoRoot, filePath);
    const issues = runRules(source);

    if (issues.length > 0) {
      fileReports.push({ file: relPath, issues });
    }

    const refactorEntry = buildRefactorEntry(relPath, issues);
    if (refactorEntry) refactorEntries.push(refactorEntry);

    if (filePath.startsWith(pagesDir)) {
      skillMapEntries.push({
        page: relPath.replace(/^src\/pages\//, "").replace(/\.tsx?$/, ""),
        file: relPath,
        skills: deriveSkillsForPage(source, issues),
      });
    }
  }

  refactorEntries.sort((a, b) => b.score - a.score);
  skillMapEntries.sort((a, b) => a.page.localeCompare(b.page));

  writeJson("ai-skill-plan.json", { generatedAt: new Date().toISOString(), pages: skillMapEntries });
  writeJson("ux-report.json", {
    generatedAt: new Date().toISOString(),
    totalIssues: fileReports.reduce((sum, r) => sum + r.issues.length, 0),
    files: fileReports,
  });
  writeJson("refactor-map.json", { generatedAt: new Date().toISOString(), entries: refactorEntries });
}

main();
