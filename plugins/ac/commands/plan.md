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
   - **Simple** (single module, clear target, no design decisions needed — e.g., rename a field, update a config value): Phase 2 (direct Read, no agents) + Phase 3
   - **Standard** (1-2 modules, some ambiguity or scope to clarify): Phase 2 + 3
   - **Complex** (cross-module, design decisions required, or user explicitly signals complexity): All phases
3. Announce intent and complexity to the user in one line
4. Detect `--loop` flag in $ARGUMENTS. If present: announce "Loop mode active — will auto-execute after plan approval." Strip `--loop` from arguments before further processing. Store $loopMode = true.
5. Detect `--deep-review` flag in $ARGUMENTS. If present: announce "Deep Review requested — will run adversarial plan review after generation." Strip `--deep-review` from arguments before further processing. Store $deepReview = true.

## Agent Routing

Always use `ac:` prefixed `subagent_type` values — see **Agents** table in `CLAUDE.md` for the full routing reference and NOT column. This command uses: `ac:explore`, `ac:librarian`, `ac:plan-analysis`, `ac:plan-review`.

### Pipeline Profiles

Pipeline depth scales with complexity classification from Phase 1. Each profile defines what the planning pipeline includes at every stage:

| Stage | Simple | Standard | Complex |
|-------|--------|----------|---------|
| **Research** | Direct Read, 0 explore agents | 1 explore agent | 2-3 explore + librarian |
| **Pre-gen Metis** | Skip | Skip | Yes |
| **Post-gen Analysis** | Skip | Yes (plan-analysis only) | Yes (plan-analysis) |
| **Deep Review** | Skip | Opt-in (user selects) | Offered (recommended) |
| **Verification** | Build+test only | Code-reviewer + linter | Full 3-agent wave |
| **Expected agents** | ~2-3 total | ~4-6 total | ~7-10 total |

This table is the single source of truth — Phase 2, Phase 3, and Complexity Shortcuts reference it. Verification depth is handled by execute.md (already implemented).

---

## Phase 2: Research

**Goal**: Research codebase patterns AND external best practices before interviewing

Research depth is profile-conditional (see Pipeline Profiles table for agent counts):
- **Simple complexity**: Use direct Read, Glob, Grep on known files. Do not spawn explore agents — the target is already clear from Phase 1 classification. Skip the Agent Routing by Intent section below entirely
- **Standard and Complex complexity**: Use ac:explore and ac:librarian agents for research. Do not use Read, Glob, Grep, or Search tools directly — delegate all codebase exploration to ac:explore agents and all external documentation research to ac:librarian agents. Agent counts per profile are defined in the Pipeline Profiles table — use the intent routing below to determine prompt content, but respect the profile's agent count limits

**Actions**:

0. **Task file detection**: If $ARGUMENTS contains `.ac/tasks/` in the path OR `/tasks/` in the path OR points to a file whose YAML frontmatter has `type:` matching `story`, `bug`, `spike`, or `chore` (pm-base types), enter **task mode**:
   - Read the task file and extract `User Story` + `Acceptance Criteria` sections as the plan's requirements
   - Announce: "Task file detected — entering task mode. Using [task title] as plan input with fresh research."
   - Carry the task's metadata (type, size, priority, status, source path) forward — include a `### Task Context` section in the final plan output showing the source task file path and extracted requirements
   - If task file contains a `### Research Summary` section (populated): apply the skip-research gate below (step 0b) — skip Phase 2, use existing findings
   - If task file contains a `### Codebase Context` section (but no Research Summary): extract file:line references as pre-seeded exploration targets. Reduce explore agent count per the Pipeline Profile (e.g., Standard: 1 explore with pre-seeded targets instead of fresh exploration)
   - If task file has neither Research Summary nor Codebase Context: proceed to step 1 with full research per Pipeline Profile
