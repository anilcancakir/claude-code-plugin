#!/usr/bin/env node
/**
 * ac plugin — PostToolUse context monitor.
 *
 * Fires after every tool call. When an autonomous /ac:execute run is in
 * progress (state file with `status: executing` and `autonomous: true`),
 * the hook checks how full the context window is and emits an
 * additionalContext warning when it crosses 75% (WARNING) or 90% (CRITICAL).
 *
 * Context window % is not exposed directly to PostToolUse hooks (confirmed
 * via the official hooks docs and the kodizm CC source). The Statusline
 * JSON has `context_window.used_percentage`, but that lives in a separate
 * channel. This hook approximates by reading the latest assistant message's
 * `usage` block from `transcript_path` and comparing it against the model's
 * context window size.
 *
 * Throttle: severity-keyed cooldown of 5 tool calls between same-severity
 * warnings. The `Last Context Warning` body section in the state file is
 * used as the persistence layer.
 *
 * Schema: writes `hookSpecificOutput.additionalContext` on stdout. Any
 * runtime error exits 0 silently so a broken hook never blocks the loop.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EXIT_SILENT = 0;

const WARNING_THRESHOLD = 0.75;
const CRITICAL_THRESHOLD = 0.90;
const COOLDOWN_TOOL_CALLS = 5;

// Default 200k context for Sonnet/Haiku, 1M for extended-context models.
// We bias toward 200k so warnings fire earlier rather than later.
const DEFAULT_CONTEXT_WINDOW = 200_000;

async function readStdin() {
    if (process.stdin.isTTY) {
        return "";
    }

    const chunks = [];

    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString("utf8");
}

function parseInput(raw) {
    if (!raw) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

/**
 * Parses the YAML frontmatter block from a markdown file's contents.
 *
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseFrontmatter(content) {
    const fields = {};

    if (!content.startsWith("---\n")) {
        return fields;
    }

    const end = content.indexOf("\n---", 4);

    if (end === -1) {
        return fields;
    }

    const block = content.slice(4, end);

    for (const line of block.split("\n")) {
        const colon = line.indexOf(":");

        if (colon === -1) {
            continue;
        }

        const key = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();

        if (key) {
            fields[key] = value;
        }
    }

    return fields;
}

/**
 * Locates the active autonomous state file. Returns the first state file
 * with `status: executing` AND `autonomous: true`, or null when no such
 * state exists.
 *
 * @returns {{ path: string, content: string, fields: Record<string, string> } | null}
 */
function findAutonomousState() {
    const plansDir = join(process.cwd(), ".ac", "plans");

    if (!existsSync(plansDir)) {
        return null;
    }

    const candidates = [];

    try {
        for (const entry of readdirSync(plansDir)) {
            if (entry.endsWith(".execution-state.md")) {
                candidates.push(join(plansDir, entry));
                continue;
            }

            const childDir = join(plansDir, entry);

            if (!statSync(childDir).isDirectory()) {
                continue;
            }

            const stateFile = join(childDir, ".execution-state.md");

            if (existsSync(stateFile)) {
                candidates.push(stateFile);
            }
        }
    } catch {
        return null;
    }

    for (const path of candidates) {
        try {
            const content = readFileSync(path, "utf8");
            const fields = parseFrontmatter(content);

            if (fields.status === "executing" && fields.autonomous === "true") {
                return {
                    path,
                    content,
                    fields,
                };
            }
        } catch {
            continue;
        }
    }

    return null;
}

/**
 * Reads the last assistant message's usage block from a JSONL transcript.
 * Returns null when the transcript cannot be read or no usage is present.
 *
 * @param {string} transcriptPath
 * @returns {{ inputTokens: number, contextWindowSize: number } | null}
 */
function readLatestUsage(transcriptPath) {
    if (!transcriptPath || !existsSync(transcriptPath)) {
        return null;
    }

    let content;

    try {
        content = readFileSync(transcriptPath, "utf8");
    } catch {
        return null;
    }

    const lines = content.split("\n").filter((line) => line.length > 0);

    // 1. Walk backwards through lines so we find the most recent usage block.
    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            const message = JSON.parse(lines[i]);
            const usage = message?.message?.usage || message?.usage;

            if (!usage) {
                continue;
            }

            const inputTokens = (usage.input_tokens || 0)
                + (usage.cache_read_input_tokens || 0)
                + (usage.cache_creation_input_tokens || 0);

            if (inputTokens === 0) {
                continue;
            }

            return {
                inputTokens,
                contextWindowSize: DEFAULT_CONTEXT_WINDOW,
            };
        } catch {
            continue;
        }
    }

    return null;
}

/**
 * Reads the persisted throttle counter from the state file body, returning
 * the latest severity and tool call count or null when never warned yet.
 *
 * @param {string} content
 * @returns {{ severity: string, toolCount: number } | null}
 */
