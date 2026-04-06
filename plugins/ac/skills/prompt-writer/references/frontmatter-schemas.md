# Frontmatter Schemas

Complete YAML frontmatter field reference for all Claude Code component types. Consult when writing or reviewing frontmatter for any component.

## Contents

- [Skill Frontmatter](#skill-frontmatter)
- [Invocation Control Matrix](#invocation-control-matrix)
- [Agent Frontmatter](#agent-frontmatter)
- [Command Frontmatter](#command-frontmatter)
- [Rule Frontmatter](#rule-frontmatter)
- [Description Patterns](#description-patterns)

---

## Skill Frontmatter

```yaml
---
name: skill-name                    # Identifier. Defaults to directory name if omitted
description: "Short summary"        # 250 char hard cap in listing, 1024 max stored
when_to_use: "Detailed triggers"    # Extended trigger conditions for auto-invocation
user-invocable: true                # true (default) = in / menu. false = Claude-only
disable-model-invocation: false     # true = manual /name only, hidden from Claude
model: sonnet                       # haiku | sonnet | opus
effort: medium                      # low | medium | high | max
allowed-tools:                      # Whitelist — skills use allowlist
  - Read
  - Glob
  - Bash(gh:*)                      # Pattern matching supported
context: inline                     # inline (default) or fork (isolated subagent)
agent: Explore                      # Subagent type when context: fork
argument-hint: "[issue-number]"     # Hint shown in autocomplete
arguments:                          # Named argument list
  - issue_number
paths: "src/**/*.ts, lib/**/*.js"   # Glob — skill activates for matching files only
shell: bash                         # bash (default) or powershell
hooks:                              # Skill-scoped hooks
  PostToolUse:
    - matcher: Edit
      command: "npm run lint"
version: 0.1.0                      # Optional semantic version
---
```

### String Substitutions

Variables replaced at skill load time:

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed on invocation |
| `$arg_name` | Named argument from `arguments:` list |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's directory |

### Shell Injection

Backtick-wrapped commands with `!` prefix execute at load time — model sees only output:

```markdown
- Branch: !`git branch --show-current`
- Recent changes: !`git log --oneline -5`
```

Multi-line variant:
````markdown
```!
git status --short
git log --oneline -3
```
````

Disable via `"disableSkillShellExecution": true` in settings.

### Tool Control

Skills use `allowed-tools` (whitelist). List only tools the skill actually needs.

Pattern matching: `Bash(gh:*)` allows only `gh` commands. `Bash(npm:*)` allows only `npm`.

Omit `allowed-tools` entirely for unrestricted access (default).

---

## Invocation Control Matrix

| Frontmatter | User can invoke | Claude can invoke | In listing |
|-------------|-----------------|-------------------|------------|
| (default) | Yes | Yes | Yes |
| `user-invocable: false` | No | Yes | No |
| `disable-model-invocation: true` | Yes | No | No |

**Decision tree:**
- Internal workflow skills (qa-patterns, browser-qa) -> `user-invocable: false`
- Manual-only tools (setup wizards, destructive ops) -> `disable-model-invocation: true`
- Everything else -> defaults (both can invoke)

---

## Agent Frontmatter

```yaml
---
name: agent-name
description: "What this agent specializes in"
model: sonnet                       # haiku | sonnet | opus
effort: medium                      # low | medium | high | max
disallowedTools:                    # Denylist — agents use denylist
  - Write
  - Edit
  - NotebookEdit
maxTurns: 20                        # Turn limit (search agents only)
color: green                        # UI display color
skills:                             # Skills available to this agent
  - my-coding
memory: true                        # Agent can use memory
background: true                    # Can run in background
isolation: worktree                 # Run in git worktree
---
```

### Tool Control

Agents use `disallowedTools` (denylist) — NOT `allowed-tools`.

Exception: strict tool-locked agents (e.g., linter) may use `tools:` allowlist for intentional lockdown.

`disallowedTools` auto-includes MCP tools without explicit allowlisting.

**Advisory agents** (read-only): `disallowedTools: Write, Edit, NotebookEdit`

**Execution agents** (write access): `disallowedTools: NotebookEdit` (minimum)

### MCP Tool Format

MCP tools follow `mcp__server__tool` naming. Denylist auto-blocks MCP unless explicitly allowed.

### Restricted Fields

Plugin-shipped agents cannot use: `hooks`, `mcpServers`, `permissionMode` (security restriction).

### maxTurns Guidance

Set `maxTurns` only for search agents with runaway risk (explore: 20, librarian: 30, linter: 10). Execution and verification agents have no turn limit — they must complete all work.

---

## Command Frontmatter

```yaml
---
name: my-command
description: "What this command does"
argument-hint: "[feature description]"
model: sonnet                       # Optional — commands can specify model
effort: medium                      # low | medium | high | max
allowed-tools:                      # Whitelist — commands use allowlist
  - Read
  - Write
  - Edit
  - Bash
  - Agent
  - Glob
  - Grep
user-invocable: true                # Commands are always user-invocable
---
```

### Template Paths

Use `${CLAUDE_PLUGIN_ROOT}` for paths to templates and resources within the plugin directory.

### Tool Control

Commands use `allowed-tools` (whitelist) — same as skills, different from agents.

---

## Rule Frontmatter

```yaml
---
path: "lib/**/*.dart"               # Glob pattern — only meaningful field
description: "Optional description"  # Informational only
---
```

Rules support ONLY `path` and `description`. No model, tools, user-invocable, context, or agent fields.

Rules are flat bullet lists scoped to file paths. No headings, no opening sentence.

---

## Description Patterns

Four proven patterns from official plugins:

### Pattern A: Capability + Usage

Simplest. For single-purpose skills with obvious trigger context.

```yaml
description: "Review changed code for reuse, quality, and efficiency, then fix any issues found."
```

### Pattern B: When-to-use + Examples

Most common. For skills needing explicit trigger phrases.

```yaml
description: "Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify keybindings.json. Examples: 'rebind ctrl+s', 'add a chord shortcut'."
```

### Pattern C: Purpose + TRIGGER/DO NOT TRIGGER

For auto-invoked skills with clear positive and negative triggers.

```yaml
description: "Build apps with the Claude API or Anthropic SDK."
when_to_use: "TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`. DO NOT TRIGGER when: code imports `openai`/other AI SDK."
```

### Pattern D: Capability + Trigger phrases in quotes

Used by 8/15 official plugin skills. Domain-specific phrase matching.

```yaml
description: "This skill should be used when the user asks to 'create a hook', 'add a PreToolUse hook', or mentions hook events and skill lifecycle automation."
```

### Description Rules

- Front-load key use case — first 250 chars are all the model sees in listing
- Third person: "Processes files" not "I process files"
- Include WHAT it does AND WHEN to use it
- Be slightly pushy — Claude undertriggers skills by default
- Never start with "Teaches" or "Provides" — use action verbs
