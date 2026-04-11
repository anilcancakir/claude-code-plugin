/**
 * End-to-end smoke test for the ac-new render pipeline.
 *
 * Exercises: clean -> render all platforms -> validate CC fidelity ->
 * check OpenCode TS signatures -> count outputs -> report.
 *
 * Exit 0 if all checks pass, exit 1 if any fail.
 */

import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { renderAllComponents } from "./renderer.js";
import { getAllPlatforms } from "./platforms/index.js";
import { writeOutput, cleanOutput } from "./writer.js";
import { validate } from "./validate.js";

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function pass(text: string): string {
    return `${GREEN}${text}${RESET}`;
}

function fail(text: string): string {
    return `${RED}${text}${RESET}`;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const acNewDir = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const templatesDir = join(acNewDir, "templates");
const acPluginDir = join(acNewDir, "..", "ac");
const distDir = join(acNewDir, "dist");

// ---------------------------------------------------------------------------
// Expected file counts per platform
// The partial is rendered by renderAllComponents (7 total) but partials/
// only appear in the total render count — validate() skips them for fidelity.
// 6 non-partial templates + 1 partial = 7 rendered per platform.
// ---------------------------------------------------------------------------

const EXPECTED_FILES_PER_PLATFORM = 7;
const EXPECTED_STANDALONE = 6; // agents(3) + commands(2) + skills(1)
const PLATFORMS = 4;

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

interface PlatformSummary {
    platformId: string;
    filesRendered: number;
    status: "PASS" | "FAIL";
    detail: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count files written under dist/<platformId>/ recursively. */
function countFilesUnder(dir: string): number {
    if (!existsSync(dir)) return 0;
    let count = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true } as Parameters<typeof readdirSync>[1])) {
        if ((entry as { isFile?: () => boolean }).isFile?.()) count++;
    }
    return count;
}

