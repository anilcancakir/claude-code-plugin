/**
 * CLI entry point for the ac-new prompt rendering engine.
 * Usage:
 *   bun run src/cli.ts render --platform <id> [--output <dir>]
 *   bun run src/cli.ts render-one <template-path> --platform <id>
 *   bun run src/cli.ts list-platforms
 *   bun run src/cli.ts validate
 */

import { join, resolve, dirname, relative } from "path";
import { renderComponent, renderAllComponents } from "./renderer.js";
import { getPlatform, getAllPlatforms } from "./platforms/index.js";
import { writeOutput } from "./writer.js";
import type { RenderedComponent } from "./types.js";

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function green(s: string): string { return `${GREEN}${s}${RESET}`; }
function red(s: string): string { return `${RED}${s}${RESET}`; }
function yellow(s: string): string { return `${YELLOW}${s}${RESET}`; }
function cyan(s: string): string { return `${CYAN}${s}${RESET}`; }
function bold(s: string): string { return `${BOLD}${s}${RESET}`; }

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : undefined;
}

// Positional arg (non-flag token after the command)
function getPositional(): string | undefined {
    return args[1]?.startsWith("--") ? undefined : args[1];
}

// ---------------------------------------------------------------------------
// File writing — delegates to writer module
// ---------------------------------------------------------------------------

async function writeRendered(components: RenderedComponent[], outputDir: string): Promise<void> {
    const result = await writeOutput(components, outputDir);
    console.log(`Wrote ${result.filesWritten} file(s), ${result.totalBytes} bytes total.`);
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** Absolute path to the templates/ directory adjacent to src/. */
const TEMPLATES_DIR = resolve(dirname(new URL(import.meta.url).pathname), "..", "templates");

/** Absolute path to the sibling ac plugin (../ac relative to ac-new). */
const AC_PLUGIN_DIR = resolve(dirname(new URL(import.meta.url).pathname), "..", "..", "ac");

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdRender(): Promise<void> {
    const platformId = getFlag("platform");
    if (platformId === undefined) {
        console.error(red("Error: --platform <id> is required"));
        process.exit(1);
    }

    let platform;
    try {
        platform = getPlatform(platformId);
    } catch (err) {
        console.error(red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }

    const outputDir = getFlag("output") ?? `dist/${platformId}`;
    const resolvedOutput = resolve(outputDir);

    console.log(`${cyan("Rendering")} platform=${bold(platformId)} output=${resolvedOutput}`);

    let components: RenderedComponent[];
    try {
        components = await renderAllComponents(TEMPLATES_DIR, platform);
    } catch (err) {
        console.error(red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }

    // Rewrite outputPath when a custom --output dir was specified
    const finalComponents = components.map((c) => {
        if (getFlag("output") === undefined) return c;
        // Strip the computed dist/{platformId} prefix and replace with resolvedOutput
        const marker = `/dist/${platformId}/`;
        const markerIdx = c.outputPath.indexOf(marker);
        if (markerIdx === -1) return c;
        const rel = c.outputPath.slice(markerIdx + marker.length);
        return { ...c, outputPath: join(resolvedOutput, rel) };
    });

    try {
        await writeRendered(finalComponents, resolvedOutput);
    } catch (err) {
        console.error(red(`Error writing output: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }

    console.log(green(`${finalComponents.length} files rendered`));
}

async function cmdRenderOne(): Promise<void> {
    const templatePath = getPositional();
    if (templatePath === undefined) {
        console.error(red("Error: <template-path> is required"));
        process.exit(1);
    }

    const platformId = getFlag("platform");
    if (platformId === undefined) {
        console.error(red("Error: --platform <id> is required"));
        process.exit(1);
    }

    let platform;
    try {
        platform = getPlatform(platformId);
    } catch (err) {
        console.error(red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }

    const resolvedTemplate = resolve(templatePath);

    let component: RenderedComponent;
    try {
        component = await renderComponent(resolvedTemplate, platform);
    } catch (err) {
        console.error(red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }

    process.stdout.write(component.content);
}

function cmdListPlatforms(): void {
    const platforms = getAllPlatforms();
    for (const p of platforms) {
        console.log(`${cyan(p.id)}  ${p.name}`);
    }
}

async function cmdValidate(): Promise<void> {
    let platform;
    try {
        platform = getPlatform("claude-code");
    } catch (err) {
        console.error(red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }

    console.log(cyan("Validating claude-code output against ../ac/ ..."));

    let components: RenderedComponent[];
    try {
        components = await renderAllComponents(TEMPLATES_DIR, platform);
    } catch (err) {
        console.error(red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }

    let matchCount = 0;
    let diffCount = 0;

    for (const c of components) {
        // Derive the original ac/ path from the template source path.
        // Template: .../ac-new/templates/<type>/<name>.liquid
        // Original: .../ac/<type>/<name>.md
        const templateNorm = c.meta.sourcePath.replace(/\\/g, "/");
        const templatesMarker = templateNorm.lastIndexOf("/templates/");
        if (templatesMarker === -1) {
            console.warn(yellow(`  SKIP  ${c.meta.sourcePath} (cannot derive original path)`));
            continue;
        }

        const relFromTemplates = templateNorm.slice(templatesMarker + "/templates/".length);
        // Swap .liquid extension for .md (all ac/ components are markdown)
        const relMd = relFromTemplates.replace(/\.liquid$/, ".md");
        const originalPath = join(AC_PLUGIN_DIR, relMd);

        let originalContent: string;
        try {
            originalContent = await Bun.file(originalPath).text();
        } catch {
            console.warn(yellow(`  MISS  ${relMd} (no original found at ${originalPath})`));
            diffCount++;
            continue;
        }

        if (c.content === originalContent) {
            matchCount++;
            console.log(green(`  MATCH ${relMd}`));
        } else {
            diffCount++;
            console.log(red(`  DIFF  ${relMd}`));
            // Line-by-line diff summary
            const renderedLines = c.content.split("\n");
            const originalLines = originalContent.split("\n");
            const maxLines = Math.max(renderedLines.length, originalLines.length);
            let shownLines = 0;
            for (let i = 0; i < maxLines && shownLines < 5; i++) {
                const rLine = renderedLines[i] ?? "<missing>";
                const oLine = originalLines[i] ?? "<missing>";
                if (rLine !== oLine) {
                    console.log(`    Line ${i + 1}:`);
                    console.log(`      ${red("-")} ${oLine}`);
                    console.log(`      ${green("+")} ${rLine}`);
                    shownLines++;
                }
            }
        }
    }

    const total = matchCount + diffCount;
    console.log(`\n${bold("Summary:")} ${matchCount}/${total} match, ${diffCount} diffs`);

    if (diffCount > 0) {
        process.exit(1);
    }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    switch (command) {
        case "render":
            await cmdRender();
            break;
        case "render-one":
            await cmdRenderOne();
            break;
        case "list-platforms":
            cmdListPlatforms();
            break;
        case "validate":
            await cmdValidate();
            break;
        default:
            if (command === undefined) {
                console.error(red("Error: no command specified"));
            } else {
                console.error(red(`Error: unknown command "${command}"`));
            }
            console.error("Usage:");
            console.error("  bun run src/cli.ts render --platform <id> [--output <dir>]");
            console.error("  bun run src/cli.ts render-one <template-path> --platform <id>");
            console.error("  bun run src/cli.ts list-platforms");
            console.error("  bun run src/cli.ts validate");
            process.exit(1);
    }
}

await main();
