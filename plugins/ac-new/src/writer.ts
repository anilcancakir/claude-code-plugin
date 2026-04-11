/**
 * Output writer for ac-new rendered prompt components.
 * Writes rendered content to the dist/ directory structure with dry-run support.
 */

import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { RenderedComponent } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a write operation, reporting files written and total bytes. */
export interface WriteResult {
    /** Number of files written (or that would be written in dry-run mode). */
    filesWritten: number;
    /** Total bytes written across all files. */
    totalBytes: number;
    /** Per-file breakdown of paths and byte sizes. */
    files: { path: string; bytes: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the platform-relative sub-path from a renderer-produced outputPath.
 *
 * The renderer emits paths like `dist/claude-code/agents/explore.md`.
 * We strip the leading `dist/<platformId>/` segment so the caller can
 * re-root the file under any outputDir they choose.
 *
 * If the path does not contain a `dist/` segment (e.g. already absolute and
 * non-standard), it is returned unchanged and joined directly with outputDir.
 */
function resolveOutputPath(outputPath: string, outputDir: string): string {
    // Normalise separators on Windows if ever needed — node:path handles this.
    const distIdx = outputPath.indexOf("dist/");
    if (distIdx !== -1) {
        // Keep everything after the leading `dist/` so the caller's outputDir
        // acts as the new dist root: outputDir/<platformId>/agents/foo.md
        const relative = outputPath.slice(distIdx + "dist/".length);
        return resolve(outputDir, relative);
    }

    // Absolute path that does not embed a dist/ segment — use as-is if
    // absolute, otherwise resolve against outputDir.
    if (outputPath.startsWith("/")) {
        return outputPath;
    }
    return resolve(outputDir, outputPath);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Writes an array of rendered components to the output directory.
 *
 * Each component's outputPath is re-rooted under outputDir by stripping
 * the renderer's `dist/` prefix and resolving relative to outputDir.
 *
 * @param rendered - Array of fully rendered components from the renderer.
 * @param outputDir - Root directory to write output into (acts as `dist/`).
 * @param dryRun - When true, prints planned writes without touching disk.
 * @returns Summary of files written and total bytes.
 */
export async function writeOutput(
    rendered: RenderedComponent[],
    outputDir: string,
    dryRun: boolean = false,
): Promise<WriteResult> {
    const files: { path: string; bytes: number }[] = [];

    for (const component of rendered) {
        const outPath = resolveOutputPath(component.outputPath, outputDir);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(component.content).byteLength;

        if (dryRun) {
            console.log(`[dry-run] ${outPath} (${bytes} bytes)`);
        } else {
            await mkdir(dirname(outPath), { recursive: true });
            await Bun.write(outPath, component.content);
        }

        files.push({ path: outPath, bytes });
    }

    const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);

    if (dryRun) {
        console.log(`\n[dry-run] Would write ${files.length} file(s), ${totalBytes} bytes total.`);
    } else {
        console.log(`Wrote ${files.length} file(s), ${totalBytes} bytes total.`);
    }

    return {
        filesWritten: files.length,
        totalBytes,
        files,
    };
}

/**
 * Removes the output directory entirely, enabling a clean re-render.
 *
 * Silently succeeds if the directory does not exist.
 *
 * @param outputDir - Directory to remove (the `dist/` root passed to writeOutput).
 */
export async function cleanOutput(outputDir: string): Promise<void> {
    const abs = resolve(outputDir);
    await rm(abs, { recursive: true, force: true });
    console.log(`Cleaned output directory: ${abs}`);
}

// ---------------------------------------------------------------------------
// Smoke test (bun run src/writer.ts)
// ---------------------------------------------------------------------------

if (import.meta.main) {
    const { join } = await import("node:path");
    const { existsSync } = await import("node:fs");

    const tmpDir = join("/tmp", `ac-new-writer-test-${Date.now()}`);
    const mockComponent: RenderedComponent = {
        content: "# Hello from writer smoke test\n",
        outputPath: "dist/claude-code/agents/smoke-test.md",
        meta: {
            type: "agent",
            frontmatter: { name: "smoke-test" },
            body: "# Hello from writer smoke test\n",
            sourcePath: "/fake/source/agents/smoke-test.md",
        },
    };

    console.log("--- Dry-run mode ---");
    const dryResult = await writeOutput([mockComponent], tmpDir, true);
    console.log("Dry-run result:", dryResult);
    console.log("Disk untouched:", !existsSync(tmpDir));

    console.log("\n--- Write mode ---");
    const writeResult = await writeOutput([mockComponent], tmpDir, false);
    console.log("Write result:", writeResult);

    const writtenPath = writeResult.files[0]?.path ?? "";
    const exists = existsSync(writtenPath);
    console.log("File exists on disk:", exists);

    if (!exists) {
        throw new Error(`Smoke test failed: file not found at ${writtenPath}`);
    }

    console.log("\n--- Clean mode ---");
    await cleanOutput(tmpDir);
    console.log("Directory removed:", !existsSync(tmpDir));

    console.log("\nSmoke test passed.");
}
