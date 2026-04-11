/**
 * Validation pipeline for ac-new rendered output.
 *
 * 1. CC fidelity check: compare claude-code renders against originals in ../ac/
 * 2. Multi-platform render check: render all templates for each platform, report errors.
 * 3. OpenCode TS syntax check: structural checks on agent .ts output.
 */

import { join, relative } from "path";
import { renderAllComponents } from "./renderer.js";
import { getPlatform, getAllPlatforms } from "./platforms/index.js";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface DiffResult {
    templatePath: string;
    originalPath: string;
    status: "match" | "whitespace-only" | "content-diff";
    diffLines: string[];
}

export interface PlatformRenderResult {
    platformId: string;
    templatesRendered: number;
    errors: string[];
}

export interface ValidationResult {
    passed: number;
    failed: number;
    diffs: DiffResult[];
    platformResults: PlatformRenderResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a templates-relative path to the corresponding original file path
 * inside the sibling `ac` plugin directory.
 *
 * Examples:
 *   agents/explore.liquid       -> ../ac/agents/explore.md
 *   commands/commit.liquid      -> ../ac/commands/commit.md
 *   skills/rule-creator/SKILL.liquid -> ../ac/skills/rule-creator/SKILL.md
 */
function templateToOriginalPath(templatePath: string, acPluginDir: string): string {
    const normalized = templatePath.replace(/\\/g, "/");
    // Strip everything up to and including /templates/
    const templatesMarker = normalized.lastIndexOf("/templates/");
    const relative_ =
        templatesMarker !== -1
            ? normalized.slice(templatesMarker + "/templates/".length)
            : normalized;

    // Swap .liquid extension for .md
    const withMd = relative_.replace(/\.liquid$/, ".md");

    return join(acPluginDir, withMd);
}

interface DiffStatus {
    status: "match" | "whitespace-only" | "content-diff";
    lines: string[];
}

/**
 * Line-by-line diff of two strings.
 * Returns a status and first 20 differing lines (shown as pairs: - expected, + actual).
 */
function diffLines(expected: string, actual: string): DiffStatus {
    const expLines = expected.split("\n");
    const actLines = actual.split("\n");
    const diffs: string[] = [];
    const maxLen = Math.max(expLines.length, actLines.length);

    for (let i = 0; i < maxLen; i++) {
        if (expLines[i] !== actLines[i]) {
            diffs.push(`L${i + 1}: - ${expLines[i] ?? "(missing)"}`);
            diffs.push(`L${i + 1}: + ${actLines[i] ?? "(missing)"}`);
        }
    }

    if (diffs.length === 0) return { status: "match", lines: [] };

    const isWhitespaceOnly = expLines.every((l, i) => l.trim() === (actLines[i] ?? "").trim()) &&
        expLines.length === actLines.length;

    return {
        status: isWhitespaceOnly ? "whitespace-only" : "content-diff",
        lines: diffs.slice(0, 20),
    };
}

/**
 * Checks structural validity of OpenCode agent TypeScript output.
 * Returns array of error strings (empty means valid).
 */
function checkOpenCodeTsSyntax(content: string, templatePath: string): string[] {
    const errors: string[] = [];

    if (!content.trimStart().startsWith("import type")) {
        errors.push(`[${templatePath}] OpenCode agent must start with "import type"`);
    }
    if (!content.includes("export function create")) {
        errors.push(`[${templatePath}] OpenCode agent must contain "export function create"`);
    }
    if (!content.includes("AgentConfig")) {
        errors.push(`[${templatePath}] OpenCode agent must reference AgentConfig`);
    }
    // Check for unclosed Liquid tags that leaked into the output
    if (/\{\{/.test(content)) {
        errors.push(`[${templatePath}] Unclosed Liquid expression tag "{{" found in output`);
    }
    if (/\{%/.test(content)) {
        errors.push(`[${templatePath}] Unclosed Liquid block tag "{%" found in output`);
    }

    return errors;
}

// ---------------------------------------------------------------------------
// Main validation function
// ---------------------------------------------------------------------------

/**
 * Runs the full validation pipeline.
 *
 * @param templatesDir - Absolute path to the templates/ directory.
 * @param acPluginDir  - Absolute path to the original ac plugin directory (e.g. ../ac).
 * @returns Aggregated validation results.
 */
export async function validate(
    templatesDir: string,
    acPluginDir: string,
): Promise<ValidationResult> {
    const diffs: DiffResult[] = [];
    const platformResults: PlatformRenderResult[] = [];

    // -------------------------------------------------------------------------
    // Step 1: CC fidelity check
    // -------------------------------------------------------------------------
    const ccPlatform = getPlatform("claude-code");
    const ccRendered = await renderAllComponents(templatesDir, ccPlatform);

    for (const rendered of ccRendered) {
        const originalPath = templateToOriginalPath(rendered.meta.sourcePath, acPluginDir);

        // Skip partials — they have no direct original counterpart
        const normalizedSource = rendered.meta.sourcePath.replace(/\\/g, "/");
        if (normalizedSource.includes("/partials/")) continue;

        let originalContent: string;
        try {
            const file = Bun.file(originalPath);
            originalContent = await file.text();
        } catch {
            diffs.push({
                templatePath: rendered.meta.sourcePath,
                originalPath,
                status: "content-diff",
                diffLines: [`[missing] Original file not found: ${originalPath}`],
            });
            continue;
        }

        const { status, lines } = diffLines(originalContent, rendered.content);
        diffs.push({
            templatePath: rendered.meta.sourcePath,
            originalPath,
            status,
            diffLines: lines.slice(0, 10),
        });
    }

    // -------------------------------------------------------------------------
    // Step 2: Multi-platform render check
    // -------------------------------------------------------------------------
    const allPlatforms = getAllPlatforms();

    for (const platform of allPlatforms) {
        const errors: string[] = [];
        let templatesRendered = 0;

        try {
            const rendered = await renderAllComponents(templatesDir, platform);
            templatesRendered = rendered.length;

            // Step 3: OpenCode TS syntax check (agents only)
            if (platform.id === "opencode") {
                for (const r of rendered) {
                    if (r.meta.type === "agent" && r.outputPath.endsWith(".ts")) {
                        const tsErrors = checkOpenCodeTsSyntax(r.content, r.meta.sourcePath);
                        errors.push(...tsErrors);
                    }
                }
            }
        } catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
        }

        platformResults.push({
            platformId: platform.id,
            templatesRendered,
            errors,
        });
    }

    // -------------------------------------------------------------------------
    // Tally results
    // -------------------------------------------------------------------------
    const fidelityDiffs = diffs.filter((d) => d.status !== "match");
    const platformErrors = platformResults.reduce((sum, p) => sum + p.errors.length, 0);
    const totalChecks = diffs.length + platformResults.length;
    const totalFailed = fidelityDiffs.length + (platformErrors > 0 ? 1 : 0);
    const passed = totalChecks - totalFailed;
    const failed = totalFailed;

    return { passed, failed, diffs, platformResults };
}

// ---------------------------------------------------------------------------
// Inline test (bun run src/validate.ts)
// ---------------------------------------------------------------------------

if (import.meta.main) {
    const acNewDir = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
    const templatesDir = join(acNewDir, "templates");
    // Originals live in sibling ac plugin directory
    const acPluginDir = join(acNewDir, "..", "ac");

    console.log(`Templates dir : ${templatesDir}`);
    console.log(`AC plugin dir : ${acPluginDir}`);
    console.log("");

    const result = await validate(templatesDir, acPluginDir);

    // CC fidelity summary
    const matchCount = result.diffs.filter((d) => d.status === "match").length;
    const totalFidelity = result.diffs.length;
    console.log(`CC fidelity: ${matchCount}/${totalFidelity} templates match original`);

    for (const diff of result.diffs) {
        if (diff.status === "match") {
            console.log(`  [PASS] ${diff.templatePath}`);
        } else {
            console.log(`  [${diff.status.toUpperCase()}] ${diff.templatePath}`);
            for (const line of diff.diffLines) {
                console.log(`    ${line}`);
            }
        }
    }

    console.log("");

    // Platform render summary
    for (const pr of result.platformResults) {
        if (pr.errors.length === 0) {
            console.log(`  [PASS] ${pr.platformId}: ${pr.templatesRendered} templates rendered`);
        } else {
            console.log(`  [FAIL] ${pr.platformId}: ${pr.errors.length} error(s)`);
            for (const err of pr.errors) {
                console.log(`    ${err}`);
            }
        }
    }

    console.log("");

    // Exit summary
    if (result.failed === 0) {
        console.log(`${matchCount}/${totalFidelity} templates match original — all platforms OK`);
    } else {
        const matchMsg = `${matchCount}/${totalFidelity} match`;
        const diffCount = result.diffs.filter((d) => d.status !== "match").length;
        const parts: string[] = [];
        if (diffCount > 0) parts.push(`${diffCount} diff(s) found`);
        for (const pr of result.platformResults) {
            if (pr.errors.length > 0) parts.push(`${pr.platformId}: ${pr.errors.length} error(s)`);
        }
        console.log(`${matchMsg}, ${parts.join(", ")}`);
    }

    process.exit(result.failed > 0 ? 1 : 0);
}
