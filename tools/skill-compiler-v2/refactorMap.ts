import type { RefactorEntry, Severity, UxIssue } from "./types";

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 1, medium: 3, high: 5 };

function priorityForScore(score: number): Severity {
  if (score >= 8) return "high";
  if (score >= 3) return "medium";
  return "low";
}

export function buildRefactorEntry(file: string, issues: UxIssue[]): RefactorEntry | null {
  if (issues.length === 0) return null;

  const score = issues.reduce((sum, issue) => sum + SEVERITY_WEIGHT[issue.severity], 0);
  const reasons = [...new Set(issues.map((issue) => issue.message))];
  const suggestedSkills = [...new Set(issues.map((issue) => issue.skill))].sort();

  return {
    file,
    priority: priorityForScore(score),
    score,
    reasons,
    suggestedSkills,
  };
}
