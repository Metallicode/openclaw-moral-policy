/**
 * Append-only JSONL audit logger.
 *
 * Each call appends one JSON object (one line) to the configured log file.
 * If no `logPath` is provided the entry is silently skipped so the plugin
 * still works without audit configuration.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface AuditEntry {
  ts: string;
  tool: string;
  decision: string;
  message: string;
  matchedRules: string[];
}

export async function writeAudit(
  logPath: string,
  entry: AuditEntry
): Promise<void> {
  if (!logPath) return;

  const line = JSON.stringify(entry) + "\n";

  try {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, line, "utf-8");
  } catch (err) {
    // Audit failure should never crash the policy gate.
    // Log to stderr so it's visible in daemon output.
    console.error("[moral-policy] audit write failed:", err);
  }
}
