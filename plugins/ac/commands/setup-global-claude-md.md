---
description: "Generate global CLAUDE.md — interviews developer, detects skills/MCP, produces lightweight orchestration config for every CC session."
effort: high
argument-hint: update, enhance, or overwrite (optional)
---

# Setup Global CLAUDE.md

Generate or update `~/.claude/CLAUDE.md`. Injected into every CC conversation as user-rules — main session AND plugin subagents.

**Authoring knowledge**: Section patterns, quality scoring, compression tactics, and dedup boundaries live in the `claude-md-writer` skill. Read it before writing any section content. The template at `${CLAUDE_PLUGIN_ROOT}/references/global-claude-md-template.md` provides structural guidance.

**Scope**: This config is deliberately lightweight. It does NOT inject planning pipelines, Intent Gate, delegation directives, tier routing, or parallel subagent mandates. CC's native plan mode and default agent behavior stay in charge.

## Section Ownership

| Type | Sections | Update Behavior |
|------|----------|----------------|
| **Fixed defaults** | Identity bullets, Behavioral Guidelines, Rules defaults | Always regenerated verbatim from template. Never preserved from existing file — users get the latest baseline every run |
| **Plugin-managed** | Skills, MCP, LSP | Regenerated from template every run |
| **User-managed** | Identity opening line, Tech Stack, Rules extras | Preserved across updates. Changed only via interview |

The Identity bullet list, full Behavioral Guidelines block, and Rules default block are non-negotiable baselines — they are rewritten verbatim on every `update`, `enhance`, and `overwrite` run. Interview (Q3/Q5) can only APPEND rules, never remove or rewrite defaults. Q1 only tunes the opening sentence of Identity.

---

## Phase 1: Discovery

1. Check `~/.claude/settings.json` → detect existing `permissions.deny` and `hooks.PreToolUse` entries. Store as EXISTING_SETTINGS for Phase 4 merge.

2. Check `~/.claude/CLAUDE.md` existence → determine mode:
   - Exists + `$ARGUMENTS` = "update" → extract user-managed sections (opening sentence, Tech Stack, Rules extras) verbatim, skip Phase 2. Fixed defaults and Behavioral Guidelines regenerate from template
   - Exists + `$ARGUMENTS` = "enhance" or no argument → pre-fill interview from existing content. Fixed defaults still rewritten verbatim
   - Exists + `$ARGUMENTS` = "overwrite" → fresh generation
   - Not exists → fresh generation

3. Detect global user skills:
   ```bash
   find ~/.claude/skills -name "SKILL.md" -maxdepth 3 2>/dev/null
   ```
   For each: read frontmatter (name, description). Note `my-coding` and `my-language` presence.

4. Detect marketplace plugin skills from session's available skills list. Namespaced `<plugin>:<skill>` format. Exclude creator skills: `skill-creator`, `agent-creator`, `command-creator`, `rule-creator`, `prompt-writer`, `claude-md-writer` (and their `ac:` prefixed variants).

5. Detect global MCP servers — parse `mcpServers` from both files:
   ```bash
   cat ~/.claude/.mcp.json 2>/dev/null; cat ~/.claude.json 2>/dev/null
   ```
   For each server: name, infer capability from command/args, enabled status.

6. Detect environment: `uname -ms`, `$SHELL`, installed runtimes (`node`, `php`, `dart`, `python3`, `go`, `docker`).

7. Detect LSP plugins from session's available agent/plugin list — check for `*-lsp` plugins.

If any detection fails → skip entry, continue. Note skipped items.

---

## Phase 2: Interview

**Skip entirely in update mode** — user-managed sections preserved from existing file.

Present discovery findings first: detected skills, MCP servers, environment. Then gather preferences via AskUserQuestion — skip questions already answered by detected skills.

**Q0 — kodizm MCP verification:**
Test kodizm MCP connectivity: call `mcp__kodizm__resolve-library` with query "react".
- Success (returns library ID) → kodizm MCP operational. Store MCP_STATUS = "operational".
- Failure (error, timeout, tool not available) → Store MCP_STATUS = "unavailable". Present warning:
  "kodizm MCP is not available. Export `KODIZM_MCP_TOKEN` in your shell profile (`~/.zshrc`). Get your token from kodizm.com."
Not blocking — continue regardless.

**Q1 — Communication style:**
- question: "How should I communicate with you?"
- options:
  - Expert peer (Recommended) — "Skip basics, architecture and trade-offs focus"
  - Collaborative — "Discuss trade-offs before acting"
  - Mentor — "Teach patterns along the way"

**Q2 — Tech stack** (skip if `my-coding` defines stack):
- question: "What is your primary development stack?"
- options: PHP/Laravel · Dart/Flutter · TypeScript/Node · Python · Multi-stack

**Q3 — Extensions** (only if skills/MCP detected beyond my-coding/my-language):
- question: "Found these global extensions. Include references in CLAUDE.md?"
- multiSelect: true
- options: dynamically built from detected skills + MCP servers (label = name, description = capability)

**Q4 — Extra rules** (defaults already enforced: English-only code, no em/en dash, project override, phases/workflows, TDD, strict types, zero suppressions, zero linter warnings, minimal changes, PHP no `declare(strict_types=1)`, my-coding reference):
- question: "Any ADDITIONAL rules, framework conventions, or team norms? Leave blank for defaults only."
- options: No extras (Recommended) · (free text — one rule per line, max 4)

