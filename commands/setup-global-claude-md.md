---
description: Interactive global CLAUDE.md generator — interviews developer, detects skills, produces orchestration config
argument-hint: enhance or overwrite (optional)
model: opus
---

# Setup Global CLAUDE.md

You are orchestrating an interactive session to build the developer's global `~/.claude/CLAUDE.md` file. This file is injected as user-rules in every Claude Code conversation. The goal: turn Claude Code into a structured orchestrator by shaping how it uses its native tools (TodoWrite, Agent, EnterPlanMode, AskUserQuestion).

## Core Principles

- **Lean map, not encyclopedia**: Target ≤120 lines. Delegate details to skills and project-level CLAUDE.md
- **Progressive disclosure**: Global file = identity + workflow + rules. Stack details → `my-coding` skill. Writing details → `my-language` skill
- **Native tool orchestration**: Every workflow directive must reference Claude Code's actual tools, not abstract concepts
- **Observe before asking**: Detect existing skills and environment first, then interview

---

## Phase 1: Discovery

**Goal**: Detect existing configuration and environment

**Actions**:

1. Check if `~/.claude/CLAUDE.md` exists:
   - If exists and `$ARGUMENTS` is not "overwrite": read it, announce "Found existing CLAUDE.md — I'll enhance it"
   - If exists and `$ARGUMENTS` is "overwrite": announce "Will create fresh CLAUDE.md (existing backed up)"
   - If not exists: announce "Creating new CLAUDE.md"
2. Detect all global skills via Bash:

   ```bash
   find ~/.claude/skills -name "SKILL.md" -maxdepth 3 2>/dev/null
   ```

   - For each found: read frontmatter (name, description) and first paragraph
   - Special handling: `my-coding` → note North Star section, `my-language` → note purpose
3. Detect global MCP servers via Bash:

   ```bash
   cat ~/.claude/.mcp.json 2>/dev/null
   cat ~/.claude.json 2>/dev/null | grep -A5 '"mcpServers"'
   ```

   - Both `~/.claude/.mcp.json` and `~/.claude.json` can define global MCP servers
   - Parse each server: name, command, enabled status
4. Cross-reference file-detected items with your current session capabilities — check if you can call specific MCP tools (e.g., try resolving a context7 library), verify agent names appear in your available agent list. This confirms detection accuracy against runtime state.
5. Detect environment via Bash:
   - OS and architecture: `uname -ms`
   - Shell: `echo $SHELL`
   - Common tools: check for `docker`, `git`, `node`, `php`, `dart`, `python3`, `go`
6. Detect global Claude Code settings via Bash:

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

**Actions**:

1. Present Discovery findings first: "Here's what I detected about your environment and existing skills."

2. Ask 4-6 questions via AskUserQuestion. Skip questions already answered by detected skills.

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

**Question 6 — Skills & MCP references** (if additional skills or MCP servers detected beyond my-coding/my-language):

- "Found these global extensions. Include references in CLAUDE.md?"
- multiSelect: true
- List each detected skill/MCP with name and description from frontmatter
- Pre-selected: all enabled items
- Skip this question if only my-coding and my-language detected (they're already handled)

**Question 7 — Extra rules:**

- "Any additional rules, pet peeves, or preferences?"
- Free-text response
- Examples: "never auto-commit", "always suggest checkpoints", "use backed enums for everything"

---

## Phase 3: Composition

**Goal**: Map interview answers + detected data to CLAUDE.md sections

**Actions**:

1. Read the template at `${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/global-claude-md-template.md`
2. Build sections:
   - **Identity block**: Communication style from Q1
   - **Tech Stack**: From Q2 or detected from `my-coding` skill
   - **Workflow — Intent Gate**: Static table with complexity classification and tool routing. Single BLOCKING REQUIREMENT with intent-based routing: Build/Refactor/Design → `skill: "ac:plan"`, Debug/Investigate/Root Cause → `skill: "ac:deep"`. Include concrete example signals for each route. Add fallback: "When in doubt, use ac:plan."
   - **Workflow — Research**: Copy the Research BLOCKING block verbatim from the template. NEVER compress, soften, or summarize — the "Do NOT use Grep, Glob, Read, or WebSearch directly" prohibition must appear word-for-word. This is the primary mechanism that makes Claude delegate to `ac:explore` and `ac:librarian` agents.
   - **Workflow subsections**: Task Tracking, Execution, Delegation, Verification — all using native tool terminology
   - **Skills section**: Include all detected skills from Phase 1. Use table format with skill name and "Load When" column. If additional skills approved in Q6, add them. If no skills detected, omit this section
    - **MCP section**: If user approved MCP references in Q6, add a concise MCP reference block listing server name and capability. Only enabled servers. Format: `MCP: <server> — <capability>`
    - **Rules section**: Compile from Q3 non-negotiables + Q4 architecture + Q7 extras. Deduplicate against `my-coding` skill rules
3. Count total lines — if over 120, trim Rules section (defer detailed rules to `my-coding` skill reference)

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
3. Ask: "Review this CLAUDE.md. What needs adjustment?"
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
