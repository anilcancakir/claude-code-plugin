---
description: "Generate or enhance project CLAUDE.md — auto-discovers codebase, interviews developer, preserves custom sections."
effort: high
argument-hint: update or enhance (optional)
---

# Init Project CLAUDE.md

Generate a project-level `./CLAUDE.md` for the active codebase. Produces ONLY `./CLAUDE.md` and optionally `.claude/settings.json` hooks. Path-scoped conventions → suggest `/ac:init-rules`.

**Authoring knowledge**: Section patterns, quality scoring, dedup boundaries, and anti-slop rules live in the `claude-md-writer` skill. Read it before writing any section content. The template at `${CLAUDE_PLUGIN_ROOT}/references/project-claude-md-template.md` provides structural guidance.

## Section Ownership

| Type | Sections | Update Behavior |
|------|----------|----------------|
| **Auto-detected** | Commands, Architecture, Key Files, Testing, Skills & Extensions | Re-discovered and updated on every run |
| **User-managed** | Mission/description, Code Style (custom conventions), Gotchas (manually added) | Preserved across updates, merged with new findings |

**Modes**: `update` → re-discover, preserve user-managed, skip interview. `enhance` or no arg → full discovery + interview, pre-fill from existing.

---

## Phase 1: Discovery

Auto-discover project structure, commands, patterns, and existing context. Use Glob, Grep, and Read directly in the main context — no subagents. Source code findings always take priority over documentation claims.

1. **Commands + Build + Dev Tools** — Glob for `package.json`, `composer.json`, `Makefile`, `Cargo.toml`, `pyproject.toml`, `Dockerfile`, `.github/workflows/*.yml`, `.gitlab-ci.yml`. Read each to extract build/test/lint/dev/format/deploy commands. Glob for linter/formatter configs (`.eslintrc*`, `phpstan.neon`, `analysis_options.yaml`, `biome.json`, `.stylelintrc*`, `pylintrc`, `.golangci.yml`, `.prettierrc*`, `.editorconfig`, `rustfmt.toml`) and test runners (`phpunit.xml`, `jest.config.*`, `vitest.config.*`, `pytest.ini`). Assemble: commands table + dev tools table. Priority: actual scripts in config files over README claims.

2. **Architecture + Entry Points** — Run `ls` at depth 2, skipping `vendor/`, `node_modules/`, `dist/`, `build/`. Identify entry points (`main.*`, `index.*`, bootstrap files) via Glob. Note non-obvious config files. Detect monorepo patterns (workspace roots, `packages/`, `apps/`). Assemble: annotated structure tree + key files with purpose.

3. **Context Docs + Code Patterns** — Read `README.md`, `AGENTS.md`, `GEMINI.md` if they exist. Grep for `DO NOT|NEVER|DEPRECATED|TODO` across source. Extract conventions, architecture decisions, anti-patterns. Source code patterns override doc claims. Assemble: conventions list + gotchas list.

   If any discovery returns empty → proceed with partial data. Note missing areas and ask targeted questions in Phase 2.

4. Detect project config via Bash:

   ```bash
   ls -la CLAUDE.md .mcp.json 2>/dev/null
   find . -name "SKILL.md" -path "*/.claude/*" -maxdepth 4 2>/dev/null
   find . -name "*.md" -path "*/.claude/agents/*" -maxdepth 4 2>/dev/null
   cat .claude/settings.json 2>/dev/null | head -50
   cat .claude/settings.local.json 2>/dev/null | head -50
   ```

   - If exists and `$ARGUMENTS` is "update" → announce "Update mode — re-discovering project, preserving your custom sections". Extract user-managed sections (Mission, custom Code Style entries, manually added Gotchas) for reuse. Skip Phase 2 interview.
   - If exists and `$ARGUMENTS` is "enhance" or no argument → announce "Found existing CLAUDE.md — I'll enhance it". Pre-fill interview from existing content.
   - If not exists → announce "Creating new CLAUDE.md"
   - Collect detected: skills list, MCP servers, custom agents
   - Collect existing hooks from settings.json (if any) — avoid duplicate proposals
   - Cross-reference file-detected items with session capabilities — check if specific MCP tools resolve, verify agent names appear in available agent list

5. Merge into discovery summary: commands table + architecture map + conventions + gotchas

---

## Phase 2: Interactive Interview

Validate discoveries, gather developer input, decide references. **Skip entirely in update mode** — user-managed sections preserved, proceed to Phase 3.

1. Present discovery summary: detected commands (table), architecture overview (compact tree), conventions, gotchas, skills/MCP/agents detected.

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

