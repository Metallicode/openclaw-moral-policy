/**
 * Shared utilities for the Moral Policy plugin
 * Keep this file dependency-free and boring on purpose.
 */

import type { EvaluationInput } from "../policy/types.js";
import { SEMANTIC_CHECKS } from "./heuristics.js";

export function normalizeToolName(name: string): string {
  return (name ?? "").trim().toLowerCase();
}

export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    try {
      return String(obj);
    } catch {
      return "";
    }
  }
}

/**
 * Compile regex patterns once and test against a value
 */
export function matchesAnyPattern(
  value: string,
  patterns: string[] | undefined
): boolean {
  if (!value || !patterns || patterns.length === 0) return false;
  const v = value.toLowerCase();
  return patterns.some((p) => {
    try {
      return new RegExp(p, "i").test(v);
    } catch {
      return false;
    }
  });
}

/**
 * Check if args object contains any sensitive keys
 */
export function argsContainAnyKeys(
  args: any,
  keys: string[] | undefined
): boolean {
  if (!args || typeof args !== "object" || !keys || keys.length === 0) {
    return false;
  }

  const argKeys = Object.keys(args).map((k) => k.toLowerCase());
  return keys.some((k) => argKeys.includes(k.toLowerCase()));
}

/**
 * Check if args (stringified) contain any dangerous tokens
 */
export function argsContainAnyValues(
  args: any,
  tokens: string[] | undefined
): boolean {
  if (!args || !tokens || tokens.length === 0) return false;
  const haystack = safeStringify(args).toLowerCase();
  return tokens.some((t) => haystack.includes(t.toLowerCase()));
}

/**
 * Generic requirement checks
 * These map directly to YAML "require" entries.
 *
 * Accepts the full EvaluationInput so semantic heuristics can
 * inspect tool name and args alongside the metadata fields.
 */
export function checkRequirement(
  requirement: string,
  input: EvaluationInput
): boolean {
  switch (requirement) {
    case "reason_present":
      return typeof input.reason === "string" && input.reason.trim().length >= 3;

    case "explicit_consent":
      return input.explicitConsent === true;

    case "rollback_plan_present":
      return typeof input.rollbackPlan === "string" && input.rollbackPlan.trim().length >= 5;

    case "change_ticket_present":
      return typeof input.changeTicket === "string" && input.changeTicket.trim().length >= 3;

    case "explicit_override":
      return input.explicitOverride === true;

    default: {
      // Semantic / heuristic checks
      const heuristic = SEMANTIC_CHECKS[requirement];
      if (heuristic) {
        return heuristic(input).pass;
      }
      // Unknown requirement → allow to avoid breaking upgrades.
      return true;
    }
  }
}

/**
 * Evaluate a list of requirements
 */
export function requirementsSatisfied(
  requirements: string[] | undefined,
  input: EvaluationInput
): boolean {
  if (!requirements || requirements.length === 0) return true;
  return requirements.every((r) => checkRequirement(r, input));
}
