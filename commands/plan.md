---
description: Structured planning workflow — classify, research, interview, plan
argument-hint: Feature or task description
model: opus
---

# Structured Planning

You are orchestrating a planning workflow. Classify intent, research the codebase, interview the user, and produce an actionable plan.

**Plan storage**: Derive project path from the auto memory directory injected in your system prompt (e.g., `~/.claude/projects/<cwd-hash>/memory/`). Save plans to the sibling `plans/` directory: `~/.claude/projects/<cwd-hash>/plans/$planName.md`.

## Core Principles

- **Research before asking**: Use ac:explore agents for codebase patterns and ac:librarian agents for external docs before questioning the user
- **One instruction per question**: Use AskUserQuestion with specific, preference-based options
- **Plan, never implement**: Produce actionable plans with acceptance criteria. Do not write code
- **Adaptive depth**: Scale phases to request complexity

---

## Phase 1: Classify

**Goal**: Determine intent type and complexity

Initial request: $ARGUMENTS

**Actions**:

1. Classify the intent type:
   - **Build**: New feature, module, greenfield ("create", "add", "implement")
   - **Refactor**: Restructure existing code ("refactor", "clean up", "restructure")
   - **Mid-sized**: Scoped deliverable, bounded work ("update", "extend")
   - **Architecture**: System design, infrastructure decisions ("how should we structure")
   - **Research**: Investigation needed, path unclear ("explore", "evaluate")
2. Classify complexity:
   - **Simple** (1-2 files, clear scope): Skip to Phase 3
   - **Standard** (2-5 files, single module): Phase 2 + 3
   - **Complex** (5+ files, cross-layer, design decisions): All phases
3. Announce intent and complexity to the user in one line

---

## Phase 2: Research

**Goal**: Research codebase patterns AND external best practices before interviewing

Critical: In this phase, use ac:explore and ac:librarian agents for ALL research. Do not use Read, Glob, Grep, or Search tools directly — delegate all codebase exploration to ac:explore agents and all external documentation research to ac:librarian agents.

**Actions**:

1. Check for project rules — invoke `skill: "my-coding"` if it exists
2. Launch ac:explore and ac:librarian agents in parallel (single message, multiple Agent tool calls). Each agent should target a different aspect of the research. Use the intent routing below to determine which agents to launch.

### Agent Routing by Intent

**Build intent**:
Launch 2 ac:explore agents + 1 ac:librarian agent in parallel. Each agent should:

- Target a different aspect of the codebase or documentation
- Include a list of key files to read in their findings

**Example agent prompts**:

- ac:explore 1: "CONTEXT: Adding [feature] to [project]. GOAL: Match existing conventions. DOWNSTREAM: Plan file structure and code patterns. REQUEST: Find similar implementations — directory structure, naming, config, shared utilities. Include project structure overview (composer.json, routes, models, migrations). Skip vendor/."
- ac:explore 2: "CONTEXT: Adding [feature] to [project]. GOAL: Understand organizational patterns. DOWNSTREAM: Decide where to place new files. REQUEST: Find how features are organized — controllers, views, routes registration. Compare 2-3 feature directories."
- ac:librarian: "CONTEXT: Implementing [technology] in production. GOAL: Follow best practices. DOWNSTREAM: Setup and configuration decisions. REQUEST: Find official docs for setup, configuration, and common pitfalls. Skip beginner tutorials."

**Refactor intent**:
Launch 2 ac:explore agents in parallel:

**Example agent prompts**:

- ac:explore 1: "CONTEXT: Refactoring [target]. GOAL: Map impact scope. DOWNSTREAM: Build safe refactoring plan. REQUEST: Find all usages — call sites, type flow, dynamic access. Return file path, usage pattern, risk level."
- ac:explore 2: "CONTEXT: Modifying [target]. GOAL: Understand test coverage. DOWNSTREAM: Decide whether to add tests first. REQUEST: Find all test files exercising this code, what each asserts, coverage gaps."

**Architecture intent**:
Launch 1 ac:explore agent + 1-2 ac:librarian agents in parallel:

**Example agent prompts**:

- ac:explore: "CONTEXT: Planning architectural changes. GOAL: Understand current system design. DOWNSTREAM: Identify safe-to-change vs load-bearing boundaries. REQUEST: Find module boundaries, dependency direction, key abstractions, circular deps."
- ac:librarian: "CONTEXT: Designing architecture for [domain]. GOAL: Evaluate trade-offs. DOWNSTREAM: Present concrete options. REQUEST: Find best practices, real-world case studies, and common failure modes. Skip generic pattern catalogs."

**Research intent**:
Launch 1 ac:explore agent + 1-2 ac:librarian agents in parallel:

**Example agent prompts**:

- ac:explore: "CONTEXT: Researching [feature]. GOAL: Decide whether to extend or replace. DOWNSTREAM: Recommend a strategy. REQUEST: Find current implementation — edge cases, limitations, TODOs/FIXMEs, whether area is actively evolving."
- ac:librarian 1: "CONTEXT: Implementing [library]. GOAL: Make correct API choices. DOWNSTREAM: Follow intended patterns. REQUEST: Find API reference, config options, migration guides, common mistakes."
- ac:librarian 2: "CONTEXT: Looking for battle-tested implementations. GOAL: Identify consensus approach. DOWNSTREAM: Avoid reinventing the wheel. REQUEST: Find OSS projects solving this — architecture, edge cases, test strategy. Skip tutorials."