0b. **Skip-research gate**: If $ARGUMENTS points to a document with a populated `### Research Summary` section (heading present with at least one non-empty line under it), skip Phase 2 entirely. Use the document's Research Summary as pre-vetted findings and announce: "Research already completed — using findings from [source document]." Proceed directly to Phase 3. This gate applies to both task files and regular documents.
0c. **Investigation intake**: If the input document (from $ARGUMENTS or inline context) contains investigation findings — identified by presence of `### Root Cause` AND `### Evidence` AND `### Affected Files` sections (ac:investigate output format) — enter **investigation mode**:
   - Extract: Root Cause (with confidence level), Evidence (file:line references), Affected Files (with role tags), Recommended Fix Approach, and Remaining Leads (if present)
   - Map investigation sections to Research Summary format: Evidence → **Key Files**, Affected Files → **Patterns Found** (role-tagged impact map), Recommended Fix Approach → plan's guiding constraint
   - Set investigation confidence: if High → skip Phase 2 entirely, proceed to Phase 3 with pre-vetted findings. If Medium/Low → run Phase 2 but scope agents to validate/extend investigation findings rather than fresh exploration
   - Announce: "Investigation findings detected (confidence: [level]) — using root cause analysis as pre-research."
   - Add `### Investigation Context` to the final plan output showing: source investigation, root cause, confidence, key evidence
1. Check if `my-coding` skill exists (look for `~/.claude/skills/my-coding/SKILL.md`). If found, load it for coding standards alignment. If not found, skip and note to user: "Consider running `/ac:setup-coding` to create personalized coding rules."
2. Launch ac:explore and ac:librarian agents in parallel (single message, multiple Agent tool calls with `subagent_type: "ac:explore"` and `subagent_type: "ac:librarian"`). Each agent should target a different aspect of the research. Use the intent routing below to determine which agents to launch.

### Agent Routing by Intent

**Simple complexity**: Skip this section entirely — use direct Read on known files per the profile gate above.

**Standard and Complex complexity**: Use the routing below. Respect the Pipeline Profiles table for agent counts — Standard launches fewer agents than Complex even within the same intent.

**Build intent** (Standard: 1 explore; Complex: 2 explore + 1 librarian):
Each agent should:

- Target a different aspect of the codebase or documentation
- Include a list of key files to read in their findings

**Example agent prompts**:

- ac:explore 1: "CONTEXT: Adding [feature] to [project]. GOAL: Match existing conventions. DOWNSTREAM: Plan file structure and code patterns. REQUEST: Find similar implementations — directory structure, naming, config, shared utilities. Include project structure overview (composer.json, routes, models, migrations). Skip vendor/."
- ac:explore 2: "CONTEXT: Adding [feature] to [project]. GOAL: Understand organizational patterns. DOWNSTREAM: Decide where to place new files. REQUEST: Find how features are organized — controllers, views, routes registration. Compare 2-3 feature directories."
- ac:librarian: "CONTEXT: Implementing [technology] in production. GOAL: Follow best practices. DOWNSTREAM: Setup and configuration decisions. REQUEST: Find official docs for setup, configuration, and common pitfalls. Skip beginner tutorials."

**Refactor intent** (Standard: 1 explore; Complex: 2 explore):

**Example agent prompts**:

- ac:explore 1: "CONTEXT: Refactoring [target]. GOAL: Map impact scope. DOWNSTREAM: Build safe refactoring plan. REQUEST: Find all usages — call sites, type flow, dynamic access. Return file path, usage pattern, risk level."
- ac:explore 2: "CONTEXT: Modifying [target]. GOAL: Understand test coverage. DOWNSTREAM: Decide whether to add tests first. REQUEST: Find all test files exercising this code, what each asserts, coverage gaps."

**Mid-sized intent** (Standard: 1 explore; Complex: 1 explore + 1 librarian):

**Example agent prompts**:

- ac:explore: "CONTEXT: Updating [target area] in [project]. GOAL: Understand current implementation and touch points. DOWNSTREAM: Plan scoped changes with minimal blast radius. REQUEST: Find the target implementation, its callers, configuration, and related tests. Return file path, current behavior, and change impact."
- ac:librarian: "CONTEXT: Extending [existing feature] with [capability]. GOAL: Follow established patterns for this type of change. DOWNSTREAM: Implementation decisions. REQUEST: Find official docs for the relevant APIs or patterns. Focus on migration guides and breaking change notes."

**Architecture intent** (Standard: 1 explore; Complex: 1 explore + 1-2 librarian):

**Example agent prompts**:

- ac:explore: "CONTEXT: Planning architectural changes. GOAL: Understand current system design. DOWNSTREAM: Identify safe-to-change vs load-bearing boundaries. REQUEST: Find module boundaries, dependency direction, key abstractions, circular deps."
- ac:librarian: "CONTEXT: Designing architecture for [domain]. GOAL: Evaluate trade-offs. DOWNSTREAM: Present concrete options. REQUEST: Find best practices, real-world case studies, and common failure modes. Skip generic pattern catalogs."

**Research intent** (Standard: 1 explore; Complex: 1 explore + 1-2 librarian):

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
1c. **Pre-generation analysis** (Metis — for Complex only, per Pipeline Profiles):
   - Launch plan-analysis agent in pre-generation mode:
     ```
     Agent(subagent_type: "ac:plan-analysis", prompt: "Pre-generation mode. Request: [original request]. Research findings: [Research Summary content]. Analyze for hidden intentions, unstated requirements, and AI-slop risks. Return directives.")
     ```
   - Read directives from agent output
   - Inject MUST DO / MUST NOT DO directives as constraints for plan generation
   - If agent returns QUESTIONS → merge them into the interview question queue below (step 2)
   - Skip for Simple and Standard complexity (see Pipeline Profiles — pre-gen Metis adds overhead without proportional value for bounded scope)
2. Identify underspecified aspects. Use AskUserQuestion with 2-4 clickable options per question (include any Metis QUESTIONS merged from step 1c):
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

**Analysis gate** (profile-conditional — see Pipeline Profiles):

- **Simple**: Skip analysis gate entirely. 1-2 step plans don't need gap analysis. Proceed directly to Save and present.
- **Standard and Complex**: Run analysis gate as described below.

Two flows depending on whether Deep Review was requested (set $deepReview flag in Phase 1 if `--deep-review` flag detected in $ARGUMENTS, or set it when the user selects Deep Review from the AskUserQuestion options below):

**Standard flow** (no Deep Review): Launch `plan-analysis` alone, wait for results, apply fixes.

```
Agent(subagent_type: "ac:plan-analysis", prompt: "Post-generation mode. Plan file: [plan-file-path]. Run gap classification, AI-slop detection, tier sanity audit, and acceptance criteria audit.")
```

**Deep Review flow**: Launch BOTH `plan-analysis` AND `plan-review` in a single parallel message block (two Agent calls in one message), wait for both to complete, then merge their results before applying fixes.

```
// Single message — both agents launch simultaneously
Agent(subagent_type: "ac:plan-analysis", prompt: "Post-generation mode. Plan file: [plan-file-path]. Run gap classification, AI-slop detection, tier sanity audit, and acceptance criteria audit.")
Agent(subagent_type: "ac:plan-review", prompt: "Review plan at [plan-file-path]. Adversarial mode — hunt for flaws, stress-test references, tiers, and executability.")
```

Once all launched agents return, merge results and apply all fixes:
- CRITICAL gaps (from plan-analysis): add as questions for the user
- MINOR gaps (from plan-analysis): fix directly in the plan
- AI-slop findings (from plan-analysis): remove or simplify affected steps
- Vague criteria (from plan-analysis): replace with executable commands
- REJECT verdict (from plan-review, Deep Review only): surface blocking issues with suggested fixes, then re-offer "Adjust" / "Execute Anyway"
- OKAY verdict (from plan-review, Deep Review only): proceed to present plan, then re-offer "Execute" / "Adjust"

