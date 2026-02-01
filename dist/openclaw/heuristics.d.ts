/**
 * Heuristic semantic requirement checks.
 *
 * Pure pattern-matching — no external dependencies, no LLM calls.
 * Each function receives the full EvaluationInput and returns
 * { pass, reason? }.
 */
import type { EvaluationInput } from "../policy/types.js";
export interface HeuristicResult {
    pass: boolean;
    reason?: string;
}
export declare const SEMANTIC_CHECKS: Record<string, (input: EvaluationInput) => HeuristicResult>;
//# sourceMappingURL=heuristics.d.ts.map