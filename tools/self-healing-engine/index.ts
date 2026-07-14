/**
 * Self-Healing CMS OS — compile-time-only issue detection + fix planning.
 *
 * Sits on top of the existing Skill Compiler v1/v2 pipeline and never
 * modifies it. Pure static analysis (regex/text pattern matches, same
 * discipline as tools/skill-compiler-v2) — no LLM calls, no network access,
 * and no execution of the plan it produces: this package only *plans*
 * fixes, it never rewrites application source files.
 *
 * ux-report.json is already written by skill-compiler-v2 by the time this
 * runs. Rather than overwrite it, this extends the existing file with a
 * `healingIssues` field so both compilers' output survive side by side.
 *
 * Run: npm run self-heal (after skill:compile-v2, before vite build)
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadSourceFiles } from "./analyzer";
import { detectIssues } from "./issue-detector";
import { planFixes } from "./fix-planner";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const srcDir = join(repoRoot, "src");
const generatedDir = join(srcDir, "generated");
const uxReportPath = join(generatedDir, "ux-report.json");

function writeJson(outPath: string, data: unknown): void {
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`self-healing-engine: wrote ${outPath.slice(repoRoot.length + 1)}`);
}

function readExistingUxReport(): Record<string, unknown> {
  if (!existsSync(uxReportPath)) {
    return { generatedAt: new Date().toISOString(), totalIssues: 0, files: [] };
  }
  return JSON.parse(readFileSync(uxReportPath, "utf-8"));
}

function main(): void {
  const files = loadSourceFiles(repoRoot, srcDir);
  const issues = detectIssues(files);
  const fixPlan = planFixes(issues);
  const safeFixes = fixPlan.filter((entry) => entry.action === "auto-fix");

  writeJson(uxReportPath, {
    ...readExistingUxReport(),
    healingGeneratedAt: new Date().toISOString(),
    healingIssueCount: issues.length,
    healingIssues: issues,
  });

  writeJson(join(generatedDir, "healing-plan.json"), {
    generatedAt: new Date().toISOString(),
    totalIssues: issues.length,
    autoFixable: safeFixes.length,
    suggestionsOnly: fixPlan.length - safeFixes.length,
    entries: fixPlan,
  });

  writeJson(join(generatedDir, "safe-fixes.json"), {
    generatedAt: new Date().toISOString(),
    count: safeFixes.length,
    fixes: safeFixes,
  });
}

main();
