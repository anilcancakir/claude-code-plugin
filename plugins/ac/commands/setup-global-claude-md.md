---
description: "Generate global CLAUDE.md — interviews developer, detects skills, produces orchestration config."
effort: high
argument-hint: update, enhance, or overwrite (optional)
allowed-tools: AskUserQuestion, Read, Write, Bash
---

# Setup Global CLAUDE.md

You are orchestrating an interactive session to build the developer's global `~/.claude/CLAUDE.md` file. This file is injected as user-rules in every Claude Code conversation. Goal: turn Claude Code into a structured orchestrator by shaping how it uses native tools (TodoWrite, Agent, EnterPlanMode, AskUserQuestion).

## Core Principles

- **Lean map, not encyclopedia**: Target ≤120 lines. Delegate details to skills and project-level CLAUDE.md
- **Progressive disclosure**: Global file = identity + workflow + rules. Stack details → `my-coding` skill. Writing details → `my-language` skill
- **Native tool orchestration**: Every workflow directive must reference Claude Code's actual tools, not abstract concepts
- **Observe before asking**: Detect existing skills and environment first, then interview

## Section Ownership

| Type | Sections | Update Behavior |
|------|----------|----------------|
| **Plugin-managed** | Workflow, Skills, MCP Servers | Updated by plugin on every run. Always reflects current plugin state |
| **User-managed** | Identity, Tech Stack, Rules | Preserved across updates. Only changed via interview |

On **update** mode: skip interview, regenerate plugin-managed sections from current template + detected skills/MCP, preserve user-managed sections verbatim. On **enhance** mode: run full interview but pre-fill answers from existing file. On **overwrite** mode: full fresh generation.

---

## Phase 1: Discovery

Detect existing configuration and environment.

1. Check if `~/.claude/CLAUDE.md` exists and determine mode:
   - If exists and `$ARGUMENTS` is "update" → read it, announce "Update mode — syncing plugin sections, preserving your preferences". Extract user-managed sections (Identity, Tech Stack, Rules) verbatim for reuse in Phase 3. Skip Phase 2 interview entirely.
   - If exists and `$ARGUMENTS` is "enhance" or no argument → read it, announce "Found existing CLAUDE.md — I'll enhance it". Pre-fill interview answers from existing content.
   - If exists and `$ARGUMENTS` is "overwrite" → announce "Will create fresh CLAUDE.md (existing backed up)"
   - If not exists → announce "Creating new CLAUDE.md"
2. Detect global user skills:

   ```bash
   find ~/.claude/skills -name "SKILL.md" -maxdepth 3 2>/dev/null
   ```

   - For each found: read frontmatter (name, description) and first paragraph. `my-coding` → note North Star section; `my-language` → note purpose.
3. Detect active marketplace plugin skills from session's available skills list. Plugin skills use namespaced format: `<plugin>:<skill>`. Always exclude `skill-creator` and `ac:skill-creator`.
4. Detect global MCP servers:

   ```bash
   cat ~/.claude/.mcp.json 2>/dev/null
   cat ~/.claude.json 2>/dev/null
   ```

   Parse full `mcpServers` object from `~/.claude.json` (not just a grep preview). For each server: extract name, infer capability from command/args, check enabled status. Cross-reference with session's `mcp__<server>__*` tool patterns.
