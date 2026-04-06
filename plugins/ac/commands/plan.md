---
description: Structured planning — classify, research, analyze, interview, generate, review
argument-hint: Feature or task description
effort: high
---

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
| **Build** | 1 explore: conventions, similar implementations, project structure | 2 explore (conventions + organization) + 1 librarian (official docs) |
| **Refactor** | 1 explore: all usages, call sites, type flow, risk | 2 explore (impact scope + test coverage) |
| **Mid-sized** | 1 explore: current implementation, callers, tests | 1 explore + 1 librarian (API docs, migration guides) |
| **Architecture** | 1 explore: module boundaries, dependency direction | 1 explore + 2 librarian (best practices + case studies) |
| **Research** | 1 explore: current state, limitations, TODOs | 1 explore + 2 librarian (API reference + OSS examples) |

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

**Complex**: Spawn 3 agents parallel (single message, foreground):
- **plan-analysis** — context sufficiency, hidden requirements, gaps, directives
- **feasibility** — effort estimation, prerequisites, codebase fit
- **challenger** — stress-test approach, surface risks, propose alternatives
```
Agent(subagent_type: "ac:plan-analysis", prompt: "Pre-generation mode. Request: [request]. Research: [summary]. Return directives.")
Agent(subagent_type: "ac:feasibility", prompt: "Assess feasibility: [request]. Codebase area: [key files]. Report fit, effort, prerequisites.")
Agent(subagent_type: "ac:challenger", prompt: "Stress-test this approach: [request + proposed approach]. Find gaps, propose alternatives.")
```
Synthesize: plan-analysis directives → plan constraints. Feasibility prerequisites → step ordering. Challenger gaps → addressed or noted as risks.

---

## Phase 4: Interview (convergence)

Resolve ambiguity before plan generation. Max 3 rounds. Skip if research + analysis resolved everything.

**Clearance check** (evaluate after each answer):
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
| **mid** | 1-3 | sonnet | Standard implementation, business logic. **DEFAULT** | SWE-bench 80%, 1M context, $15/MTok. 98.5% of Opus coding at 1/5 cost. |
| **senior** | 3+ | opus | Cross-layer, architecture, migration, complex edge cases | SWE-bench 81%, GPQA 91% (+17pp over Sonnet). $75/MTok. Justified for deep reasoning. |

**Quick-tier enrichment**: Compensate for Haiku's lower reasoning — write exhaustively explicit descriptions: exact file, exact change, before/after state. No ambiguity.

**Codebase state escalation**: Chaotic or Legacy → all `quick` steps escalate to `mid`.

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

**Standard**: Spawn 2 agents parallel (single message, foreground):
```
Agent(subagent_type: "ac:plan-analysis", prompt: "Post-generation mode. Plan file: .ac/plans/[name].md. Run: gap classification, AI-slop detection, acceptance criteria audit, scope boundary check, tier sanity.")
Agent(subagent_type: "ac:plan-review", prompt: "Review plan: .ac/plans/[name].md. Check references, executability, QA scenarios, tier sanity. Blockers-only — OKAY or REJECT.")
```
plan-analysis: CRITICAL gaps → surface to user. MINOR → fix. AI-slop → simplify.
plan-review: REJECT → fix cited issues, re-submit (max 2 iterations). OKAY → proceed.

**Complex** (mandatory): Spawn 3 agents parallel (single message, foreground):
```
Agent(subagent_type: "ac:plan-analysis", prompt: "Post-generation mode. Plan file: .ac/plans/[name].md. Full analysis.")
Agent(subagent_type: "ac:plan-review", prompt: "Review plan: .ac/plans/[name].md. Blockers-only review.")
Agent(subagent_type: "ac:plan-deep-review", prompt: "Adversarial review. Plan: .ac/plans/[name].md. Deep reference verification, AI-slop detection, cross-task dependencies, tier challenge. Earn approval.")
```
Merge findings from all 3. Either REJECT → fix cited issues, re-submit (max 2 iterations). Both reviewers OKAY → proceed.

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

3. Next step (complexity-conditional):
   - **Simple**: Auto-execute (invoke ac:execute with plan path)
   - **Standard**: AskUserQuestion → Execute (Recommended) / Deep Review / Adjust
   - **Complex**: Deep Review already done. AskUserQuestion → Execute (Recommended) / Adjust

4. Execute selected → invoke ac:execute. Plan mode active → ExitPlanMode first.

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
- **Tier**: quick | mid | senior
- **Files**: {comma-separated absolute paths}
- **Done when**:
  - {executable criterion — greppable, testable, or readable}
- **QA**: {test command + expected result}
- **Must NOT**: {per-step exclusions}

**Step 2**: {title}
- **Tier**: mid
- **Files**: {paths — MUST NOT overlap with Step 1 within same wave}
- **Done when**: ...
- **QA**: ...

### Wave 2 (depends on Wave 1)

**Step 3**: {title}
...

### Must NOT Have
- {Scope boundaries — what to exclude}
- {AI-slop prevention — no bonus refactors, no extra abstractions}

### Risks
- {Open questions, unresolved gaps, assumptions made}

### Task Context
(task mode only — source path, type, size, priority)
```

---

## Complexity Pipeline Summary

| | Simple | Standard | Complex |
|---|--------|----------|---------|
| **Research** | Direct Read | 1 explore | 2-3 explore + librarian |
| **Pre-plan** | skip | plan-analysis | plan-analysis + feasibility + challenger |
| **Interview** | 0-1 round | ≤3 rounds | ≤3 rounds |
| **Review** | skip | plan-analysis + plan-review (sonnet) | plan-analysis + plan-review (sonnet) + plan-deep-review (opus) |
| **Execution verification** | build + test | plan-verifier + plan-code-review | plan-verifier + plan-code-review + plan-deep-code-review |

Do not write code or modify source files. Only produce the plan.