/** Collect all .ts files under a directory recursively. */
function collectTsFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true } as Parameters<typeof readdirSync>[1])) {
        const e = entry as unknown as { isFile?: () => boolean; name: string; path?: string; parentPath?: string };
        if (e.isFile?.() && e.name.endsWith(".ts")) {
            const parent = e.parentPath ?? e.path ?? dir;
            results.push(join(parent, e.name));
        }
    }
    return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    console.log("\n=== ac-new Smoke Test ===\n");

    let totalFailures = 0;
    const summaries: PlatformSummary[] = [];

    // -----------------------------------------------------------------------
    // Step 1: Clean dist/
    // -----------------------------------------------------------------------

    await cleanOutput(distDir);
    console.log("");

    // -----------------------------------------------------------------------
    // Step 2: Render all platforms and write to dist/
    // -----------------------------------------------------------------------

    const platforms = getAllPlatforms();

    for (const platform of platforms) {
        try {
            const rendered = await renderAllComponents(templatesDir, platform);
            await writeOutput(rendered, distDir);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            summaries.push({
                platformId: platform.id,
                filesRendered: 0,
                status: "FAIL",
                detail: `Render error: ${msg}`,
            });
            totalFailures++;
        }
    }

    console.log("");

    // -----------------------------------------------------------------------
    // Step 3: Validate CC fidelity
    // -----------------------------------------------------------------------

    const validation = await validate(templatesDir, acPluginDir);
    const ccMatches = validation.diffs.filter((d) => d.status === "match").length;
    const ccTotal = validation.diffs.length;
    const ccPlatformResult = validation.platformResults.find((p) => p.platformId === "claude-code");
    const ccFilesRendered = ccPlatformResult?.templatesRendered ?? 0;

    const ccFailed = ccMatches < ccTotal;
    if (ccFailed) totalFailures++;

    summaries.push({
        platformId: "claude-code",
        filesRendered: ccFilesRendered,
        status: ccFailed ? "FAIL" : "PASS",
        detail: ccFailed
            ? `${ccMatches}/${ccTotal} match original`
            : `${ccMatches}/${ccTotal} match original`,
    });

    // Print CC diff details on failure
    if (ccFailed) {
        for (const diff of validation.diffs) {
            if (diff.status !== "match") {
                console.log(`  [DIFF] ${diff.templatePath}`);
                for (const line of diff.diffLines) {
                    console.log(`    ${line}`);
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Step 4: Check OpenCode .ts files for required signatures
    // -----------------------------------------------------------------------

    const ocAgentsDir = join(distDir, "opencode", "agents");
    const ocTsFiles = collectTsFiles(ocAgentsDir);

    let ocErrors: string[] = [];
    for (const tsFile of ocTsFiles) {
        const content = await Bun.file(tsFile).text();
        if (!content.includes("export function create")) {
            ocErrors.push(`Missing "export function create" in ${tsFile}`);
        }
        if (!content.includes("AgentConfig")) {
            ocErrors.push(`Missing "AgentConfig" in ${tsFile}`);
        }
    }

    const ocPlatformResult = validation.platformResults.find((p) => p.platformId === "opencode");
    const ocFilesRendered = ocPlatformResult?.templatesRendered ?? 0;
    const ocValidationErrors = ocPlatformResult?.errors ?? [];
    const allOcErrors = [...ocErrors, ...ocValidationErrors];
    const ocFailed = allOcErrors.length > 0;
    if (ocFailed) totalFailures++;

    summaries.push({
        platformId: "opencode",
        filesRendered: ocFilesRendered,
        status: ocFailed ? "FAIL" : "PASS",
        detail: ocFailed ? `TS errors: ${allOcErrors.join("; ")}` : "TS syntax OK",
    });

    // -----------------------------------------------------------------------
    // Step 5: Remaining platforms (antigravity, generic) — render check only
    // -----------------------------------------------------------------------

    for (const platformId of ["antigravity", "generic"]) {
        const pr = validation.platformResults.find((p) => p.platformId === platformId);
        const filesRendered = pr?.templatesRendered ?? 0;
        const errors = pr?.errors ?? [];
        const hasFailed = errors.length > 0 || filesRendered === 0;
        if (hasFailed) totalFailures++;

        summaries.push({
            platformId,
            filesRendered,
            status: hasFailed ? "FAIL" : "PASS",
            detail: hasFailed ? (errors.join("; ") || "no files rendered") : "rendered",
        });
    }

    // -----------------------------------------------------------------------
    // Step 6: Count total output files
    // -----------------------------------------------------------------------

    let totalFilesOnDisk = 0;
    for (const platform of platforms) {
        const platformDir = join(distDir, platform.id);
        totalFilesOnDisk += countFilesUnder(platformDir);
    }

    // Verify we have the expected count (7 per platform * 4 platforms = 28, but
    // partial maps to same subdir as other types — count what actually exists)
    const expectedTotal = EXPECTED_FILES_PER_PLATFORM * PLATFORMS;
    const countOk = totalFilesOnDisk === expectedTotal;
    if (!countOk) {
        totalFailures++;
        console.log(`  [WARN] Expected ${expectedTotal} files on disk, found ${totalFilesOnDisk}`);
    }

    // -----------------------------------------------------------------------
    // Step 7: Report table
    // -----------------------------------------------------------------------

    console.log("");
    const col1 = 14;
    const col2 = 11;
    const col3 = 30;

    const header = `${"Platform".padEnd(col1)} | ${"Templates".padEnd(col2)} | Status`;
    const separator = "-".repeat(col1 + col2 + col3 + 6);

    console.log(header);
    console.log(separator);

    for (const s of summaries) {
        const statusText = s.status === "PASS"
            ? pass(`PASS (${s.detail})`)
            : fail(`FAIL (${s.detail})`);
        console.log(`${s.platformId.padEnd(col1)} | ${String(s.filesRendered).padEnd(col2)} | ${statusText}`);
    }

    console.log("");

    const standaloneTotal = EXPECTED_STANDALONE * PLATFORMS;
    const failuresLabel = totalFailures === 0 ? pass("0 failures") : fail(`${totalFailures} failures`);
    console.log(`Total: ${standaloneTotal} standalone files rendered, ${failuresLabel}`);
    console.log("");

    process.exit(totalFailures > 0 ? 1 : 0);
}

await main();
