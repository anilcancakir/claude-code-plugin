---
description: Generate or enhance project-level CLAUDE.md — auto-discovers codebase, interviews developer, produces optimized context file
argument-hint: enhance (optional, to improve existing CLAUDE.md)
model: opus
---

# Init Project CLAUDE.md

You are generating a project-level `./CLAUDE.md` file for the active codebase. This file is injected into every Claude Code conversation as user-rules context.

## Core Principle

> **CLAUDE.md's job is project-level context, not rules management.**
>
> Rules belong in `.claude/rules/*.md` (path/topic-scoped, auto-injected). CLAUDE.md gives Claude the map — what the project is, how it builds, where things live, what's non-obvious. A developer's first-day briefing, not a policy manual.

## Token Budget

Target ≤2500 tokens (~100-120 lines). CLAUDE.md is injected into every conversation turn — every token costs every turn. Brevity is critical.

## Anti-Slop Filter

**NEVER include:**

- Obvious instructions ("write tests", "use descriptive names", "handle errors")
- Generic practices ("follow SOLID", "keep functions small", "use dependency injection")
- File listings easily discoverable via Glob/LS
- Setup/installation instructions — assume project already configured
- Verbose explanations — one line per concept
- Made-up sections ("Common Tasks", "Tips", "Support") not found in codebase
- **Anything already in global `~/.claude/CLAUDE.md`**: workflow protocol, tool names (TodoWrite, Agent, Explore), delegation rules, 3-strike rule, complexity classification, identity, tech stack, coding rules (TDD, linter). The project CLAUDE.md is ADDITIVE — project-specific facts only

---

## Phase 1: Discovery

**Goal**: Auto-discover project structure, commands, patterns, and existing context.

**Critical**: Use ac:explore agents for ALL codebase research. Do not Read, Glob, Grep, or Search directly — delegate to agents. Source code findings always take priority over documentation claims.

**Actions**:

1. Launch 3 ac:explore agents in a **single message** (parallel, multiple Agent tool calls):

   ac:explore 1 — **Commands + Build + Dev Tools**:
   "CONTEXT: Generating project CLAUDE.md. GOAL: Find all development commands AND dev tooling. REQUEST: Find package.json, composer.json, Makefile, Cargo.toml, pyproject.toml, Dockerfile. Extract build, test, lint, dev, format, deploy commands. Check CI configs (.github/workflows, .gitlab-ci.yml) for additional commands. Also detect: linter configs (.eslintrc, phpstan.neon, analysis_options.yaml, biome.json, .stylelintrc, pylintrc, .golangci.yml), formatter configs (.prettierrc, .editorconfig, rustfmt.toml), test runners (phpunit.xml, jest.config, vitest.config, pytest.ini). For each dev tool found: tool name, type (linter/formatter/test), command to run. Report as: commands table + dev tools table. PRIORITY: Actual scripts in config files over README claims."

   ac:explore 2 — **Architecture + Entry Points**:
   "CONTEXT: Generating project CLAUDE.md. GOAL: Map project structure for Claude Code context. REQUEST: Directory structure (depth 2, skip vendor/node_modules/dist). Entry points (main files, index files, bootstrap). Key config files (non-obvious ones only). Module boundaries and monorepo patterns. Report: annotated structure tree + key files with purpose."

   ac:explore 3 — **Context Docs + Code Patterns**:
   "CONTEXT: Generating project CLAUDE.md. GOAL: Extract conventions and anti-patterns. REQUEST: Read README.md, GEMINI.md, root AGENTS.md if they exist — extract conventions, architecture decisions, anti-patterns. Find linter/formatter configs and infer code style rules. Find DO NOT/NEVER/DEPRECATED/TODO comments in source. PRIORITY: Source code patterns over documentation claims. Report: conventions list + gotchas list."

2. While agents run, main session detects project config via Bash:

   ```bash
   ls -la CLAUDE.md .mcp.json 2>/dev/null
   find . -name "SKILL.md" -path "*/.claude/*" -maxdepth 4 2>/dev/null
   find . -name "*.md" -path "*/.claude/agents/*" -maxdepth 4 2>/dev/null
   cat .claude/settings.json 2>/dev/null | head -50
   cat .claude/settings.local.json 2>/dev/null | head -50
   ```

   - If `./CLAUDE.md` exists and `$ARGUMENTS` is not "enhance": announce "Found existing CLAUDE.md — I'll enhance it"
   - If `$ARGUMENTS` is "enhance": announce "Enhance mode — will improve existing CLAUDE.md"
   - If not exists: announce "Creating new CLAUDE.md"
   - Collect detected: skills list, MCP servers, custom agents
   - Collect existing hooks from settings.json (if any) — avoid duplicate proposals

