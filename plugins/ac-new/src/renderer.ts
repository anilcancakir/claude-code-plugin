/**
 * Component renderer — orchestrates the full render pipeline for a single prompt component.
 * Reads template -> parses frontmatter -> builds context -> renders Liquid -> assembles output.
 */

import { join, dirname, relative } from "path";
import type { ComponentMeta, ComponentType, PlatformAdapter, RenderedComponent } from "./types.js";
import { createEngine } from "./engine.js";
import { parseFrontmatter, renderFrontmatter } from "./frontmatter.js";

// ---------------------------------------------------------------------------
// Component type detection
// ---------------------------------------------------------------------------

/**
 * Derives the ComponentType from the template file path.
 * Convention:
 *   templates/agents/**   -> 'agent'
 *   templates/commands/** -> 'command'
 *   templates/skills/**   -> 'skill'
 *   anything else         -> 'reference'
 */
function detectComponentType(templatePath: string): ComponentType {
    const normalized = templatePath.replace(/\\/g, "/");
    if (/\/templates\/agents\//.test(normalized)) return "agent";
    if (/\/templates\/commands\//.test(normalized)) return "command";
    if (/\/templates\/skills\//.test(normalized)) return "skill";
    return "reference";
}

// ---------------------------------------------------------------------------
// Output path computation
// ---------------------------------------------------------------------------

/**
 * Maps a template path to its dist output path.
 * Replaces `templates/` segment with `dist/{platformId}/` and swaps `.liquid`
 * for the platform-appropriate extension for the given component type.
 */
function computeOutputPath(templatePath: string, platform: PlatformAdapter, componentType: ComponentType): string {
    const normalized = templatePath.replace(/\\/g, "/");
    const templatesIdx = normalized.lastIndexOf("/templates/");

    if (templatesIdx === -1) {
        // Fallback: replace .liquid extension only
        return normalized.replace(/\.liquid$/, `.${platform.fileExtension(componentType)}`);
    }

    const base = normalized.slice(0, templatesIdx);
    const rest = normalized.slice(templatesIdx + "/templates/".length);
    const withoutLiquid = rest.replace(/\.liquid$/, `.${platform.fileExtension(componentType)}`);

    return `${base}/dist/${platform.id}/${withoutLiquid}`;
}

// ---------------------------------------------------------------------------
// Single component renderer
// ---------------------------------------------------------------------------

/**
 * Renders a single `.liquid` template file through the full pipeline:
 * read -> parse -> build context -> render Liquid -> map frontmatter -> assemble.
 *
 * @param templatePath - Absolute path to the source `.liquid` file.
 * @param platform     - Target platform adapter.
 * @param globals      - Optional extra variables injected into the Liquid context.
 * @returns Fully rendered component with content, outputPath, and metadata.
 */
export async function renderComponent(
    templatePath: string,
    platform: PlatformAdapter,
    globals?: Record<string, unknown>,
): Promise<RenderedComponent> {
    try {
        // Step 1: Read template from disk
        const raw = await Bun.file(templatePath).text();

        // Step 2: Parse frontmatter + body
        const { frontmatter, body } = parseFrontmatter(raw);

        // Step 3: Detect component type
        const type = detectComponentType(templatePath);

        // Step 4: Build ComponentMeta
        const meta: ComponentMeta = { type, frontmatter, body, sourcePath: templatePath };

        // Step 5: Derive templates directory (parent of templates/ subtree)
        const normalized = templatePath.replace(/\\/g, "/");
        const templatesMarker = normalized.lastIndexOf("/templates/");
        const templatesDir =
            templatesMarker !== -1
                ? normalized.slice(0, templatesMarker) + "/templates"
                : dirname(templatePath);

        const engine = createEngine(platform, templatesDir);

        // Step 6: Build Liquid render context
        const context: Record<string, unknown> = {
            platform: {
                id: platform.id,
                name: platform.name,
                capabilities: platform.capabilities,
            },
            component: {
                type,
                frontmatter,
            },
            ...(globals ?? {}),
        };

        // Step 7: Render Liquid expressions inside frontmatter values
        const renderedFm = await renderFrontmatter(frontmatter, engine, context);

        // Step 8: Map frontmatter through platform adapter
        const mappedFm = platform.mapFrontmatter(renderedFm, type);

        // Step 9: Render body
        const renderedBody = await engine.parseAndRender(body, context);

        // Step 10: Assemble final content via platform adapter
        // Pass a meta with the mapped frontmatter so renderComponent has accurate data
        const assemblyMeta: ComponentMeta = { ...meta, frontmatter: mappedFm };
        const content = platform.renderComponent(assemblyMeta, renderedBody);

        // Step 11: Compute output path
        const outputPath = computeOutputPath(templatePath, platform, type);

        return { content, outputPath, meta };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`[renderer] Failed to render "${templatePath}" for platform "${platform.id}": ${message}`);
    }
}

// ---------------------------------------------------------------------------
// Bulk renderer
// ---------------------------------------------------------------------------

/**
 * Renders all `.liquid` templates found under `templatesDir`.
 *
 * @param templatesDir - Root directory containing `.liquid` template files.
 * @param platform     - Target platform adapter.
 * @param globals      - Optional extra variables injected into every render.
 * @returns Array of rendered components (one per template file found).
 */
export async function renderAllComponents(
    templatesDir: string,
    platform: PlatformAdapter,
    globals?: Record<string, unknown>,
): Promise<RenderedComponent[]> {
    const glob = new Bun.Glob("**/*.liquid");
    const paths: string[] = [];

    for await (const file of glob.scan({ cwd: templatesDir, absolute: false })) {
        paths.push(join(templatesDir, file));
    }

    return Promise.all(paths.map((p) => renderComponent(p, platform, globals)));
}

// ---------------------------------------------------------------------------
// Inline smoke test
// ---------------------------------------------------------------------------

if (import.meta.main) {
    const { getPlatform } = await import("./platforms/index.js");

    function assert(condition: boolean, message: string): void {
        if (!condition) throw new Error(`Assertion failed: ${message}`);
    }

    // Create a temp templates/agents/ tree with a minimal .liquid file
    const tmpDir = `/tmp/ac-renderer-test-${Date.now()}`;
    const agentsDir = `${tmpDir}/templates/agents`;
    await Bun.write(`${agentsDir}/explore.liquid`, [
        "---",
        "name: explore",
        "description: Searches the codebase for {{ platform.id }}",
        "model: haiku",
        "---",
        "You are a codebase search specialist on {{ platform.name }}.",
    ].join("\n"));

    // -- claude-code render --------------------------------------------------
    const cc = getPlatform("claude-code");
    const ccResult = await renderComponent(`${agentsDir}/explore.liquid`, cc);

    assert(ccResult.content.includes("name: explore"), "CC output has frontmatter name");
    assert(ccResult.content.includes("claude-code"), "CC output has platform id in frontmatter description");
    assert(ccResult.content.includes("You are a codebase search specialist on Claude Code"), "CC body rendered");
    assert(
        ccResult.outputPath.includes(`/dist/claude-code/agents/explore.md`),
        `CC outputPath should end with dist/claude-code/agents/explore.md, got: ${ccResult.outputPath}`,
    );
    assert(ccResult.meta.type === "agent", "CC meta type is agent");

    // -- opencode render (agent -> .ts, TS factory) --------------------------
    const oc = getPlatform("opencode");
    const ocResult = await renderComponent(`${agentsDir}/explore.liquid`, oc);

    assert(ocResult.content.includes("export function createExploreAgent"), "OC output is TS factory");
    assert(
        ocResult.outputPath.includes(`/dist/opencode/agents/explore.ts`),
        `OC outputPath should end with dist/opencode/agents/explore.ts, got: ${ocResult.outputPath}`,
    );

    // -- renderAllComponents -------------------------------------------------
    const allResults = await renderAllComponents(`${tmpDir}/templates`, cc);
    assert(allResults.length === 1, `renderAllComponents returned ${allResults.length}, expected 1`);

    // Cleanup
    const { rmSync } = await import("fs");
    rmSync(tmpDir, { recursive: true, force: true });

    console.log("Renderer smoke test passed.");
}
