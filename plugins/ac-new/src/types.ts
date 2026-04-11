/**
 * Core type system for the ac-new prompt rendering engine.
 * Defines contracts between engine, adapters, renderer, and CLI modules.
 */

// ---------------------------------------------------------------------------
// Primitive types
// ---------------------------------------------------------------------------

/** Supported component categories that can be rendered across platforms. */
export type ComponentType = "agent" | "command" | "skill" | "reference";

// ---------------------------------------------------------------------------
// Capability flags
// ---------------------------------------------------------------------------

/** Describes which prompt component features a target platform supports. */
export interface PlatformCapabilities {
    /** Platform supports agent definitions (subagents, workers). */
    hasAgents: boolean;
    /** Platform supports slash commands. */
    hasCommands: boolean;
    /** Platform supports skills / reusable workflow fragments. */
    hasSkills: boolean;
    /** Platform has an MCP (Model Context Protocol) integration layer. */
    hasMcp: boolean;
    /** Platform supports LSP plugin definitions. */
    hasLsp: boolean;
    /** Platform supports lifecycle hooks (pre/post tool use, session events). */
    hasHooks: boolean;
    /** Platform reads YAML frontmatter from prompt component files. */
    hasFrontmatter: boolean;
}

// ---------------------------------------------------------------------------
// Component data
// ---------------------------------------------------------------------------

/** Parsed representation of a single source prompt component. */
export interface ComponentMeta {
    /** Category of the component (agent, command, skill, or reference). */
    type: ComponentType;
    /** Raw frontmatter key-value pairs parsed from the source file. */
    frontmatter: Record<string, unknown>;
    /** Raw body text of the component, excluding frontmatter. */
    body: string;
    /** Absolute path to the source `.md` file on disk. */
    sourcePath: string;
}

// ---------------------------------------------------------------------------
// Render context
// ---------------------------------------------------------------------------

/** Full context passed into every Liquid template during rendering. */
export interface RenderContext {
    /** The target platform adapter driving this render pass. */
    platform: PlatformAdapter;
    /** Parsed component being rendered. */
    component: ComponentMeta;
    /** Global variables injected into all templates (e.g. plugin root, version). */
    globals: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Rendered output
// ---------------------------------------------------------------------------

/** A fully rendered component ready to be written to the output directory. */
export interface RenderedComponent {
    /** Final rendered text content for the output file. */
    content: string;
    /** Absolute path where the output file should be written. */
    outputPath: string;
    /** Source component metadata used to produce this output. */
    meta: ComponentMeta;
}

// ---------------------------------------------------------------------------
// Platform adapter
// ---------------------------------------------------------------------------

/**
 * Contract that every platform adapter must implement.
 * Adapters translate Claude Code-native prompt conventions into
 * the format expected by a specific target platform.
 */
export interface PlatformAdapter {
    /** Unique machine-readable identifier for this platform (e.g. `"claude-code"`). */
    id: string;
    /** Human-readable display name (e.g. `"Claude Code"`). */
    name: string;
    /** Feature flags describing what this platform supports. */
    capabilities: PlatformCapabilities;
    /**
     * Returns the output file extension for a given component type.
     * @param componentType - The category of the component being written.
     * @returns File extension string without leading dot (e.g. `"md"`).
     */
    fileExtension(componentType: ComponentType): string;
    /**
     * Transforms Claude Code frontmatter into the platform-native equivalent.
     * Keys and values may be renamed, removed, or added as required by the target.
     * @param fm - Raw frontmatter parsed from the source component.
     * @param componentType - Category of the component owning this frontmatter.
     * @returns Platform-specific frontmatter record.
     */
    mapFrontmatter(fm: Record<string, unknown>, componentType: ComponentType): Record<string, unknown>;
    /**
     * Translates a Claude Code tool name to the platform-native equivalent.
     * Returns the original name unchanged when no mapping is needed.
     * @param ccToolName - Tool name as used in Claude Code (e.g. `"Bash"`).
     * @returns Platform-specific tool name string.
     */
    mapToolName(ccToolName: string): string;
    /**
     * Translates a Claude Code model identifier to the platform-native equivalent.
     * Returns the original identifier unchanged when no mapping is needed.
     * @param ccModel - Model slug as used in Claude Code (e.g. `"claude-opus-4-5"`).
     * @returns Platform-specific model identifier string.
     */
    mapModelName(ccModel: string): string;
    /**
     * Assembles the final file content string for a rendered component.
     * Responsible for prepending frontmatter, wrapping body, or applying
     * any platform-specific file layout conventions.
     * @param meta - Component metadata (type, frontmatter, body, sourcePath).
     * @param renderedBody - Liquid-rendered body string ready for output.
     * @returns Complete file content string.
     */
    renderComponent(meta: ComponentMeta, renderedBody: string): string;
}
