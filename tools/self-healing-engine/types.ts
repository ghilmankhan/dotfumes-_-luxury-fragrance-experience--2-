export type Category = "ui" | "ux" | "a11y" | "perf";
export type Severity = "low" | "medium" | "high";
export type FixAction = "auto-fix" | "suggest";

export interface HealingIssue {
  id: string;
  rule: string;
  category: Category;
  severity: Severity;
  file: string;
  line: number;
  message: string;
}

export interface FixPlanEntry {
  issueId: string;
  file: string;
  category: Category;
  severity: Severity;
  action: FixAction;
  message: string;
  reason: string;
}
