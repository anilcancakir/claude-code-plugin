#!/usr/bin/env node
/**
 * ac plugin — SessionStart hook.
 *
 * Fires on every SessionStart trigger: startup, resume, clear, and compact
 * (confirmed via kodizm source `services/compact/compact.ts:591`,
 * `utils/hooks.ts:3867` — source enum: 'startup' | 'resume' | 'clear' |
 * 'compact').
 *
 * Detects the user's personal twin skills at ~/.claude/skills/my-coding and
 * ~/.claude/skills/my-language. When present, injects a short
 * additionalContext reminder so Claude invokes them via the Skill tool before
 * writing code or prose. Silent no-op when neither skill is installed.
 *
 * Post-compact trigger adds an extra line reminding Claude that prior Skill
 * invocations may have been compacted out of history and should be re-invoked
 * if the upcoming turn requires the coding or prose baseline.
 *
 * Schema: writes `hookSpecificOutput.additionalContext` on stdout. Any runtime
 * error exits 0 silently so a broken hook never blocks the session.
 */

import { existsSync } from "node:fs";
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

async function main() {
    const skillsRoot = join(homedir(), ".claude", "skills");
    const hasMyCoding = existsSync(join(skillsRoot, "my-coding", "SKILL.md"));
    const hasMyLanguage = existsSync(join(skillsRoot, "my-language", "SKILL.md"));

    // Silent skip when the user has not installed any twin skill yet.
    if (!hasMyCoding && !hasMyLanguage) {
        process.exit(EXIT_SILENT);
    }

    const raw = await readStdin();
    const input = parseInput(raw);
    const source = typeof input.source === "string" ? input.source : "startup";

    const bullets = buildBullets({ hasMyCoding, hasMyLanguage });
    const context = buildContext({ bullets, source });

    const output = {
        hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: context,
        },
    };

    process.stdout.write(JSON.stringify(output));
}

main().catch(() => {
    // Never break the session on hook error: exit 0 without output.
    process.exit(EXIT_SILENT);
});
