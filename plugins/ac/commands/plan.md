---
description: Structured planning workflow — classify, research, interview, plan
argument-hint: Feature or task description
model: opus
---

# Structured Planning

You are orchestrating a planning workflow. Classify intent, research the codebase, interview the user, and produce an actionable plan.

**Plan storage**: Your auto memory directory appears in your system prompt (e.g., `/Users/user/.claude/projects/-Users-user-Code-project/memory/`). Replace the trailing `memory/` with `plans/` to derive the plan storage path. Save plans as `plans/$planName.md` where `$planName` is slugified from the request topic.

## Core Principles

- **Research before asking**: Use ac:explore agents for codebase patterns and ac:librarian agents for external docs before questioning the user
- **One instruction per question**: Use AskUserQuestion with specific, preference-based options
- **Plan, never implement**: Produce actionable plans with acceptance criteria. Do not write code
- **Adaptive depth**: Scale phases to request complexity
- **Plan-mode safety**: Respect Claude Code runtime mode. If plan mode is active, follow native plan-mode workflow and use `ExitPlanMode` for approval. If plan mode is not active, stay in standard chat flow with AskUserQuestion for decisions

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

## Agent Routing

Always use `ac:` prefixed `subagent_type` values — see **Agents** table in `CLAUDE.md` for the full routing reference and NOT column. This command uses: `ac:explore`, `ac:librarian`, `ac:plan-analysis`, `ac:plan-review`.

---

## Phase 2: Research

**Goal**: Research codebase patterns AND external best practices before interviewing

Critical: In this phase, use ac:explore and ac:librarian agents for ALL research. Do not use Read, Glob, Grep, or Search tools directly — delegate all codebase exploration to ac:explore agents and all external documentation research to ac:librarian agents.

**Actions**:

0. **Skip-research gate**: If $ARGUMENTS contains a file path to an existing document, read that document. If it has a populated `### Research Summary` section (heading present with at least one non-empty line under it), skip Phase 2 entirely. Use the document's Research Summary as pre-vetted findings and announce: "Research already completed — using findings from [source document]." Proceed directly to Phase 3.
1. Check if `my-coding` skill exists (look for `~/.claude/skills/my-coding/SKILL.md`). If found, load it for coding standards alignment. If not found, skip and note to user: "Consider running `/ac:setup-coding` to create personalized coding rules."
2. Launch ac:explore and ac:librarian agents in parallel (single message, multiple Agent tool calls with `subagent_type: "ac:explore"` and `subagent_type: "ac:librarian"`). Each agent should target a different aspect of the research. Use the intent routing below to determine which agents to launch.

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
3. Populate the plan draft's `### Research Summary` and `### Conventions` sections with findings:
   - **Key Files**: file:line references with one-line descriptions of what each file contains
   - **Patterns Found**: Architectural patterns, naming conventions, code organization discovered
   - **Dependencies**: External libraries, frameworks, or services identified
   - **Conventions**: Detected naming patterns, file organization style, coding conventions
   Format must be structured (not raw agent output) — maximum ~30 lines total.

**Error Recovery**: If ac:explore agents return empty or insufficient results, proceed to Phase 3 with reduced confidence. Note research gaps in the plan's Risks section and flag them to the user during review. Do not block planning due to incomplete research — partial data is better than no plan.

---

## Phase 3: Interview + Plan Output

**Goal**: Gather preferences, then produce the plan

**Actions**:

1. Review research findings and the original request
1b. If Research Summary contains Key Files, use them to ground interview questions in specific file references rather than abstract concepts.
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
    - Each unit must have no shared state with sibling units
    - Each unit must be independently verifiable
    - Add "Work Units" section to plan file
12. Save the draft plan to `~/.claude/projects/<cwd-hash>/plans/$planName.md`

**Plan File Format** (contract with ac:execute):

Plans must follow this exact structure for ac:execute compatibility:
- `# Plan: [Title]` — H1 with plan name
- `**TL;DR**:` — 1-2 sentence summary
- `**Intent**:` and `**Complexity**:` — classification metadata
- `## Steps` or `### Unit N:` — numbered steps, each with:
  - `**Step N**: [title]` heading
  - `Files:` list of files to modify
  - `Done when:` executable acceptance criteria
  - `Independence:` independent or depends on Step N
- `### Work Units` — parallel decomposition with Unit entries containing Steps, Files, Verification
- `### Must NOT Have` — explicit exclusions
- `### Risks` — optional risk section
- `### Research Summary` — structured findings from Phase 2:
  - `Key Files` — file:line references with one-line description of what each contains
  - `Patterns Found` — convention bullets (architecture, naming, code organization)
  - `Dependencies` — external libraries, frameworks, or services identified
- `### Conventions` — naming patterns, file organization, coding style detected from explore agents

### Symbol Verification (if LSP tool available)

Before running the analysis gate, verify key symbols the plan references actually exist:

If LSP tool is available:
  For each file the plan proposes to modify with known symbol names:
  ```
  LSP(operation="documentSymbol", filePath=<file>, line=1, character=1)
  ```
  → if expected class/function/interface is missing → revise that plan step before proceeding

If LSP tool is not available:
  Skip this step. Note "symbol existence unverified — confirm file structure before implementation"
  in the plan's Risks section.

Do not present a plan that references symbols verified-missing by LSP.

**Analysis gate** (mandatory before presenting to user):

1. Launch the `plan-analysis` agent via the Agent tool with `subagent_type: "ac:plan-analysis"`. In the prompt, provide the plan file path. This runs gap classification, AI-slop detection, and acceptance criteria audit on a fresh Sonnet context
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
    description: "Launch parallel background agents to execute independent steps concurrently."
  - label: "Plan Review"
    description: "Launch plan-review agent to verify references and executability."
  - label: "Adjust"
    description: "Modify specific parts of the plan."
```

If user selects **Execute (Parallel)**, invoke `ac:execute` with the plan file path.

Plan handoff must respect runtime mode:
- If plan mode is active, use `ExitPlanMode` for approval handoff
- If plan mode is not active, use standard chat flow and AskUserQuestion options

CRITICAL: Do not write code or modify source files during planning. Only produce the plan.

---

## Complexity Shortcuts

For **Simple** requests:

1. Skip Phase 2 (research)
2. Identify affected files directly
3. Create a 3-4 step plan via TodoWrite
4. **Analysis gate: skip for Simple** (1-2 step plans don't need gap analysis)
5. Save and present to user

For **Standard** requests:

- Run Phase 2 with 1-2 ac:explore agents + 1 ac:librarian agent (if external docs relevant), then Phase 3

For **Complex** requests:

- Run all phases with 2-3 ac:explore agents + 1-2 ac:librarian agents and deeper interview
- Add Risks section with specific failure scenarios
- Suggest phased execution if steps have dependencies
