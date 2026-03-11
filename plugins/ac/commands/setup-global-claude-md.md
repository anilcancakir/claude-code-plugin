---
description: Interactive global CLAUDE.md generator — interviews developer, detects skills, produces orchestration config. Re-run after plugin updates to sync workflow routing and skill references while preserving your personal preferences.
argument-hint: update, enhance, or overwrite (optional)
model: opus
---

# Setup Global CLAUDE.md

You are orchestrating an interactive session to build the developer's global `~/.claude/CLAUDE.md` file. This file is injected as user-rules in every Claude Code conversation. The goal: turn Claude Code into a structured orchestrator by shaping how it uses its native tools (TodoWrite, Agent, EnterPlanMode, AskUserQuestion).

## Core Principles

- **Lean map, not encyclopedia**: Target ≤120 lines. Delegate details to skills and project-level CLAUDE.md
- **Progressive disclosure**: Global file = identity + workflow + rules. Stack details → `my-coding` skill. Writing details → `my-language` skill
- **Native tool orchestration**: Every workflow directive must reference Claude Code's actual tools, not abstract concepts
- **Observe before asking**: Detect existing skills and environment first, then interview

## Section Ownership

Sections in the generated CLAUDE.md have two ownership types:

| Type | Sections | Update Behavior |
|------|----------|----------------|
| **Plugin-managed** | Workflow Protocol, Skills, MCP Servers | Updated by plugin on every run. Always reflects current plugin state |
| **User-managed** | Identity, Tech Stack, Rules | Preserved across updates. Only changed via interview |

On **update** mode: skip interview, regenerate plugin-managed sections from current template + detected skills/MCP, preserve user-managed sections verbatim. On **enhance** mode: run full interview but pre-fill answers from existing file. On **overwrite** mode: full fresh generation.

---

## Phase 1: Discovery

**Goal**: Detect existing configuration and environment

**Actions**:

1. Check if `~/.claude/CLAUDE.md` exists and determine mode:
   - If exists and `$ARGUMENTS` is "update": read it, announce "Update mode — syncing plugin sections, preserving your preferences". Extract user-managed sections (Identity, Tech Stack, Rules) verbatim for reuse in Phase 3. Skip Phase 2 interview entirely.
   - If exists and `$ARGUMENTS` is "enhance" or no argument: read it, announce "Found existing CLAUDE.md — I'll enhance it". Pre-fill interview answers from existing content.
   - If exists and `$ARGUMENTS` is "overwrite": announce "Will create fresh CLAUDE.md (existing backed up)"
   - If not exists: announce "Creating new CLAUDE.md"
2. Detect all global user skills via Bash:

   ```bash
   find ~/.claude/skills -name "SKILL.md" -maxdepth 3 2>/dev/null
   ```

   - For each found: read frontmatter (name, description) and first paragraph
   - Special handling: `my-coding` → note North Star section, `my-language` → note purpose
3. Detect active marketplace plugin skills from your current session's available skills list:
   - Plugin skills use namespaced format: `<plugin>:<skill>` (e.g., `github-cli:github-cli`, `frontend-design:frontend-design`, `git-master:git-master`)
   - A plugin skill is active if it appears in your available skills list for this session
   - **Always exclude** `ac-skill-creator` and `ac:ac-skill-creator` — user-invoked on demand, must never appear in the generated Skills table
   - For each active plugin skill: note its namespaced name and description for Phase 3
4. Detect global MCP servers via Bash:

   ```bash
   cat ~/.claude/.mcp.json 2>/dev/null
   cat ~/.claude.json 2>/dev/null
   ```

   - `~/.claude/.mcp.json` — plugin-installed MCP servers (e.g., context7 installed by `ac` plugin)
   - `~/.claude.json` — user-global MCP servers: parse the full `mcpServers` object, not just a grep preview
   - For each server: extract name, infer capability from command/args (one-line description), check enabled status
   - Cross-reference with your session's available MCP tools (look for `mcp__<server>__*` tool patterns to confirm active servers)
