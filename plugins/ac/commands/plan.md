---
description: Structured planning workflow — classify, research, interview, plan
argument-hint: Feature or task description
effort: high
---

# Structured Planning

You are orchestrating a planning workflow. Classify intent, research the codebase, interview the user, and produce an actionable plan.

**Plan storage**: Plans are stored in `.ac/plans/` relative to the working directory. Save plans as `.ac/plans/$planName.md` where `$planName` is slugified from the request topic. Create the directory if it doesn't exist.

## Core Principles

- **Research before asking**: Use ac:explore agents for codebase patterns and ac:librarian agents for external docs before questioning the user
- **One instruction per question**: Use AskUserQuestion with specific, preference-based options
- **Plan, never implement**: Produce actionable plans with acceptance criteria. Do not write code
- **Adaptive depth**: Scale phases to request complexity
- **Plan-mode safety**: If plan mode is active, follow native plan-mode workflow and use `ExitPlanMode` for approval. If not, stay in standard chat flow with AskUserQuestion

---

## Phase 1: Classify

**Goal**: Determine intent type and complexity

Initial request: $ARGUMENTS

**Actions**:

1. Classify intent type:
   - **Build**: New feature, module, greenfield ("create", "add", "implement")
   - **Refactor**: Restructure existing code ("refactor", "clean up", "restructure")
   - **Mid-sized**: Scoped deliverable, bounded work ("update", "extend")
   - **Architecture**: System design, infrastructure decisions ("how should we structure")
   - **Research**: Investigation needed, path unclear ("explore", "evaluate")
2. Classify complexity:
   - **Simple** (single module, clear target, no design decisions — e.g., rename a field, update a config value): Phase 2 (direct Read, no agents) + Phase 3
   - **Standard** (1-2 modules, some ambiguity or scope to clarify): Phase 2 + 3
   - **Complex** (cross-module, design decisions required, or user explicitly signals complexity): All phases
3. Announce intent and complexity to the user in one line
4. Detect `--loop` flag in $ARGUMENTS. If present: announce "Loop mode active — will auto-execute after plan approval." Strip `--loop` before further processing. Store $loopMode = true.
5. Detect `--deep-review` flag in $ARGUMENTS. If present: announce "Deep Review requested — will run adversarial plan review after generation." Strip `--deep-review` before further processing. Store $deepReview = true.

## Agent Routing

Always use `ac:` prefixed `subagent_type` values — see **Agents** table in `CLAUDE.md`. This command uses: `ac:explore`, `ac:librarian`, `ac:plan-analysis`, `ac:plan-review`.

### Pipeline Profiles

Pipeline depth scales with complexity from Phase 1:

| Stage | Simple | Standard | Complex |
|-------|--------|----------|---------|
| **Research** | Direct Read, 0 explore agents | 1 explore agent | 2-3 explore + librarian |
| **Pre-gen Metis** | Skip | Skip | Yes |
| **Post-gen Analysis** | Skip | Yes (plan-analysis only) | Yes (plan-analysis) |
| **Deep Review** | Skip | Opt-in (user selects) | Offered (recommended) |
| **Verification** | Build+test only | Code-reviewer + linter | Full 3-agent wave |
| **Expected agents** | ~2-3 total | ~4-6 total | ~7-10 total |

This table is the single source of truth — Phase 2, Phase 3, and Complexity Shortcuts reference it. Verification depth is handled by execute.md.

---

## Phase 2: Research

**Goal**: Research codebase patterns and external best practices before interviewing

Research depth is profile-conditional:
- **Simple**: Use direct Read, Glob, Grep on known files. Do not spawn explore agents. Skip Agent Routing by Intent below.
- **Standard and Complex**: Delegate research to ac:explore (codebase) and ac:librarian (external docs). Do not search directly. Agent counts per profile are in the Pipeline Profiles table — use intent routing below for prompt content.

**Actions**:

0. **Task file detection**: If $ARGUMENTS contains `.ac/tasks/` or `/tasks/` in the path, OR the file's YAML frontmatter has `type:` matching `story`, `bug`, `spike`, or `chore`, enter **task mode**:
   - Read the task file. Extract `User Story` + `Acceptance Criteria` as plan requirements.
   - Announce: "Task file detected — entering task mode. Using [task title] as plan input with fresh research."
   - Carry task metadata (type, size, priority, status, source path) forward — include `### Task Context` in the final plan.
   - If task has `### Research Summary` (populated): apply skip-research gate (step 0b).
   - If task has `### Codebase Context` (but no Research Summary): extract file:line references as pre-seeded targets, reduce explore agent count per profile.
   - If task has neither: proceed to step 1 with full research per profile.
