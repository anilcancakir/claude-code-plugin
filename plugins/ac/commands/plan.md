---
description: Structured planning — classify, research, analyze, interview, generate, review
argument-hint: Feature or task description
effort: high
---

**CRITICAL: Do NOT call EnterPlanMode.** This command IS the planning workflow — calling CC's native EnterPlanMode would create a conflicting plan-within-a-plan. Write the plan directly to `.ac/plans/$planName.md` in Phase 5, then deliver via AskUserQuestion in Phase 7. If already in plan mode when this command starts, call ExitPlanMode immediately before proceeding.

Plan storage: `.ac/plans/$planName.md`. Create directory if missing.

## Phase 1: Classify

Request: $ARGUMENTS

1. Detect flags: `--loop` (auto-execute after approval) → store $loopMode. `--deep-review` (adversarial review) → store $deepReview. Strip both before processing.
2. **Task file detection**: If path contains `.ac/tasks/` or YAML has `type: story|bug|spike|chore`:
   - Read task file → extract User Story + Acceptance Criteria as plan requirements
   - If `### Research Summary` populated → skip Phase 2
   - If `### Codebase Context` present (no Research Summary) → use as pre-seeded targets
3. Classify intent: **Build** (create, add, implement) | **Refactor** (restructure, clean up) | **Mid-sized** (update, extend) | **Architecture** (design, structure) | **Research** (explore, evaluate)
4. Estimate complexity: **Simple** (1-2 steps, single module, zero design decisions) | **Standard** (3-6 steps, 1-2 modules, some ambiguity) | **Complex** (7+ steps, cross-module, architectural impact)
5. Announce: "[Intent] — [Complexity] estimated."

---

## Phase 2: Research (complexity-gated)

**Simple**: Direct Read/Glob/Grep on known files. No agents.

**Standard/Complex**: Launch research agents — all in a single message block (parallel foreground).

| Intent | Standard | Complex |
|--------|----------|---------|
| **Build** | 1 explore: conventions, similar implementations, project structure + 1 librarian: implementation patterns, code examples for key dependency | 2 explore (conventions + organization) + 1 librarian (official docs) + 1 challenger (stress-test approach) |
| **Refactor** | 1 explore: all usages, call sites, type flow, risk | 2 explore (impact scope + test coverage) + 1 challenger (stress-test approach) |
| **Mid-sized** | 1 explore: current implementation, callers, tests + 1 librarian: API docs, real-world usage examples | 1 explore + 1 librarian (API docs, migration guides) + 1 challenger (stress-test approach) |
| **Architecture** | 1 explore: module boundaries, dependency direction | 1 explore + 2 librarian (best practices + case studies) + 1 challenger (stress-test approach) |
| **Research** | 1 explore: current state, limitations, TODOs | 1 explore + 2 librarian (API reference + OSS examples) + 1 challenger (stress-test approach) |

**Librarian prompt guidance** — Brief librarian to trigger code-search alongside docs. Include the project stack language as a hint. Templates:

- Build (new feature): `"Find implementation patterns and code examples for [feature/library] in [language from project stack]. Show real-world usage — constructor patterns, error handling, idiomatic API calls. Official docs + OSS examples."`
- Mid-sized (extend/update): `"Find API docs and real-world usage examples for [API/library]. Include migration patterns if version changed. Code examples preferred over prose — show [language from project stack] idioms."`
- Build (integration): `"Find integration patterns for [library A] with [library B] in [language from project stack]. Implementation examples, gotchas, and configuration options from public repos."`

**Actions**:

1. Read `~/.claude/skills/my-coding/SKILL.md` → **MY_CODING_RULES**. If absent → empty.
2. Read CLAUDE.md + CLAUDE.local.md + `.claude/rules/` → **PROJECT_CONTEXT** (max ~1K tokens). Prioritize: conventions > gotchas > build commands. Note: plugin subagents DO receive CLAUDE.md automatically (only built-in Explore/Plan omit it). PROJECT_CONTEXT is still needed for the plan document's `### Conventions` section — workers use it alongside CLAUDE.md for plan-specific rules.
3. Launch agents. Agents receive CLAUDE.md automatically — inject focused constraints to direct the search:
   ```
   FOCUS: Research with these conventions in mind (from project config):
   [PROJECT_CONTEXT key conventions — max 5 rules]
   Flag patterns that conflict with them.
   ```
