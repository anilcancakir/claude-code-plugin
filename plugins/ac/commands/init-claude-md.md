---
description: Generate or enhance project-level CLAUDE.md — auto-discovers codebase, interviews developer, produces optimized context file. Re-run after project changes to update commands, architecture, and extensions while preserving custom sections.
argument-hint: update or enhance (optional)
model: opus
---

# Init Project CLAUDE.md

You are generating a project-level `./CLAUDE.md` file for the active codebase. This file is injected into every Claude Code conversation as user-rules context.

## Core Principle

> **CLAUDE.md's job is project-level context, not rules management.**
>
> Rules belong in `.claude/rules/*.md` (path/topic-scoped, auto-injected). CLAUDE.md gives Claude the map — what the project is, how it builds, where things live, what's non-obvious. A developer's first-day briefing, not a policy manual.

## Scope Constraint

**Do NOT create `.claude/rules/` files.** This command produces ONLY `./CLAUDE.md` and optionally `.claude/settings.json` hooks. If conventions are discovered that belong in path-scoped rules, mention them in the output and suggest: "Run `/ac:init-rules` to generate path-scoped rules for these conventions." Never create rule files yourself.

## Section Ownership

| Type | Sections | Update Behavior |
|------|----------|----------------|
| **Auto-detected** | Commands, Architecture, Key Files, Testing, Skills & Extensions | Re-discovered and updated on every run |
| **User-managed** | Mission/description, Code Style (custom conventions), Gotchas (manually added) | Preserved across updates, merged with new findings |

On **update** mode: re-run discovery agents, update auto-detected sections, preserve user-managed sections, skip interview. On **enhance** mode: full discovery + interview, pre-fill from existing content.

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

0. **Agent model override**: Before launching research agents, check `~/.claude/settings.json` for `env` overrides:
   - `EXPLORE_MODEL`: Override explore agent model (default: haiku if unset)
   If a value is set, add `model: "[value]"` to each ac:explore Agent() call. If unset, omit the model parameter — the agent's frontmatter default applies.

1. Launch 3 ac:explore agents in a **single message** (parallel, multiple Agent tool calls):

   ac:explore 1 — **Commands + Build + Dev Tools**:
   "CONTEXT: Generating project CLAUDE.md. GOAL: Find all development commands AND dev tooling. REQUEST: Find package.json, composer.json, Makefile, Cargo.toml, pyproject.toml, Dockerfile. Extract build, test, lint, dev, format, deploy commands. Check CI configs (.github/workflows, .gitlab-ci.yml) for additional commands. Also detect: linter configs (.eslintrc, phpstan.neon, analysis_options.yaml, biome.json, .stylelintrc, pylintrc, .golangci.yml), formatter configs (.prettierrc, .editorconfig, rustfmt.toml), test runners (phpunit.xml, jest.config, vitest.config, pytest.ini). For each dev tool found: tool name, type (linter/formatter/test), command to run. Report as: commands table + dev tools table. PRIORITY: Actual scripts in config files over README claims."

   ac:explore 2 — **Architecture + Entry Points**:
   "CONTEXT: Generating project CLAUDE.md. GOAL: Map project structure for Claude Code context. REQUEST: Directory structure (depth 2, skip vendor/node_modules/dist). Entry points (main files, index files, bootstrap). Key config files (non-obvious ones only). Module boundaries and monorepo patterns. Report: annotated structure tree + key files with purpose."

   ac:explore 3 — **Context Docs + Code Patterns**:
   "CONTEXT: Generating project CLAUDE.md. GOAL: Extract conventions and anti-patterns. REQUEST: Read README.md, GEMINI.md, root AGENTS.md if they exist — extract conventions, architecture decisions, anti-patterns. Find linter/formatter configs and infer code style rules. Find DO NOT/NEVER/DEPRECATED/TODO comments in source. PRIORITY: Source code patterns over documentation claims. Report: conventions list + gotchas list."