0b. **Skip-research gate**: If $ARGUMENTS points to a document with a populated `### Research Summary` (heading present with at least one non-empty line), skip Phase 2 entirely. Announce: "Research already completed — using findings from [source document]." Proceed to Phase 3. Applies to both task files and regular documents.
0c. **Investigation intake**: If the input document contains `### Root Cause` AND `### Evidence` AND `### Affected Files` (ac:investigate output format), enter **investigation mode**:
   - Extract: Root Cause (with confidence), Evidence (file:line refs), Affected Files (role tags), Recommended Fix Approach, Remaining Leads.
   - Map to Research Summary format: Evidence → **Key Files**, Affected Files → **Patterns Found**, Recommended Fix → guiding constraint.
   - High confidence → skip Phase 2, proceed to Phase 3. Medium/Low → run Phase 2 scoped to validate investigation findings.
   - Announce: "Investigation findings detected (confidence: [level]) — using root cause analysis as pre-research."
   - Add `### Investigation Context` to final plan: source investigation, root cause, confidence, key evidence.
1. **Extract my-coding conventions**: Read `~/.claude/skills/my-coding/SKILL.md` if present. Extract: naming conventions, type hints, trailing commas, TDD rules, coding patterns, project-specific style. Store as **MY_CODING_RULES**. If absent → set **MY_CODING_RULES** = empty string, note: "Consider running `/ac:setup-coding`."
2. **Project context extraction**: Read project config files and merge my-coding conventions. Store as **PROJECT_CONTEXT** (max ~3000 tokens — prioritize: conventions > gotchas > build commands > architecture):
   1. Read `./CLAUDE.md` if present — extract: Stack, Rules, Gotchas, Architecture notes, Build/test/lint commands
   2. Read `./CLAUDE.local.md` if present — extract same (private rules override CLAUDE.md on conflict)
   3. Read `.claude/rules/` if present — list via Glob, read each file, extract path-scoped conventions
   4. Merge into **PROJECT_CONTEXT** — deduplicate overlapping rules, keep most specific version
   5. If **MY_CODING_RULES** non-empty: append under "## Personal Coding Conventions" subsection
   6. If **PROJECT_CONTEXT** non-empty: append to every ac:explore agent prompt as a STYLE CONSTRAINTS block:
      ```
      STYLE CONSTRAINTS (from project CLAUDE.md and my-coding skill):
      [PROJECT_CONTEXT content]
      Research WITH these constraints in mind — flag any codebase patterns that conflict with them.
      ```
   7. Carry **PROJECT_CONTEXT** forward to Phase 3 — inject into the plan's `### Conventions` section
3. **Launch research agents** — launch all agents in a single message block (parallel foreground — CC waits for all automatically). Launch ac:explore and ac:librarian in parallel with `subagent_type: "ac:explore"` / `"ac:librarian"`. Each agent targets a different research aspect. Inject **STYLE CONSTRAINTS** block (from step 2) into each prompt if **PROJECT_CONTEXT** is non-empty.

### Agent Routing by Intent

**Simple**: Skip — use direct Read on known files.

**Standard and Complex**: Use routing below. Respect Pipeline Profiles for agent counts.

**Build intent** (Standard: 1 explore; Complex: 2 explore + 1 librarian):

- ac:explore 1: "CONTEXT: Adding [feature] to [project]. GOAL: Match existing conventions. DOWNSTREAM: Plan file structure and code patterns. REQUEST: Find similar implementations — directory structure, naming, config, shared utilities. Include project structure overview. Skip vendor/."
- ac:explore 2: "CONTEXT: Adding [feature] to [project]. GOAL: Understand organizational patterns. DOWNSTREAM: Decide where to place new files. REQUEST: Find how features are organized — controllers, views, routes. Compare 2-3 feature directories."
- ac:librarian: "CONTEXT: Implementing [technology] in production. GOAL: Follow best practices. DOWNSTREAM: Setup and configuration decisions. REQUEST: Official docs for setup, configuration, and common pitfalls. Skip beginner tutorials."

