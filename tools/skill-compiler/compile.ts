/**
 * Compile-time only. Never shipped, never imported by src/ (blocked by the
 * no-restricted-imports ESLint rule on tools/*), never invoked at runtime.
 *
 * Runs the local kernel (~/.agents/kernel/engine.ts) for every CMS action
 * this app cares about and writes the resolved decisions to a static JSON
 * file under src/generated/. That JSON file is the only skill source the
 * browser bundle ever reads (via src/lib/skills/skillBridge.ts).
 *
 * Outside local dev (Vercel, CI, NODE_ENV=production) this is a structural
 * no-op: it returns before the ~/.agents path is even constructed, so a
 * production build can never reach the kernel filesystem. The committed
 * src/generated/resolvedSkills.json is what production actually consumes —
 * this script only ever refreshes it locally.
 *
 * Run: npm run skill:compile
 * Re-run whenever ~/.agents/orchestrator/*.json changes.
 */
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isLocalDev =
  process.env.VERCEL !== "1" &&
  process.env.CI !== "true" &&
  process.env.NODE_ENV !== "production";

const CMS_TASKS = [
  "dashboard sheets api fetch",
  "orders zustand client state",
  "products ui redesign typography",
  "settings ts-expect-error fix types",
  "hook composition best practices",
  "slow render bundle size audit",
  "react 19 refs as props no manual memoization",
] as const;

interface KernelResult {
  status: string;
  activeSkills: string[];
}

async function main() {
  if (!isLocalDev) {
    console.log("skill-compiler: non-local environment detected, skipping (committed resolvedSkills.json is used as-is)");
    return;
  }

  const enginePath = join(homedir(), ".agents", "kernel", "engine.ts");
  const { runTask } = await import(/* @vite-ignore */ enginePath);

  const resolved: Record<string, { activeSkills: string[]; status: string }> = {};
  for (const task of CMS_TASKS) {
    const result: KernelResult = await runTask(task);
    resolved[task] = { activeSkills: result.activeSkills, status: result.status };
  }

  const outPath = join(__dirname, "..", "..", "src", "generated", "resolvedSkills.json");
  writeFileSync(outPath, JSON.stringify(resolved, null, 2) + "\n", "utf-8");
  console.log(`skill-compiler: wrote ${outPath}`);
}

main();
