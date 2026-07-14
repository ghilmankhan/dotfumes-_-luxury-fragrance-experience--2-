/**
 * Turns detected issues into a fix plan. This module only *plans* — nothing
 * here (or anywhere in self-healing-engine) reads back into and rewrites
 * application source files. `action: "auto-fix"` marks an issue as safe to
 * apply by hand or by a future dedicated tool; it is not applied here.
 */
import type { FixAction, FixPlanEntry, HealingIssue } from "./types";

// Rules whose fix is a pure presentational className/style edit — the only
// kind of change eligible for auto-fix. Everything else touches structure,
// business logic, or data flow and is suggestion-only regardless of severity.
const PRESENTATIONAL_RULES = new Set([
  "missing-focus-state",
  "small-touch-target",
  "possible-low-contrast",
  "layout-drift",
]);

const CMS_OR_BACKEND_PATH = /\/(lib\/(store|cms|api|skills)|pages\/AdminPage)/;

function isSafeToAutoFix(issue: HealingIssue): boolean {
  if (issue.severity === "high") return false;
  if (!PRESENTATIONAL_RULES.has(issue.rule)) return false;
  if (CMS_OR_BACKEND_PATH.test(issue.file)) return false;
  return true;
}

function reasonFor(issue: HealingIssue, action: FixAction): string {
  if (action === "auto-fix") {
    return "Presentational-only change (className/style), severity is low or medium, and the file is outside CMS/backend/data-flow paths.";
  }
  if (issue.severity === "high") return "Severity is high — never auto-fixed.";
  if (CMS_OR_BACKEND_PATH.test(issue.file)) {
    return "File touches CMS, store, API, or admin logic — suggestion only.";
  }
  return "Fix requires a structural or logic change, not a safe presentational edit.";
}

export function planFixes(issues: HealingIssue[]): FixPlanEntry[] {
  return issues.map((issue) => {
    const action: FixAction = isSafeToAutoFix(issue) ? "auto-fix" : "suggest";
    return {
      issueId: issue.id,
      file: issue.file,
      category: issue.category,
      severity: issue.severity,
      action,
      message: issue.message,
      reason: reasonFor(issue, action),
    };
  });
}