5. Cross-reference all detected items (user skills, plugin skills, MCP servers) with your current session capabilities — check if you can call specific MCP tools (e.g., try resolving a context7 library), verify agent names appear in your available agent list. This confirms detection accuracy against runtime state.
6. Detect environment via Bash:
   - OS and architecture: `uname -ms`
   - Shell: `echo $SHELL`
   - Common tools: check for `docker`, `git`, `node`, `php`, `dart`, `python3`, `go`
7. Detect global Claude Code settings via Bash:

   ```bash
   cat ~/.claude/settings.json 2>/dev/null
   ```

   - Parse `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
   - Parse `env.CLAUDE_CODE_ENABLE_TASKS`
   - Parse `teammateMode`
   - Mark missing keys for optional safe merge during install

**Error Recovery**: If environment detection fails for any tool (command not found, permission denied), skip that tool entry and continue detection. Do not fail the entire discovery phase due to a single tool detection failure. Note skipped items for the interview phase.

---

## Phase 2: Interview

**Goal**: Gather developer identity, preferences, and workflow rules

**Skip entirely in update mode** — user-managed sections are preserved from existing file. Proceed to Phase 3.

**Actions**:

1. Present Discovery findings first: "Here's what I detected about your environment and existing skills."

2. Ask 4-6 questions via AskUserQuestion. Skip questions already answered by detected skills or pre-filled from existing CLAUDE.md (enhance mode).

**Question 1 — Communication style:**

- "How should I communicate with you?"
- Options:
  - "Expert peer — skip basics, focus on architecture" (Recommended)
  - "Collaborative — explain decisions, discuss trade-offs"
  - "Mentor — explain reasoning, teach patterns"

**Question 2 — Primary tech stack:**

- "What is your primary development stack?"
- Options: PHP/Laravel, Dart/Flutter, TypeScript/Node, Python, Multi-stack (specify)
- Skip if `my-coding` skill already defines this

**Question 3 — Non-negotiable rules:**

- "Which rules must NEVER be violated?"
- multiSelect: true
- Options:
  - "TDD — write failing test first, always"
  - "English only — all code, comments, commits"
  - "Strict types — every parameter and return typed"
  - "Zero suppressions — no @ts-ignore, @phpstan-ignore"
- Include "Other" for custom rules

**Question 4 — Architecture philosophy:**

- "How do you organize business logic?"
- Options: Thin Controllers + Fat Services, Service-Repository, Action classes, Domain-Driven, Other
- Skip if `my-coding` skill already defines this

**Question 5 — Autonomy level:**

- "How autonomous should I be?"
- Options:
  - "Plan-first — always plan non-trivial work before executing" (Recommended)
  - "Balanced — plan complex tasks, execute simple ones directly"
  - "High autonomy — execute and report, ask only when blocked"

**Question 6 — Skills & MCP references** (if additional skills, plugin skills, or MCP servers detected):

- "Found these global extensions. Include references in CLAUDE.md?"
- multiSelect: true
- List each item with name and description:
  - User skills beyond my-coding/my-language: from `~/.claude/skills/` detection
  - Active marketplace plugin skills: from session capabilities (namespaced `<plugin>:<skill>` format) — **never list ac-skill-creator**
  - MCP servers: from `~/.claude/.mcp.json` + `~/.claude.json` mcpServers
- Pre-selected: all enabled items
- Skip this question if only my-coding and my-language detected and no plugin skills active and no extra MCP servers found

**Question 7 — Extra rules:**

- "Any additional rules, pet peeves, or preferences?"
- Free-text response
- Examples: "never auto-commit", "always suggest checkpoints", "use backed enums for everything"

---

## Phase 3: Composition

**Goal**: Map interview answers + detected data to CLAUDE.md sections

**Actions**:

1. Read the template at `${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/global-claude-md-template.md`

2. **Update mode** (skip interview path): Reconstruct the file by combining:
   - **User-managed sections** (verbatim from existing file): Identity block, Tech Stack, Rules
   - **Plugin-managed sections** (regenerated from template + discovery): Workflow Protocol (intent gate, research, task tracking, execution, delegation, verification), Skills table, MCP references
   - This ensures plugin updates (new commands, new agents, new skills) are reflected without losing user preferences

3. **Enhance/New mode** (interview path): Build all sections from interview answers + detected data:
   - **Identity block**: Communication style from Q1
   - **Tech Stack**: From Q2 or detected from `my-coding` skill
   - **Workflow — Intent Gate**: Static table with complexity classification and tool routing. Single BLOCKING REQUIREMENT with intent-based routing: Build/Refactor/Design → `skill: "ac:plan"`, Debug/Investigate/Root Cause → `skill: "ac:deep"`, Critical/Must-not-fail → `skill: "ac:ultra"`. Include concrete example signals for each route. Add fallback: "When in doubt, use ac:plan."
   - **Workflow — Research**: Copy the Research BLOCKING block verbatim from the template. NEVER compress, soften, or summarize — the "Do NOT use Grep, Glob, Read, or WebSearch directly" prohibition must appear word-for-word. This is the primary mechanism that makes Claude delegate to `ac:explore` and `ac:librarian` agents.
   - **Workflow subsections**: Task Tracking, Execution, Delegation, Verification — all using native tool terminology
   - **Skills section**: Merge all approved skills into one table — user skills (my-coding, my-language from `~/.claude/skills/`) and active marketplace plugin skills (namespaced `<plugin>:<skill>` from session). User skills: trigger description from frontmatter. Plugin skills: trigger description from frontmatter. **Never include `ac-skill-creator` or `ac:ac-skill-creator`** — omit entirely regardless of detection. If no skills detected, omit this section
   - **MCP section**: If user approved MCP references in Q6, include all active MCP servers from both `~/.claude/.mcp.json` and `~/.claude.json` mcpServers. For each: `| server-name | one-line capability |`. Only enabled servers. Infer capability from command/args if no description available. Omit if none detected or user declined
   - **Rules section**: Compile from Q3 non-negotiables + Q4 architecture + Q7 extras. Deduplicate against `my-coding` skill rules

4. Count total lines — if over 120, trim Rules section (defer detailed rules to `my-coding` skill reference)

---

## Phase 4: Generation

**Goal**: Produce the final CLAUDE.md content

**Actions**:

1. Generate the file following the template structure
2. Ensure every workflow directive uses official Claude Code tool names:
   - `TodoWrite` not "create a task list"
   - `ac:explore` for codebase exploration, `ac:librarian` for external docs — not "launch an explorer"
   - `skill: "ac:plan"` for planning workflows
   - `skill: "ac:deep"` for debugging/investigation workflows — not "analyze the bug"
   - `AskUserQuestion` not "ask the user"
   - `run_in_background: true` for parallel execution
3. Ensure no duplicate rules — each rule appears exactly once
4. Verify conditional sections:
   - Skills section present only if skills detected
   - Stack section populated from interview or skill detection
   - Rules section compiled from all sources, deduplicated

---

## Phase 5: Review & Install

**Goal**: Present the generated file, iterate, and install

CRITICAL: Do not install without user approval.

**Actions**:

1. Present the generated CLAUDE.md content to the developer
2. Highlight: line count, detected skills referenced, number of rules
3. In update mode: highlight what changed — "Updated: Workflow routing (added ac:ultra), Skills table (added X). Preserved: Identity, Stack, Rules."
4. Ask: "Review this CLAUDE.md. What needs adjustment?"
   - "approve" → Proceed to install
   - "adjust [detail]" → Update and re-present
   - "restart" → Return to Phase 2
4. Once approved:
   - If existing `~/.claude/CLAUDE.md`, backup: `cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak`
   - Write the new file: `~/.claude/CLAUDE.md`
   - If `~/.claude/settings.json` exists or can be created, perform safe merge for background-agent reliability keys:
     - Ensure `env` object exists
     - Add `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"` only if missing
     - Add `env.CLAUDE_CODE_ENABLE_TASKS = "true"` only if missing
     - Never overwrite existing values
     - Never modify existing `teammateMode`
5. Confirm installation:
   - "Global CLAUDE.md installed at `~/.claude/CLAUDE.md`"
   - "It will be injected into every Claude Code conversation automatically."
   - If settings keys were added: "Added missing background-agent settings keys in `~/.claude/settings.json` without changing existing teammateMode or user-defined values."
   - If `my-coding` or `my-language` not detected: "Consider running `/ac:setup-coding` and `/ac:setup-language` to create personalized skills that this CLAUDE.md can reference."
