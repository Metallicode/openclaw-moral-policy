/**
 * Append-only JSONL audit logger.
 *
 * Each call appends one JSON object (one line) to the configured log file.
 * If no `logPath` is provided the entry is silently skipped so the plugin
 * still works without audit configuration.
 */
export interface AuditEntry {
    ts: string;
    tool: string;
    decision: string;
    message: string;
    matchedRules: string[];
}
export declare function writeAudit(logPath: string, entry: AuditEntry): Promise<void>;
//# sourceMappingURL=audit.d.ts.map