export type Severity = "low" | "medium" | "high";

export interface UxIssue {
  rule: string;
  severity: Severity;
  skill: string;
  message: string;
  line: number;
}

export interface FileReport {
  file: string;
  issues: UxIssue[];
}

export interface SkillMapEntry {
  page: string;
  file: string;
  skills: string[];
}

export interface RefactorEntry {
  file: string;
  priority: Severity;
  score: number;
  reasons: string[];
  suggestedSkills: string[];
}
