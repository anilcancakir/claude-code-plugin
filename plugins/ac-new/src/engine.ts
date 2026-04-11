/**
 * Liquid template engine factory.
 * Creates a configured LiquidJS instance with platform-aware custom filters
 * and a `platform_switch` tag for conditional platform-specific blocks.
 */

import { Liquid, Tag, type Emitter, type TagToken, type TopLevelToken, type Template, type Context } from "liquidjs";
import { type Parser } from "liquidjs";
import type { PlatformAdapter } from "./types.js";

// ---------------------------------------------------------------------------
// Variable mappings per platform
// ---------------------------------------------------------------------------

/** CC variable -> platform-specific expansion. Empty string = not supported. */
const PLATFORM_VARS: Record<string, Record<string, string>> = {
    "claude-code": {
        CLAUDE_PLUGIN_ROOT: "${CLAUDE_PLUGIN_ROOT}",
        CLAUDE_SKILL_DIR: "${CLAUDE_SKILL_DIR}",
        CLAUDE_SESSION_ID: "${CLAUDE_SESSION_ID}",
    },
};

function resolvePlatformVar(platformId: string, varName: string): string {
    return PLATFORM_VARS[platformId]?.[varName] ?? "";
}

// ---------------------------------------------------------------------------
// Custom tag: platform_switch
// ---------------------------------------------------------------------------

class PlatformSwitchTag extends Tag {
    branches: { platformId: string; templates: Template[] }[] = [];
    elseTemplates: Template[] = [];

