---
name: agent-creator
description: "Create Claude Code agents with optimal structure and output contracts. Use when building subagents, advisory agents, or execution workers for Claude Code plugins."
when_to_use: "TRIGGER when: 'create an agent', 'add a subagent', 'new agent for', building Claude Code plugin agents. DO NOT TRIGGER: creating skills, commands, or rules."
effort: high
---

Create Claude Code agents that follow the kodizm 5-section format — Identity, Execution, Output Format, Failure Conditions, Constraints — producing concise, CC-optimized agent definitions.

## Core Process

### 1. Classify Agent Type

Determine the agent's role before drafting:

| Type | Posture | Key Traits |
|------|---------|------------|
| **Advisory** | Read-only (declared in Constraints) | Analyzes, reports findings, never writes |
| **Execution** | Write access | Implements changes, runs tests, verifies own work |
| **Search** | Read-only + `maxTurns` cap | Fast lookup, bounded turns, structured references |

If the agent's purpose spans types, default to the more restrictive — advisory over execution. Execution agents must justify write access in their Identity.

### 2. Research Existing Agents

Use Glob + Read directly to find similar agents in the target project:

- Glob `**/agents/*.md` under the plugin root, scan frontmatter `description` for overlapping responsibilities
- Read 2-3 closest matches to absorb naming, structure, and style
- Check for naming conflicts — agent names must be unique within the plugin

### 3. Dedup Audit

Before drafting, identify what CC already provides so the agent does not repeat it:

- CC auto-injects: identity preamble, tool schemas, permissions, CLAUDE.md
- CLAUDE.md provides: project architecture, conventions, stack info
- Parent prompt provides: task briefing, specific context for this invocation

Read `${CLAUDE_SKILL_DIR}/../prompt-writer/references/cc-dedup-guide.md` for the full dedup checklist. Strip anything CC or CLAUDE.md already covers — every repeated token wastes context budget.

### 4. Draft Agent

Follow the kodizm 5-section format from `references/agent-patterns.md`. Read it before drafting any agent.

**Section targets:**

| Section | Lines | Purpose |
|---------|-------|---------|
| Identity | 1-3 | Role + mission in imperative form |
| Execution | 10-30 | Numbered steps or strategy |
| Output Format | 5-15 | Structured markdown template |
| Failure Conditions | 3-8 | "FAILED if:" checklist |
| Constraints | 2-5 | Scope, style, hard limits, read-only posture if applicable |

**Body size enforcement:**
- Target: 40-80 lines
- Hard max: 120 lines
- Exceeding 120 → move templates, examples, or reference material to `references/`
- Each section should be 5-20 lines — if a section exceeds 20, compress or extract

### 5. Frontmatter Validation

Verify all required fields before finalizing. Read `${CLAUDE_SKILL_DIR}/../prompt-writer/references/frontmatter-schemas.md` for the complete schema.

**Required fields:**

| Field | Format | Notes |
|-------|--------|-------|
| `name` | kebab-case | Unique within plugin |
| `description` | ≤250 chars | Front-load key use case, "slightly pushy" |
| `effort` | low/medium/high | Match task complexity |
| `color` | green/yellow/red/blue/cyan | See Color Guide in references |

**Conditional fields:**

| Field | When |
|-------|------|
| `maxTurns` | Search agents only (10-30 range) |
| `skills` | Agent needs specific skill access |
| `memory` | Agent uses persistent memory |
| `isolation: worktree` | Agent needs isolated git worktree |

**Ineffective — do not declare**: `model`, `allowed-tools`, `disallowedTools`, `tools`. CC ignores these for plugin-shipped agents. Tool access comes from session permissions; read-only posture is declared in the Constraints section of the body.

### 6. Review

Present draft to user. Verify before finalizing:

- Output format defined with concrete template?
- Failure conditions present and specific?
- Constraints clear — scope, style, hard limits, read-only declaration if advisory?
- No CC-auto-injected content repeated (identity preamble, tool lists, CLAUDE.md content)?
- Description ≤250 chars and front-loaded?
- Body within 40-120 line target?
- No ineffective frontmatter (`model`, `allowed-tools`, `disallowedTools`, `tools`)?

---

## Posture Enforcement

Since tool restrictions cannot be declared in frontmatter, the agent body must state its posture:

**Advisory (read-only)** — add to Constraints section:
```markdown
## Constraints

Read-only. No file writes. Report findings only.
```

**Execution (writes)** — add to Constraints section:
```markdown
## Constraints

Only modify listed files. Match existing style. Verify with tests after changes.
```

**Search (bounded)** — add to Constraints section plus `maxTurns` in frontmatter:
```markdown
## Constraints

Read-only. Stop when sufficient. Max 3 search rounds for quick, 5 for thorough.
```

---

## Plugin Restrictions

Plugin-shipped agents cannot use: `hooks`, `mcpServers`, `permissionMode` in frontmatter (security restriction — enforced by CC at load time).

---

## Size Enforcement

| Metric | Target | Hard Max |
|--------|--------|----------|
| Body lines | 40-80 | 120 |
| Per section | 5-20 lines | — |
| Description | — | 250 chars |

If exceeding 120 lines:
1. Move output format templates to `references/`
2. Move detailed examples to `references/`
3. Compress execution steps — combine related steps
4. Remove explanations CC already knows (general coding, tool usage)

If a section exceeds 20 lines, it likely contains reference material that belongs in `references/`.

---

## References

| Topic | File | When to read |
|-------|------|-------------|
| Agent patterns | [agent-patterns.md](references/agent-patterns.md) | Before drafting any agent — templates for advisory, execution, search |
| CC dedup guide | [cc-dedup-guide.md](${CLAUDE_SKILL_DIR}/../prompt-writer/references/cc-dedup-guide.md) | During dedup audit (step 3) — full checklist of what CC auto-injects |
| Frontmatter schemas | [frontmatter-schemas.md](${CLAUDE_SKILL_DIR}/../prompt-writer/references/frontmatter-schemas.md) | During frontmatter validation (step 5) — complete field reference |
