/**
 * Antigravity platform adapter — placeholder.
 * All methods are identity transforms pending format specification.
 */

import type { ComponentMeta, ComponentType, PlatformAdapter, PlatformCapabilities } from "../types.js";

const capabilities: PlatformCapabilities = {
    // TODO: implement when format is known
    hasAgents: false,
    hasCommands: false,
    hasSkills: false,
    hasMcp: false,
    hasLsp: false,
    hasHooks: false,
    hasFrontmatter: false,
};

export const antigravityAdapter: PlatformAdapter = {
    id: "antigravity",
    name: "Antigravity",
    capabilities,

    fileExtension(_componentType: ComponentType): string {
        // TODO: implement when format is known
        return "md";
    },

    mapFrontmatter(
        fm: Record<string, unknown>,
        _componentType: ComponentType,
    ): Record<string, unknown> {
        // TODO: implement when format is known
        return fm;
    },

    mapToolName(ccToolName: string): string {
        // TODO: implement when format is known
        return ccToolName;
    },

    mapModelName(ccModel: string): string {
        // TODO: implement when format is known
        return ccModel;
    },

    renderComponent(meta: ComponentMeta, renderedBody: string): string {
        // TODO: implement when format is known
        return renderedBody;
    },
};