**Error Recovery**: If any ac:explore agent returns empty results (no commands found, no architecture detected, no context docs), proceed with partial data. Note the missing areas and ask targeted questions about them in Phase 2 interview. Partial discovery is better than blocked execution.

2. While agents run, main session detects project config via Bash:

   ```bash
   ls -la CLAUDE.md .mcp.json 2>/dev/null
   find . -name "SKILL.md" -path "*/.claude/*" -maxdepth 4 2>/dev/null
   find . -name "*.md" -path "*/.claude/agents/*" -maxdepth 4 2>/dev/null
   cat .claude/settings.json 2>/dev/null | head -50
   cat .claude/settings.local.json 2>/dev/null | head -50
   ```

   - If exists and `$ARGUMENTS` is "update": announce "Update mode — re-discovering project, preserving your custom sections". Extract user-managed sections (Mission, custom Code Style entries, manually added Gotchas) for reuse. Skip Phase 2 interview.
   - If exists and `$ARGUMENTS` is "enhance" or no argument: announce "Found existing CLAUDE.md — I'll enhance it". Pre-fill interview from existing content.
   - If not exists: announce "Creating new CLAUDE.md"
   - Collect detected: skills list, MCP servers, custom agents
   - Collect existing hooks from settings.json (if any) — avoid duplicate proposals
   - Cross-reference file-detected items with your current session capabilities — check if you can call specific MCP tools (e.g., try resolving a context7 library), verify agent names appear in your available agent list. This confirms detection accuracy against runtime state.

3. Collect all agent results
4. Merge into discovery summary: commands table + architecture map + conventions + gotchas

---

## Phase 2: Interactive Interview

**Goal**: Validate discoveries, gather developer input, decide references.

**Skip entirely in update mode** — user-managed sections are preserved from existing file. Proceed to Phase 3.

**Actions**:

1. Present discovery summary to user:
   - Detected commands (table)
   - Architecture overview (compact tree)
   - Conventions found (from source + docs)
   - Gotchas/anti-patterns found
   - Skills, MCP servers, custom agents detected (if any)

2. Use AskUserQuestion to gather preferences. Skip questions where data is sufficient.

   **First AskUserQuestion call** (Q1-Q2):

   Question 1 (always):
   - question: "Here's what I found. Corrections, additions, or anything I missed?"
   - header: "Findings"
   - options:
     - Looks good — "Proceed with detected findings"

   Question 2 (if skills/MCP/agents detected):
   - question: "Found these project extensions. Include references in CLAUDE.md?"
   - header: "Extensions"
   - multiSelect: true
   - options: Build dynamically — one option per detected item, label is name, description from frontmatter

   **Second AskUserQuestion call** (Q3-Q5, conditional):

   Question 3 (if no existing CLAUDE.md):
   - question: "Any project-specific gotchas or conventions I should know? (e.g., never modify migrations directly, feature branches only)"
   - header: "Gotchas"
   - options:
     - No extras — "Nothing to add"

   Question 4 (enhance mode only):
   - question: "What to improve in current CLAUDE.md?"
   - header: "Improve"
   - options:
     - Auto-enhance — "Merge new findings into existing CLAUDE.md"
     - Specific areas — "I'll tell you what to focus on"
     - Full rewrite — "Regenerate from scratch"

   Question 5 (if linters/formatters/test runners detected AND not already in settings.json hooks):
   - question: "Found these dev tools. Set up auto-hooks in .claude/settings.json?"
   - header: "Hooks"
   - multiSelect: true
   - options: Build dynamically from detected tools:
     - Formatter → "Auto-format on write (PostToolUse)" — e.g. `dart format`, `prettier`
     - Linter → "Auto-lint on write (PostToolUse)" — e.g. `dart analyze`, `eslint`
     - Sensitive files (.env) → "Write guard for sensitive files (PreToolUse)"
   - Pre-selected: formatter hooks (most useful). Skip if no tools detected or all already hooked.

---

## Phase 3: Synthesis

