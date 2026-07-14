/**
 * Static heuristics only — same discipline as skill-compiler-v2/rules.ts.
 * No network calls, no LLM invocation. Every rule is a deterministic pattern
 * match over source text (or a cross-file structural comparison), so
 * re-running against an unchanged tree always produces the same output.
 */
import type { SourceFile } from "./analyzer";
import { findDuplicateComponentDefinitions, findDuplicateUiPatterns } from "./analyzer";
import type { Category, HealingIssue, Severity } from "./types";

let issueCounter = 0;
function nextId(): string {
  issueCounter += 1;
  return `issue-${issueCounter}`;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function makeIssue(
  file: string,
  rule: string,
  category: Category,
  severity: Severity,
  message: string,
  line: number,
): HealingIssue {
  return { id: nextId(), rule, category, severity, file, line, message };
}

// ---------------------------------------------------------------------------
// UI issues
// ---------------------------------------------------------------------------

function ruleInconsistentComponentUsage(file: SourceFile): HealingIssue[] {
  const hasRawButton = /<button[\s>]/.test(file.source);
  const importsButtonComponent = /import\s+[^;]*\bButton\b[^;]*from\s+["'][^"']*components[^"']*["']/.test(
    file.source,
  );
  if (!hasRawButton || !importsButtonComponent) return [];
  const index = file.source.search(/<button[\s>]/);
  return [
    makeIssue(
      file.path,
      "inconsistent-component-usage",
      "ui",
      "low",
      "Mixes raw <button> elements with the imported Button component in the same file.",
      lineOf(file.source, index),
    ),
  ];
}

function ruleLayoutDrift(file: SourceFile): HealingIssue[] {
  const issues: HealingIssue[] = [];
  const re = /(?:margin|padding)(?:-(?:top|bottom|left|right))?:\s*(\d+)px/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(file.source))) {
    const px = Number(match[1]);
    if (px % 4 !== 0) {
      issues.push(
        makeIssue(
          file.path,
          "layout-drift",
          "ui",
          "low",
          `Spacing value ${px}px does not align to the 4px scale.`,
          lineOf(file.source, match.index),
        ),
      );
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// UX issues
// ---------------------------------------------------------------------------

function ruleCheckoutFriction(file: SourceFile): HealingIssue[] {
  if (!/cart|checkout/i.test(file.path)) return [];
  const handlerMatch = /(handleCheckout|handleSubmit|addToCart|placeOrder)\s*[:=]/.exec(file.source);
  if (!handlerMatch) return [];
  const hasLoadingGuard = /disabled=|isLoading|isSubmitting/.test(file.source);
  if (hasLoadingGuard) return [];
  return [
    makeIssue(
      file.path,
      "checkout-friction-no-loading-state",
      "ux",
      "medium",
      "Checkout/cart action has no visible loading or disabled state while submitting.",
      lineOf(file.source, handlerMatch.index),
    ),
  ];
}

function ruleMissingFeedbackState(file: SourceFile): HealingIssue[] {
  const asyncMatch = /await\s+|\.then\(/.exec(file.source);
  if (!asyncMatch) return [];
  const hasFeedback = /toast\(|setError\(|setLoading\(|alert\(/.test(file.source);
  if (hasFeedback) return [];
  return [
    makeIssue(
      file.path,
      "missing-feedback-state",
      "ux",
      "medium",
      "Async operation has no visible success/error/loading feedback.",
      lineOf(file.source, asyncMatch.index),
    ),
  ];
}

function ruleConfusingConditionalFlow(file: SourceFile): HealingIssue[] {
  const match = /\?[^:?{}]*\?[^:?{}]*:[^:?{}]*:/.exec(file.source);
  if (!match) return [];
  return [
    makeIssue(
      file.path,
      "confusing-conditional-flow",
      "ux",
      "low",
      "Nested ternary expression may produce a confusing UI flow.",
      lineOf(file.source, match.index),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Accessibility issues
// ---------------------------------------------------------------------------

function interactiveTagsWithClassName(source: string): RegExpMatchArray[] {
  return [...source.matchAll(/<(button|a)\b[^>]*className="([^"]*)"[^>]*>/g)];
}

function ruleMissingFocusState(file: SourceFile): HealingIssue[] {
  const issues: HealingIssue[] = [];
  for (const match of interactiveTagsWithClassName(file.source)) {
    const classes = match[2];
    if (/hover:/.test(classes) && !/focus(-visible)?:/.test(classes)) {
      issues.push(
        makeIssue(
          file.path,
          "missing-focus-state",
          "a11y",
          "medium",
          `Interactive <${match[1]}> has hover: styles but no focus: equivalent.`,
          lineOf(file.source, match.index ?? 0),
        ),
      );
    }
  }
  return issues;
}

function ruleSmallTouchTarget(file: SourceFile): HealingIssue[] {
  const issues: HealingIssue[] = [];
  for (const match of interactiveTagsWithClassName(file.source)) {
    const classes = match[2];
    if (/\b[hw]-[1-9]\b/.test(classes)) {
      issues.push(
        makeIssue(
          file.path,
          "small-touch-target",
          "a11y",
          "low",
          `Interactive <${match[1]}> uses a height/width class under the ~40px touch-target minimum.`,
          lineOf(file.source, match.index ?? 0),
        ),
      );
    }
  }
  return issues;
}

function ruleLowContrast(file: SourceFile): HealingIssue[] {
  const issues: HealingIssue[] = [];
  const re = /text-gray-(300|400)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(file.source))) {
    issues.push(
      makeIssue(
        file.path,
        "possible-low-contrast",
        "a11y",
        "low",
        `text-gray-${match[1]} is likely to fail contrast against a light background.`,
        lineOf(file.source, match.index),
      ),
    );
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Performance issues
// ---------------------------------------------------------------------------

function ruleRerenderRiskInMemo(file: SourceFile): HealingIssue[] {
  if (!/\bmemo\(/.test(file.source)) return [];
  const inlineHandlerMatch = /=\{?\s*\(\)\s*=>/.exec(file.source);
  if (!inlineHandlerMatch) return [];
  return [
    makeIssue(
      file.path,
      "rerender-risk-inline-handler-in-memo",
      "perf",
      "medium",
      "Component is wrapped in memo() but passes inline arrow functions as props, defeating memoization.",
      lineOf(file.source, inlineHandlerMatch.index),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Cross-file checks
// ---------------------------------------------------------------------------

function crossFileDuplicateUiPatterns(files: SourceFile[]): HealingIssue[] {
  const duplicates = findDuplicateUiPatterns(files);
  const issues: HealingIssue[] = [];
  for (const paths of duplicates.values()) {
    for (const path of paths) {
      const others = paths.filter((p) => p !== path);
      issues.push(
        makeIssue(
          path,
          "duplicate-ui-pattern",
          "ui",
          "medium",
          `Shares an identical JSX structure with ${others.length} other file(s): ${others.join(", ")}.`,
          1,
        ),
      );
    }
  }
  return issues;
}

function crossFileDuplicateComponentDefinitions(files: SourceFile[]): HealingIssue[] {
  const duplicates = findDuplicateComponentDefinitions(files);
  const issues: HealingIssue[] = [];
  for (const [name, paths] of duplicates) {
    for (const path of paths) {
      issues.push(
        makeIssue(
          path,
          "duplicate-component-definition",
          "perf",
          "high",
          `Component "${name}" is defined in ${paths.length} files: ${paths.join(", ")}.`,
          1,
        ),
      );
    }
  }
  return issues;
}

const PER_FILE_RULES: Array<(file: SourceFile) => HealingIssue[]> = [
  ruleInconsistentComponentUsage,
  ruleLayoutDrift,
  ruleCheckoutFriction,
  ruleMissingFeedbackState,
  ruleConfusingConditionalFlow,
  ruleMissingFocusState,
  ruleSmallTouchTarget,
  ruleLowContrast,
  ruleRerenderRiskInMemo,
];

export function detectIssues(files: SourceFile[]): HealingIssue[] {
  issueCounter = 0;
  const issues: HealingIssue[] = [];

  for (const file of files) {
    for (const rule of PER_FILE_RULES) {
      issues.push(...rule(file));
    }
  }

  issues.push(...crossFileDuplicateUiPatterns(files));
  issues.push(...crossFileDuplicateComponentDefinitions(files));

  return issues;
}