---

## Phase 3: Compose & Generate

1. Read template at `${CLAUDE_PLUGIN_ROOT}/references/global-claude-md-template.md`

2. **Fixed defaults (every mode)**: Write these verbatim from template, never edited by interview:
   - Identity bullet list (English-only, user-language communication, direct/technical, flawed-approach, AskUserQuestion enforcement, em/en dash ban)
   - Twin Mode framing paragraph + project override bullet (always). my-coding / my-language bullets conditional on detection
   - Full Behavioral Guidelines block (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution)
   - Rules default bullets (project override, phases/workflows, TDD, strict types, PHP no `declare(strict_types=1)`, zero tolerance, minimal changes, my-coding reference)

3. **Update mode**: Combine:
   - Fixed defaults: rewritten verbatim from template
   - User-managed: opening sentence of Identity, Tech Stack, Rules extras — verbatim from existing file
   - Plugin-managed (Skills/MCP/LSP): regenerated with current detection
   - Diff against existing. If no changes: announce "Already in sync." and stop

4. **Enhance/New mode**: Build all sections from interview + detection following template structure. Apply `claude-md-writer` skill's section authoring patterns. Key rules:
   - **Section order**: Identity → Twin Mode → Behavioral Guidelines → Tech Stack → Skills → MCP → LSP → Rules
   - **Skills table**: Exclude creator skills (skill-creator, agent-creator, command-creator, rule-creator, prompt-writer, claude-md-writer)
   - **Rules**: defaults fixed + up to 4 Q4 extras, deduplicated against defaults

5. Count lines. If over 150, drop LSP section and trim Rules extras (never remove defaults or Behavioral Guidelines).

6. Apply `claude-md-writer` quality checklist: no CC system prompt duplication, no duplicate rules across sections, no planning pipeline injection (Intent Gate, Delegation Check, tier routing, parallel subagent mandates, `skill: "ac:plan"` refs, internal pipeline agents). Only reference `/ac:commit`, `/ac:init-claude-md`, `/ac:init-rules`, `/ac:setup-coding`, `/ac:setup-language`, `/ac:setup-global-claude-md`.

---

## Phase 4: Review & Install

1. Present generated CLAUDE.md with: line count, sections included, skills/MCP referenced.
2. Update mode → show diff (`- old` / `+ new`). No changes → already announced in Phase 3.
3. **Compute settings.json diff** (do not write yet). Load EXISTING_SETTINGS from Phase 1. Build proposed merged settings per Phase 4.6 rules. Show planned additions, removals (obsolete `EnterPlanMode`/`Agent(Explore)`/`Agent(Plan)` entries from prior runs), and "no change" set.
4. Call AskUserQuestion with these exact parameters:
   ```json
   {
     "questions": [{
       "question": "Review the CLAUDE.md and settings.json diff above. What needs adjustment?",
       "header": "Review",
       "options": [
         {"label": "Approve both (Recommended)", "description": "Install CLAUDE.md and apply settings.json changes."},
         {"label": "CLAUDE.md only", "description": "Install CLAUDE.md, skip settings.json changes."},
         {"label": "Adjust", "description": "Change specific sections before installing."},
         {"label": "Restart", "description": "Start the interview over."}
       ]
     }]
   }
   ```
   - "Adjust" → ask what to change, update, re-present
   - "Restart" → return to Phase 2
   - "CLAUDE.md only" → skip step 6 below

5. On approve:
   - Backup existing: `cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak` (if exists)
   - Write `~/.claude/CLAUDE.md`

6. **Apply `~/.claude/settings.json` changes** (only if user chose "Approve both") — only restriction is blocking CC's native web tools when kodizm MCP is available as replacement. Nothing else is blocked. Read existing settings, merge (preserve all existing keys).

   Only deny if MCP_STATUS = "operational":
   - `WebSearch`, `WebFetch` — replaced by kodizm MCP's `web-search`, `web-fetch`.

   If MCP_STATUS = "unavailable": skip these entries and warn: "WebSearch/WebFetch kept enabled — kodizm MCP unavailable as replacement."

   Example deny array when MCP_STATUS = "operational":
   ```json
   {
     "permissions": {
       "deny": [
         "WebSearch",
         "WebFetch"
       ]
     }
   }
   ```

   Matching `hooks.PreToolUse` entry (only if MCP_STATUS = "operational"):
   ```json
   {
     "matcher": "WebSearch|WebFetch",
     "hooks": [{
       "type": "command",
       "command": "echo 'Web tools blocked — use kodizm MCP (web-search / web-fetch).' >&2; exit 2"
     }]
   }
   ```

   Do NOT add deny entries or hooks for `EnterPlanMode`, `Agent(Explore)`, or `Agent(Plan)` — CC's native plan mode and built-in agents stay enabled. If prior runs installed these entries, remove them during this merge (they are obsolete).

   Write merged settings back. Report what changed vs already configured.

7. Confirm:
   - "Global CLAUDE.md installed at `~/.claude/CLAUDE.md` — active in every CC session."
   - Settings update summary: list new deny entries, new hooks, and any obsolete entries removed (or "settings unchanged" if user chose CLAUDE.md only).
   - If my-coding not detected → "Consider `/ac:setup-coding` for detailed coding rules."
   - If my-language not detected → "Consider `/ac:setup-language` for writing style."
