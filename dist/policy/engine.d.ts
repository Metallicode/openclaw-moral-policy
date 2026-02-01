/**
 * Policy evaluation engine.
 *
 * Walks the rule list top-to-bottom.  For each rule whose `when` clause
 * matches (or is absent → always matches), it checks `require`.
 * The first rule whose requirements are NOT satisfied produces the
 * verdict from its `on_fail` block.  If every rule passes, the
 * policy's `default_decision` is returned.
 */
import type { MoralPolicy, EvaluationInput, EvaluationResult } from "./types.js";
export declare function evaluate(policy: MoralPolicy, input: EvaluationInput): EvaluationResult;
//# sourceMappingURL=engine.d.ts.map