---
description: Structured planning workflow — classify, research, interview, plan
argument-hint: Feature or task description
---

# Structured Planning

You are orchestrating a planning workflow. Classify intent, research the codebase, interview the user, and produce an actionable plan.

**Plan storage**: Plans are stored in `.ac/plans/` relative to the working directory. Save plans as `.ac/plans/$planName.md` where `$planName` is slugified from the request topic. Create the directory if it doesn't exist.

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
   - **Simple** (single module, clear target, no design decisions needed — e.g., rename a field, update a config value): Skip to Phase 3
   - **Standard** (1-2 modules, some ambiguity or scope to clarify): Phase 2 + 3
   - **Complex** (cross-module, design decisions required, or user explicitly signals complexity): All phases
3. Announce intent and complexity to the user in one line
4. Detect `--loop` flag in $ARGUMENTS. If present: announce "Loop mode active — will auto-execute after plan approval." Strip `--loop` from arguments before further processing. Store $loopMode = true.

## Agent Routing

Always use `ac:` prefixed `subagent_type` values — see **Agents** table in `CLAUDE.md` for the full routing reference and NOT column. This command uses: `ac:explore`, `ac:librarian`, `ac:plan-analysis`, `ac:plan-review`.

---

## Phase 2: Research

**Goal**: Research codebase patterns AND external best practices before interviewing

Critical: In this phase, use ac:explore and ac:librarian agents for ALL research. Do not use Read, Glob, Grep, or Search tools directly — delegate all codebase exploration to ac:explore agents and all external documentation research to ac:librarian agents.

**Actions**:

0. **Task file detection**: If $ARGUMENTS contains `.ac/tasks/` in the path OR `/tasks/` in the path OR points to a file whose YAML frontmatter has `type:` matching `story`, `bug`, `spike`, or `chore` (pm-base types), enter **task mode**:
   - Read the task file and extract `User Story` + `Acceptance Criteria` sections as the plan's requirements
   - Force Phase 2 research — do NOT skip even if the task file contains a `### Research Summary` section
   - Announce: "Task file detected — entering task mode. Using [task title] as plan input with fresh research."
   - Carry the task's metadata (type, size, priority, status, source path) forward — include a `### Task Context` section in the final plan output showing the source task file path and extracted requirements
   - Then continue to step 1 (skip the skip-research gate below)
0b. **Skip-research gate**: If $ARGUMENTS contains a file path to an existing document, read that document. If it has a populated `### Research Summary` section (heading present with at least one non-empty line under it), skip Phase 2 entirely. Use the document's Research Summary as pre-vetted findings and announce: "Research already completed — using findings from [source document]." Proceed directly to Phase 3.
0c. **Investigation intake**: If the input document (from $ARGUMENTS or inline context) contains investigation findings — identified by presence of `### Root Cause` AND `### Evidence` AND `### Affected Files` sections (ac:investigate output format) — enter **investigation mode**:
   - Extract: Root Cause (with confidence level), Evidence (file:line references), Affected Files (with role tags), Recommended Fix Approach, and Remaining Leads (if present)
   - Map investigation sections to Research Summary format: Evidence → **Key Files**, Affected Files → **Patterns Found** (role-tagged impact map), Recommended Fix Approach → plan's guiding constraint
   - Set investigation confidence: if High → skip Phase 2 entirely, proceed to Phase 3 with pre-vetted findings. If Medium/Low → run Phase 2 but scope agents to validate/extend investigation findings rather than fresh exploration
   - Announce: "Investigation findings detected (confidence: [level]) — using root cause analysis as pre-research."
   - Add `### Investigation Context` to the final plan output showing: source investigation, root cause, confidence, key evidence
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
3. Populate the plan draft's `### Research Summary` and `### Conventions` sections with findings. Four subsections: **Key Files** (file:line references with one-line descriptions), **Patterns Found** (architecture, naming, code organization), **Dependencies** (external libraries/frameworks/services), **Conventions** (naming patterns, file organization, coding style). Format must be structured — maximum ~30 lines total.
4. **Codebase state assessment**: After reading key files from agent findings, classify the target area's codebase state and code quality:
   - **Disciplined**: Consistent patterns, good test coverage, strong typing → follow existing patterns exactly
   - **Transitional**: Mixed old/new patterns coexisting → follow the NEW pattern direction, don't copy legacy
   - **Legacy**: Outdated patterns, weak tests, loose typing → improve incrementally alongside changes
   - **Chaotic**: No clear patterns, no tests → establish conventions before implementing
   Include the classification in the plan's `### Research Summary` under a `**Codebase State**:` line. This classification informs step-level decisions: disciplined areas get quick-tier steps, chaotic areas get senior-tier with convention-establishment prerequisites.

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
6. Plan storage path is `.ac/plans/` (created automatically if missing)
6b. **Pre-generation analysis** (Metis — for Standard and Complex only):
   - Launch plan-analysis agent in pre-generation mode:
     ```
     Agent(subagent_type: "ac:plan-analysis", prompt: "Pre-generation mode. Request: [original request]. Research findings: [Research Summary content]. Analyze for hidden intentions, unstated requirements, and AI-slop risks. Return directives.")
     ```
   - Read directives from agent output
   - Inject MUST DO / MUST NOT DO directives as constraints for plan generation
   - If agent returns QUESTIONS → add them to the interview question queue (ask user before generating plan)
   - Skip for Simple complexity (not worth the overhead)