4. Classify codebase state: **Disciplined** (consistent, tested → follow patterns) | **Transitional** (mixed → follow NEW direction) | **Legacy** (outdated → improve, don't copy) | **Chaotic** (no patterns → establish)
5. Populate **Research Summary**: Key Files (file:line), Patterns Found, Dependencies, Codebase State.

---

## Phase 3: Pre-Plan Analysis (complexity-gated)

**Simple**: Skip.

**Standard**: Spawn plan-analysis (pre-gen mode, foreground):
```
Agent(subagent_type: "ac:plan-analysis", prompt: "Pre-generation mode.
Request: [original request].
Research findings: [Research Summary].
Analyze: hidden intentions, unstated requirements, AI-slop risks.
Return: MUST DO / MUST NOT directives and QUESTIONS if any.")
```
Incorporate directives. Merge QUESTIONS into interview queue.

**Complex**: Spawn 2 agents parallel (single message, foreground). Challenger already ran in Phase 2 — its findings are in research results.
- **plan-analysis** — context sufficiency, hidden requirements, gaps, directives
- **feasibility** — effort estimation, prerequisites, codebase fit
```
Agent(subagent_type: "ac:plan-analysis", prompt: "Pre-generation mode. Request: [request]. Research: [summary]. Return directives.")
Agent(subagent_type: "ac:feasibility", prompt: "Assess feasibility: [request]. Codebase area: [key files]. Report fit, effort, prerequisites.")
```
Synthesize: plan-analysis directives → plan constraints. Feasibility prerequisites → step ordering. Challenger findings from Phase 2 → addressed or noted as risks.

---

## Phase 4: Interview (convergence)

Resolve ambiguity before plan generation. Max 3 rounds.

**Auto-skip conditions** (ALL must be true → skip directly to Phase 5):
1. Phase 3 plan-analysis returned zero QUESTIONS
2. All 5 clearance criteria below evaluable as met from research + analysis results
3. Intent is NOT Architecture (always interview for architectural decisions)

**Task-driven auto-skip**: Source is `.ac/tasks/` file with User Story present + ≥3 Acceptance Criteria + Phase 3 found zero CRITICAL gaps → auto-skip.

When auto-skipped, announce: "Interview skipped — all clearance criteria met from research."

**Clearance check** (evaluate after each answer — or evaluate once for auto-skip decision):
- [ ] Core objective clearly defined?
- [ ] Scope boundaries established (what's IN and what's OUT)?
- [ ] Technical approach decided?
- [ ] Test strategy confirmed (if project has test infrastructure)?
- [ ] No blocking ambiguities remaining?

ALL checked → proceed to Phase 5. ANY unchecked → ask the specific unclear dimension via AskUserQuestion with 2-4 concrete options. Always include: "Done — proceed with current understanding."

**Intent-specific focus**:

| Intent | Key Questions |
|--------|--------------|
| **Build** | Follow existing pattern X or deviate? What must NOT be built? MVP or full? |
| **Refactor** | What behavior to preserve? Test commands? Rollback strategy? |
| **Mid-sized** | Exact deliverables? Hard boundaries? How do we know it's done? |
| **Architecture** | Lifespan? Scale expectations? Non-negotiable constraints? |
| **Research** | Exit criteria? Expected outputs? Time box? |

If 3 rounds exhausted and ambiguity remains → proceed with assumptions documented in Risks section.

---

## Phase 5: Generate Plan

Generate plan following **Plan Format** below.

### Tier Assignment

Assign per-step based on scope and required reasoning:

| Tier | Files | Model | When | Benchmark Context |
|------|-------|-------|------|-------------------|
| **quick** | ≤1 | haiku | Mechanical: config, rename, scaffold, boilerplate | SWE-bench 73%, 200K context, $5/MTok. Fast (93 tok/s). Fails at cross-file reasoning. |
| **mid** | 1-3 | sonnet | Standard implementation, business logic. **DEFAULT** | SWE-bench 80%, 200K context, $15/MTok. 98.5% of Opus coding at 1/5 cost. |
| **senior** | 3+ | opus | Cross-layer, architecture, migration, complex edge cases | SWE-bench 81%, 200K context, GPQA 91% (+17pp over Sonnet). $75/MTok. Justified for deep reasoning. |

**Quick-tier enrichment**: Compensate for Haiku's lower reasoning — write exhaustively explicit descriptions: exact file, exact change, before/after state. No ambiguity.

**Codebase state escalation**: Chaotic or Legacy → all `quick` steps escalate to `mid`.

### Tier-Aware Step Verbosity

Step descriptions scale with tier to minimize plan size while ensuring worker success:

| Tier | Verbosity | What to Include | What to Omit |
|------|-----------|-----------------|--------------|
| **quick** | Verbose | Exact commands, before/after state, full config values. Haiku needs explicit instructions — no ambiguity. | Nothing — spell everything out. |
| **mid** | Standard | Description, acceptance criteria, key values/parameters. Sonnet infers implementation from context. | Full command blocks, complete file contents, inline configs. |
| **senior** | Lean | High-level description, acceptance criteria, constraints, architectural notes. Opus explores deeply before acting. | Step-by-step instructions, command syntax, implementation details. |

Quick steps compensate for Haiku's lower reasoning. Mid and senior steps trust the model to read existing code and figure out implementation — this is what they're good at.

### Wave Rules

- Steps within a wave MUST touch **different files** (file-exclusive parallelism)
- Steps across waves MAY touch same files (sequential, no conflict)
- Group independent steps → same wave. Dependent steps → later waves.
- Wave size target: 3-8 steps. Fewer than 2 = under-splitting.

### Plan Quality Rules

- Every step: tier + files + done-when + QA. No exceptions.
- **Done-when**: Executable criteria — greppable, testable, readable. Never vague ("verify it works").
- **QA**: Concrete test scenario with expected outcome. Command to run + expected result.
- **Files**: Absolute paths that exist (or will be created, noted explicitly).
- **Conventions**: Reference actual code patterns (file:line), not generic advice.
- **Must NOT Have**: Always include for Standard/Complex. Prevent: scope inflation, premature abstraction, over-validation, documentation bloat.

---

## Phase 6: Review (complexity-gated)

**Simple**: Skip — save plan directly.

**Standard**: Spawn plan-review (foreground). plan-review now includes AI-slop detection (check 5).
```
Agent(subagent_type: "ac:plan-review", prompt: "Review plan: .ac/plans/[name].md. Check references, executability, QA scenarios, tier sanity, AI-slop patterns. Blockers-only — OKAY or REJECT.")
```
REJECT → fix cited issues, re-submit (max 2 iterations). OKAY → proceed.

**Complex** (mandatory): Spawn 2 agents parallel (single message, foreground):
```
Agent(subagent_type: "ac:plan-review", prompt: "Review plan: .ac/plans/[name].md. Check references, executability, QA scenarios, tier sanity, AI-slop patterns. Blockers-only — OKAY or REJECT.")
Agent(subagent_type: "ac:plan-deep-review", prompt: "Adversarial review. Plan: .ac/plans/[name].md. Deep reference verification, AI-slop detection, cross-task dependencies, tier challenge. Earn approval.")
```
Merge findings from both. Either REJECT → fix cited issues, re-submit (max 2 iterations). Both reviewers OKAY → proceed.

**--deep-review on Standard**: When selected or $deepReview = true → add plan-deep-review (opus) to Standard review flow.

**--loop + Complex**: Deep Review runs automatically (mandatory). Both OKAY → auto-execute. Any REJECT → halt, surface issues, offer Adjust / Execute Anyway.

---

## Phase 7: Deliver

1. Save plan to `.ac/plans/$planName.md`
2. Present summary:

```
## Plan: [Title]
**Complexity**: [level] | **Steps**: N | **Waves**: N | **Tiers**: N quick, N mid, N senior
**Codebase State**: [classification]

[Step list with tiers and files]
[Wave grouping]
```

3. Next step — call AskUserQuestion tool (complexity-conditional):

   **Simple**: Auto-execute — invoke ac:execute with plan path. Skip AskUserQuestion.

   **Standard** — call AskUserQuestion with these exact parameters:
   ```json
   {
     "questions": [{
       "question": "Plan ready. How to proceed?",
       "header": "Next step",
       "options": [
         {"label": "Execute (Recommended)", "description": "Start implementation with plan-worker agents."},
         {"label": "Deep Review First", "description": "Run adversarial plan-deep-review (opus) before executing."},
         {"label": "Adjust", "description": "Modify the plan before proceeding."}
       ]
     }]
   }
   ```

   **Complex** (deep review already done) — call AskUserQuestion with these exact parameters:
   ```json
   {
     "questions": [{
       "question": "Plan reviewed and approved. How to proceed?",
       "header": "Next step",
       "options": [
         {"label": "Execute (Recommended)", "description": "Start implementation with plan-worker agents."},
         {"label": "Adjust", "description": "Modify the plan before proceeding."}
       ]
     }]
   }
   ```

4. On answer: "Execute" → ExitPlanMode first if plan mode active, then invoke ac:execute with plan path. "Deep Review First" → spawn plan-deep-review agent. "Adjust" → ask what to change, revise plan, re-deliver.

---

## Plan Format

The Developer (ac:execute) parses this format. All sections required unless noted.

```markdown
# Plan: {Title}

**Complexity**: simple | standard | complex
**Steps**: N | **Waves**: N
**Codebase State**: disciplined | transitional | legacy | chaotic

### Research Summary
- **Key Files**: file:line — description (one per line)
- **Patterns**: architecture, naming conventions found
- **Codebase State**: classification with rationale

### Conventions
[PROJECT_CONTEXT + MY_CODING_RULES — max ~500 tokens]
[Pattern references: file:line — what to follow]

### Wave 1

**Step 1**: {imperative title}
- **Type**: code | infra
- **Tier**: quick | mid | senior
- **Files**: {absolute paths — or "N/A (server-side)" for infra steps}
- **Done when**:
  - {executable criterion — greppable, testable, or readable}
- **QA**: {test command + expected result}
- **Must NOT**: {per-step exclusions}

**Step 2**: {title}
- **Tier**: mid
- **Files**: {paths — MUST NOT overlap with Step 1 within same wave}
- **Done when**: ...
- **QA**: ...

**Tier verbosity examples**:

Quick (verbose — Haiku needs everything spelled out):
- **Description**: Create PostgreSQL database `kodizm_ai` with user `kodizm_ai_user` on port 6543.
- **Commands**:
  ```bash
  sudo -u postgres psql -p 6543 -c "CREATE DATABASE kodizm_ai OWNER kodizm_ai_user;"
  ```
- **Done when**: `psql -l | grep kodizm_ai` returns a row

Mid (standard — Sonnet reads context):
- **Description**: Create production .env for API based on .env.example. Key overrides: DB_PORT=6543, REDIS_DB=2, QUEUE=redis.
- **Done when**: .env exists with correct values per .env.example

Senior (lean — Opus explores deeply):
- **Description**: Design and implement CI/CD workflow following existing deploy patterns.
- **Constraints**: SSH deploy, zero-downtime, run migrations
- **Done when**: Workflow deploys on push to master, runs full pipeline

### Wave 2 (depends on Wave 1)

**Step 3**: {title}
...

### Must NOT Have
- {Scope boundaries — what to exclude}
- {AI-slop prevention — no bonus refactors, no extra abstractions}

### Risks
- {Open questions, unresolved gaps, assumptions made}

### Context
(Optional — for plans with large reference data: server details, port tables, secret inventories, environment variables. Workers read on demand. Omit for code-only plans.)

### Task Context
(task mode only — source path, type, size, priority)
```

---

## Complexity Pipeline Summary

| | Simple | Standard | Complex |
|---|--------|----------|---------|
| **Research** | Direct Read | 1 explore + librarian (Build/Mid-sized) | 2-3 explore + librarian + challenger |
| **Pre-plan** | skip | plan-analysis | plan-analysis + feasibility |
| **Interview** | 0-1 round | ≤3 rounds (auto-skip if clear) | ≤3 rounds (auto-skip if clear) |
| **Review** | skip | plan-review (sonnet, enhanced) | plan-review (sonnet) + plan-deep-review (opus) |
| **Execution verification** | build + test | plan-verifier + plan-code-review | plan-verifier + plan-code-review + plan-deep-code-review |

Do not write code or modify source files. Only produce the plan.
