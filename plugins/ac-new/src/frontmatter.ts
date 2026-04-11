/**
 * Frontmatter parser, Liquid renderer, and serializer for prompt component files.
 * Pure transform module — no file I/O.
 */

import { parse as parseYaml } from "yaml";
import type { Liquid } from "liquidjs";

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/** Pattern that matches YAML frontmatter delimited by `---` blocks. */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Result of parsing a raw component file string. */
export interface ParseResult {
    /** Parsed YAML key-value pairs, or empty object when no frontmatter is present. */
    frontmatter: Record<string, unknown>;
    /** Component body text, excluding the frontmatter block. */
    body: string;
}

/**
 * Splits a raw component file into its YAML frontmatter and body.
 *
 * Handles three cases:
 * - Full frontmatter + body: parsed normally.
 * - Frontmatter only (no body): parsed frontmatter + empty body.
 * - No frontmatter delimiters: empty frontmatter + full text as body.
 *
 * @param raw - Raw file content string.
 * @returns Parsed frontmatter record and body string.
 */
export function parseFrontmatter(raw: string): ParseResult {
    const match = FRONTMATTER_RE.exec(raw);
    if (!match) {
        return { frontmatter: {}, body: raw };
    }

    const [, yamlBlock, bodyBlock] = match;

    try {
        const parsed = parseYaml(yamlBlock ?? "");
        const frontmatter =
            parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {};
        return { frontmatter, body: bodyBlock ?? "" };
    } catch {
        return { frontmatter: {}, body: raw };
    }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Recursively renders Liquid template expressions embedded in frontmatter string values.
 *
 * Only values that contain `{{` or `{%` are passed through the engine — others are
 * left untouched to avoid unnecessary async overhead.
 *
 * @param fm - Frontmatter record to render (not mutated).
 * @param engine - Liquid engine instance to use for template rendering.
 * @param ctx - Template context variables available during rendering.
 * @returns New frontmatter record with Liquid expressions resolved.
 */
export async function renderFrontmatter(
    fm: Record<string, unknown>,
    engine: Liquid,
    ctx: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return renderValue(fm, engine, ctx) as Promise<Record<string, unknown>>;
}

async function renderValue(
    value: unknown,
    engine: Liquid,
    ctx: Record<string, unknown>,
): Promise<unknown> {
    if (typeof value === "string") {
        if (value.includes("{{") || value.includes("{%")) {
            return engine.parseAndRender(value, ctx);
        }
        return value;
    }

    if (Array.isArray(value)) {
        return Promise.all(value.map((item) => renderValue(item, engine, ctx)));
    }

    if (value !== null && typeof value === "object") {
        const entries = await Promise.all(
            Object.entries(value as Record<string, unknown>).map(async ([k, v]) => [
                k,
                await renderValue(v, engine, ctx),
            ]),
        );
        return Object.fromEntries(entries);
    }

    return value;
}

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------

if (import.meta.main) {
    // Case 1: full frontmatter + body
    const result1 = parseFrontmatter("---\nname: test\nmodel: opus\n---\nBody here");
    console.assert(result1.frontmatter["name"] === "test", "name should be test");
    console.assert(result1.frontmatter["model"] === "opus", "model should be opus");
    console.assert(result1.body === "Body here", "body should be 'Body here'");

    // Case 2: no frontmatter
    const result2 = parseFrontmatter("No frontmatter here");
    console.assert(
        Object.keys(result2.frontmatter).length === 0,
        "frontmatter should be empty",
    );
    console.assert(result2.body === "No frontmatter here", "body should be full text");

    console.log("Frontmatter smoke test passed");
}