7. Synthesize all findings into a draft plan
8. Each step must include: clear deliverable description, files to create/modify, acceptance criteria as executable commands (not "verify it works"), QA Scenario per step as executable verification (what to test, expected outcome — e.g., "grep -c 'pattern' file returns ≥2", not "verify it works"), independence (`independent` or `depends on Step N`), and tier assignment (`quick`/`mid`/`senior`)
   - **Tier heuristic**: `quick` = ≤1 file, trivial change, no design decisions. `mid` = 1-2 files, standard implementation (default). `senior` = 3+ files, schema/migration, cross-layer, architecture decisions
   - **Quick-tier enrichment**: Write exhaustively explicit descriptions — exact file, exact change, before/after state. The executing model optimizes for speed; compensate with prompt precision
9. If TDD rule is active, every implementation step must be preceded by a test step
10. Add a "Must NOT Have" section listing explicit exclusions
11. If plan has 3+ steps, decompose into Waves for `ac:execute`. Wave 1: all independent steps (no shared files/deps) run in parallel. Wave 2+: steps depending on Wave 1. No shared state between sibling waves. Annotate each step with tier inline: `Step N [quick/mid/senior]`. Add "Waves" section to plan file.
12. Save the draft plan to `.ac/plans/$planName.md`

**Plan File Format** (contract with ac:execute):

Plans must follow this exact structure for ac:execute compatibility:
- `# Plan: [Title]` — H1 with plan name
- `**TL;DR**:` — 1-2 sentence summary
- `**Intent**:` and `**Complexity**:` — classification metadata
- `## Steps` or `### Unit N:` — numbered steps, each with `**Step N**: [title]`, `Files:`, `Done when:`, `QA:` (QA Scenario — executable verification), `Independence:`, `Tier:` (quick→Haiku, mid→Sonnet, senior→Opus)
- `### Waves` — wave-based parallel decomposition: Wave 1 (no deps, all parallel), Wave 2 (after Wave 1), etc. Each step annotated with tier `[quick/mid/senior]`
- `### Must NOT Have` — explicit exclusions
- `### Risks` — optional risk section
- `### Research Summary` — structured findings from Phase 2 (Key Files, Patterns Found, Dependencies)
- `### Conventions` — naming patterns, file organization, coding style detected from explore agents
- `### Task Context` — (task mode only) source task file path, type, size, priority, extracted User Story + Acceptance Criteria

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

1. Launch the `plan-analysis` agent via the Agent tool with `subagent_type: "ac:plan-analysis"`. In the prompt, provide the plan file path. This runs gap classification, AI-slop detection, tier sanity audit, and acceptance criteria audit on a fresh Opus context
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
**Tier Summary**: N quick / N mid / N senior

### Steps

1. [Step title]
   Files: [file paths]
   Done when: [executable verification command + expected output]
   QA: [action] → [expected outcome] (QA Scenario)
   Independence: [independent / depends on Step N]
   Tier: [quick / mid / senior]

2. ...

### Waves (for ac:execute)

Wave 1 (Start Immediately):
├── Step 1 [quick]: [title]
├── Step 2 [quick]: [title]
└── Step 3 [mid]: [title]

Wave 2 (After Wave 1):
├── Step 4 [senior]: [title]
└── Step 5 [mid]: [title]

Wave 3 (After Wave 2):
└── Step 6 [mid]: [title]

### Must NOT Have
- [Explicit exclusion / AI-slop guardrail]

### Risks
- [Risk and mitigation, if any]

Plan saved to: .ac/plans/$planName.md
```

1. Use AskUserQuestion to get user decision:

```
question: "Plan is ready. How would you like to proceed?"
header: "Next Step"
options:
  - label: "Execute (Recommended)"
    description: "Launch ac:execute with tier-based model routing. Workers spawn as Haiku/Sonnet/Opus per step tier."
  - label: "Deep Review"
    description: "Launch adversarial plan-reviewer (Momus-class) to stress-test references, tiers, and executability before committing."
  - label: "Adjust"
    description: "Modify specific parts of the plan."
```

If user selects **Execute** (or $loopMode is true from --loop — auto-execute without asking), invoke `ac:execute` with the plan file path.

If user selects **Deep Review**:
1. Launch plan-review agent: `Agent(subagent_type: "ac:plan-review", prompt: "Review plan at [plan-file-path]. Adversarial mode — hunt for flaws.")`
2. Present the verdict to the user
3. If OKAY → re-offer: "Execute" / "Adjust"
4. If REJECT → show blocking issues with suggested fixes, then offer: "Adjust" / "Execute Anyway"

Plan handoff must respect runtime mode:
- If plan mode is active, use `ExitPlanMode` for approval handoff
- If plan mode is not active, use standard chat flow and AskUserQuestion options

=== CRITICAL: PLAN ONLY — DO NOT WRITE CODE ===
Do not write code or modify source files. Only produce the plan.

---

## Complexity Shortcuts

For **Simple** requests (single module, clear target, no design decisions):

1. Skip Phase 2 (research)
2. Identify affected files directly
3. Create a 3-4 step plan via TodoWrite
4. **Analysis gate: skip for Simple** (1-2 step plans don't need gap analysis)
5. Save and present to user

For **Standard** requests (1-2 modules, some ambiguity or scope to clarify):

- Run Phase 2 with 1-2 ac:explore agents + 1 ac:librarian agent (if external docs relevant), then Phase 3

For **Complex** requests (cross-module, design decisions required, or user explicitly signals complexity):

- Run all phases with 2-3 ac:explore agents + 1-2 ac:librarian agents and deeper interview
- Add Risks section with specific failure scenarios
- Suggest phased execution if steps have dependencies
