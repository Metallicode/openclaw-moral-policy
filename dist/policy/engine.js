/**
 * Policy evaluation engine.
 *
 * Walks the rule list top-to-bottom.  For each rule whose `when` clause
 * matches (or is absent → always matches), it checks `require`.
 * The first rule whose requirements are NOT satisfied produces the
 * verdict from its `on_fail` block.  If every rule passes, the
 * policy's `default_decision` is returned.
 */
import { normalizeToolName, matchesAnyPattern, argsContainAnyKeys, argsContainAnyValues, requirementsSatisfied, } from "../openclaw/util.js";
/* ------------------------------------------------------------------ */
/*  Matcher reference resolution ($matchers.xxx)                       */
/* ------------------------------------------------------------------ */
/**
 * A condition value can be an inline array of strings OR a single
 * string of the form `"$matchers.<key>"`.  This helper resolves
 * the reference against the policy's top-level `matchers` map and
 * always returns a concrete `string[]`.
 */
function resolvePatterns(raw, matchers) {
    if (Array.isArray(raw))
        return raw;
    // "$matchers.high_risk_tool_name_patterns" → key = "high_risk_tool_name_patterns"
    if (typeof raw === "string" && raw.startsWith("$matchers.")) {
        const key = raw.slice("$matchers.".length);
        return matchers?.[key] ?? [];
    }
    // Treat a plain string as a single-element list
    return [raw];
}
/* ------------------------------------------------------------------ */
/*  Condition evaluation                                               */
/* ------------------------------------------------------------------ */
function evalExpr(expr, input, matchers) {
    const toolName = normalizeToolName(input.tool);
    if ("tool_name_matches_any" in expr) {
        const patterns = resolvePatterns(expr.tool_name_matches_any, matchers);
        return matchesAnyPattern(toolName, patterns);
    }
    if ("args_contain_any_keys" in expr) {
        const keys = resolvePatterns(expr.args_contain_any_keys, matchers);
        return argsContainAnyKeys(input.args, keys);
    }
    if ("args_contain_any_values" in expr) {
        const tokens = resolvePatterns(expr.args_contain_any_values, matchers);
        return argsContainAnyValues(input.args, tokens);
    }
    return false;
}
function evalCondition(cond, input, matchers) {
    // No `when` clause → rule always applies
    if (!cond)
        return true;
    if (cond.any && cond.any.length > 0) {
        const anyMatch = cond.any.some((e) => evalExpr(e, input, matchers));
        // If `all` is also present, both groups must pass
        if (cond.all && cond.all.length > 0) {
            return anyMatch && cond.all.every((e) => evalExpr(e, input, matchers));
        }
        return anyMatch;
    }
    if (cond.all && cond.all.length > 0) {
        return cond.all.every((e) => evalExpr(e, input, matchers));
    }
    return true;
}
/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */
export function evaluate(policy, input) {
    const matchedRules = [];
    for (const rule of policy.rules) {
        const conditionMatches = evalCondition(rule.when, input, policy.matchers);
        if (!conditionMatches)
            continue;
        // Condition matched — now check requirements
        const satisfied = requirementsSatisfied(rule.require, input);
        if (satisfied) {
            // Rule matched and requirements met — record and continue
            matchedRules.push(rule.id);
            continue;
        }
        // Requirements failed → this rule's on_fail is the verdict
        matchedRules.push(rule.id);
        return {
            decision: rule.on_fail.decision,
            message: rule.on_fail.message,
            matchedRules,
        };
    }
    // Every applicable rule passed
    return {
        decision: policy.default_decision,
        message: "Policy check passed.",
        matchedRules,
    };
}
//# sourceMappingURL=engine.js.map