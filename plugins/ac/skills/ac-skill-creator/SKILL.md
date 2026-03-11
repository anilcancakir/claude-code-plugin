---
name: ac-skill-creator
description: Create Claude Code skills, agents, commands, and rules optimized for Claude models. This skill should be used when users want to create, update, or improve any Claude Code extension component (skills, agents, commands, rules, CLAUDE.md). Use it when creating prompt-based files for Claude Code, designing agent instructions, writing skill workflows, crafting rules, or optimizing existing prompts for token efficiency and effectiveness. Also use when the user mentions creating tools, workflows, plugins, or automations for Claude Code.
user-invocable: true
model: opus
---

# Skill Creator for Claude Code

A skill for creating high-quality Claude Code extension components: skills, agents, commands, and rules. Every component produced follows patterns extracted from Anthropic's official system prompt and 29+ official plugins.

## Core Process

**1. Classify Component Type**

Determine what the user wants to create:

| Type | Trigger | File Location | Format |
|------|---------|---------------|--------|
| **Skill** | "create a skill", reusable workflow | `skills/<name>/SKILL.md` | YAML frontmatter + markdown |
| **Agent** | "create an agent", specialized subagent | `agents/<name>.md` | YAML frontmatter + markdown |
| **Command** | "create a command", user slash command | `commands/<name>.md` | YAML frontmatter + markdown |
| **Rule** | "create a rule", path-scoped linting | `rules/<name>.md` | YAML frontmatter + markdown |

If ambiguous, use AskUserQuestion to clarify.

**2. Interview**

Gather requirements through focused questions. Limit to 3-4 AskUserQuestion calls maximum:

1. What should this component enable Claude to do?
2. When should it trigger? (user phrases, file patterns, contexts)
3. What tools does it need? (Read, Write, Edit, Bash, Agent, etc.)
4. What model suits best? (Haiku for fast/search, Sonnet for standard, Opus for complex/architecture)

Skip questions where the answer is obvious from context.

**3. Explore Existing Patterns**

Launch 1-2 Explore agents to find existing conventions in the target project:

- File structure and naming conventions
- Similar components already defined
- Technology stack and test patterns

**4. Draft the Component**

Write the component following the writing patterns defined below. Read `references/prompt-patterns.md` for the full pattern library before drafting.

**5. Review and Iterate**

Present the draft to the user. Apply feedback. Iterate until approved.

---

## Writing Patterns

### Frontmatter

Every component starts with YAML frontmatter:

```yaml
---
name: component-name
description: When to trigger, what it does. Be specific and slightly pushy to improve trigger accuracy.
# Optional fields:
user-invocable: true          # Skills/commands only
model: opus                   # haiku | sonnet | opus
allowed-tools:                # Restrict tool access
  - Read
  - Glob
  - Grep
---
```

**Description quality rules:**

- Include both WHAT it does AND WHEN to use it
- Add specific trigger phrases: "Use when the user mentions X, Y, or Z"
- Slightly pushy > too conservative (Claude undertriggers skills)
- Third-person for skills: "This skill should be used when..."

### Opening Sentence

Each component type uses a different opening pattern:

- **Agent**: Role definition, second person. "You are a senior software architect who delivers actionable blueprints."
- **Command**: Direct task. "You are helping a developer implement a new feature."
- **Skill**: Concept definition, third person. "A skill for creating high-quality skills optimized for Claude models."
- **Rule**: No opening. Start directly with bullet list.

### Section Headings

- **Agent**: Conceptual headings. `## Core Process`, `## Output Guidance`, `## Constraints`
- **Command**: Phase-based. `## Phase 1: Discovery`, `## Phase 2: Exploration`
- **Skill**: Topic-based. `## Overview`, `## When This Skill Applies`, `## Best Practices`
- **Rule**: No headings. Flat bullet list.

### Sentence Structure

