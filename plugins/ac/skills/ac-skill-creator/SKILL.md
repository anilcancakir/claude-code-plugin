---
name: ac-skill-creator
description: "Create or improve Claude Code extension components — skills, agents, commands, rules, CLAUDE.md. Use when building or optimizing prompts for Claude Code."
when_to_use: "Use when the user wants to create, improve, or audit a Claude Code extension component — skills, agents, commands, rules, CLAUDE.md files. Trigger phrases: 'create a skill', 'create an agent', 'add a command', 'write a rule', 'build a plugin component', 'optimize my skill'."
user-invocable: true
---

# Skill Creator for Claude Code

Create high-quality Claude Code extension components: skills, agents, commands, and rules. Every component follows patterns from Anthropic's official plugins and Claude Code documentation.

## Core Process

**1. Classify Component Type**

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

**5. Wire References into SKILL.md**

CRITICAL: CC does NOT auto-load `references/` files. The model never sees them unless SKILL.md explicitly points to them. If the skill includes bundled resources:

1. Add inline "read this when" links at the point of use: `Read references/syntax.md for full YAML reference.`
2. Add a `## References` table at the end of SKILL.md listing all bundled files:

```markdown
## References

| Topic | File | When to read |
|-------|------|-------------|
| Syntax | [syntax.md](references/syntax.md) | When generating YAML files |
| Templates | [templates.md](references/templates.md) | After detecting project language |
```

3. Verify every file in `references/`, `scripts/`, `assets/` is reachable from SKILL.md — orphan files are invisible to the model.

**6. Review and Iterate**

Present the draft to the user. Apply feedback. Iterate until approved.

---

## Skill Frontmatter — Complete Schema

Every skill starts with YAML frontmatter. Only `description` is truly required — all others are optional.

```yaml
---
name: skill-name                    # Identifier. Defaults to directory name if omitted
description: "Short summary for skill listing (≤250 chars after truncation)"
when_to_use: "Detailed trigger conditions for auto-invocation. Use when user mentions X, asks about Y, or works with Z files. Also trigger when..."
user-invocable: true                # true (default) = appears in / menu. false = only Claude auto-invokes
disable-model-invocation: false     # true = only manual /name invocation, removed from Claude's context entirely
model: sonnet                       # haiku | sonnet | opus — preferred model tier
effort: medium                      # low | medium | high | max
allowed-tools:                      # Tool permission patterns (whitelist)
  - Read
  - Glob
  - Bash(gh:*)
context: inline                     # inline (default) or fork (isolated subagent)
agent: Explore                      # Subagent type when context: fork (Explore, general-purpose, or custom plugin agent name)
argument-hint: "[issue-number]"     # Hint shown in autocomplete
arguments:                          # Named argument list
  - issue_number
paths: "src/**/*.ts, lib/**/*.js"   # Glob patterns — skill activates only when working with matching files
shell: bash                         # bash (default) or powershell
hooks:                              # Skill-scoped hooks (fire during skill lifecycle)
  PostToolUse:
    - matcher: Edit
      command: "npm run lint"
version: 0.1.0                      # Semantic version (optional, used by ~47% of official plugins)
---
```

### Invocation Control Matrix

| Frontmatter | User can invoke | Claude can invoke | In system prompt listing |
|-------------|-----------------|-------------------|------------------------|
| (default) | Yes | Yes | Yes — description visible |
| `user-invocable: false` | No | Yes | No — hidden from listing |
| `disable-model-invocation: true` | Yes | No | No — completely hidden |

