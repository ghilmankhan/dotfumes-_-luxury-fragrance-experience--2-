/**
 * Single enforcement entry point for gating CMS actions on kernel-resolved
 * skills. Reads the same static resolvedSkills.json as skillBridge — fail
 * closed: if the required skill isn't in activeSkills, action never runs.
 *
 * Also applies static risk rules on top of the primary required-skill check:
 * keyword-matched task categories (destructive/UI/mutation) must carry their
 * associated skill even if it wasn't passed as requiredSkill. Rule-based only
 * — no inference, no simulation, no generated test cases.
 */
import { hasSkill, getActiveSkills } from './skillBridge';

export type SkillGuardResult<T> =
  | { status: 'success'; output: T }
  | { status: 'blocked'; reason: string };

type RiskRule = { keywords: string[]; requiredSkill: string; label: string };

const RISK_RULES: RiskRule[] = [
  { keywords: ['delete', 'remove', 'destroy'], requiredSkill: 'apps-script', label: 'destructive operation' },
  { keywords: ['ui', 'design', 'redesign', 'layout', 'typography'], requiredSkill: 'frontend-design', label: 'UI change' },
  { keywords: ['update', 'mutation', 'mutate', 'write', 'save'], requiredSkill: 'typescript', label: 'data mutation' },
];

function checkRiskRules(task: string): string | null {
  const lower = task.toLowerCase();
  const active = getActiveSkills(task);
  for (const rule of RISK_RULES) {
    const matches = rule.keywords.some((kw) => lower.includes(kw));
    if (matches && !active.includes(rule.requiredSkill)) {
      return `risk rule "${rule.label}" requires skill "${rule.requiredSkill}" but it is not active for task "${task}"`;
    }
  }
  return null;
}

export async function skillGuard<T>(
  task: string,
  requiredSkill: string,
  action: () => Promise<T> | T,
): Promise<SkillGuardResult<T>> {
  if (!hasSkill(task, requiredSkill)) {
    return { status: 'blocked', reason: `skill "${requiredSkill}" not approved for task "${task}"` };
  }
  const riskBlock = checkRiskRules(task);
  if (riskBlock) {
    return { status: 'blocked', reason: riskBlock };
  }
  const output = await action();
  return { status: 'success', output };
}
