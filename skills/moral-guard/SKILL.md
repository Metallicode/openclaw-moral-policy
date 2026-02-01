---
name: moral-guard
description: Route risky actions through policy_invoke with reason + consent + rollback.
openclaw:
  requires:
    tools:
      - policy_invoke
---

# Moral Guard Skill

When you need to call any tool that changes state, involves credentials, contacts other people, or could be risky:
- Do NOT call the tool directly.
- Call `policy_invoke` instead.

## How to call
Provide:
- `tool`: the real tool name
- `args`: the real tool args
- `reason`: short goal
- `explicitConsent`: true only if the user clearly agreed
- `rollbackPlan`: required for high-impact actions (exec/deploy/delete)

If you get an `ask_user` response, ask the user for the missing consent/rollback, then retry.
