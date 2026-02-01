/**
 * Heuristic semantic requirement checks.
 *
 * Pure pattern-matching — no external dependencies, no LLM calls.
 * Each function receives the full EvaluationInput and returns
 * { pass, reason? }.
 */

import type { EvaluationInput } from "../policy/types.js";
import { safeStringify } from "./util.js";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

export interface HeuristicResult {
  pass: boolean;
  reason?: string;
}

const MAX_SCAN_LENGTH = 100_000;

function truncate(s: string): string {
  return s.length > MAX_SCAN_LENGTH ? s.slice(0, MAX_SCAN_LENGTH) : s;
}

function argsString(args: unknown): string {
  return truncate(safeStringify(args));
}

/** Simple word-tokeniser — lowercase, unique. */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s\-_/.:;,!?(){}\[\]"']+/)
      .filter((t) => t.length > 2)
  );
}

/* ------------------------------------------------------------------ */
/*  Pattern constants                                                  */
/* ------------------------------------------------------------------ */

const HEDGING_WORDS = [
  "probably",
  "maybe",
  "might",
  "perhaps",
  "possibly",
  "likely",
  "i think",
  "i believe",
  "i assume",
  "i guess",
  "not sure",
  "uncertain",
  "it seems",
  "appears to",
  "could be",
  "supposedly",
];

const ASSUMPTION_LABEL_RE = /\[assumption\]/i;

const EXFIL_URL_PATTERNS = [
  /ngrok\.io/i,
  /requestbin/i,
  /webhook\.site/i,
  /hookbin/i,
  /pipedream/i,
  /burpcollaborator/i,
  /interact\.sh/i,
  /canarytokens/i,
  /oastify\.com/i,
  /requestcatcher/i,
];

const EXFIL_COMMAND_PATTERNS = [
  /curl\s+.*--data/i,
  /curl\s+.*-d\s/i,
  /curl\s+.*-X\s*POST/i,
  /wget\s+.*--post/i,
  /nc\s+-/i,
  /ncat\s/i,
  /netcat\s/i,
  /\bsocat\b/i,
  /base64\s.*[\w+/=]{100,}/,
];

/** IP:high-port — common reverse-shell indicator. */
const IP_HIGH_PORT_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{4,5}\b/;

const SECRET_PATTERNS = [
  // AWS keys
  /AKIA[0-9A-Z]{16}/,
  // GitHub tokens
  /ghp_[A-Za-z0-9]{36,}/,
  /gho_[A-Za-z0-9]{36,}/,
  /ghs_[A-Za-z0-9]{36,}/,
  /ghr_[A-Za-z0-9]{36,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  // Slack tokens
  /xox[bpors]-[A-Za-z0-9\-]+/,
  // JWTs (header.payload.signature)
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/,
  // RSA / EC private keys
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  // Generic API key patterns (long hex / base64)
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9/+=]{20,}/i,
  // Database connection strings
  /(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s]{10,}/i,
];

const MANIPULATION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(everything|all)\s+(above|before)/i,
  /you\s+are\s+now\s+(a|an|the)\b/i,
  /new\s+instructions\s*:/i,
  /system\s*:\s/i,
  /\[INST\]/i,
  /<<\s*SYS\s*>>/i,
  /\bDAN\b.*\bjailbreak/i,
  /do\s+anything\s+now/i,
  /pretend\s+you\s+(are|have)/i,
  /act\s+as\s+(if|though)\s+you/i,
  /override\s+(your|all)\s+(rules|guidelines|restrictions)/i,
  /bypass\s+(your|all)\s+(rules|guidelines|restrictions|safety|filters)/i,
];

/* ------------------------------------------------------------------ */
/*  Heuristic implementations                                          */
/* ------------------------------------------------------------------ */

function bindToToolResult(_input: EvaluationInput): HeuristicResult {
  // Needs conversation context we don't have — pass-through for now.
  return { pass: true };
}

function assumptionsLabeled(input: EvaluationInput): HeuristicResult {
  const text = argsString(input.args);
  for (const hedge of HEDGING_WORDS) {
    if (text.toLowerCase().includes(hedge)) {
      if (!ASSUMPTION_LABEL_RE.test(text)) {
        return {
          pass: false,
          reason: `Hedging language ("${hedge}") found without an [assumption] label.`,
        };
      }
    }
  }
  return { pass: true };
}

function actionAdvancesReason(input: EvaluationInput): HeuristicResult {
  if (!input.reason || input.reason.trim().length === 0) {
    // No reason given — can't verify alignment. Other checks handle "reason_present".
    return { pass: true };
  }

  const reasonTokens = tokenize(input.reason);
  const actionTokens = tokenize(
    `${input.tool} ${safeStringify(input.args)}`
  );

  let overlap = 0;
  for (const t of reasonTokens) {
    if (actionTokens.has(t)) overlap++;
  }

  if (overlap === 0) {
    return {
      pass: false,
      reason:
        "Zero keyword overlap between stated reason and tool/args — action may not advance the given reason.",
    };
  }
  return { pass: true };
}

function noExfiltrationDetected(input: EvaluationInput): HeuristicResult {
  const text = argsString(input.args);

  for (const re of EXFIL_URL_PATTERNS) {
    if (re.test(text)) {
      return {
        pass: false,
        reason: `Potential exfiltration URL detected (${re.source}).`,
      };
    }
  }

  for (const re of EXFIL_COMMAND_PATTERNS) {
    if (re.test(text)) {
      return {
        pass: false,
        reason: `Potential exfiltration command detected (${re.source}).`,
      };
    }
  }

  return { pass: true };
}

function authorizedTarget(input: EvaluationInput): HeuristicResult {
  const text = argsString(input.args);

  if (IP_HIGH_PORT_RE.test(text)) {
    const match = text.match(IP_HIGH_PORT_RE);
    return {
      pass: false,
      reason: `IP:high-port pattern detected (${match?.[0]}) — possible reverse-shell indicator.`,
    };
  }

  return { pass: true };
}

function noSecretEcho(input: EvaluationInput): HeuristicResult {
  const text = argsString(input.args);

  for (const re of SECRET_PATTERNS) {
    if (re.test(text)) {
      return {
        pass: false,
        reason: `Known secret format detected (${re.source}).`,
      };
    }
  }

  return { pass: true };
}

function noManipulationDetected(input: EvaluationInput): HeuristicResult {
  const text = argsString(input.args);

  for (const re of MANIPULATION_PATTERNS) {
    if (re.test(text)) {
      return {
        pass: false,
        reason: `Prompt injection / manipulation pattern detected (${re.source}).`,
      };
    }
  }

  return { pass: true };
}

/* ------------------------------------------------------------------ */
/*  Dispatch map                                                       */
/* ------------------------------------------------------------------ */

export const SEMANTIC_CHECKS: Record<
  string,
  (input: EvaluationInput) => HeuristicResult
> = {
  bind_to_tool_result: bindToToolResult,
  assumptions_labeled: assumptionsLabeled,
  action_advances_reason: actionAdvancesReason,
  no_exfiltration_detected: noExfiltrationDetected,
  authorized_target: authorizedTarget,
  no_secret_echo: noSecretEcho,
  no_manipulation_detected: noManipulationDetected,
};
