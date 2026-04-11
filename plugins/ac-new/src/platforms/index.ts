/**
 * Platform adapter registry.
 * Central lookup for all registered platform adapters.
 */

import type { PlatformAdapter } from "../types.js";
import { antigravityAdapter } from "./antigravity.js";
import { claudeCodeAdapter } from "./claude-code.js";
import { genericAdapter } from "./generic.js";
import { opencodeAdapter } from "./opencode.js";

const REGISTRY: ReadonlyMap<string, PlatformAdapter> = new Map([
    [claudeCodeAdapter.id, claudeCodeAdapter],
    [opencodeAdapter.id, opencodeAdapter],
    [antigravityAdapter.id, antigravityAdapter],
    [genericAdapter.id, genericAdapter],
]);

/**
 * Returns the adapter registered under the given id.
 * @throws {Error} When no adapter is registered for `id`.
 */
export function getPlatform(id: string): PlatformAdapter {
    const adapter = REGISTRY.get(id);
    if (adapter === undefined) {
        const known = [...REGISTRY.keys()].join(", ");
        throw new Error(`Unknown platform "${id}". Known platforms: ${known}`);
    }
    return adapter;
}

/** Returns all registered platform adapters. */
export function getAllPlatforms(): PlatformAdapter[] {
    return [...REGISTRY.values()];
}

// ---------------------------------------------------------------------------
// Inline verification
// ---------------------------------------------------------------------------

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runVerification(): void {
    // claude-code: passthrough
    const cc = getPlatform("claude-code");
    assert(cc.fileExtension("agent") === "md", "claude-code fileExtension(agent) === md");
    assert(cc.fileExtension("skill") === "md", "claude-code fileExtension(skill) === md");
    assert(cc.mapToolName("Write") === "Write", "claude-code mapToolName passthrough");
    assert(cc.mapModelName("opus") === "opus", "claude-code mapModelName passthrough");
    const ccFm = { name: "test", model: "sonnet" };
    assert(
        JSON.stringify(cc.mapFrontmatter(ccFm, "agent")) === JSON.stringify(ccFm),
        "claude-code mapFrontmatter returns fm unchanged",
    );

    // opencode: mapped tool + model names, agent -> ts extension
    const oc = getPlatform("opencode");
    assert(oc.mapToolName("Write") === "write", "opencode mapToolName Write -> write");
    assert(oc.mapToolName("NotebookEdit") === "notebook_edit", "opencode mapToolName NotebookEdit -> notebook_edit");
    assert(oc.mapModelName("opus") === "claude-opus-4-6", "opencode mapModelName opus");
    assert(oc.mapModelName("sonnet") === "claude-sonnet-4-6", "opencode mapModelName sonnet");
    assert(oc.mapModelName("haiku") === "claude-haiku-4-5-20251001", "opencode mapModelName haiku");
    assert(oc.fileExtension("agent") === "ts", "opencode fileExtension(agent) === ts");
    assert(oc.fileExtension("skill") === "md", "opencode fileExtension(skill) === md");
    const ocFm = { name: "explore", description: "Codebase search", model: "haiku", color: "purple" };
    const ocMapped = oc.mapFrontmatter(ocFm, "skill");
    assert(ocMapped["name"] === "explore", "opencode skill frontmatter retains name");
    assert(ocMapped["description"] === "Codebase search", "opencode skill frontmatter retains description");
    assert(ocMapped["model"] === undefined, "opencode skill frontmatter drops model");
    const ocAgentFm = oc.mapFrontmatter(ocFm, "agent");
    assert(Object.keys(ocAgentFm).length === 0, "opencode agent frontmatter is empty");

    // opencode agent renderComponent produces TS factory
    const agentMeta = {
        type: "agent" as const,
        frontmatter: { description: "Searches the codebase" },
        body: "You are an explorer.",
        sourcePath: "/agents/plan-worker.liquid",
    };
    const agentOutput = oc.renderComponent(agentMeta, "You are an explorer.");
    assert(agentOutput.includes("export function createPlanWorkerAgent"), "opencode agent has factory fn");
    assert(agentOutput.includes("Searches the codebase"), "opencode agent includes description");
    assert(agentOutput.includes("import type { AgentConfig }"), "opencode agent has AgentConfig import");

    // antigravity: placeholder identity
    const ag = getPlatform("antigravity");
    assert(ag.mapToolName("Write") === "Write", "antigravity mapToolName identity");
    assert(ag.mapModelName("sonnet") === "sonnet", "antigravity mapModelName identity");
    assert(ag.capabilities.hasAgents === false, "antigravity capabilities all false");

    // generic: empty frontmatter, body only
    const gn = getPlatform("generic");
    const gnFm = gn.mapFrontmatter({ name: "test" }, "agent");
    assert(Object.keys(gnFm).length === 0, "generic mapFrontmatter returns empty");
    const gnMeta = {
        type: "agent" as const,
        frontmatter: { name: "test" },
        body: "Hello world.",
        sourcePath: "/agents/test.liquid",
    };
    const gnOutput = gn.renderComponent(gnMeta, "Hello world.");
    assert(gnOutput === "Hello world.", "generic renderComponent returns body only");

    // registry throws on unknown
    let threw = false;
    try {
        getPlatform("does-not-exist");
    } catch {
        threw = true;
    }
    assert(threw, "getPlatform throws on unknown id");

    // getAllPlatforms returns all 4
    assert(getAllPlatforms().length === 4, "getAllPlatforms returns 4 adapters");

    console.log("All platform adapter verifications passed.");
}

runVerification();
