import type { UxIssue } from "./types";

/**
 * Keyword -> skill, matched against a page's own source text. Static and
 * deterministic: no import graph traversal, just a marker scan of the page
 * file itself (import specifiers, hook calls, JSX attributes it uses directly).
 */
const KEYWORD_SKILL_MAP: Array<{ keyword: RegExp; skill: string }> = [
  { keyword: /from ["']zustand["']|useStore\(/, skill: "state-management" },
  { keyword: /useEffect\(/, skill: "hook composition" },
  { keyword: /\bmemo\(|\buseMemo\(|\buseCallback\(/, skill: "performance-memoization" },
  { keyword: /from ["']motion\/react["']|from ["']framer-motion["']/, skill: "animation" },
  { keyword: /aria-|role=/, skill: "accessibility" },
];

export function deriveSkillsForPage(source: string, issues: UxIssue[]): string[] {
  const skills = new Set<string>();

  for (const { keyword, skill } of KEYWORD_SKILL_MAP) {
    if (keyword.test(source)) skills.add(skill);
  }
  for (const issue of issues) {
    skills.add(issue.skill);
  }

  return [...skills].sort();
}
