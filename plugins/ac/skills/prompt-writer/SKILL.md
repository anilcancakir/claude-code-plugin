---
name: prompt-writer
description: "Write CC-optimal prompts for skills, agents, commands, and rules. Use when creating or improving any Claude Code extension component, or when writing prompts that need to align with how CC models process instructions."
when_to_use: "TRIGGER when: writing prompts for Claude Code components, creating skills/agents/commands/rules, optimizing existing component prompts. DO NOT TRIGGER: business logic, general coding, non-CC prompt work."
model: opus
effort: high
---

Write prompts optimized for Claude Code's model architecture. Every sentence earns its tokens — Claude already knows general concepts.

## Core Principles

**Progressive disclosure** drives all component design. CC loads content in three tiers:

1. **Metadata** (~100 tokens per skill in `<system-reminder>` listing) — description only, 250 char cap
2. **Body** (loaded on invocation, compacted to 5k tokens) — SKILL.md content
3. **References** (loaded on demand, unlimited) — `references/` files read explicitly

Total invoked skills budget: 25k tokens. Challenge every token.

**Dedup awareness** — CC auto-injects identity, safety rules, tool schemas, permission system, CLAUDE.md cascade, memory instructions, and output formatting. Components must NOT repeat these. Read `references/cc-dedup-guide.md` for the complete dedup reference before drafting.

**Golden rule**: Infrastructure instructions = CC provides. Business logic = your component.

**Token budget targets**:

| Level | Budget |
|-------|--------|
| Skill listing description | 250 chars hard cap |
| SKILL.md body | <500 lines, compacted to 5k tokens |
| Total invoked skills | 25k tokens |
| Agent body | 40-80 lines, max 120 |
| Command body | 50-200 lines |
| Rule body | 10-40 lines |

## Sentence Structure

Use imperative mood: "Extract", "Launch", "Run", "Identify", "Verify".

One sentence = one instruction. Keep under 25 words.

Active voice: "Analyze files" not "Files are analyzed".

Replace vague words with concrete rules:

| Vague | Concrete |
|-------|----------|
| "good code" | "typed, tested, lint-clean" |
| "proper error handling" | "catch at boundary, rethrow typed" |
| "appropriate naming" | "camelCase methods, PascalCase classes" |
| "consider performance" | "lazy-load collections over 100 items" |

Avoid hedging: "Consider", "Try to", "You should", "You might want to", "Be careful with". These waste tokens and weaken instructions.

## Section Patterns

Each component type follows a distinct structural pattern. Read `references/writing-patterns.md` for complete templates with examples.

### Agent (kodizm 5-section format)

1. **Identity** (1-2 sentences) — role + core mission
2. **Execution** (numbered steps) — the work process
3. **Output Format** (structured template) — exact output contract
4. **Failure Conditions** (FAILED if:) — clear failure contract
5. **Constraints** (hard boundaries) — read-only, scope, evidence

Size: 40-80 lines body, max 120. Overflow to `references/`.

### Command (phase-based)

Opening: direct task statement.

```
## Phase N: Name
**Goal**: One-line objective
**Actions**:
1. Step one
2. Step two
```

Insert approval gates before destructive actions: `**DO NOT START WITHOUT USER APPROVAL**`

Size: 50-200 lines body.

### Skill (topic-based)

Opening: concept definition, third person.

Sections: `## Overview`, domain-specific topics, `## References` table at end.

References NOT auto-loaded — link with "read this when" guidance.

Size: 200-500 lines body. Detail moves to `references/`.

### Rule (flat bullets)

No opening sentence. No headings. Path glob in frontmatter.

Flat bullet list of imperative conventions. 10-40 lines.

Never duplicate CLAUDE.md or `my-coding` skill content.

## Opening Sentences

The first sentence anchors the model's behavior for the entire component.

**Agent**: Role definition, second person. Declare what the agent IS and what it DELIVERS.
- "You are a senior software architect who delivers actionable blueprints."
- "Codebase search specialist. Find files, patterns, and relationships."

**Command**: Direct task statement. Frame the collaboration.
- "You are helping a developer implement a new feature."
- "Generate a comprehensive project CLAUDE.md from codebase analysis."

**Skill**: Concept definition, third person. State what this skill DOES.
- "Write CC-optimal prompts for skills, agents, commands, and rules."
- "Create high-quality Claude Code extension components."

**Rule**: No opening. Start directly with the first bullet.

## Constraint Hierarchy

Four priority levels signal instruction weight to the model:

- `CRITICAL:` — System breaks without this. Max 1-2 per entire file. Reserve for invariants.
- `IMPORTANT:` — Core behavior rule. Use sparingly — 3-5 per file maximum.
- No marker — Normal instruction. The default for most content.
- `Prefer` — Suggested approach, acceptable to deviate from.

Always explain WHY behind constraints. "CRITICAL: Do not write to files — this agent's analysis feeds into a review pipeline that assumes read-only" beats "CRITICAL: Do not write to files."

CRITICAL/IMPORTANT inflation destroys signal. If everything is critical, nothing is.

## Bold Usage

Bold marks structural anchors — not emphasis.

Use bold for:
- Process step headings: `**1. Analysis**`
- Output component names: `**Architecture Decision**:`
- Phase labels: `**Goal**:`
- Principle names: `**Explore before planning**:`

Do NOT bold inline words for emphasis. Italics and bold-for-emphasis add noise.

## List Patterns

- Numbered lists for sequential steps (commands, execution sections)
- Bullet lists for rules, features, output sections (agents, skills, rules)
- Bold numbered sub-headings for agent process steps: `**1. Analysis**`
- Maximum 1 level of nesting — flatten deeper structures into separate sections
- Multi-line + trailing commas in code examples

Tables beat nested lists for structured comparisons. Use tables when content has 2+ attributes per item.

## Quality Checklist

Run before finalizing any component:

1. Every sentence an action verb? No "consider", "try to", passive voice?
2. No CC auto-injected content repeated? (identity, tools, permissions, CLAUDE.md)
3. Description 250 chars, front-loaded with key use case?
4. Output format defined? (agents — exact template; commands — phase structure)
5. Failure conditions defined? (agents — FAILED if: list)
6. Component size within limits? (agent 120, command 200, skill 500, rule 40)
7. References linked with "read this when" guidance? One level deep?
8. No hardcoded paths, usernames, or model IDs?
9. CRITICAL/IMPORTANT inflation avoided? (max 1-2 CRITICAL, 3-5 IMPORTANT per file)
10. Nesting depth max 1 level? Sentences under 25 words?

## References

| Topic | File | When to read |
|-------|------|--------------|
| CC deduplication | [cc-dedup-guide.md](references/cc-dedup-guide.md) | Before drafting any component — know what CC already provides |
| Frontmatter schemas | [frontmatter-schemas.md](references/frontmatter-schemas.md) | When writing YAML frontmatter for any component type |
| Writing patterns | [writing-patterns.md](references/writing-patterns.md) | When structuring component body — templates and anti-patterns |