Transform raw findings into optimized CLAUDE.md content. Apply `claude-md-writer` skill's quality checklist and dedup boundaries throughout.

1. **Update mode**: Reconstruct by combining:
   - **User-managed** (verbatim from existing): Mission, custom Code Style, manually added Gotchas
   - **Auto-detected** (regenerated from discovery): Commands, Architecture, Key Files, Testing, Skills & Extensions
   - Merge new Gotchas with existing (no duplicates)

2. **Enhance/New mode**: Build sections from merged findings + interview answers

3. **Deduplication**: Read `~/.claude/CLAUDE.md`. Remove any overlap — project file is ADDITIVE. Apply `claude-md-writer` skill's dedup decision tree (CC system → global → project → rules → my-coding boundaries)
4. Incorporate context files selectively: README → non-obvious architecture only; source code overrides doc claims
5. **Scope check**: Path-specific conventions → do NOT include. Collect and suggest in Phase 5: "Run `/ac:init-rules` to generate scoped rules."
6. **Token budget**: ≤2500 tokens (~100-120 lines). Trim order: Commands examples → Gotchas → Architecture. Never trim: Mission, Key Commands. Over budget after trimming → split CLAUDE.md + CLAUDE.local.md

---

## Phase 4: Generation

1. Read the template at `${CLAUDE_PLUGIN_ROOT}/references/project-claude-md-template.md`
2. Read `claude-md-writer` skill for section authoring patterns — how to write effective Commands, Architecture, Code Style, Gotchas, etc. Apply quality scoring rubric
3. Generate following the template structure. Omit sections with no content
4. Validate: every command copy-paste executable, no section duplicates, no slop leaked, token count within budget. Apply `claude-md-writer` quality checklist

---

## Phase 4b: Hooks Generation (if approved in Q5)

Generate `.claude/settings.json` hooks from approved proposals. **Skip entirely** if user declined Q5 or no dev tools detected.

### Hook JSON Structure

Every hook must follow this three-level nesting. Do NOT flatten or restructure:

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

2. **Merge strategy**: Read existing `.claude/settings.json` first. If exists → merge new hooks into existing `hooks` object, preserve all other settings, append matcher groups (don't replace). If doesn't exist → create `{ "hooks": { ... } }`. All commands end with `|| true`.

3. **Validation gate**: Validate before presenting — proper nesting (root → `hooks` → event arrays), each hook has `type`/`command`, no duplicate matchers. If validation fails → present as formatted text for manual review.

4. Prepare hooks preview for Phase 5

---

## Phase 5: Review & Install

Do not install without user approval.

1. Present generated CLAUDE.md with: token count / line count, sections included, sources used.
2. If hooks generated in Phase 4b → also present: hook count and types, target `.claude/settings.json`, each hook's event/matcher/tool.
3. If enhance mode → show diff against existing CLAUDE.md.
4. Call AskUserQuestion with these exact parameters:
   ```json
   {
     "questions": [{
       "question": "Review the CLAUDE.md above. What needs adjustment?",
       "header": "Review",
       "options": [
         {"label": "Approve all (Recommended)", "description": "Install CLAUDE.md and merge hooks into settings.json."},
         {"label": "Approve CLAUDE.md only", "description": "Install CLAUDE.md, skip hooks."},
         {"label": "Adjust", "description": "I want to change specific sections."},
         {"label": "Restart", "description": "Start the interview over from scratch."}
       ]
     }]
   }
   ```
   - If "Approve all" → write CLAUDE.md + merge hooks into settings.json
   - If "Approve CLAUDE.md only" → write CLAUDE.md, skip hooks
   - If "Adjust" → ask what to change via AskUserQuestion, modify, re-present
   - If "Restart" → return to Phase 2
5. On approval:
   - If existing `./CLAUDE.md` → backup: `cp CLAUDE.md CLAUDE.md.bak`
   - Write new `./CLAUDE.md`
   - If hooks approved → merge into `.claude/settings.json` (read → merge → write)
6. Post-install:
   - "CLAUDE.md installed — [N] tokens, [M] sections"
   - Update mode: highlight what changed — "Updated: Commands table, Architecture, Skills. Preserved: Mission, Code Style, Gotchas."
   - Hooks installed: "[K] hooks added to .claude/settings.json"
   - Path-specific conventions found: "Found [N] path-specific conventions. Run `/ac:init-rules` to generate scoped rules."
   - "For path-scoped rules, use `/ac:init-rules`"