3. Collect all agent results
4. Merge into discovery summary: commands table + architecture map + conventions + gotchas

---

## Phase 2: Interactive Interview

**Goal**: Validate discoveries, gather developer input, decide references.

**Actions**:

1. Present discovery summary to user:
   - Detected commands (table)
   - Architecture overview (compact tree)
   - Conventions found (from source + docs)
   - Gotchas/anti-patterns found
   - Skills, MCP servers, custom agents detected (if any)

2. Ask targeted questions via AskUserQuestion. Skip questions where data is sufficient:

   **Q1** (always): "Here's what I found. Corrections, additions, or anything I missed?"
   Options: "Looks good" / Free-text corrections

   **Q2** (if skills/MCP/agents detected): "Found these project extensions. Include references in CLAUDE.md?"
   multiSelect: list items with descriptions from frontmatter

   **Q3** (if no existing CLAUDE.md): "Any project-specific gotchas or conventions I should know?"
   Free-text. Examples: "never modify migrations directly", "feature branches only", "use backed enums"

   **Q4** (enhance mode only): "What to improve in current CLAUDE.md?"
   Options: "Auto-enhance with new findings" / "Specific areas: [free-text]" / "Full rewrite"

   **Q5** (if linters/formatters/test runners detected AND not already in settings.json hooks):
   "Found these dev tools. Set up auto-hooks in `.claude/settings.json`?"
   multiSelect: true. For each detected tool, propose:
   - Formatter → "Auto-format on write (PostToolUse)" — e.g. `dart format`, `prettier`
   - Linter → "Auto-lint on write (PostToolUse)" — e.g. `dart analyze`, `eslint`
   - Sensitive files (.env) → "Write guard for sensitive files (PreToolUse)"
   Pre-selected: formatter hooks (most useful). Skip this question if no tools detected or all already hooked.

---

## Phase 3: Synthesis

**Goal**: Transform raw findings into optimized CLAUDE.md content.

**Actions**:

1. Build sections from merged findings + interview answers
2. Apply anti-slop filter (see top of this file)
3. **Deduplication check**: Read `~/.claude/CLAUDE.md` if it exists. Remove any content that overlaps with global CLAUDE.md — the project file is ADDITIVE, not a replacement
4. Incorporate context files selectively:
   - README → non-obvious architecture info only
   - GEMINI.md / root AGENTS.md → conventions, anti-patterns, gotchas
   - Source code findings always override doc claims
5. Add user-approved references (skills, MCP servers)
6. Token budget check: ≤2500 tokens (~100-120 lines)
   - Over limit → trim least-critical sections
   - Defer detailed conventions to `.claude/rules/` and mention in output

---

## Phase 4: Generation

**Goal**: Produce the CLAUDE.md file content.

**Actions**:

1. Read the template at `${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/project-claude-md-template.md`
2. Generate following the template structure. Omit sections with no content:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `<command>` | <description> |

## Architecture

<high-level structure — annotated with non-obvious purpose only>

## Key Files

- `<path>` - <purpose>

## Code Style

- <project-specific imperative convention>

## Testing

- `<test command>` - <what it covers>
- <testing pattern or convention>

## Gotchas

- <non-obvious quirk or common mistake>
- <anti-pattern found in source>

## Skills & Extensions

- `<skill>` — <when to invoke>
- MCP: `<server>` — <capability>
```

1. Validate before presenting:
   - Every command is copy-paste executable
   - No section duplicates another
   - No generic advice leaked through anti-slop filter
   - Token count within budget

---

## Phase 4b: Hooks Generation (if approved in Q5)

**Goal**: Generate `.claude/settings.json` hooks from approved proposals.

**Skip entirely** if user declined Q5 or no dev tools detected.

### Hook JSON Structure

Every hook MUST follow this three-level nesting. Do NOT flatten or restructure:

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex string>",
        "hooks": [
          {
            "type": "command",
            "command": "<shell command>",
            "timeout": 10000
          }
        ]
      }
    ]
  }
}
```

Schema rules:

- `matcher` → **regex string** (e.g. `"Edit|Write"`, `"Bash"`, `"mcp__.*"`). NEVER an object.
- `hooks` → **array** of handler objects. Each handler has `type`, `command`, and optional `timeout`.
- `timeout` → lives **inside** the handler object, NOT at matcher group level.