1. Once agents return, read all key files identified by agents to build deep understanding
2. Summarize findings: patterns found, files to modify, dependencies, external best practices discovered

---

## Phase 3: Interview + Plan Output

**Goal**: Gather preferences, then produce the plan

**Actions**:

1. Review research findings and the original request
2. Identify underspecified aspects. Use AskUserQuestion with 2-4 clickable options per question:
   - **Simple**: 1 question max (or skip if clear)
   - **Standard**: 1-2 questions
   - **Complex**: 2-3 questions
3. Ask test strategy if project has test infrastructure and rules require it:
   - TDD (tests first) / Tests after / No tests
4. Flag AI-Slop risks if detected:
   - Scope inflation: "Should tests cover beyond [target]?"
   - Premature abstraction: "Inline or extract to utility?"
   - Over-validation: "Minimal or comprehensive error handling?"
5. Derive `$planName` from request topic (slugified, e.g., `auth-system`)
6. Derive plan storage path from auto memory directory (replace `memory/` with `plans/`)
7. Synthesize all findings into a draft plan
8. Each step must include:
   - Clear deliverable description
   - Files to create or modify
   - Acceptance criteria as executable commands (not "verify it works")
   - Independence: `independent` (no shared files/state with other steps) or `depends on Step N` (reason)
9. If TDD rule is active, every implementation step must be preceded by a test step
10. Add a "Must NOT Have" section listing explicit exclusions
11. If plan has 3+ steps, decompose into Work Units for `ac:execute`:
    - Group independent steps (no shared files, no dependency) into parallel units
    - Merge dependent steps into single sequential units
    - Each unit must be implementable in an isolated git worktree (no shared state with sibling units)
    - Each unit must be mergeable on its own
    - Add "Work Units" section to plan file
12. Save the draft plan to `~/.claude/projects/<cwd-hash>/plans/$planName.md`

**Analysis gate** (mandatory before presenting to user):

1. Launch the `plan-analysis` agent via the Agent tool with `subagent_type: "plan-analysis"`. In the prompt, provide the plan file path. This runs gap classification, AI-slop detection, and acceptance criteria audit on a fresh Sonnet context
2. Read the analysis agent's output. Apply all fixes:
    - CRITICAL gaps: add as questions for the user
    - MINOR gaps: fix directly in the plan
    - AI-slop findings: remove or simplify affected steps
    - Vague criteria: replace with executable commands
3. Rewrite the plan file with all fixes applied

**Save and present** (after analysis):

1. Create the plan via TodoWrite with all steps as pending tasks
2. Present the final plan to the user in this format:

```
## Plan: [Feature Name]

**TL;DR**: [1-2 sentence summary]
**Intent**: [Build/Refactor/Mid-sized/Architecture/Research] | **Complexity**: [Simple/Standard/Complex]
**Test Strategy**: [TDD/Tests after/None]

### Steps

1. [Step title]
   Files: [file paths]
   Done when: [executable verification command + expected output]
   Independence: [independent / depends on Step N]

2. ...

### Work Units (for ac:execute)

Unit 1: [descriptive name]
- Steps: [step numbers]
- Files: [non-overlapping file list]
- Verification: [command]

Unit 2: [descriptive name]
- Steps: [step numbers]
- Files: [non-overlapping file list]
- Verification: [command]

Sequential: [step numbers that must run after parallel units, if any]

### Must NOT Have
- [Explicit exclusion / AI-slop guardrail]

### Risks
- [Risk and mitigation, if any]

Plan saved to: ~/.claude/projects/<cwd-hash>/plans/$planName.md
```

1. Use AskUserQuestion to get user decision:

```
question: "Plan is ready. How would you like to proceed?"
header: "Next Step"
options:
  - label: "Proceed (Recommended)"
    description: "Approve the plan and begin implementation."
  - label: "Execute (Parallel)"
    description: "Launch parallel worktree agents to execute independent steps concurrently."
  - label: "Plan Review"
    description: "Launch plan-review agent to verify references and executability."
  - label: "Adjust"
    description: "Modify specific parts of the plan."
```

If user selects **Execute (Parallel)**, invoke `ac:execute` with the plan file path.

CRITICAL: Do not write code or modify source files during planning. Only produce the plan.

---

## Complexity Shortcuts

For **Simple** requests:

1. Skip Phase 2 (research)
2. Identify affected files directly
3. Create a 3-4 step plan via TodoWrite
4. Save and present to user

For **Standard** requests:

- Run Phase 2 with 1-2 ac:explore agents + 1 ac:librarian agent (if external docs relevant), then Phase 3

For **Complex** requests:

- Run all phases with 2-3 ac:explore agents + 1-2 ac:librarian agents and deeper interview
- Add Risks section with specific failure scenarios
- Suggest phased execution if steps have dependencies