**Goal**: Transform raw findings into optimized CLAUDE.md content.

**Actions**:

1. **Update mode**: Reconstruct the file by combining:
   - **User-managed sections** (verbatim from existing file): Mission/description, custom Code Style entries, manually added Gotchas
   - **Auto-detected sections** (regenerated from discovery): Commands, Architecture, Key Files, Testing, Skills & Extensions
   - Merge new Gotchas from discovery with existing user Gotchas (no duplicates)

2. **Enhance/New mode**: Build sections from merged findings + interview answers

3. Apply anti-slop filter (see top of this file)
4. **Deduplication check**: Read `~/.claude/CLAUDE.md` if it exists. Remove any content that overlaps with global CLAUDE.md — the project file is ADDITIVE, not a replacement
5. Incorporate context files selectively:
   - README → non-obvious architecture info only
   - GEMINI.md / root AGENTS.md → conventions, anti-patterns, gotchas
   - Source code findings always override doc claims
6. Add user-approved references (skills, MCP servers)
7. **Scope check**: If conventions were discovered that are path-specific (apply only to certain directories/file types), do NOT include them in CLAUDE.md. Instead, collect them and suggest in Phase 5: "Found [N] path-specific conventions. Run `/ac:init-rules` to generate scoped rules."
8. Token budget check: ≤2500 tokens (~100-120 lines)
   - Over limit → trim least-critical sections
   - Defer detailed conventions to `.claude/rules/` and mention in output

**Token Budget Overflow**: If synthesized content exceeds ≤2500 tokens (~120 lines), trim in this priority order:
1. Reduce examples in Commands table (keep command name + 1-line description only)
2. Remove Gotchas entries (least critical)
3. Condense Architecture details to 1-2 key patterns
4. **Never trim**: Mission statement, Key Commands section, or Tech Stack

After trimming, recount. If still over budget, split into CLAUDE.md (critical context) + CLAUDE.local.md (supplementary details).

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

3. **Validation gate**: Before presenting hooks to user, validate the generated JSON:
   1. Proper nesting: `settings.json` root → `hooks` object → event name arrays (e.g., `"PreToolUse"`, `"PostToolUse"`)
   2. Each hook entry has `type` (string: "command"), `command` (string), and optionally `matcher` with valid glob pattern
   3. All shell commands are properly escaped strings
   4. No duplicate matchers within the same event array

   If validation fails, present the hooks as formatted text for manual review instead of auto-installing. Explain which validation rule failed.

4. Prepare hooks preview for Phase 5

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
4. Use AskUserQuestion for review:
   - question: "Review the CLAUDE.md above. What needs adjustment?"
   - header: "Review"
   - options:
     - Approve all — "Install CLAUDE.md and merge hooks into settings.json"
     - Approve CLAUDE.md only — "Install CLAUDE.md, skip hooks"
     - Adjust — "I want to change specific sections"
     - Restart — "Start the interview over from scratch"
   - If "Approve all" → write CLAUDE.md + merge hooks into settings.json
   - If "Approve CLAUDE.md only" → write CLAUDE.md, skip hooks
   - If "Adjust" → ask what to change via AskUserQuestion, modify, re-present
   - If "Restart" → return to Phase 2
5. On approval:
   - If existing `./CLAUDE.md`: backup first → `cp CLAUDE.md CLAUDE.md.bak`
   - Write new `./CLAUDE.md`
   - If hooks approved: merge into `.claude/settings.json` (read → merge → write)
6. Post-install message:
   - "CLAUDE.md installed — [N] tokens, [M] sections"
   - If update mode: highlight what changed — "Updated: Commands table, Architecture, Skills. Preserved: Mission, Code Style, Gotchas."
   - If hooks installed: "[K] hooks added to .claude/settings.json"
   - If path-specific conventions were found: "Found [N] path-specific conventions. Run `/ac:init-rules` to generate scoped rules for them."
   - "This file is project-level context. For path-scoped rules, use `/ac:init-rules`"