**Refactor intent** (Standard: 1 explore; Complex: 2 explore):

- ac:explore 1: "CONTEXT: Refactoring [target]. GOAL: Map impact scope. DOWNSTREAM: Build safe refactoring plan. REQUEST: Find all usages — call sites, type flow, dynamic access. Return file path, usage pattern, risk level."
- ac:explore 2: "CONTEXT: Modifying [target]. GOAL: Understand test coverage. DOWNSTREAM: Decide whether to add tests first. REQUEST: Find all test files exercising this code, what each asserts, coverage gaps."

**Mid-sized intent** (Standard: 1 explore; Complex: 1 explore + 1 librarian):

- ac:explore: "CONTEXT: Updating [target area] in [project]. GOAL: Understand current implementation and touch points. DOWNSTREAM: Plan scoped changes with minimal blast radius. REQUEST: Find the target implementation, its callers, configuration, and related tests."
- ac:librarian: "CONTEXT: Extending [existing feature] with [capability]. GOAL: Follow established patterns. DOWNSTREAM: Implementation decisions. REQUEST: Official docs for relevant APIs. Focus on migration guides and breaking change notes."

**Architecture intent** (Standard: 1 explore; Complex: 1 explore + 1-2 librarian):

- ac:explore: "CONTEXT: Planning architectural changes. GOAL: Understand current system design. DOWNSTREAM: Identify safe-to-change vs load-bearing boundaries. REQUEST: Find module boundaries, dependency direction, key abstractions, circular deps."
- ac:librarian: "CONTEXT: Designing architecture for [domain]. GOAL: Evaluate trade-offs. DOWNSTREAM: Present concrete options. REQUEST: Best practices, real-world case studies, and common failure modes. Skip generic pattern catalogs."

**Research intent** (Standard: 1 explore; Complex: 1 explore + 1-2 librarian):

- ac:explore: "CONTEXT: Researching [feature]. GOAL: Decide whether to extend or replace. DOWNSTREAM: Recommend a strategy. REQUEST: Find current implementation — edge cases, limitations, TODOs/FIXMEs, whether area is actively evolving."
- ac:librarian 1: "CONTEXT: Implementing [library]. GOAL: Make correct API choices. DOWNSTREAM: Follow intended patterns. REQUEST: API reference, config options, migration guides, common mistakes."
- ac:librarian 2: "CONTEXT: Looking for battle-tested implementations. GOAL: Identify consensus approach. DOWNSTREAM: Avoid reinventing the wheel. REQUEST: OSS projects solving this — architecture, edge cases, test strategy. Skip tutorials."

4. Once all agents return, read key files identified by agents to build deep understanding
5. Summarize findings: patterns found, files to modify, dependencies, external best practices
6. Populate plan draft's `### Research Summary` and `### Conventions` sections. Four subsections: **Key Files** (file:line with one-line descriptions), **Patterns Found** (architecture, naming, organization), **Dependencies** (external libraries/frameworks/services), **Conventions** (naming, file organization, coding style). Max ~30 lines total. Merge **PROJECT_CONTEXT** into **Conventions** — PROJECT_CONTEXT rules take priority over agent-discovered patterns.
7. **Codebase state assessment**: Classify the target area after reading key files:
   - **Disciplined**: Consistent patterns, good test coverage, strong typing → follow existing patterns exactly
   - **Transitional**: Mixed old/new patterns → follow the NEW direction, don't copy legacy
   - **Legacy**: Outdated patterns, weak tests → improve incrementally alongside changes
   - **Chaotic**: No clear patterns, no tests → establish conventions before implementing
   Include as `**Codebase State**: [classification]` in `### Research Summary`. Informs step-level tier decisions — chaotic areas get senior-tier with convention-establishment prerequisites.

**Error Recovery**: If explore agents return empty or insufficient results, proceed to Phase 3 with reduced confidence. Note research gaps in the plan's Risks section. Do not block planning — partial data is better than no plan.

---

## Phase 3: Interview + Plan Output

**Goal**: Gather preferences, then produce the plan

**Actions**:

1. Review research findings and the original request
1b. If Research Summary contains Key Files, ground interview questions in specific file references.
1c. **Pre-generation analysis** (Metis — Complex only, per Pipeline Profiles):
   - Launch plan-analysis in pre-generation mode:
     ```
     Agent(subagent_type: "ac:plan-analysis", prompt: "Pre-generation mode. Request: [original request]. Research findings: [Research Summary content]. Analyze for hidden intentions, unstated requirements, and AI-slop risks. Return directives.")
     ```
   - Read directives from output. Inject MUST DO / MUST NOT DO as plan generation constraints.
   - If agent returns QUESTIONS → merge into interview queue (step 2).
   - Skip for Simple and Standard — pre-gen Metis adds overhead without proportional value for bounded scope.
2. Identify underspecified aspects. Use AskUserQuestion with 2-4 clickable options per question (include any Metis QUESTIONS from step 1c):
   - **Simple**: 1 question max (or skip if clear)
   - **Standard**: 1-2 questions
   - **Complex**: 2-3 questions
3. Ask test strategy if project has test infrastructure and rules require it: TDD (tests first) / Tests after / No tests
4. Flag AI-Slop risks if detected: scope inflation, premature abstraction, over-validation
5. Derive `$planName` from request topic (slugified, e.g., `auth-system`)
6. Plan storage path is `.ac/plans/` (created automatically if missing)
7. Synthesize all findings into a draft plan
8. Each step must include: deliverable description, files to create/modify, acceptance criteria as executable commands, QA Scenario (what to test, expected outcome — e.g., "grep -c 'pattern' file returns ≥2", not "verify it works"), independence (`independent` or `depends on Step N`), and tier (`quick`/`mid`/`senior`)
   - **Tier heuristic**: `quick` = ≤1 file, trivial, no design decisions. `mid` = 1-2 files, standard implementation (default). `senior` = 3+ files, schema/migration, cross-layer, architecture decisions
   - **Quick-tier enrichment**: Write exhaustively explicit descriptions — exact file, exact change, before/after state
9. If TDD rule is active, every implementation step must be preceded by a test step
10. Add a "Must NOT Have" section listing explicit exclusions
11. If plan has 3+ steps, decompose into Waves for `ac:execute`. Wave 1: all independent steps (no shared files/deps) in parallel. Wave 2+: steps depending on Wave 1. Annotate each step with tier inline: `Step N [quick/mid/senior]`. Add "Waves" section to plan file.
12. Save the draft plan to `.ac/plans/$planName.md`

**Plan File Format** (contract with ac:execute):

- `# Plan: [Title]` — H1 with plan name
- `**TL;DR**:` — 1-2 sentence summary
- `**Intent**:` and `**Complexity**:` — classification metadata
- `## Steps` or `### Unit N:` — numbered steps, each with `**Step N**: [title]`, `Files:`, `Done when:`, `QA:` (executable verification), `Independence:`, `Tier:`
- `### Waves` — Wave 1 (no deps, all parallel), Wave 2 (after Wave 1), etc. Each step annotated with tier `[quick/mid/senior]`
- `### Must NOT Have` — explicit exclusions
- `### Risks` — optional
- `### Research Summary` — structured findings (Key Files, Patterns Found, Dependencies, `**Codebase State**: [Disciplined|Transitional|Legacy|Chaotic]`)
- `### Conventions` — (required) merged from **PROJECT_CONTEXT** and explore agent findings; PROJECT_CONTEXT takes priority
- `### Task Context` — (task mode only) source path, type, size, priority, extracted User Story + Acceptance Criteria

### Symbol Verification (if LSP tool available)

Before running the analysis gate, verify key symbols the plan references actually exist:

If LSP available: for each file the plan proposes to modify with known symbol names:
```
LSP(operation="documentSymbol", filePath=<file>, line=1, character=1)
```
→ if expected class/function/interface is missing → revise that plan step before proceeding.

If LSP not available: skip. Note "symbol existence unverified — confirm file structure before implementation" in the plan's Risks section.

**Analysis gate** (profile-conditional — see Pipeline Profiles):

- **Simple**: Skip. 1-2 step plans don't need gap analysis. Proceed to Save and present.
- **Standard and Complex**: Run as described below.

Two flows depending on whether Deep Review was requested ($deepReview flag from Phase 1 or user selection below):

**Standard flow** (no Deep Review): Launch `plan-analysis` alone, wait for results, apply fixes.

