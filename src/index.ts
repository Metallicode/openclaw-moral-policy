import { Type } from "@sinclair/typebox";
import { loadPolicy } from "./policy/load.js";
import { evaluate } from "./policy/engine.js";
import { invokeTool } from "./openclaw/invoke.js";
import { writeAudit } from "./audit/audit.js";

export default function register(api: any) {
  api.registerTool({
    name: "policy_invoke",
    description:
      "Policy-gated tool invocation. Use this for any risky or state-changing action.",
    parameters: Type.Object({
      tool: Type.String({ description: "The real tool name to invoke (e.g., system.run)" }),
      args: Type.Optional(Type.Any({ description: "Arguments for the real tool" })),
      reason: Type.String({ description: "Short goal for the action" }),
      explicitConsent: Type.Optional(Type.Boolean({ description: "User explicitly approved (T2/T3)" })),
      rollbackPlan: Type.Optional(Type.String({ description: "Rollback plan for high-impact actions (T3)" }))
    }),
    async execute(_id: string, params: any) {
      const cfg = api.config?.plugins?.entries?.["moral-policy"]?.config ?? {};
      const policyPath = cfg.policyPath ?? "./policy/moral-policy.yaml";
      const auditLogPath = cfg.auditLogPath ?? "";

      const policy = loadPolicy(policyPath);

      const verdict = evaluate(policy, {
        tool: params.tool,
        args: params.args ?? {},
        reason: params.reason,
        explicitConsent: !!params.explicitConsent,
        rollbackPlan: params.rollbackPlan ?? ""
      });

      // Audit everything
      await writeAudit(auditLogPath, {
        ts: new Date().toISOString(),
        tool: params.tool,
        decision: verdict.decision,
        message: verdict.message,
        matchedRules: verdict.matchedRules
      });

      if (verdict.decision !== "allow") {
        return {
          content: [
            { type: "text", text: `[${verdict.decision}] ${verdict.message}` }
          ]
        };
      }

      // If allowed, invoke via Gateway Tools Invoke API (HTTP)
      // (Tool invocation is still gated by OpenClaw tool policy.)
      const gatewayBaseUrl = cfg.gatewayBaseUrl ?? "http://127.0.0.1:18789";
      const result = await invokeTool(gatewayBaseUrl, params.tool, params.args ?? {});
      return result;
    }
  });
}