    constructor(token: TagToken, remainTokens: TopLevelToken[], liquid: Liquid, parser: Parser) {
        super(token, remainTokens, liquid);

        let currentTemplates: Template[] = [];
        let currentPlatformId: string | null = null;
        let hitElse = false;

        const stream = parser.parseStream(remainTokens);
        stream
            .on("tag:when", (tagToken: TagToken) => {
                // Flush previous branch
                if (currentPlatformId !== null) {
                    this.branches.push({ platformId: currentPlatformId, templates: currentTemplates });
                }
                // Extract platform id from the tag args, stripping quotes
                currentPlatformId = tagToken.args.trim().replace(/^["']|["']$/g, "");
                currentTemplates = [];
            })
            .on("tag:else", () => {
                // Flush previous branch
                if (currentPlatformId !== null) {
                    this.branches.push({ platformId: currentPlatformId, templates: currentTemplates });
                    currentPlatformId = null;
                }
                hitElse = true;
                currentTemplates = [];
            })
            .on("tag:endplatform_switch", () => {
                // Flush last branch
                if (hitElse) {
                    this.elseTemplates = currentTemplates;
                } else if (currentPlatformId !== null) {
                    this.branches.push({ platformId: currentPlatformId, templates: currentTemplates });
                }
                stream.stop();
            })
            .on("template", (tpl: Template) => {
                currentTemplates.push(tpl);
            })
            .on("end", () => {
                throw new Error(
                    "tag {% platform_switch %} not closed with {% endplatform_switch %}",
                );
            });

        stream.start();
    }

    *render(ctx: Context, emitter: Emitter): Generator<unknown, void, unknown> {
        const scope = ctx.getAll() as Record<string, unknown>;
        const platformId = ((scope.platform as { id: string } | undefined)?.id) ?? "";

        for (const branch of this.branches) {
            if (branch.platformId === platformId) {
                yield this.liquid.renderer.renderTemplates(branch.templates, ctx, emitter);
                return;
            }
        }

        // No match, render else block if present
        if (this.elseTemplates.length > 0) {
            yield this.liquid.renderer.renderTemplates(this.elseTemplates, ctx, emitter);
        }
    }
}

// ---------------------------------------------------------------------------
// Engine factory
// ---------------------------------------------------------------------------

/**
 * Creates a configured LiquidJS engine with platform-aware globals,
 * custom filters (tool_name, model_name, platform_var, indent),
 * and the `platform_switch` custom tag.
 */
export function createEngine(platform: PlatformAdapter, templatesDir: string): Liquid {
    const engine = new Liquid({
        root: templatesDir,
        partials: `${templatesDir}/partials`,
        extname: ".liquid",
        cache: true,
        trimTagRight: true,
        greedy: true,
    });

    // -----------------------------------------------------------------------
    // Globals
    // -----------------------------------------------------------------------

    const globals: Record<string, unknown> = {
        platform: {
            id: platform.id,
            name: platform.name,
            capabilities: platform.capabilities,
        },
        plugin_root: platform.id === "claude-code" ? "${CLAUDE_PLUGIN_ROOT}" : "",
        skill_dir: platform.id === "claude-code" ? "${CLAUDE_SKILL_DIR}" : "",
        session_id: platform.id === "claude-code" ? "${CLAUDE_SESSION_ID}" : "",
    };

    // Inject globals into the engine so they're available in every render call.
    // LiquidJS supports globals via the `globals` option, but we set them
    // after construction by patching the options object.
    (engine.options as { globals: Record<string, unknown> }).globals = globals;

    // -----------------------------------------------------------------------
    // Custom filters
    // -----------------------------------------------------------------------

    engine.registerFilter("tool_name", (value: string) => {
        return platform.mapToolName(value);
    });

    engine.registerFilter("model_name", (value: string) => {
        return platform.mapModelName(value);
    });

    engine.registerFilter("platform_var", (value: string) => {
        return resolvePlatformVar(platform.id, value);
    });

    engine.registerFilter("indent", (_value: unknown, spaces: number) => {
        const value = String(_value ?? "");
        const pad = " ".repeat(spaces ?? 0);
        return value
            .split("\n")
            .map((line) => (line.length > 0 ? pad + line : line))
            .join("\n");
    });

    // -----------------------------------------------------------------------
    // Custom tags
    // -----------------------------------------------------------------------

    engine.registerTag("platform_switch", PlatformSwitchTag);

    return engine;
}

// ---------------------------------------------------------------------------
// Inline smoke test
// ---------------------------------------------------------------------------

if (import.meta.main) {
    const { getPlatform } = await import("./platforms/index.js");

    function assert(condition: boolean, message: string): void {
        if (!condition) throw new Error(`Assertion failed: ${message}`);
    }

    // -- Claude Code adapter -------------------------------------------------
    const cc = getPlatform("claude-code");
    const ccEngine = createEngine(cc, "/tmp/templates");

    const ccToolResult = await ccEngine.parseAndRender('{{ "Write" | tool_name }}');
    assert(ccToolResult === "Write", `CC tool_name: expected "Write", got "${ccToolResult}"`);

    const ccModelResult = await ccEngine.parseAndRender('{{ "opus" | model_name }}');
    assert(ccModelResult === "opus", `CC model_name: expected "opus", got "${ccModelResult}"`);

    const ccVarResult = await ccEngine.parseAndRender('{{ "CLAUDE_PLUGIN_ROOT" | platform_var }}');
    assert(
        ccVarResult === "${CLAUDE_PLUGIN_ROOT}",
        `CC platform_var: expected "\${CLAUDE_PLUGIN_ROOT}", got "${ccVarResult}"`,
    );

    // -- OpenCode adapter ----------------------------------------------------
    const oc = getPlatform("opencode");
    const ocEngine = createEngine(oc, "/tmp/templates");

    const ocToolResult = await ocEngine.parseAndRender('{{ "Write" | tool_name }}');
    assert(ocToolResult === "write", `OC tool_name: expected "write", got "${ocToolResult}"`);

    const ocModelResult = await ocEngine.parseAndRender('{{ "opus" | model_name }}');
    assert(ocModelResult === "claude-opus-4-6", `OC model_name: expected "claude-opus-4-6", got "${ocModelResult}"`);

    // -- indent filter -------------------------------------------------------
    const indentResult = await ccEngine.parseAndRender('{{ "line1\nline2\nline3" | indent: 4 }}');
    assert(indentResult === "    line1\n    line2\n    line3", `indent: unexpected result "${indentResult}"`);

    // -- platform_switch tag -------------------------------------------------
    const switchTemplate = [
        "{% platform_switch %}",
        '{% when "claude-code" %}CC block',
        '{% when "opencode" %}OC block',
        "{% else %}fallback block",
        "{% endplatform_switch %}",
    ].join("\n");

    const ccSwitchResult = await ccEngine.parseAndRender(switchTemplate);
    assert(ccSwitchResult.trim() === "CC block", `CC platform_switch: expected "CC block", got "${ccSwitchResult.trim()}"`);

    const ocSwitchResult = await ocEngine.parseAndRender(switchTemplate);
    assert(ocSwitchResult.trim() === "OC block", `OC platform_switch: expected "OC block", got "${ocSwitchResult.trim()}"`);

    // Fallback via generic adapter
    const gn = getPlatform("generic");
    const gnEngine = createEngine(gn, "/tmp/templates");
    const gnSwitchResult = await gnEngine.parseAndRender(switchTemplate);
    assert(
        gnSwitchResult.trim() === "fallback block",
        `generic platform_switch: expected "fallback block", got "${gnSwitchResult.trim()}"`,
    );

    // -- globals verification ------------------------------------------------
    const pluginRootResult = await ccEngine.parseAndRender("{{ plugin_root }}");
    assert(
        pluginRootResult === "${CLAUDE_PLUGIN_ROOT}",
        `CC plugin_root: expected "\${CLAUDE_PLUGIN_ROOT}", got "${pluginRootResult}"`,
    );

    const ocPluginRootResult = await ocEngine.parseAndRender("{{ plugin_root }}");
    assert(ocPluginRootResult === "", `OC plugin_root: expected "", got "${ocPluginRootResult}"`);

    console.log("Engine smoke test passed.");
}