function readWarningCounter(content) {
    const heading = "## Last Context Warning";
    const start = content.indexOf(heading);

    if (start === -1) {
        return null;
    }

    const tail = content.slice(start + heading.length);
    const blockEnd = tail.indexOf("\n## ");
    const block = blockEnd === -1
        ? tail
        : tail.slice(0, blockEnd);

    const match = block.match(/severity=(\w+).*?tool_count=(\d+)/);

    if (!match) {
        return null;
    }

    return {
        severity: match[1],
        toolCount: parseInt(match[2], 10),
    };
}

/**
 * Replaces the `Last Context Warning` block in the state file body with a
 * fresh marker. Preserves the rest of the file.
 *
 * @param {string} statePath
 * @param {string} content
 * @param {string} severity
 * @param {number} toolCount
 */
function recordWarning(statePath, content, severity, toolCount) {
    const heading = "## Last Context Warning";
    const timestamp = new Date().toISOString();
    const newBlock = `${heading}\n${timestamp} severity=${severity} tool_count=${toolCount}`;

    let updated;
    const start = content.indexOf(heading);

    if (start === -1) {
        updated = `${content.trimEnd()}\n\n${newBlock}\n`;
    } else {
        const tail = content.slice(start + heading.length);
        const blockEnd = tail.indexOf("\n## ");
        const before = content.slice(0, start);
        const after = blockEnd === -1
            ? ""
            : tail.slice(blockEnd);

        updated = `${before}${newBlock}${after}`;
    }

    try {
        writeFileSync(statePath, updated);
    } catch {
        // Throttle persistence is best-effort; failing here just means the
        // next call may re-warn at the same severity.
    }
}

/**
 * Counts tool_use entries in the transcript as a proxy for "tool calls so
 * far". Used to throttle same-severity warnings.
 *
 * @param {string} transcriptPath
 * @returns {number}
 */
function countToolCalls(transcriptPath) {
    if (!transcriptPath || !existsSync(transcriptPath)) {
        return 0;
    }

    try {
        const content = readFileSync(transcriptPath, "utf8");
        const matches = content.match(/"type":"tool_use"/g);

        return matches ? matches.length : 0;
    } catch {
        return 0;
    }
}

function buildWarningContext(severity, percentage, fields) {
    const slug = fields.slug || "(unknown)";
    const phase = fields.current_phase || "?";
    const task = fields.current_task || "?";
    const pctRounded = Math.round(percentage * 100);

    if (severity === "CRITICAL") {
        return [
            `## Context window CRITICAL (${pctRounded}%)`,
            "",
            `Plan ${slug} is at phase ${phase} task ${task}. Compaction is imminent. Finalize the current task, sync the state file, and route to /ac:execute Phase 5 to ScheduleWakeup the next resume cleanly.`,
            "Do not start a new task in this turn.",
        ].join("\n");
    }

    return [
        `## Context window WARNING (${pctRounded}%)`,
        "",
        `Plan ${slug} is at phase ${phase} task ${task}. Wrap up the current task, write the state file, and consider letting Phase 5 schedule the next resume in a fresh turn.`,
    ].join("\n");
}

async function main() {
    const state = findAutonomousState();

    // Silent skip when no autonomous run is active.
    if (!state) {
        process.exit(EXIT_SILENT);
    }

    const raw = await readStdin();
    const input = parseInput(raw);
    const transcriptPath = typeof input.transcript_path === "string"
        ? input.transcript_path
        : "";

    const usage = readLatestUsage(transcriptPath);

    if (!usage) {
        process.exit(EXIT_SILENT);
    }

    const ratio = usage.inputTokens / usage.contextWindowSize;
    let severity;

    if (ratio >= CRITICAL_THRESHOLD) {
        severity = "CRITICAL";
    } else if (ratio >= WARNING_THRESHOLD) {
        severity = "WARNING";
    } else {
        // Below warning threshold: nothing to do.
        process.exit(EXIT_SILENT);
    }

    const previous = readWarningCounter(state.content);
    const toolCount = countToolCalls(transcriptPath);

    // Throttle: same-severity within cooldown window stays silent.
    if (previous && previous.severity === severity) {
        if (toolCount - previous.toolCount < COOLDOWN_TOOL_CALLS) {
            process.exit(EXIT_SILENT);
        }
    }

    recordWarning(state.path, state.content, severity, toolCount);

    const output = {
        hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: buildWarningContext(severity, ratio, state.fields),
        },
    };

    process.stdout.write(JSON.stringify(output));
}

main().catch(() => {
    // Never break the tool loop on hook error: exit 0 without output.
    process.exit(EXIT_SILENT);
});