### Actions

1. For each approved hook, use these templates:

   **Auto-format (PostToolUse, matcher: `"Edit|Write"`, timeout: 10000ms):**

   | Tool | Command |
   |------|---------|
   | dart format | `jq -r '.tool_response.filePath // .tool_input.file_path' \| grep '\.dart$' \| xargs dart format 2>/dev/null \|\| true` |
   | prettier | `jq -r '.tool_response.filePath // .tool_input.file_path' \| xargs prettier --write 2>/dev/null \|\| true` |
   | biome | `jq -r '.tool_response.filePath // .tool_input.file_path' \| xargs biome format --write 2>/dev/null \|\| true` |
   | gofmt | `jq -r '.tool_response.filePath // .tool_input.file_path' \| grep '\.go$' \| xargs gofmt -w 2>/dev/null \|\| true` |
   | rustfmt | `jq -r '.tool_response.filePath // .tool_input.file_path' \| grep '\.rs$' \| xargs rustfmt 2>/dev/null \|\| true` |
   | php-cs-fixer | `jq -r '.tool_response.filePath // .tool_input.file_path' \| grep '\.php$' \| xargs php-cs-fixer fix 2>/dev/null \|\| true` |

   **Auto-lint (PostToolUse, matcher: `"Edit|Write"`, timeout: 15000ms):**

   | Tool | Command |
   |------|---------|
   | dart analyze | `jq -r '.tool_response.filePath // .tool_input.file_path' \| grep '\.dart$' && dart analyze --no-fatal-infos \|\| true` |
   | eslint | `jq -r '.tool_response.filePath // .tool_input.file_path' \| grep -E '\.(ts\|js\|tsx\|jsx)$' \| xargs eslint --fix 2>/dev/null \|\| true` |
   | phpstan | `jq -r '.tool_response.filePath // .tool_input.file_path' \| grep '\.php$' && phpstan analyze --no-progress \|\| true` |

   **Write guard (PreToolUse, matcher: `"Write"`, timeout: 5000ms):**
   `jq -r '.tool_input.file_path' | grep -qE '(\.env|\.credentials|secrets)' && echo '{"continue":false,"stopReason":"Blocked: sensitive file"}' && exit 2 || true`

   **Concrete example** — dart format + dart analyze together:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Edit|Write",
           "hooks": [
             {
               "type": "command",
               "command": "jq -r '.tool_response.filePath // .tool_input.file_path' | grep '.dart$' | xargs dart format 2>/dev/null || true",
               "timeout": 10000
             },
             {
               "type": "command",
               "command": "jq -r '.tool_response.filePath // .tool_input.file_path' | grep '.dart$' && dart analyze --no-fatal-infos || true",
               "timeout": 15000
             }
           ]
         }
       ]
     }
   }
   ```

2. **Merge strategy** — CRITICAL:
   - Read existing `.claude/settings.json` first (detected in Phase 1)
   - If exists: merge new hooks into existing `hooks` object, preserve all other settings
   - If event already has hooks array: append matcher groups, don't replace
   - If doesn't exist: create `{ "hooks": { ... } }`
   - All commands end with `|| true` — hook failures must never block work

3. Prepare hooks preview for Phase 5

---

## Phase 5: Review & Install

**Goal**: Get user approval and write the file(s).

**CRITICAL**: Do not install without user approval.

**Actions**:

1. Present generated CLAUDE.md to user with metadata:
   - Token count / line count
   - Sections included
   - Sources used (which docs, which agents, interview answers)
2. If hooks were generated in Phase 4b, also present:
   - Hook count and types (format/lint/guard)
   - Target file: `.claude/settings.json`
   - Each hook: event, matcher, tool, one-line description
3. If enhance mode: show diff against existing CLAUDE.md
4. AskUserQuestion:
   - "Approve all" → write CLAUDE.md + merge hooks into settings.json
   - "Approve CLAUDE.md only" → write CLAUDE.md, skip hooks
   - "Adjust [detail]" → modify and re-present
   - "Restart" → return to Phase 2
5. On approval:
   - If existing `./CLAUDE.md`: backup first → `cp CLAUDE.md CLAUDE.md.bak`
   - Write new `./CLAUDE.md`
   - If hooks approved: merge into `.claude/settings.json` (read → merge → write)
6. Post-install message:
   - "CLAUDE.md installed — [N] tokens, [M] sections"
   - If hooks installed: "[K] hooks added to .claude/settings.json"
   - "This file is project-level context. For path-scoped rules, use `.claude/rules/`"
