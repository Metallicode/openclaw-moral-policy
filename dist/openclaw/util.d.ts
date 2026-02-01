/**
 * Shared utilities for the Moral Policy plugin
 * Keep this file dependency-free and boring on purpose.
 */
import type { EvaluationInput } from "../policy/types.js";
export declare function normalizeToolName(name: string): string;
export declare function safeStringify(obj: any): string;
/**
 * Compile regex patterns once and test against a value
 */
export declare function matchesAnyPattern(value: string, patterns: string[] | undefined): boolean;
/**
 * Check if args object contains any sensitive keys
 */
export declare function argsContainAnyKeys(args: any, keys: string[] | undefined): boolean;
/**
 * Check if args (stringified) contain any dangerous tokens
 */
export declare function argsContainAnyValues(args: any, tokens: string[] | undefined): boolean;
/**
 * Generic requirement checks
 * These map directly to YAML "require" entries.
 *
 * Accepts the full EvaluationInput so semantic heuristics can
 * inspect tool name and args alongside the metadata fields.
 */
export declare function checkRequirement(requirement: string, input: EvaluationInput): boolean;
/**
 * Evaluate a list of requirements
 */
export declare function requirementsSatisfied(requirements: string[] | undefined, input: EvaluationInput): boolean;
//# sourceMappingURL=util.d.ts.map