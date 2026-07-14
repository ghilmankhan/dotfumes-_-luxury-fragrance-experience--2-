/**
 * Browser-safe. Reads the compile-time resolved skill decisions (generated
 * by tools/skill-compiler/compile.ts, a dev/CI-only script). This is the
 * only skill source src/ ever consumes — no runtime kernel access, no
 * filesystem logic, no fallback execution path.
 */
import resolved from "../../generated/resolvedSkills.json";

type ResolvedSkillEntry = { activeSkills: string[]; status: "success" | "empty" | "failure" };

const RESOLVED_SKILLS = resolved as Record<string, ResolvedSkillEntry>;

export function getActiveSkills(task: string): string[] {
  return RESOLVED_SKILLS[task]?.activeSkills ?? [];
}

export function hasSkill(task: string, skillName: string): boolean {
  return getActiveSkills(task).includes(skillName);
}
