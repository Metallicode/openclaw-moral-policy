/**
 * Core policy types for the Moral Policy plugin
 * These types define the contract between YAML, engine, and tools.
 */

/* ---------- Policy root ---------- */

export interface MoralPolicy {
  version: string;
  name: string;
  default_decision: PolicyDecision;
  tiers: Record<TierName, TierConfig>;
  matchers?: Matchers;
  rules: PolicyRule[];
}

/* ---------- Decisions ---------- */

export type PolicyDecision =
  | "allow"
  | "allow_with_changes"
  | "ask_user"
  | "deny"
  | "escalate";

/* ---------- Tiers ---------- */

export type TierName = "T0" | "T1" | "T2" | "T3";

export interface TierConfig {
  friction: string;
}

/* ---------- Matchers ---------- */

export interface Matchers {
  [key: string]: string[];
}

/* ---------- Rules ---------- */

export interface PolicyRule {
  id: string;
  tier: TierName;

  when?: RuleCondition;
  require?: RequirementKey[];

  on_fail: {
    decision: PolicyDecision;
    message: string;
  };
}

/* ---------- Conditions ---------- */

export interface RuleCondition {
  any?: ConditionExpr[];
  all?: ConditionExpr[];
}

export type ConditionExpr =
  | { tool_name_matches_any: string[] | string }
  | { args_contain_any_keys: string[] | string }
  | { args_contain_any_values: string[] | string };

/* ---------- Requirements ---------- */

export type RequirementKey =
  | "reason_present"
  | "explicit_consent"
  | "rollback_plan_present"
  | "change_ticket_present"
  | "explicit_override"

  // soft / semantic requirements (default allow in v0.1)
  | "bind_to_tool_result"
  | "assumptions_labeled"
  | "action_advances_reason"
  | "no_exfiltration_detected"
  | "authorized_target"
  | "no_secret_echo"
  | "no_manipulation_detected";

/* ---------- Evaluation ---------- */

export interface EvaluationInput {
  tool: string;
  args: any;
  reason?: string;
  explicitConsent?: boolean;
  rollbackPlan?: string;
  changeTicket?: string;
  explicitOverride?: boolean;
}

export interface EvaluationResult {
  decision: PolicyDecision;
  message: string;
  matchedRules: string[];
}
