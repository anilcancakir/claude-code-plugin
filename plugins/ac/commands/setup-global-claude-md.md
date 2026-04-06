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

1. Check `~/.claude/CLAUDE.md` existence → determine mode:
   - Exists + `$ARGUMENTS` = "update" → extract user-managed sections verbatim, skip Phase 2
   - Exists + `$ARGUMENTS` = "enhance" or no argument → pre-fill interview from existing content
   - Exists + `$ARGUMENTS` = "overwrite" → fresh generation
   - Not exists → fresh generation

2. Detect global user skills:
   ```bash
   find ~/.claude/skills -name "SKILL.md" -maxdepth 3 2>/dev/null
   ```
   For each: read frontmatter (name, description). Note `my-coding` and `my-language` presence.

3. Detect marketplace plugin skills from session's available skills list. Namespaced `<plugin>:<skill>` format. Exclude creator skills: `skill-creator`, `agent-creator`, `command-creator`, `rule-creator`, `prompt-writer`, `claude-md-writer` (and their `ac:` prefixed variants).

4. Detect global MCP servers — parse `mcpServers` from both files:
   ```bash
   cat ~/.claude/.mcp.json 2>/dev/null; cat ~/.claude.json 2>/dev/null
   ```
   For each server: name, infer capability from command/args, enabled status.

5. Detect environment: `uname -ms`, `$SHELL`, installed runtimes (`node`, `php`, `dart`, `python3`, `go`, `docker`).

6. Detect LSP plugins from session's available agent/plugin list — check for `*-lsp` plugins.

If any detection fails → skip entry, continue. Note skipped items.

---

## Phase 2: Interview

**Skip entirely in update mode** — user-managed sections preserved from existing file.

Present discovery findings first: detected skills, MCP servers, environment. Then gather preferences via AskUserQuestion — skip questions already answered by detected skills.

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
3. AskUserQuestion:
   - question: "Review the CLAUDE.md above. What needs adjustment?"
   - options:
     - Approve — "Install as shown"
     - Adjust — "I want to change specific sections"
     - Restart — "Start the interview over"
   - Adjust → ask what to change, update, re-present
   - Restart → return to Phase 2

4. On approve:
   - Backup existing: `cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak` (if exists)
   - Write `~/.claude/CLAUDE.md`

5. Confirm:
   - "Global CLAUDE.md installed at `~/.claude/CLAUDE.md` — active in every CC session."
   - If my-coding not detected → "Consider `/ac:setup-coding` for detailed coding rules."
   - If my-language not detected → "Consider `/ac:setup-language` for writing style."