Rewrite the plan file with all fixes applied.

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

1. Use AskUserQuestion to get user decision (profile-conditional options):

**Simple complexity**: Skip AskUserQuestion entirely — auto-execute. Simple plans are trivial and don't need user confirmation.

**Standard complexity**:
```
question: "Plan is ready. How would you like to proceed?"
header: "Next Step"
options:
  - label: "Execute (Recommended)"
    description: "Launch ac:execute with tier-based model routing."
  - label: "Deep Review"
    description: "Launch adversarial plan-reviewer (Momus-class) in parallel with plan-analysis. Stress-tests references, tiers, and executability."
  - label: "Adjust"
    description: "Modify specific parts of the plan."
```

**Complex complexity**:
```
question: "Plan is ready. How would you like to proceed?"
header: "Next Step"
options:
  - label: "Deep Review (Recommended)"
    description: "Launch adversarial plan-reviewer (Momus-class) in parallel with plan-analysis. Cross-module plans benefit from adversarial scrutiny before execution."
  - label: "Execute"
    description: "Launch ac:execute with tier-based model routing. Skip adversarial review."
  - label: "Adjust"
    description: "Modify specific parts of the plan."
```

If user selects **Execute** (or $loopMode is true from --loop — auto-execute without asking), invoke `ac:execute` with the plan file path.

If user selects **Deep Review**:
Set $deepReview = true and return to the **Analysis gate** above. If plan-analysis already ran in Standard flow (post-gen analysis gate), launch ONLY `plan-review` on re-entry — do not re-run plan-analysis. If this is the first analysis pass (e.g., `--deep-review` was set in Phase 1), run both `plan-analysis` and `plan-review` in parallel per the Deep Review flow. Merge combined output, apply fixes, and present the updated plan. Verdict handling is done inside the analysis gate's merge step — no separate sequential launch here.

Plan handoff must respect runtime mode:
- If plan mode is active, use `ExitPlanMode` for approval handoff
- If plan mode is not active, use standard chat flow and AskUserQuestion options

=== CRITICAL: PLAN ONLY — DO NOT WRITE CODE ===
Do not write code or modify source files. Only produce the plan.

---

## Complexity Shortcuts

Each complexity level maps to a Pipeline Profile that controls depth across the entire planning pipeline. See the Pipeline Profiles table above for the authoritative reference. Below are the quick-reference execution paths:

**Pipeline Profile: Simple** (~2-3 total agents)
- Phase 1: Classify → Simple
- Phase 2: Skip explore agents. Use direct Read/Glob/Grep on known files
- Phase 3: Skip pre-gen Metis. 0-1 interview questions. Skip analysis gate. Auto-execute (no AskUserQuestion)
- Verification (execute.md): Build+test only — no verification agents

**Pipeline Profile: Standard** (~4-6 total agents)
- Phase 1: Classify → Standard
- Phase 2: Launch 1 ac:explore agent (+ ac:librarian if external docs relevant)
- Phase 3: Skip pre-gen Metis. 1-2 interview questions. Run post-gen analysis gate (plan-analysis only). Deep Review is opt-in via AskUserQuestion
- Verification (execute.md): Code-reviewer + linter (skip verifier)

**Pipeline Profile: Complex** (~7-10 total agents)
- Phase 1: Classify → Complex
- Phase 2: Launch 2-3 ac:explore agents + 1 ac:librarian agent (full research)
- Phase 3: Run pre-gen Metis. 2-3 interview questions. Run post-gen analysis gate. Deep Review is recommended via AskUserQuestion. Add Risks section with specific failure scenarios
- Verification (execute.md): Full 3-agent wave (code-reviewer + linter + verifier)
- Suggest phased execution if steps have dependencies
