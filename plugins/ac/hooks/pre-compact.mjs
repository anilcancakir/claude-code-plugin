#!/usr/bin/env node
/**
 * ac plugin — PreCompact hook.
 *
 * Fires immediately before Claude Code summarizes the conversation. Plugins
 * can return `newCustomInstructions` on stdout, which CC injects into the
 * summarization prompt so the resulting summary preserves what we ask for
 * (confirmed via the reverse-engineered v2.1.76 sources, section
 * `12-context-history.js` and `01-hook-system.js`).
 *
 * This hook scans `.ac/plans/` for any `.execution-state.md` with
 * `status: executing` and asks the summarizer to keep the plan's slug,
 * current phase + task, iteration count, autonomous flag, the last 3 entries
 * from the plan's Deviations Log, and a reminder about the user's twin
 * skills (my-coding, my-language). Without this, summarization drops the
 * "I'm in the middle of an autonomous run" context and the next turn
 * cannot route to `/ac:execute --resume <slug>` correctly.
 *
 * Schema: writes `hookSpecificOutput.newCustomInstructions` on stdout. Any
 * runtime error exits 0 silently so a broken hook never breaks compaction.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const EXIT_SILENT = 0;

/**
 * Parses the YAML frontmatter block from a markdown file's contents.
 *
 * Only flat scalar key: value pairs are recognized (no nesting, no lists).
 * Returns an empty object when the file has no frontmatter or parsing fails.
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
 * Extracts the most recent N entries from the `Recent Deviations` body
 * section of a state file. Each entry is a single line starting with `- `.
 *
 * @param {string} content
 * @param {number} limit
 * @returns {Array<string>}
 */
function readRecentDeviations(content, limit) {
    const heading = "## Recent Deviations";
    const start = content.indexOf(heading);

    if (start === -1) {
        return [];
    }

    const tail = content.slice(start + heading.length);
    const blockEnd = tail.indexOf("\n## ");
    const block = blockEnd === -1
        ? tail
        : tail.slice(0, blockEnd);

    const entries = [];

    for (const line of block.split("\n")) {
        const trimmed = line.trim();

        if (trimmed.startsWith("- ")) {
            entries.push(trimmed.slice(2));
        }
    }

    return entries.slice(-limit);
}

/**
 * Scans `.ac/plans/` for `.execution-state.md` files (Simple sibling and
 * Mode A/B child layouts) and returns parsed frontmatter + recent
 * deviations for any state file with `status: executing`.
 *
 * Returns an empty array when the directory does not exist or no executing
 * plan is found. All errors are swallowed (returns []).
 *
 * @returns {Array<{ fields: Record<string, string>, deviations: Array<string> }>}
 */
function findExecutingPlans() {
    const plansDir = join(process.cwd(), ".ac", "plans");

    if (!existsSync(plansDir)) {
        return [];
    }

    const found = [];

    try {
        // 1. Simple layout: <slug>.execution-state.md sibling files.
        for (const entry of readdirSync(plansDir)) {
            if (!entry.endsWith(".execution-state.md")) {
                continue;
            }

            const path = join(plansDir, entry);
            const content = readFileSync(path, "utf8");
            const fields = parseFrontmatter(content);

            if (fields.status === "executing") {
                found.push({
                    fields,
                    deviations: readRecentDeviations(content, 3),
                });
            }
        }

        // 2. Mode A and B layout: <slug>/.execution-state.md child files.
        for (const entry of readdirSync(plansDir)) {
            const childDir = join(plansDir, entry);

            if (!statSync(childDir).isDirectory()) {
                continue;
            }

            const stateFile = join(childDir, ".execution-state.md");

            if (!existsSync(stateFile)) {
                continue;
            }

            const content = readFileSync(stateFile, "utf8");
            const fields = parseFrontmatter(content);

            if (fields.status === "executing") {
                found.push({
                    fields,
                    deviations: readRecentDeviations(content, 3),
                });
            }
        }
    } catch {
        return [];
    }

    return found;
}

/**
 * Builds the newCustomInstructions block telling the summarizer which
 * autonomous-run details must survive compaction.
 *
 * Returns an empty string when no plan is executing.
 *
 * @param {Array<{ fields: Record<string, string>, deviations: Array<string> }>} executing
 * @returns {string}
 */
function buildInstructions(executing) {
    if (executing.length === 0) {
        return "";
    }

    const lines = [
        "Preserve in the summary, do not drop:",
        "",
    ];

    for (const { fields, deviations } of executing) {
        const slug = fields.slug || "(unknown)";
        const mode = fields.mode || "single";
        const phase = fields.current_phase || "?";
        const task = fields.current_task || "?";
        const iteration = fields.iteration || "?";
        const max = fields.max_iterations || "?";
        const autonomous = fields.autonomous === "true";

        lines.push(
            `- Plan ${slug}: mode ${mode}, current phase ${phase} task ${task}, iteration ${iteration}/${max}, autonomous=${autonomous}.`,
        );

        if (deviations.length > 0) {
            lines.push("  Last deviations:");

            for (const entry of deviations) {
                lines.push(`    - ${entry}`);
            }
        }
    }

    lines.push(
        "",
        "Also remind the post-compaction context to re-invoke `Skill(\"my-coding\")` and `Skill(\"my-language\")` before the next code or prose output. The next turn may need to route to `/ac:execute --resume <slug>`.",
    );

    return lines.join("\n");
}

async function main() {
    const executing = findExecutingPlans();
    const instructions = buildInstructions(executing);

    if (!instructions) {
        process.exit(EXIT_SILENT);
    }

    const output = {
        hookSpecificOutput: {
            hookEventName: "PreCompact",
            newCustomInstructions: instructions,
        },
    };

    process.stdout.write(JSON.stringify(output));
}

main().catch(() => {
    // Never break compaction on hook error: exit 0 without output.
    process.exit(EXIT_SILENT);
});
