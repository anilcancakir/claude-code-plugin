/**
 * Claude Code passthrough adapter.
 * Output matches the original ac plugin exactly — no transformations applied.
 */

import { Scalar, stringify } from "yaml";
import type { ComponentMeta, ComponentType, PlatformAdapter, PlatformCapabilities } from "../types.js";

/**
 * Wraps string values that were originally quoted in the source YAML.
 * The `description` and `when_to_use` fields in ac plugin components
 * are always double-quoted. This ensures round-trip fidelity.
 */
const QUOTED_FIELDS = new Set(["description", "when_to_use", "argument-hint"]);

function preserveQuoting(fm: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fm)) {
        if (QUOTED_FIELDS.has(key) && typeof value === "string") {
            const scalar = new Scalar(value);
            scalar.type = "QUOTE_DOUBLE";
            result[key] = scalar;
        } else {
            result[key] = value;
        }
    }
    return result;
}

const capabilities: PlatformCapabilities = {
    hasAgents: true,
    hasCommands: true,
    hasSkills: true,
    hasMcp: true,
    hasLsp: true,
    hasHooks: true,
    hasFrontmatter: true,
};

export const claudeCodeAdapter: PlatformAdapter = {
    id: "claude-code",
    name: "Claude Code",
    capabilities,

    fileExtension(_componentType: ComponentType): string {
        return "md";
    },

    mapFrontmatter(fm: Record<string, unknown>, _componentType: ComponentType): Record<string, unknown> {
        return fm;
    },

    mapToolName(ccToolName: string): string {
        return ccToolName;
    },

    mapModelName(ccModel: string): string {
        return ccModel;
    },

    renderComponent(meta: ComponentMeta, renderedBody: string): string {
        const fm = meta.frontmatter;
        if (Object.keys(fm).length === 0) {
            return renderedBody;
        }
        const frontmatterBlock = stringify(preserveQuoting(fm), {
            lineWidth: 0,
        }).trimEnd();
        return `---\n${frontmatterBlock}\n---\n${renderedBody}`;
    },
};