5. Cross-reference all detected items with session capabilities — check if specific MCP tools resolve, verify agent names in available agent list.
6. Detect environment: `uname -ms` (OS/arch), `echo $SHELL`, check for `docker`, `git`, `node`, `php`, `dart`, `python3`, `go`.
7. Detect global settings: `cat ~/.claude/settings.json 2>/dev/null` — parse `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `env.CLAUDE_CODE_ENABLE_TASKS`, `teammateMode`. Mark missing keys for optional safe merge.

   If any detection fails → skip that entry and continue. Do not fail the phase. Note skipped items for the interview.

---

## Phase 2: Interview

Gather developer identity, preferences, and workflow rules. **Skip entirely in update mode** — user-managed sections preserved, proceed to Phase 3.

1. Present discovery findings: "Here's what I detected about your environment and existing skills."

2. Use AskUserQuestion to gather preferences. Skip questions already answered by detected skills or pre-filled from existing CLAUDE.md. Ask up to 4 questions per call.

**First AskUserQuestion call** — core preferences (Q1-Q3):

Question 1:
- question: "How should I communicate with you?"
- header: "Comm style"
- options:
  - Expert peer (Recommended) — "Skip basics, focus on architecture and trade-offs"
  - Collaborative — "Explain decisions, discuss trade-offs before acting"
  - Mentor — "Explain reasoning, teach patterns along the way"

Question 2 (skip if `my-coding` skill already defines stack):
- question: "What is your primary development stack?"
- header: "Tech stack"
- options:
  - PHP/Laravel — "Backend with Laravel ecosystem"
  - Dart/Flutter — "Mobile and cross-platform"
  - TypeScript/Node — "Full-stack JavaScript/TypeScript"
  - Python — "Backend, ML, scripting"

Question 3:
- question: "Which rules must NEVER be violated?"
- header: "Rules"
- multiSelect: true
- options:
  - TDD — "Write failing test first, always"
  - English only — "All code, comments, commits in English"
  - Strict types — "Every parameter and return typed"
  - Zero suppressions — "No @ts-ignore, @phpstan-ignore, no linter disables"

**Second AskUserQuestion call** — workflow and extensions (Q4-Q6):

Question 4 (skip if `my-coding` skill already defines this):
- question: "How do you organize business logic?"
- header: "Architecture"
- options:
  - Thin Controllers + Fat Services — "Controllers delegate to service classes"
  - Service-Repository — "Services use repository pattern for data access"
  - Action classes — "Single-purpose action classes per operation"
  - Domain-Driven — "Bounded contexts with domain objects"

Question 5:
- question: "How autonomous should I be?"
- header: "Autonomy"
- options:
  - Plan-first (Recommended) — "Always plan non-trivial work before executing"
  - Balanced — "Plan complex tasks, execute simple ones directly"
  - High autonomy — "Execute and report, ask only when blocked"

Question 6 (only if additional skills, plugin skills, or MCP servers detected beyond my-coding/my-language):
- question: "Found these global extensions. Include references in CLAUDE.md?"
- header: "Extensions"
- multiSelect: true
- options: Build dynamically from detected items:
  - User skills beyond my-coding/my-language from `~/.claude/skills/` detection
  - Active marketplace plugin skills from session (namespaced `<plugin>:<skill>` format) — never list skill-creator
  - MCP servers from `~/.claude/.mcp.json` + `~/.claude.json` mcpServers
- Each option: label is the name, description is one-line capability

**Third AskUserQuestion call** — free-form (Q7):

Question 7:
- question: "Any additional rules, pet peeves, or preferences? (e.g., use backed enums, always use strict types, prefer composition over inheritance)"
- header: "Extra rules"
- options:
  - No extras — "I'm good with the rules above"

---

## Phase 3: Composition

**Goal**: Map interview answers + detected data to CLAUDE.md sections.

**Actions**:

1. Read the template at `${CLAUDE_PLUGIN_ROOT}/references/global-claude-md-template.md`

2. **Update mode**: Reconstruct the file by combining:
   - **User-managed sections** (verbatim from existing file): Identity block (everything before `## Stack`), Tech Stack section, Rules section
   - **Plugin-managed sections** (always regenerate from template — never reuse existing text): Workflow section from template's Sisyphus Brain Workflow block. Skills table from detected skills. MCP table from detected servers. LSP section from template. Do NOT compare existing sections against template — always overwrite plugin-managed sections with template content populated with discovery data.
   - **Diff report**: Compare composed file line-by-line against existing file. Report every changed line in Phase 5. If no lines differ → announce "No changes needed" and skip install.

