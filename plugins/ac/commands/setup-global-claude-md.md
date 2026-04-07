---
description: "Generate global CLAUDE.md — interviews developer, detects skills/MCP, produces orchestration config for every CC session."
effort: high
argument-hint: update, enhance, or overwrite (optional)
---

# Setup Global CLAUDE.md

Generate or update `~/.claude/CLAUDE.md`. Injected into every CC conversation as user-rules — main session AND all plugin subagents.

**Authoring knowledge**: Section patterns, quality scoring, compression tactics, and dedup boundaries live in the `claude-md-writer` skill. Read it before writing any section content. The template at `${CLAUDE_PLUGIN_ROOT}/references/global-claude-md-template.md` provides structural guidance and compression-critical anchors.

## Section Ownership

| Type | Sections | Update Behavior |
|------|----------|----------------|
| **Plugin-managed** | Workflow, Skills, MCP, LSP | Regenerated from template every run |
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

**Q0 — kodizm MCP token:**
Check if `KODIZM_MCP_TOKEN` env var is set (`echo $KODIZM_MCP_TOKEN`). If empty, present informational message: "Export `KODIZM_MCP_TOKEN` in your shell profile (`~/.zshrc`). Get your token from kodizm.com. ac's librarian agent requires it for documentation lookups." Not blocking — continue regardless.

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
- options: TDD · English only · Strict types · Zero suppressions · Minimal changes (no bonus refactors)

**Q4 — Autonomy level:**
- question: "How autonomous should I be?"
- options:
  - Plan-first (Recommended) — "Always plan non-trivial work before executing"
  - Balanced — "Plan complex tasks, execute simple ones directly"
  - High autonomy — "Execute and report, ask only when blocked"

**Q5 — Extensions** (only if skills/MCP detected beyond my-coding/my-language):
- question: "Found these global extensions. Include references in CLAUDE.md?"
- multiSelect: true
- options: dynamically built from detected skills + MCP servers (label = name, description = capability)

**Q6 — Extra rules:**
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
   - **Workflow**: Copy verbatim from template — compression-critical anchors, do NOT abbreviate
   - **Skills table**: Exclude creator skills (skill-creator, agent-creator, command-creator, rule-creator, prompt-writer, claude-md-writer)
   - **Rules**: 3-5 rules max. If `my-coding` exists → defer: "Detailed coding rules → `my-coding` skill."

4. Count lines — if over 120, trim Rules (defer to my-coding) and remove LSP section

5. Apply `claude-md-writer` quality checklist: no CC system prompt duplication, no duplicate rules across sections, only ac:explore/ac:librarian/ac:plan/ac:commit referenced

---

## Phase 4: Review & Install

1. Present generated CLAUDE.md with: line count, sections included, skills/MCP referenced
2. Update mode → show diff (`- old` / `+ new`). No changes → already announced in Phase 3
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

5. **Auto-configure `~/.claude/settings.json`** — ac replaces CC's native tools and agents. Read existing settings, merge (preserve all existing keys), ensure these entries:

   **`permissions.deny`** — add to deny array (create if missing, append if exists, skip already-present):
   ```json
   {
     "permissions": {
       "deny": [
         "EnterPlanMode",
         "WebSearch",
         "WebFetch",
         "Agent(Explore)",
         "Agent(Plan)"
       ]
     }
   }
   ```

   Why each entry is blocked:
   - `EnterPlanMode` — ac manages planning via `/ac:plan`. Native plan mode hijacks ac's 7-phase workflow.
   - `WebSearch`, `WebFetch` — unreliable (hangs, timeouts). ac:librarian uses kodizm MCP instead.
   - `Agent(Explore)` — ac:explore replaces CC's built-in Explore agent.
   - `Agent(Plan)` — defense-in-depth alongside EnterPlanMode deny.

   **`hooks.PreToolUse`** — add entries (create array if missing, append, skip if matcher present):
   ```json
   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "EnterPlanMode",
           "hooks": [{
             "type": "command",
             "command": "echo 'EnterPlanMode blocked — ac manages planning via /ac:plan.' >&2; exit 2"
           }]
         },
         {
           "matcher": "WebSearch|WebFetch",
           "hooks": [{
             "type": "command",
             "command": "echo 'Web tools blocked — ac:librarian uses kodizm MCP.' >&2; exit 2"
           }]
         }
       ]
     }
   }
   ```

   Write merged settings back. Report what changed vs already configured.

6. Confirm:
   - "Global CLAUDE.md installed at `~/.claude/CLAUDE.md` — active in every CC session."
   - "Settings updated: blocked tools/agents via `permissions.deny` + `PreToolUse` hooks." List which entries were newly added vs already configured.
   - If my-coding not detected → "Consider `/ac:setup-coding` for detailed coding rules."
   - If my-language not detected → "Consider `/ac:setup-language` for writing style."