**Decision tree:**
- Internal workflow skills that Claude should NOT auto-discover (qa-patterns, browser-qa) → `user-invocable: false` (hidden from listing AND / menu)
- Manual-only tools (setup wizards, destructive operations) → `disable-model-invocation: true` (user-only, hidden from Claude's context)
- Everything else → defaults (both can invoke, description visible in listing)

### Description vs when_to_use

Two separate fields with different purposes:

| Field | Where it appears | Max length | Purpose |
|-------|-----------------|------------|---------|
| `description` | Skill listing in `<system-reminder>` | **250 chars hard cap** in listing (1024 max stored) | Short summary — front-load key use case |
| `when_to_use` | Extended context for model decision | No hard cap | Detailed trigger conditions, edge cases, counter-examples |

**Description rules:**
- Front-load the key use case — first 250 chars are all the model sees in the listing
- Third person: "Processes Excel files" not "I can help you process Excel files"
- Include both WHAT it does AND WHEN to use it
- Be slightly pushy — Claude undertriggers skills by default
- Long descriptions are truncated with `…` in the listing

**Four proven description patterns:**

Pattern A — Capability + Usage (simplest):
```
description: "Review changed code for reuse, quality, and efficiency, then fix any issues found."
```

Pattern B — When-to-use + Examples (most common):
```
description: "Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify keybindings.json. Examples: 'rebind ctrl+s', 'add a chord shortcut'."
```

Pattern C — Purpose + Auto-trigger Conditions:
```
description: "Build apps with the Claude API or Anthropic SDK."
when_to_use: "TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`, or user asks to use Claude API. DO NOT TRIGGER when: code imports `openai` or other AI SDK."
```

Pattern D — Capability + Trigger phrases in quotes (used by 8/15 official plugin skills):
```
description: "This skill should be used when the user asks to 'create a hook', 'add a PreToolUse hook', 'validate tool use', or mentions hook events and skill lifecycle automation."
```

### String Substitutions

Available variables in skill body (replaced at load time):

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed on invocation |
| `$arg_name` | Named argument (from `arguments:` list) |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's directory |

### Shell Injection (Dynamic Context)

Backtick-wrapped commands prefixed with `!` execute at skill load time — model sees only the output:

```markdown
## Current State
- Branch: !`git branch --show-current`
- Recent changes: !`git log --oneline -5`
- PR diff: !`gh pr diff`
```

Multi-line variant uses fenced block with `!`:
````markdown
```!
git status --short
git log --oneline -3
```
````

Disable via `"disableSkillShellExecution": true` in settings.

---

## Agent Frontmatter — Complete Schema

```yaml
---
name: agent-name
description: "What this agent specializes in. Use when..."
model: sonnet                       # haiku | sonnet | opus
effort: medium                      # low | medium | high | max
maxTurns: 20                        # Turn limit
tools:                              # Allowed tools (whitelist)
  - Read
  - Glob
  - Grep
disallowedTools:                    # Blocked tools (blacklist, defense-in-depth)
  - Write
  - Edit
skills:                             # Skills available to this agent
  - my-coding
memory: true                        # Agent can use memory
background: true                    # Can run in background
isolation: worktree                 # Run in git worktree (only valid value)
color: green                        # UI display color
---
```

**Skills use `allowed-tools` (whitelist). Agents use `disallowedTools` (blacklist).** Different component types, different semantics.

### Read-Only Agent Pattern

For agents that advise but must not modify code:

```yaml
---
name: code-reviewer
model: sonnet
disallowedTools:
  - Write
  - Edit
  - NotebookEdit
  - Bash
---
```

Plugin-shipped agents cannot use: `hooks`, `mcpServers`, `permissionMode` (security restriction).

---

## Command Frontmatter

```yaml
---
name: my-command
description: "What this command does"
argument-hint: "[feature description]"
model: sonnet
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Agent
user-invocable: true
---
```

Commands are always user-invocable. Use phase-based structure (`## Phase 1: Name`).

---

## Writing Patterns

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

Design skills with three-level loading. This is how CC actually works internally:

**Level 1 — Metadata** (always in system prompt, ~100 tokens per skill)
- Only `name` + `description` injected into `<system-reminder>` listing
- **Hard cap: 250 characters** per entry in the listing — front-load key use case
- Character budget scales at 1% of context window, 8000-char fallback
- This is ALL the model sees until it decides to invoke the skill

**Level 2 — SKILL.md body** (loaded on invocation, up to ~5k tokens)
- Full body injected when Claude invokes via Skill tool or user types `/name`
- Injected as: `### Skill: {name}\nPath: {path}\n\n{content}`
- On context compaction: truncated to 5,000 tokens with ellipsis
- Total invoked skills budget: 25,000 tokens
- **Target: <500 lines / <3k words**. Challenge every token — Claude already knows general concepts

**Level 3 — Bundled resources** (loaded on demand, unlimited size)
- `references/` — detailed docs, API refs, schemas
- `scripts/` — executable helpers (stdout consumed, source NOT loaded into context)
- `assets/` — HTML templates, static files
- **NOT auto-loaded** — model must explicitly Read them via filesystem
- **One level deep rule**: `SKILL.md → reference.md` works. `SKILL.md → advanced.md → details.md` breaks (CC may only `head -100` deeply nested files)

### Token Efficiency Rules

- SKILL.md body under 500 lines / 3k words
- Move detailed docs, API refs, schemas to `references/`
- Move executable logic to `scripts/` (executed, not loaded — only stdout consumes tokens)
- Reference files from SKILL.md with clear "read this when" guidance
- For references >100 lines, include a table of contents at the top
- Avoid time-sensitive information in SKILL.md body
- Use consistent terminology throughout

### Referencing Bundled Resources

Always point to supporting files explicitly with when-to-read guidance:

```markdown
For complete API details, see [reference.md](reference.md).
```

Table pattern (for 3+ reference files):

```markdown
## References

| Topic | File | When to read |
|-------|------|-------------|
| YAML syntax | [workflow-syntax.md](references/workflow-syntax.md) | When generating workflow files |
| Security | [security-patterns.md](references/security-patterns.md) | Every workflow — apply all patterns |
```

### Context: Fork Pattern

Run a skill in an isolated subagent — useful for contained, parallelizable work:

```yaml
---
name: pr-summary
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

Summarize this PR:
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
```

Use `context: fork` when: skill is self-contained, may run in parallel, or needs isolation from main conversation.

---

## Component Size Guidelines

| Type | Target Length | Max | Notes |
|------|-------------|-----|-------|
| Agent | 30-80 lines body | 150 lines | Role + process + output guidance |
| Command | 50-120 lines body | 200 lines | Phase-based, approval gates |
| Skill | 200-500 lines body | 500 lines | Move detail to references/ |
| Rule | 10-30 lines body | 50 lines | Flat bullet list, no headings |

Official Anthropic skills range 200-800 lines. If approaching 500, add hierarchy and split to references/.

---

## Model Routing

| Model | Use For | Cost |
|-------|---------|------|
| **Haiku** | Search, simple tasks, writing, exploration | Low |
| **Sonnet** | Standard execution, debugging, testing | Medium |
| **Opus** | Architecture, planning, deep review, complex analysis | High |

Default to Sonnet unless the task clearly needs Haiku speed or Opus depth.

---

## Bundled Resources Decision Tree

| Content Type | Location | When |
|--------------|----------|------|
| API reference, schemas, syntax docs | `references/*.md` | >100 lines of reference material |
| Code templates, boilerplate | `references/*.md` | Language-specific patterns |
| Executable helpers (linting, validation) | `scripts/*.py` or `scripts/*.sh` | Logic that runs, not loads |
| HTML templates, viewers, static files | `assets/*` | Visual output, eval viewers |
| Everything fits in SKILL.md | No subdirectory needed | <500 lines total |

---

## Quality Checklist

Before finalizing any component, verify:

**Structure**
1. YAML frontmatter valid? All fields from schema used correctly?
2. Description ≤250 chars (front-loaded key use case)?
3. `when_to_use` present for auto-triggered skills?
4. Component size within guidelines?

**Content**
5. Every sentence is an action? "Consider" → "Use", "Extract", "Run"
6. No unnecessary explanations? Tell what to do, not what concepts mean
7. No vague words? "good", "proper", "appropriate" → concrete rule
8. No repetition? Same instruction in different sections?
9. Output format defined? Agent knows what to return?

**Style**
10. CRITICAL/IMPORTANT inflation? Maximum 1-2 per file
11. Nesting depth ≤ 1?
12. Sentences under 25 words?
13. No passive voice? "Files are analyzed" → "Analyze files"
14. Imperative mood throughout? Not advisory ("you should")
15. No hardcoded values? Paths, model IDs, usernames → remove

**Progressive Disclosure**
16. SKILL.md body <500 lines?
17. References explicitly linked with "read this when" guidance?
18. References one level deep only? No `ref → ref → ref` chains?
19. Large references (>100 lines) have TOC?
20. Scripts in `scripts/`, not inline code blocks?

**Invocation**
21. `user-invocable` / `disable-model-invocation` set correctly per decision tree?
22. `paths` field used if skill is file-type specific?
23. `context: fork` considered for self-contained parallelizable skills?
24. `allowed-tools` minimal? Only tools the skill actually needs?

CRITICAL: Run this checklist on every component before presenting to user.
