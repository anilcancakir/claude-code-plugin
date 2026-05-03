#!/usr/bin/env node
/**
 * ac plugin — SessionStart hook.
 *
 * Fires on every SessionStart trigger: startup, resume, clear, and compact
 * (confirmed via kodizm source `services/compact/compact.ts:591`,
 * `utils/hooks.ts:3867` — source enum: 'startup' | 'resume' | 'clear' |
 * 'compact').
 *
 * Two responsibilities:
 *
 * 1. Twin skill reminder. Detects the user's personal skills at
 *    ~/.claude/skills/my-coding and ~/.claude/skills/my-language. When present,
 *    injects a short additionalContext reminder so Claude invokes them via the
 *    Skill tool before writing code or prose. Silent no-op when neither skill
 *    is installed. Post-compact trigger adds an extra line about re-invoking
 *    skills that may have been compacted out of history.
 *
 * 2. Autonomous execution resume. Scans for `.execution-state.md` files in
 *    `.ac/plans/` (Simple sibling and Mode A/B child layouts). When a state
 *    file with `status: executing` is found, adds a resume reminder so the
 *    upcoming turn knows it can call `/ac:execute --resume <slug>` and which
 *    phase + task to pick up from. Schema: see
 *    `plugins/ac/references/execution-state-schema.md`.
 *
 * Schema: writes `hookSpecificOutput.additionalContext` on stdout. Any runtime
 * error exits 0 silently so a broken hook never blocks the session.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const EXIT_SILENT = 0;

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

function buildBullets({ hasMyCoding, hasMyLanguage }) {
    const bullets = [];

    if (hasMyCoding) {
        bullets.push(
            "Before ANY code output (Edit, Write, MultiEdit, NotebookEdit, code blocks in chat, refactor, review): invoke `Skill(\"my-coding\")`. It encodes the user's personal coding baseline (naming, syntax, TDD, architecture). Not a suggestion, it IS the style.",
        );
    }

    if (hasMyLanguage) {
        bullets.push(
            "Before ANY prose output longer than one sentence (commit messages, PR descriptions, docs, articles, guides): invoke `Skill(\"my-language\")`. It encodes the user's personal writing voice (tone, phrasing, structure, em/en dash ban).",
        );
    }

    return bullets;
}

function buildContext({ bullets, source }) {
    const header = "## Twin Mode (ac plugin)";
    const intro = "The user has installed personal twin skills at `~/.claude/skills/`. Treat them as DEFAULTS, not optional references.";
    const body = bullets.map((line) => `- ${line}`).join("\n");
    const footer = "Invoke each skill ONCE per relevant task. Its SKILL.md stays in context for the remainder of the turn.";

    const lines = [
        header,
        "",
        intro,
        "",
        body,
        "",
        footer,
    ];

    if (source === "compact") {
        lines.push(
            "",
            "Post-compact: prior `Skill` invocations may have been compressed out of history. Re-invoke the relevant skill before the next code or prose output, do not assume earlier load is still effective.",
        );
    }

    return lines.join("\n");
}

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
 * Scans `.ac/plans/` for `.execution-state.md` files (Simple sibling and
 * Mode A/B child layouts) and returns parsed frontmatter for any state file
 * with `status: executing`.
 *
 * Returns an empty array when the directory does not exist or no executing
 * plan is found. All errors are swallowed (returns []) so a malformed state
 * file never breaks the hook.
 *
 * @returns {Array<{ path: string, fields: Record<string, string> }>}
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
                    path,
                    fields,
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
                    path: stateFile,
                    fields,
                });
            }
        }
    } catch {
        return [];
    }

    return found;
}

/**
 * Builds a one-block resume reminder for the executing plans found on disk.
 *
 * Lists each plan with its slug, mode, current phase + task, iteration count,
 * and autonomous flag so the upcoming turn can route to /ac:execute --resume
 * without re-discovering state. Returns an empty string when nothing is
 * executing.
 *
 * @param {Array<{ path: string, fields: Record<string, string> }>} executing
 * @returns {string}
 */
function buildResumeContext(executing) {
    if (executing.length === 0) {
        return "";
    }

    const lines = [
        "## ac autonomous execution resume",
        "",
        "One or more plans are mid-run. Pick up via `/ac:execute --resume <slug>`:",
        "",
    ];

    for (const { fields } of executing) {
        const slug = fields.slug || "(unknown)";
        const mode = fields.mode || "single";
        const phase = fields.current_phase || "?";
        const task = fields.current_task || "?";
        const iteration = fields.iteration || "?";
        const max = fields.max_iterations || "?";
        const autonomous = fields.autonomous === "true";

        lines.push(
            `- ${slug} (mode: ${mode}, phase ${phase} task ${task}, iteration ${iteration}/${max}, autonomous: ${autonomous})`,
        );
    }

    lines.push(
        "",
        "Re-invoke `Skill(\"my-coding\")` and `Skill(\"my-language\")` before continuing, then `/ac:execute --resume <slug>`.",
    );

    return lines.join("\n");
}

async function main() {
    const skillsRoot = join(homedir(), ".claude", "skills");
    const hasMyCoding = existsSync(join(skillsRoot, "my-coding", "SKILL.md"));
    const hasMyLanguage = existsSync(join(skillsRoot, "my-language", "SKILL.md"));
    const executing = findExecutingPlans();

    // Silent skip when neither twin skill is installed AND no plan is executing.
    if (!hasMyCoding && !hasMyLanguage && executing.length === 0) {
        process.exit(EXIT_SILENT);
    }

    const raw = await readStdin();
    const input = parseInput(raw);
    const source = typeof input.source === "string" ? input.source : "startup";

    const sections = [];

    if (hasMyCoding || hasMyLanguage) {
        const bullets = buildBullets({
            hasMyCoding,
            hasMyLanguage,
        });
        sections.push(buildContext({
            bullets,
            source,
        }));
    }

    const resume = buildResumeContext(executing);

    if (resume) {
        sections.push(resume);
    }

    const output = {
        hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: sections.join("\n\n"),
        },
    };

    process.stdout.write(JSON.stringify(output));
}

main().catch(() => {
    // Never break the session on hook error: exit 0 without output.
    process.exit(EXIT_SILENT);
});