- Use imperative mood: "Extract", "Launch", "Run", "Identify", "Verify"
- One sentence = one instruction
- Avoid: "Consider", "Try to", "You should", "You might want to", "Be careful with"
- Prefer: "Use", "Run", "Launch", "Extract", "Identify", "Verify", "Check", "Ensure"
- Keep sentences under 25 words
- Avoid passive voice: "Files are analyzed" → "Analyze files"

### Lists

- Numbered lists for sequential steps (commands)
- Bullet lists for rules/features/output (agents, skills, rules)
- Bold numbered sub-headings for process steps (agents): `**1. Analysis**`
- Maximum 1 level of nesting

### Bold Usage

Use bold for:

- Process step headings: `**1. Codebase Pattern Analysis**`
- Output component names: `- **Architecture Decision**: Chosen approach`
- Phase labels: `**Goal**: Understand what needs to be built`
- Principle names: `- **Explore before planning**: Use agents first`

Do not use bold for inline emphasis.

### Constraints and Priorities

- `CRITICAL:` — System breaks without this. Maximum 1-2 per file.
- `IMPORTANT:` — Core behavior rule.
- No marker — Normal instruction.
- `Prefer` — Suggested approach.

Explain the WHY behind constraints instead of heavy-handed MUSTs.

### Approval Gates

Insert gates before major actions:

```markdown
**DO NOT START WITHOUT USER APPROVAL**

**Actions**:
1. Wait for explicit user approval
2. Implement following chosen architecture
```

### Output Format

Define expected output for agents:

```markdown
## Output Guidance

Deliver a complete blueprint. Include:

- **Patterns Found**: Existing patterns with file:line references
- **Architecture Decision**: Chosen approach with rationale
- **Implementation Map**: Files to create/modify with descriptions
```

---

## Progressive Disclosure

Design skills with three-level loading:

1. **Metadata** (name + description) — Always in context (~100 words)
2. **SKILL.md body** — Loaded when skill triggers (<500 lines ideal)
3. **Bundled resources** — Loaded as needed (scripts/, references/, assets/)

Token efficiency rules:

- SKILL.md under 500 lines
- Move detailed docs to `references/`
- Move scripts to `scripts/`
- Reference files from SKILL.md with clear "read this when" guidance
- For large references (>300 lines), include a table of contents

---

## Component Size Guidelines

| Type | Target Length | Max |
|------|-------------|-----|
| Agent | 30-80 lines body | 150 lines |
| Command | 50-120 lines body | 200 lines |
| Skill | 100-300 lines body | 500 lines |
| Rule | 10-30 lines body | 50 lines |

---

## Read-Only Agent Pattern

For agents that advise but should not modify code:

```yaml
---
name: architect
model: opus
allowed-tools:
  - Read
  - Glob
  - Grep
  - Agent
---
```

Exclude Edit, Write, Bash, NotebookEdit from `allowed-tools`.

---

## Dynamic Context Pattern

Inject runtime state into skills:

```markdown
## Current State
`!git status --short`
`!git log --oneline -3`
```

Backtick-wrapped commands prefixed with `!` execute at skill load time.

---

## Model Routing

| Model | Use For | Cost |
|-------|---------|------|
| **Haiku** | Search, simple tasks, writing, exploration | Low |
| **Sonnet** | Standard execution, debugging, testing | Medium |
| **Opus** | Architecture, planning, deep review, complex analysis | High |

Default to Sonnet unless the task clearly needs Haiku speed or Opus depth.

---

## Quality Checklist

Before finalizing any component, verify:

1. Every sentence is an action? "Consider" → "Use", "Extract", "Run"
2. No unnecessary explanations? Tell what to do, not what concepts mean
3. No vague words? "good", "proper", "appropriate" → concrete rule
4. No repetition? Same instruction in different sections?
5. Output format defined? Agent knows what to return?
6. CRITICAL/IMPORTANT inflation? Maximum 1-2 per file
7. Nesting depth ≤ 1?
8. Sentences under 25 words?
9. No passive voice? "Files are analyzed" → "Analyze files"
10. No hardcoded values? Paths, model IDs, usernames → remove

CRITICAL: Run this checklist on every component before presenting to user.
