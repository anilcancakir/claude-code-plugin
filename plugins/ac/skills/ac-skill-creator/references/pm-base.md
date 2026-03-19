# PM Base Reference

Shared reference for `/ac:ideate`. Defines task file schema, validation rules, interview patterns, triage format, priority model, and plan handoff protocol.

## Task File Format

Each task is a standalone markdown file with YAML frontmatter and structured sections.

```yaml
---
type: story | bug | spike | chore
size: XS | S | M | L | XL
priority: P0 | P1 | P2 | P3
status: draft | ready | planned | done
design: required | not-needed | in-progress
project: {project-slug}    # optional, PRD grouping
phase: {phase-number}      # optional, PRD ordering
created: YYYY-MM-DD
---
```

Required sections in body:

- **User Story**: `As a {persona}, I want to {action}, so that {outcome}.`
- **Context**: Why this task exists, what triggered it, current state.
- **Acceptance Criteria**: Given/When/Then format. Minimum 1 criterion per task.
- **Scope**: `In:` what the task covers. `Out:` what it explicitly excludes.
- **Open Questions**: Unresolved decisions needing answers during planning.
- **Notes**: Additional context, cross-references, design links.

## INVEST Validation

Every task at `status: ready` must pass all 6 INVEST criteria. Fail any one and the task stays `draft`.

| Criterion | Question | Fail signal |
|-----------|----------|-------------|
| **I**ndependent | Can this ship without waiting on another in-progress task? | Blocked by unfinished dependency |
| **N**egotiable | Is implementation flexible, not dictating HOW? | Acceptance criteria prescribe code-level details |
| **V**aluable | Does the user story state a clear outcome for a real persona? | Missing persona or outcome in story |
| **E**stimable | Can the team assign a size (XS-XL) with confidence? | Open questions > 2 or context section is empty |
| **S**mall | Does size fit within a single `ac:plan` cycle (XS-L)? | Size is XL without a decomposition plan |
| **T**estable | Does every acceptance criterion have a verifiable condition? | Any criterion lacks Given/When/Then structure |

Pass rule: all 6 pass to promote `draft` to `ready`. Surface failing criteria to the user with fix suggestions.

## Interview Dimensions

Use these dimensions to extract a complete task from a vague request. Ask one dimension at a time via AskUserQuestion.

| Dimension | Purpose | Example prompt |
|-----------|---------|----------------|
| **Persona** | Who benefits? | "Who is the primary user for this?" |
| **Value** | Why build it? | "What outcome does this enable?" |
| **Scope** | What's in/out? | "What should this explicitly NOT cover?" |
| **AC** | How to verify? | "How would you confirm this works correctly?" |
| **Edge Cases** | What could break? | "What happens when input is missing or invalid?" |

Interview stops when: user story is complete, acceptance criteria are testable, scope boundaries are explicit, and open questions are < 3.

## Triage Table Format

Bulk mode presents multiple tasks in a single table for rapid prioritization.

```markdown
| # | Title | Type | Size | Priority | Status | Action |
|---|-------|------|------|----------|--------|--------|
| 1 | [title] | story | M | P1 | draft | promote / split / drop |
| 2 | [title] | bug | S | P0 | ready | plan / defer |
```

Valid actions: `promote` (draft to ready), `split` (decompose XL), `drop` (remove), `plan` (send to ac:plan), `defer` (move to backlog).

## Priority Model

Two complementary schemes — P-level for urgency, MoSCoW for scope negotiation.

| P-level | Urgency | Response |
|---------|---------|----------|
| **P0** | Blocking / broken | Immediate — drop current work |
| **P1** | High impact, time-sensitive | Next cycle |
| **P2** | Important, not urgent | Planned backlog |
| **P3** | Nice to have | Opportunistic |

MoSCoW mapping: P0 = Must, P1 = Should, P2 = Could, P3 = Won't (this cycle).

Size estimates (single developer, focused work):

| Size | Effort | ac:plan steps |
|------|--------|---------------|
| XS | < 30 min | 1-2 |
| S | 30 min - 2 hr | 2-4 |
| M | 2-8 hr | 4-8 |
| L | 1-3 days | 8-15 |
| XL | > 3 days | Split first |

## Plan Handoff Protocol

Transition a `ready` task into `ac:plan` execution.

1. Set `status: planned` in frontmatter.
2. Build the plan prompt from task sections:
   - **Goal** from User Story + Context.
   - **Constraints** from Scope (In/Out).
   - **Success criteria** from Acceptance Criteria.
   - **Open items** from Open Questions (resolve before plan or flag as assumptions).
3. Pass to `ac:plan` with the assembled prompt. Include `project` and `phase` if set.
4. After plan approval and execution, set `status: done`.

Task files with `project` set group under the same PRD. Phase ordering determines execution sequence — lower phase numbers execute first.
