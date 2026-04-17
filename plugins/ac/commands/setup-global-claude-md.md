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
| **Plugin-managed** | Skills, MCP, LSP | Regenerated from template every run |
| **User-managed** | Identity, Tech Stack, Rules | Preserved across updates. Changed only via interview |

---

## Phase 1: Discovery

1. Check `~/.claude/settings.json` → detect existing `permissions.deny` and `hooks.PreToolUse` entries. Store as EXISTING_SETTINGS for Phase 4 merge.

2. Check `~/.claude/CLAUDE.md` existence → determine mode:
   - Exists + `$ARGUMENTS` = "update" → extract user-managed sections verbatim, skip Phase 2
   - Exists + `$ARGUMENTS` = "enhance" or no argument → pre-fill interview from existing content
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

**Q3 — Non-negotiable rules:**
- question: "Which rules must NEVER be violated?"
- multiSelect: true
- options: TDD · English only · Strict types · Zero suppressions · Minimal changes (no bonus refactors) · No em dash / en dash

**Q4 — Extensions** (only if skills/MCP detected beyond my-coding/my-language):
- question: "Found these global extensions. Include references in CLAUDE.md?"
- multiSelect: true
- options: dynamically built from detected skills + MCP servers (label = name, description = capability)

**Q5 — Extra rules:**
- question: "Any additional rules, pet peeves, or preferences?"
- options: No extras · (free text response)

---

## Phase 3: Compose & Generate

1. Read template at `${CLAUDE_PLUGIN_ROOT}/references/global-claude-md-template.md`

2. **Update mode**: Combine:
   - User-managed sections: verbatim from existing file (Identity, Tech Stack, Rules)
   - Plugin-managed sections: regenerated from template with current detection data
   - Diff against existing — if no changes → announce "Already in sync." and stop

3. **Enhance/New mode**: Build all sections from interview + detection following template structure. Apply `claude-md-writer` skill's section authoring patterns for each section. Key rules:
   - **Section order**: Identity → Tech Stack → Skills → MCP → LSP → Rules. No Workflow section.
   - **Skills table**: Exclude creator skills (skill-creator, agent-creator, command-creator, rule-creator, prompt-writer, claude-md-writer)
   - **Rules**: 4-6 rules max. If `my-coding` exists → defer: "Detailed coding rules live in the `my-coding` skill."

4. Count lines — if over 100, trim Rules (defer to my-coding) and drop LSP section.

5. Apply `claude-md-writer` quality checklist: no CC system prompt duplication, no duplicate rules across sections, no planning pipeline injection (Intent Gate, Delegation Check, tier routing, parallel subagent mandates, `skill: "ac:plan"` refs, internal pipeline agents). Only reference `/ac:commit`, `/ac:init-claude-md`, `/ac:init-rules`, `/ac:setup-coding`, `/ac:setup-language`, `/ac:setup-global-claude-md`.

---

## Phase 4: Review & Install

1. Present generated CLAUDE.md with: line count, sections included, skills/MCP referenced.
2. Update mode → show diff (`- old` / `+ new`). No changes → already announced in Phase 3.
3. Call AskUserQuestion with these exact parameters:
   ```json
   {
     "questions": [{
       "question": "Review the CLAUDE.md above. What needs adjustment?",
       "header": "Review",
       "options": [
         {"label": "Approve (Recommended)", "description": "Install as shown."},
         {"label": "Adjust", "description": "I want to change specific sections."},
         {"label": "Restart", "description": "Start the interview over."}
       ]
     }]
   }
   ```
   - "Adjust" → ask what to change, update, re-present
   - "Restart" → return to Phase 2

4. On approve:
   - Backup existing: `cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak` (if exists)
   - Write `~/.claude/CLAUDE.md`

5. **Auto-configure `~/.claude/settings.json`** — only restriction is blocking CC's native web tools when kodizm MCP is available as replacement. Nothing else is blocked. Read existing settings, merge (preserve all existing keys).

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

6. Confirm:
   - "Global CLAUDE.md installed at `~/.claude/CLAUDE.md` — active in every CC session."
   - Settings update summary: list new deny entries, new hooks, and any obsolete entries removed.
   - If my-coding not detected → "Consider `/ac:setup-coding` for detailed coding rules."
   - If my-language not detected → "Consider `/ac:setup-language` for writing style."
