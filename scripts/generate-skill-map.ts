/**
 * Dev-only. Runs the real kernel (runTask) for every CMS action this app
 * cares about and writes the resolved decisions to a static JSON file the
 * browser bundle can import. Never ships Node APIs (fs/path/os) to the
 * client — the browser only ever reads the JSON output of this script.
 *
 * Run: npx tsx scripts/generate-skill-map.ts
 * Re-run whenever ~/.agents/orchestrator/*.json changes.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CMS_TASKS = [
  "dashboard sheets api fetch",
  "orders zustand client state",
  "products ui redesign typography",
  "settings ts-expect-error fix types",
  "hook composition best practices",
  "slow render bundle size audit",
  "react 19 refs as props no manual memoization",
] as const;

async function main() {
  const enginePath = join(homedir(), ".agents", "kernel", "engine.ts");
  const { runTask } = await import(enginePath);

  const resolved: Record<string, { activeSkills: string[]; status: string }> = {};
  for (const task of CMS_TASKS) {
    const result = runTask(task);
    resolved[task] = { activeSkills: result.activeSkills, status: result.status };
  }

  const outPath = join(__dirname, "..", "src", "lib", "skills", "resolvedSkills.json");
  writeFileSync(outPath, JSON.stringify(resolved, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${outPath}`);
}

main();
