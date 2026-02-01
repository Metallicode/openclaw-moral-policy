# OpenClaw Moral Policy


A policy-gate plugin for [OpenClaw](https://openclaw.dev) that evaluates every tool call against a configurable set of ethical rules before allowing execution. Rules are defined in YAML, evaluated top-to-bottom, and enforced with tiered friction — from silent pass-through to hard denial requiring explicit override.

This plugin is inspired by the Ten Commandments as a compact, high-leverage moral baseline. The goal is not to impose religious practice, but to reuse the Commandments’ structure (short, universal constraints) to build an enforceable “moral correction layer” for AI agents that can take real actions.

In agentic systems, the moral risk isn’t just “bad answers” — it’s unsafe tool execution. So each commandment is translated into a runtime rule that gates tool calls.

1. “You shall have no other gods before me.” → Scope & authority

Mapped rule(s): C1_scope_and_authority

Reasoning: In agentic systems, “other gods” becomes other sources of authority (unstated goals, hidden objectives, unapproved tasks).
Requiring a stated reason keeps the agent aligned with legitimate intent and prevents wandering into side actions.

2. “You shall not make idols.” → No fabrication / no false authority

Mapped rule(s): C2_no_fabrication

Reasoning: An “idol” is a false object of trust. For agents, that’s invented tool output, made-up access, or imaginary confirmations.
bind_to_tool_result forces the agent to ground its claims in verified tool results instead of hallucination.

3. “You shall not take the name of the Lord your God in vain.” → No impersonation / no manipulation

Mapped rule(s): C3_no_manipulation

Reasoning: “Name in vain” is about misusing identity, authority, and trust. In modern agent terms this includes prompt injection, identity hijacking, and coercive tool-argument manipulation.
This rule blocks tool calls that show patterns of injection or identity misuse.

4. “Remember the Sabbath day, to keep it holy.” → Pause before irreversible actions

Mapped rule(s): C4_reflect_before_irreversible

Reasoning: Sabbath is a structured pause — a deliberate stop before action.
For agents, the equivalent is friction before irreversible or high-impact tool calls, requiring explicit consent and a rollback plan.

5. -“Honor your father and your mother.” → Respect human authority

Mapped rule(s): C5_respect_authority

Reasoning: In an agentic environment, “honor” becomes deference to humans for sensitive decisions.
This is implemented as explicit human approval before sensitive operations (credential-like args, comms, or other T2 tools).

6. “You shall not murder.” → Do no harm

Mapped rule(s): C6_no_exfiltration, C6_authorized_targets

Reasoning: The modern “harm” most relevant to system agents is often digital harm: credential theft, data loss, compromise, or enabling attack paths.
These rules detect suspicious targets and data exfiltration patterns (e.g., reverse shells, high-port IP connections) and deny execution.

7. “You shall not commit adultery.” → Privacy & loyalty (consent boundaries)

Mapped rule(s): C7_privacy (and overlaps with C5_respect_authority)

Reasoning: Adultery is fundamentally a violation of consent and trust.
For agents, that maps to strict boundaries around personal/sensitive data: don’t access, process, or transmit it without explicit consent.

8. “You shall not steal.” → No theft of secrets

Mapped rule(s): C8_no_secret_theft (and overlaps with C6_no_exfiltration)

Reasoning: The most common “stealing” failure mode for agents is secrets leakage: tokens, API keys, credentials, private keys.
This rule blocks tool calls that include or echo secret-like strings.

9. “You shall not bear false witness.” → Truthfulness

Mapped rule(s): C9_truthfulness

Reasoning: Agents must clearly separate facts from assumptions.
When uncertainty is detected, the agent is forced to label it explicitly (and may rewrite the response) so users aren’t misled.

10. “You shall not covet.” → No goal drift / no hidden objectives

Mapped rule(s): C10_no_goal_drift

Reasoning: Coveting maps well to goal drift and self-serving behavior: doing extra actions “because it can,” collecting data “just in case,” or pursuing side quests.
This rule requires the action to demonstrably serve the stated reason.



## How it works

```
Agent wants to call tool
        |
        v
  policy_invoke(tool, args, reason, ...)
        |
        v
  Load YAML policy  -->  Evaluate rules top-to-bottom
        |                       |
        |           condition matches? --> check requirements
        |                                       |
        |                              all pass? --> next rule
        |                              any fail? --> on_fail verdict
        |
        v
  All rules pass --> default_decision (allow)
        |
        v
  Forward to OpenClaw Gateway Tools Invoke API
        |
        v
  Append audit entry (JSONL)
```

1. The agent calls `policy_invoke` instead of calling tools directly.
2. The engine loads the YAML policy file and walks rules top-to-bottom.
3. Each rule has an optional `when` condition (tool name patterns, arg keys, arg values). If it matches (or is absent), the rule's `require` list is checked.
4. Requirements range from simple field checks (`reason_present`, `explicit_consent`) to heuristic semantic checks (`no_exfiltration_detected`, `no_secret_echo`).
5. The first rule whose requirements fail produces the verdict from its `on_fail` block (`ask_user`, `deny`, `allow_with_changes`, `escalate`).
6. If every rule passes, the tool call is forwarded to the OpenClaw Gateway and the result is returned to the agent.
7. Every evaluation is appended to an audit log (JSONL).

## Project structure

```
.
├── openclaw.plugin.json          # Plugin manifest (id, config schema, skills)
├── package.json
├── tsconfig.json
├── policy/
│   ├── moral-policy.yaml         # Minimal starter policy
│   └── profiles/
│       ├── general-default.yaml  # General-purpose profile (T1–T3)
│       └── sysadmin-tight.yaml   # Hardened sysadmin profile
├── skills/
│   └── moral-guard/
│       └── SKILL.md              # Agent skill: route risky calls through policy_invoke
├── examples/
│   ├── gateway.config.snippet.jsonc   # Gateway tool-allow/deny config
│   └── openclaw.config.snippet.jsonc  # Plugin + tool policy config
├── src/
│   ├── index.ts                  # Plugin entry: registers policy_invoke tool
│   ├── openclaw/
│   │   ├── util.ts               # Requirement checks, pattern matching helpers
│   │   ├── heuristics.ts         # Semantic heuristic checks (exfil, secrets, manipulation, ...)
│   │   └── invoke.ts             # HTTP call to Gateway Tools Invoke API
│   ├── policy/
│   │   ├── types.ts              # TypeScript types for policy, rules, conditions, evaluation
│   │   ├── load.ts               # YAML policy loader
│   │   └── engine.ts             # Rule evaluation engine
│   └── audit/
│       └── audit.ts              # Append-only JSONL audit logger
└── dist/                         # Compiled output (generated)
```

## Requirements

- Node.js >= 18
- An OpenClaw Gateway instance (default `http://127.0.0.1:18789`)

## Installation

```bash
npm install
npm run build
```

The `prepare` script runs the build automatically on install.

## Configuration

Register the plugin in your OpenClaw config (see `examples/openclaw.config.snippet.jsonc`):

```jsonc
{
  "plugins": {
    "entries": {
      "moral-policy": {
        "enabled": true,
        "config": {
          "policyPath": "./policy/profiles/general-default.yaml",
          "auditLogPath": "~/.openclaw/logs/moral-policy.jsonl",
          "gatewayBaseUrl": "http://127.0.0.1:18789"
        }
      }
    }
  }
}
```

| Config key | Type | Default | Description |
|---|---|---|---|
| `policyPath` | `string` | `./policy/moral-policy.yaml` | Path to the YAML policy file |
| `auditLogPath` | `string` | `""` (disabled) | Path for the JSONL audit log |
| `gatewayBaseUrl` | `string` | `http://127.0.0.1:18789` | OpenClaw Gateway base URL |
| `requireExplicitConsentForT3` | `boolean` | — | Reserved for future use |
| `requireRollbackForT3` | `boolean` | — | Reserved for future use |

Lock down direct tool access so agents must go through the policy gate (see `examples/gateway.config.snippet.jsonc`):

```jsonc
{
  "tools": {
    "allow": ["policy_invoke", "web.fetch", "browser.read", "files.read", "apply_patch"],
    "deny": ["system.run", "nodes.run", "exec", "group:exec"]
  }
}
```

## Policy YAML format

A policy file defines tiers, matchers, and rules:

```yaml
version: "0.1"
name: "My Policy"
default_decision: "allow"

tiers:
  T0: { friction: "none" }
  T1: { friction: "confirm_if_ambiguous" }
  T2: { friction: "explicit_consent" }
  T3: { friction: "explicit_consent+rollback" }

matchers:
  dangerous_tools:
    - "(^|\\.)exec($|\\.)"
    - "(^|\\.)deploy($|\\.)"
  sensitive_keys:
    - "password"
    - "token"

rules:
  - id: require_reason
    tier: T1
    require: ["reason_present"]
    on_fail:
      decision: "ask_user"
      message: "Provide a reason for this action."

  - id: sensitive_consent
    tier: T2
    when:
      any:
        - tool_name_matches_any: "$matchers.dangerous_tools"
        - args_contain_any_keys: "$matchers.sensitive_keys"
    require: ["explicit_consent"]
    on_fail:
      decision: "ask_user"
      message: "This is sensitive. Confirm consent."
```

### Condition expressions

Used in `when.any` / `when.all`:

| Expression | Matches against |
|---|---|
| `tool_name_matches_any` | Tool name (regex, case-insensitive) |
| `args_contain_any_keys` | Top-level keys of the args object |
| `args_contain_any_values` | Stringified args (substring, case-insensitive) |

Values can be inline arrays or `$matchers.<key>` references.

### Requirement keys

**Field checks** — validate metadata fields on the `policy_invoke` call:

| Key | Passes when |
|---|---|
| `reason_present` | `reason` is a string with >= 3 characters |
| `explicit_consent` | `explicitConsent` is `true` |
| `rollback_plan_present` | `rollbackPlan` is a string with >= 5 characters |
| `change_ticket_present` | `changeTicket` is a string with >= 3 characters |
| `explicit_override` | `explicitOverride` is `true` |

**Semantic heuristic checks** — pattern-match against tool name and args:

| Key | What it detects |
|---|---|
| `bind_to_tool_result` | Pass-through (needs conversation context not yet available) |
| `assumptions_labeled` | Hedging words (`probably`, `maybe`, `might`, ...) without `[assumption]` labels |
| `action_advances_reason` | Zero keyword overlap between stated reason and tool/args |
| `no_exfiltration_detected` | Exfil URLs (ngrok, requestbin, webhook.site, ...) and commands (`curl --data`, `nc`, `netcat`, ...) |
| `authorized_target` | IP:high-port patterns (reverse-shell indicators like `10.0.0.1:4444`) |
| `no_secret_echo` | Known secret formats: AWS keys (`AKIA...`), GitHub tokens (`ghp_...`), JWTs, private keys, connection strings |
| `no_manipulation_detected` | Prompt injection patterns: `ignore previous instructions`, role switching, `[INST]`/`<<SYS>>` delimiters, jailbreak phrases |

### Decisions

| Decision | Meaning |
|---|---|
| `allow` | Tool call proceeds |
| `allow_with_changes` | Proceeds, but the agent should adjust (e.g., label assumptions) |
| `ask_user` | Blocked until the user provides missing input (consent, reason, rollback) |
| `deny` | Hard block |
| `escalate` | Reserved for external escalation workflows |

## Included policy profiles

### `general-default.yaml`

General-purpose profile with rules mapped to Decalogue commandments:

- **C1** (scope/authority): Require a reason for every action
- **C2** (no fabrication): Claims must bind to tool results
- **C7/C8** (privacy/consent): Sensitive tools and credential args need explicit consent
- **C4** (reflection): High-impact tools need consent + rollback plan
- **C9** (truthfulness): Hedging language must be labeled as assumptions
- **C10** (goal alignment): Actions must serve the stated reason

### `full-decalogue.yaml`

Complete 1:1 mapping of all ten commandments — the canonical reference profile:

| Rule | Commandment | Requirement | On fail |
|---|---|---|---|
| C1 | Scope & authority | `reason_present` | `ask_user` |
| C2 | No fabrication | `bind_to_tool_result` | `deny` |
| C3 | No impersonation | `no_manipulation_detected` | `deny` |
| C4 | Pause before irreversible | `explicit_consent` + `rollback_plan_present` | `ask_user` |
| C5 | Respect human authority | `explicit_consent` | `ask_user` |
| C6 | Do no harm | `no_exfiltration_detected` + `authorized_target` | `deny` |
| C7 | Privacy & loyalty | `explicit_consent` | `ask_user` |
| C8 | No theft of secrets | `no_secret_echo` | `deny` |
| C9 | Truthfulness | `assumptions_labeled` | `allow_with_changes` |
| C10 | No goal drift | `action_advances_reason` | `deny` |

### `sysadmin-tight.yaml`

Hardened profile for infrastructure/sysadmin contexts:

- All T3 tools (exec, ssh, docker, kubectl, terraform, ansible, ...) require consent + rollback plan + change ticket
- Hard-blocks destructive shell patterns (`rm -rf /`, fork bombs, `mkfs`, `dd`, `iptables -F`, `chmod 777`, pipe-to-shell)
- Credential boundary enforcement for sensitive arg keys
- Goal-drift detection on all T3 tool calls

## Audit log

When `auditLogPath` is configured, every evaluation is appended as a JSON line:

```json
{"ts":"2026-02-01T12:00:00.000Z","tool":"system.run","decision":"deny","message":"Blocked: command contains high-destruction patterns.","matchedRules":["C1_reason_required","HARD_block_destruction_tokens"]}
```

The logger is append-only and creates parent directories automatically. Audit failures are logged to stderr but never crash the policy gate.

## The `moral-guard` skill

The `skills/moral-guard/SKILL.md` skill instructs the agent to route all state-changing, credential-involving, or risky tool calls through `policy_invoke` rather than calling tools directly. If the policy returns `ask_user`, the agent should ask the user for the missing input and retry.

## Development

```bash
# Build
npm run build

# Type-check without emitting
npx tsc --noEmit
```

The project uses TypeScript with strict mode, `NodeNext` module resolution, and targets ES2022.

## License

See [LICENSE](./LICENSE).
