/**
 * Generic platform adapter.
 * Produces clean markdown output with no frontmatter — body only.
 */

import type { ComponentMeta, ComponentType, PlatformAdapter, PlatformCapabilities } from "../types.js";

const capabilities: PlatformCapabilities = {
    hasAgents: false,
    hasCommands: false,
    hasSkills: false,
    hasMcp: false,
    hasLsp: false,
    hasHooks: false,
    hasFrontmatter: false,
};

export const genericAdapter: PlatformAdapter = {
    id: "generic",
    name: "Generic",
    capabilities,

    fileExtension(_componentType: ComponentType): string {
        return "md";
    },

    mapFrontmatter(
        _fm: Record<string, unknown>,
        _componentType: ComponentType,
    ): Record<string, unknown> {
        return {};
    },

    mapToolName(ccToolName: string): string {
        return ccToolName;
    },

    mapModelName(ccModel: string): string {
        return ccModel;
    },

    renderComponent(_meta: ComponentMeta, renderedBody: string): string {
        return renderedBody;
    },
};