3. **Enhance/New mode**: Build all sections from interview answers + detected data:
   - **Identity block**: Communication style from Q1
   - **Tech Stack**: From Q2 or detected from `my-coding` skill
   - **Workflow — Sisyphus Brain**: Copy the entire Workflow section from the template verbatim. This includes: Intent Gate (6-type intent classification table + verbalization format), Delegation Check (3-step DELEGATE bias), Investigation Protocol (surgical vs hairy), Codebase State Awareness, Research delegation, Execution, and Verification. Do not modify, abbreviate, or rewrite it.
   - **Workflow — Compression guard**: Two subsections must survive context compression verbatim: (1) Intent Gate table with 6 intent types — primary routing mechanism, and (2) Research delegation with "proactively" keyword — primary agent-triggering enforcement. NEVER soften, summarize, or abbreviate these.
   - **Skills section**: Merge all approved skills into one table — user skills (my-coding, my-language from `~/.claude/skills/`) and active marketplace plugin skills (namespaced `<plugin>:<skill>`). Never include `skill-creator` or `ac:skill-creator`. Omit section if no skills detected.
   - **MCP section**: If user approved MCP references in Q6, include all active MCP servers from both `~/.claude/.mcp.json` and `~/.claude.json` mcpServers. For each: `| server-name | one-line capability |`. Only enabled servers. Omit if none detected or user declined.
   - **LSP (Code Intelligence)** — if LSP plugins are installed or planned. Include this block (5 lines max):

     ```
     ## LSP (Code Intelligence)

     If LSP plugin installed (`/plugin install <lang>-lsp@claude-plugins-official`):
     - Navigation first: use `LSP(findReferences/goToDefinition/hover)` before Grep for semantic lookups
     - Diagnostics auto-injected: check `<new-diagnostics>` after every Edit — fix ERRORs before proceeding
     - Verify after edits: `LSP(documentSymbol, file, 1, 1)` confirms structure intact
     - Graceful: if LSP returns error → fall back to Grep silently
     ```

   - **Rules section**: Compile from Q3 non-negotiables + Q4 architecture + Q7 extras. Deduplicate against `my-coding` skill rules

4. Count total lines — if over 120, trim Rules section (defer detailed rules to `my-coding` skill reference)

---

## Phase 4: Generation

1. Generate following the template structure.
2. Every workflow directive uses official CC tool names: `TodoWrite`, `AskUserQuestion`, `ac:explore`/`ac:librarian`, `skill: "ac:plan"`, `run_in_background: true`.
3. No duplicate rules — each rule appears exactly once.
4. Verify conditional sections: Skills present only if detected, Stack populated from interview or skill detection, Rules deduplicated from all sources.

---

## Phase 5: Review & Install

Do not install without user approval.

1. Present the generated CLAUDE.md: line count, detected skills referenced, number of rules.
2. In update mode → show concrete diff (`- old` / `+ new` per changed line). If no lines changed → announce "No changes detected — already in sync." and stop.
3. Use AskUserQuestion for review:
   - question: "Review the CLAUDE.md above. What needs adjustment?"
   - header: "Review"
   - options:
     - Approve — "Install as shown"
     - Adjust — "I want to change specific sections"
     - Restart — "Start the interview over from scratch"
   - If "Approve" → proceed to install
   - If "Adjust" → ask what to change, update, re-present, ask again
   - If "Restart" → return to Phase 2
4. Once approved:
   - If existing `~/.claude/CLAUDE.md` → backup: `cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak`
   - Write: `~/.claude/CLAUDE.md`
   - Safe merge into `~/.claude/settings.json`: ensure `env` object exists, add `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"` and `env.CLAUDE_CODE_ENABLE_TASKS = "true"` only if missing. Never overwrite existing values or modify `teammateMode`.
5. Confirm:
   - "Global CLAUDE.md installed at `~/.claude/CLAUDE.md` — injected into every Claude Code conversation."
   - If settings keys added: "Added missing background-agent keys in `~/.claude/settings.json` without changing existing values."
   - If `my-coding` or `my-language` not detected: "Consider running `/ac:setup-coding` and `/ac:setup-language`."