```
Agent(subagent_type: "ac:plan-analysis", prompt: "Post-generation mode. Plan file: [plan-file-path]. Run gap classification, AI-slop detection, tier sanity audit, and acceptance criteria audit.")
```

**Deep Review flow**: Launch `plan-analysis` AND `plan-review` in a single message block (parallel foreground — CC waits for all automatically), then merge results before applying fixes.

```
Agent(subagent_type: "ac:plan-analysis", prompt: "Post-generation mode. Plan file: [plan-file-path]. Run gap classification, AI-slop detection, tier sanity audit, and acceptance criteria audit.")
Agent(subagent_type: "ac:plan-review", prompt: "Review plan at [plan-file-path]. Adversarial mode — hunt for flaws, stress-test references, tiers, and executability.")
```

Once all agents return, merge and apply fixes:
- CRITICAL gaps (plan-analysis): add as questions for the user
- MINOR gaps (plan-analysis): fix directly in the plan
- AI-slop findings (plan-analysis): remove or simplify affected steps
- Vague criteria (plan-analysis): replace with executable commands
- REJECT verdict (plan-review, Deep Review only): surface blocking issues with suggested fixes, re-offer "Adjust" / "Execute Anyway"
- OKAY verdict (plan-review, Deep Review only): proceed to present plan, re-offer "Execute" / "Adjust"

Rewrite the plan file with all fixes applied.

**Save and present** (after analysis):

1. Create the plan via TodoWrite with all steps as pending tasks
2. Present the final plan — header block followed by numbered steps, then waves:
   - Header: `## Plan: [Title]`, `**TL;DR**`, `**Intent**`, `**Complexity**`, `**Test Strategy**`, `**Tier Summary**`
   - Each step: `**Step N**: [title]` / `Files:` / `Done when: [executable command + expected output]` / `QA: [action] → [expected outcome]` / `Independence:` / `Tier:`
   - Waves: `Wave 1 (Start Immediately): ├── Step N [tier]: [title]` — one wave per dependency group
   - Footer: `### Must NOT Have`, `### Risks`, `Plan saved to: .ac/plans/$planName.md`

3. Use AskUserQuestion for next step (profile-conditional):
   - **Simple**: Skip — auto-execute.
   - **Standard**: options: `Execute (Recommended)` / `Deep Review` (adversarial plan-reviewer + plan-analysis) / `Adjust`
   - **Complex**: options: `Deep Review (Recommended)` (cross-module plans benefit from adversarial scrutiny) / `Execute` / `Adjust`

If user selects **Execute** (or $loopMode = true), invoke `ac:execute` with the plan file path.

If user selects **Deep Review**: set $deepReview = true and return to the **Analysis gate**. If plan-analysis already ran in Standard flow, launch ONLY `plan-review` on re-entry. If this is the first analysis pass (e.g., `--deep-review` set in Phase 1), run both in parallel per the Deep Review flow. Merge combined output, apply fixes, present the updated plan.

Plan handoff must respect runtime mode:
- If plan mode is active, use `ExitPlanMode` for approval handoff
- If plan mode is not active, use standard chat flow and AskUserQuestion options

=== CRITICAL: PLAN ONLY — DO NOT WRITE CODE ===
Do not write code or modify source files. Only produce the plan.

---

## Complexity Shortcuts

Each complexity level maps to a Pipeline Profile. See Pipeline Profiles table for the authoritative reference.

**Pipeline Profile: Simple** (~2-3 total agents)
- Phase 2: Direct Read/Glob/Grep on known files — no explore agents
- Phase 3: Skip pre-gen Metis. 0-1 questions. Skip analysis gate. Auto-execute.
- Verification: Build+test only

**Pipeline Profile: Standard** (~4-6 total agents)
- Phase 2: 1 ac:explore agent (+ ac:librarian if external docs relevant)
- Phase 3: Skip pre-gen Metis. 1-2 questions. Post-gen analysis gate (plan-analysis only). Deep Review opt-in.
- Verification: Code-reviewer + linter (skip verifier)

**Pipeline Profile: Complex** (~7-10 total agents)
- Phase 2: 2-3 ac:explore + 1 ac:librarian (full research)
- Phase 3: Pre-gen Metis. 2-3 questions. Post-gen analysis gate. Deep Review recommended. Add Risks section.
- Verification: Full 3-agent wave (code-reviewer + linter + verifier)
- Suggest phased execution if steps have dependencies
