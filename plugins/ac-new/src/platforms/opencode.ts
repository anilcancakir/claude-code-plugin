/**
 * OpenCode platform adapter.
 * Maps Claude Code conventions to OpenCode format — agents become TS factory functions,
 * skills retain name + description frontmatter only.
 */

import { stringify } from "yaml";
import type { ComponentMeta, ComponentType, PlatformAdapter, PlatformCapabilities } from "../types.js";

const capabilities: PlatformCapabilities = {
    hasAgents: true,
    hasCommands: false,
    hasSkills: true,
    hasMcp: true,
    hasLsp: false,
    hasHooks: false,
    hasFrontmatter: true,
};

/** Maps Claude Code PascalCase tool names to OpenCode lowercase equivalents. */
const TOOL_MAP: Record<string, string> = {
    Write: "write",
    Edit: "edit",
    Bash: "bash",
    Read: "read",
    Grep: "grep",
    Glob: "glob",
    NotebookEdit: "notebook_edit",
    Agent: "agent",
};

/** Maps Claude Code model slugs to OpenCode model identifiers. */
const MODEL_MAP: Record<string, string> = {
    haiku: "claude-haiku-4-5-20251001",
    sonnet: "claude-sonnet-4-6",
    opus: "claude-opus-4-6",
};

/**
 * Derives a PascalCase component name from a source file path.
 * e.g. "explore.liquid" -> "Explore", "plan-worker.liquid" -> "PlanWorker"
 */
function nameFromSourcePath(sourcePath: string): string {
    const filename = sourcePath.split("/").pop() ?? sourcePath;
    const base = filename.replace(/\.[^.]+$/, "");
    return base
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}

export const opencodeAdapter: PlatformAdapter = {
    id: "opencode",
    name: "OpenCode",
    capabilities,

    fileExtension(componentType: ComponentType): string {
        return componentType === "agent" ? "ts" : "md";
    },

    mapFrontmatter(fm: Record<string, unknown>, componentType: ComponentType): Record<string, unknown> {
        if (componentType === "agent") {
            // TS factory function handles all agent metadata — no frontmatter block needed.
            return {};
        }
        if (componentType === "skill") {
            const mapped: Record<string, unknown> = {};
            if (fm["name"] !== undefined) mapped["name"] = fm["name"];
            if (fm["description"] !== undefined) mapped["description"] = fm["description"];
            return mapped;
        }
        return fm;
    },

    mapToolName(ccToolName: string): string {
        return TOOL_MAP[ccToolName] ?? ccToolName;
    },

    mapModelName(ccModel: string): string {
        return MODEL_MAP[ccModel] ?? ccModel;
    },

    renderComponent(meta: ComponentMeta, renderedBody: string): string {
        if (meta.type === "agent") {
            const agentName = nameFromSourcePath(meta.sourcePath);
            const description = String(meta.frontmatter["description"] ?? "");

            // Escape backticks in the rendered body so they don't break the template literal.
            const escapedBody = renderedBody.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

            return [
                `import type { AgentConfig } from '@opencode-ai/sdk'`,
                ``,
                `export function create${agentName}Agent(model: string): AgentConfig {`,
                `  return {`,
                `    description: "${description}",`,
                `    mode: "subagent",`,
                `    model,`,
                `    prompt: \`${escapedBody}\`,`,
                `  }`,
                `}`,
            ].join("\n");
        }

        // Skills and other component types: YAML frontmatter + body.
        const fm = meta.frontmatter;
        if (Object.keys(fm).length === 0) {
            return renderedBody;
        }
        const frontmatterBlock = stringify(fm).trimEnd();
        return `---\n${frontmatterBlock}\n---\n${renderedBody}`;
    },
};
