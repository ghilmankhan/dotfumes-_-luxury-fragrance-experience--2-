/**
 * Static heuristics only — no network calls, no LLM invocation. Every rule
 * here is a deterministic pattern match over source text, so re-running the
 * compiler against an unchanged tree always produces byte-identical output.
 */
import type { Severity, UxIssue } from "./types";

interface PatternRule {
  id: string;
  severity: Severity;
  skill: string;
  message: string;
  pattern: RegExp;
}

const PATTERN_RULES: PatternRule[] = [
  {
    id: "inline-style-object",
    severity: "low",
    skill: "design-tokens",
    message: "Inline style={{...}} object; prefer a token/utility class",
    pattern: /style=\{\{/g,
  },
  {
    id: "hardcoded-hex-color",
    severity: "low",
    skill: "design-tokens",
    message: "Hardcoded hex color literal; prefer a design token",
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
  },
  {
    id: "missing-img-alt",
    severity: "medium",
    skill: "accessibility",
    message: "<img> without an alt attribute",
    pattern: /<img(?![^>]*\balt=)[^/>]*\/?>/g,
  },
  {
    id: "console-log",
    severity: "low",
    skill: "code-complexity",
    message: "console.log left in source",
    pattern: /console\.log\(/g,
  },
  {
    id: "explicit-any",
    severity: "medium",
    skill: "type-safety",
    message: "Explicit `any` type",
    pattern: /:\s*any\b/g,
  },
  {
    id: "ts-suppression",
    severity: "medium",
    skill: "type-safety",
    message: "Type checking suppressed (@ts-ignore / @ts-expect-error)",
    pattern: /@ts-(?:ignore|expect-error)/g,
  },
  {
    id: "todo-fixme",
    severity: "low",
    skill: "code-complexity",
    message: "Unresolved TODO/FIXME comment",
    pattern: /\b(?:TODO|FIXME)\b/g,
  },
  {
    id: "inline-jsx-handler",
    severity: "low",
    skill: "performance-memoization",
    message: "Inline arrow function passed directly as a prop (re-created every render)",
    pattern: /=\{\(\)\s*=>/g,
  },
];

const LARGE_FILE_LINE_THRESHOLD = 300;
const MAP_KEY_LOOKAHEAD_CHARS = 200;

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (source.charCodeAt(i) === 10) line++;
  }
  return line;
}

function runPatternRules(source: string): UxIssue[] {
  const issues: UxIssue[] = [];
  for (const rule of PATTERN_RULES) {
    const matches = source.matchAll(rule.pattern);
    for (const match of matches) {
      issues.push({
        rule: rule.id,
        severity: rule.severity,
        skill: rule.skill,
        message: rule.message,
        line: lineAt(source, match.index ?? 0),
      });
    }
  }
  return issues;
}

function runLargeFileRule(source: string): UxIssue[] {
  const lineCount = source.split("\n").length;
  if (lineCount <= LARGE_FILE_LINE_THRESHOLD) return [];
  return [
    {
      rule: "large-file",
      severity: "medium",
      skill: "code-complexity",
      message: `File is ${lineCount} lines (threshold ${LARGE_FILE_LINE_THRESHOLD}); consider splitting`,
      line: 1,
    },
  ];
}

function runMapWithoutKeyRule(source: string): UxIssue[] {
  const issues: UxIssue[] = [];
  const mapCalls = source.matchAll(/\.map\(\s*\(?[^)]*\)?\s*=>/g);
  for (const match of mapCalls) {
    const start = (match.index ?? 0) + match[0].length;
    const window = source.slice(start, start + MAP_KEY_LOOKAHEAD_CHARS);
    if (/</.test(window) && !/\bkey=/.test(window)) {
      issues.push({
        rule: "map-without-key",
        severity: "medium",
        skill: "code-complexity",
        message: "List rendered via .map() with no `key` prop found nearby",
        line: lineAt(source, match.index ?? 0),
      });
    }
  }
  return issues;
}

export function runRules(source: string): UxIssue[] {
  return [
    ...runPatternRules(source),
    ...runLargeFileRule(source),
    ...runMapWithoutKeyRule(source),
  ];
}
