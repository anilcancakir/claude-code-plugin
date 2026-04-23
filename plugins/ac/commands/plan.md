---
description: Interview-driven planning. Writes .ac/plans/<slug>.md or <slug>/phase-N.md. Pair-planning loop, intent-branching, clearance gate, Nyquist verify rule. Main-agent only.
argument-hint: "[feature description | existing slug to continue Mode B]"
effort: high
---

# Plan

You are pair-planning with the user. Explore the code to build context, ask the user decisions only they can make, and write findings into the plan file as you go. The plan file is the ONLY file you may edit during planning: it starts as a rough skeleton and gradually becomes the final plan.

**Scope**: main agent handles the interview and the writes. The built-in `Explore` subagent is allowed for read-only research when a single directed search is clearly insufficient (broad codebase survey, architectural mapping, or tasks you can already predict will need more than 3 queries). Prefer inline Read / Glob / Grep for narrow, directed scans. Never spawn other custom subagents, never use `Agent(Plan)`. Trivial tasks bypass the plan file entirely and execute inline.

---

## Phase 1: Initialize

1. Parse `$ARGUMENTS`. If empty, ask the intent first:

   ```json
   {
     "questions": [{
       "question": "What should I plan?",
       "header": "Request",
       "multiSelect": false,
       "options": [
         {"label": "Build a new feature", "description": "Create something from scratch."},
         {"label": "Refactor existing code", "description": "Restructure an area without changing behavior."},
         {"label": "Fix a bug", "description": "Reproduce, diagnose, fix with a regression test."},
         {"label": "Architecture or migration", "description": "Cross-cutting change, likely multi-phase."}
       ]
     }]
   }
   ```

   Follow up as free text for the specific description.

2. Continuation check: if `$ARGUMENTS` resolves to an existing `.ac/plans/<slug>/ROADMAP.md`, this is a Mode B continuation. Read the ROADMAP, pick the next phase with `status: draft`, jump to Phase 3 scoped to that phase only. Announce: `Mode B continuation, planning phase-0N-<name>.`

3. Ensure `.ac/plans/` exists in cwd; `mkdir -p .ac/plans` if not.

4. Pre-invoke twin skills (silent no-op if missing):
   - `Skill("my-coding")` for Task code snippets.
   - `Skill("my-language")` for plan prose.

5. Generate a kebab-case slug under 40 chars. If the slug already exists (and is not a continuation), ask via `AskUserQuestion` whether to append a numeric suffix or replace.

---

## Phase 2: Classify

Decide Intent and Complexity from the request. No user question unless genuinely ambiguous.

**Intent**: Build, Refactor, Architecture, Migration, Bugfix, Research.

**Complexity**:
- **Trivial**: 1 file, mechanical, zero design decisions (typo fix, version bump, rename).
- **Simple**: 1-5 tasks, 1-2 modules, at most one design call.
- **Complex**: 6+ tasks OR 3+ modules OR architectural decisions OR multi-package work.

**Trivial bypass**: announce `Trivial task. Executing inline, no plan file needed.` Stop. Return control.

**Intent-specific scan strategy** (applies during Phase 3 Skeleton + Phase 4 Interview):

| Intent | First-turn scan priorities |
|--------|----------------------------|
| Build | Similar features, naming conventions, existing helpers, test patterns. |
| Refactor | All call sites of the target, test coverage, behavior contracts to preserve. |
| Architecture | Boundaries, cross-module contracts, current leaks, rollback strategy. |
| Migration | Old and new APIs side by side, migration order, backward compat window. |
| Bugfix | Repro steps, failing test location, git blame for recent touches. |
| Research | Compact survey, no implementation details, defer to a follow-up plan. |

For Build and Refactor, include a **Test Infrastructure Assessment** in the first interview round: is a test framework installed? TDD, tests-after, or none? Record the decision in the plan frontmatter; it shapes every Task's Verify command.

---

## Phase 3: Skeleton

Create the plan scaffold from a short scan: two to four files, enough to write rough notes. Don't exhaust research before engaging the user.

For an Architecture, Migration, or "Build from scratch" intent with no clear anchor file, launch one `Agent(subagent_type: "Explore")` call with thoroughness `medium` and a focused question (similar features, naming conventions, boundary contracts). Use the Explore result as raw material for Phase 4 questions; do not commit Explore output to the plan verbatim.

**Simple (single-file)**: write `.ac/plans/<slug>.md` with the Plan File Format frontmatter, all section headers, and rough notes. Tasks stay empty until Phase 4.

**Complex**: ask mode first:

```json
{
  "questions": [{
    "question": "This looks like a multi-phase job. How should we structure planning and execution?",
    "header": "Mode",
    "multiSelect": false,
    "options": [
      {"label": "Mode A, plan all then execute", "description": "Plan every phase up front. /ac:execute <slug>/ runs them continuously. Zero open questions at approval."},
      {"label": "Mode B, plan and execute phase-by-phase", "description": "Skeleton every phase. Plan phase-01 in detail now; later phases planned after each /ac:execute."},
      {"label": "Single file override", "description": "Keep the whole effort in one file. Longer Task list, no phase split."}
    ]
  }]
}
```

On Mode A or B:
1. `mkdir -p .ac/plans/<slug>`.
2. Write `.ac/plans/<slug>/ROADMAP.md`:

   ```markdown
   ---
   slug: <slug>
   created: <ISO date>
   mode: <A | B>
   phases: <N>
   status: draft
   ---

   ## Goal
   <One paragraph describing the whole effort.>

   ## Phases

   | # | Name | Goal | Estimated Tasks | Depends On | Status |
   |---|------|------|-----------------|------------|--------|
   | 1 | <name> | <one-line> | <count> | (none) | draft |
   | 2 | <name> | <one-line> | <count> | 1 | draft |
   ```

3. Create empty `phase-0N-<kebab-name>.md` shells with frontmatter only (status: draft).
4. Touch empty `open-questions.md` in the plan directory.

---

## Phase 4: Interview Loop

Pair-planning cycle: **Explore the code → Update the plan file → Ask the user. Repeat.**

1. Identify the next ambiguity only the user can resolve. Priority: requirements, scope boundaries, tradeoffs, edge cases, preferences.
2. Ask ONE decision per `AskUserQuestion` call with 2-4 options. Use `preview` for code snippets, file excerpts, or config samples when comparing concrete approaches. Batch only when follow-ups share the same decision.
3. Write the answer into the plan file immediately. Don't batch updates.
4. If the question implies more scan is needed, use inline Read / Glob / Grep first. Escalate to `Agent(subagent_type: "Explore", thoroughness: "quick" or "medium")` only when the next answer clearly needs more than 3 directed queries or a broad survey.
5. Never ask what the code can answer; read the code.
6. Scale depth to the task: a vague feature request needs many rounds, a focused bug fix may need one or none.

**Mode A**: loop through every phase in ROADMAP order, fully populating each `phase-0N-*.md`. No open questions allowed at approval.

**Mode B**: interview ONLY the current `status: draft` phase. Later phases stay as skeletons; assumptions get tagged entries in `open-questions.md` with the phase number.

**Simple**: interview the single plan file until all Tasks are populated.

Convergence hint: the plan is ready when it covers what to change, which files to modify, what existing code to reuse with paths, and how to verify end-to-end. If stuck after 5 rounds, ask: `Converge now with current understanding, or one more round?` with a Proceed option.

---

## Phase 5: Clearance Gate

Before approval, every plan (Simple, Mode A current phase, Mode B current phase) must pass this checklist:

- [ ] Core objective defined in Context
- [ ] Scope boundaries explicit in Goals / Non-Goals
- [ ] Technical approach decided (no open architectural fork)
- [ ] Every Task has concrete Files, Action, Done-when, and automated `Verify`
- [ ] `Critical Files` and `Existing Code to Reuse` each list at least one entry

If any box is unchecked, loop back to Phase 4 with a targeted question about that specific gap. Do NOT proceed to approval until all five pass.

**Nyquist rule** (subset of gate item 4): every Task needs an executable Verify command (test, build, grep, count). If a test file does not exist yet, insert a Wave 0 scaffold Task before the Task that depends on it, OR ask:

```json
{
  "questions": [{
    "question": "Task <N> has no automated Verify. How should we verify it?",
    "header": "Verify",
    "multiSelect": false,
    "options": [
      {"label": "Add test scaffold as Wave 0", "description": "Insert a preceding Task that creates the test file, then Task <N> runs against it."},
      {"label": "Use build check", "description": "The build / typecheck / lint command is enough to prove the change."},
      {"label": "Define a grep criterion", "description": "A Bash grep/wc/count check against the modified files."}
    ]
  }]
}
```

---

## Phase 6: Approval

Present a compact summary:

```
Plan: <slug>
Mode: <A | B | single>
Phases: <N>           (omit for single)
Total Tasks: <N>
Files touched: <unique count>
Open Questions: <N>
```

Then:

```json
{
  "questions": [{
    "question": "Plan ready. What next?",
    "header": "Approval",
    "multiSelect": false,
    "options": [
      {"label": "Approve and execute now (Recommended)", "description": "Set status=approved and immediately run /ac:execute against the plan in this same turn."},
      {"label": "Approve only", "description": "Set status=approved and print the exact /ac:execute command for the user to run later."},
      {"label": "Edit specific section", "description": "Tell me which section to change; loop back to Phase 4 for that scope."},
      {"label": "Restart", "description": "Return to Phase 2 and redo classify and skeleton from scratch."}
    ]
  }]
}
```

Resolve the approved plan path from mode (used by both Approve options):
- Simple: `.ac/plans/<slug>.md`
- Mode A: `.ac/plans/<slug>/`
- Mode B: `.ac/plans/<slug>/phase-0N-<name>.md`

On **Approve and execute now**:
1. Set `status: approved` on the target file (Mode A updates every phase file; Mode B updates only the current phase file and ROADMAP).
2. Announce: `Plan approved, starting /ac:execute <path>.`
3. Proceed inline with the `/ac:execute` workflow against the resolved path. Follow its Phase 1 through Phase 5 in the same turn. Do not stop until `/ac:execute` reports completion or halts on a Rule 4 / verify-fail gate.

On **Approve only**:
1. Set `status: approved` as above.
2. Print the exact command: `/ac:execute <path>`.
3. Return control to the user without running execute.

---

## Plan File Format

```markdown
---
slug: <slug>
created: <ISO date>
phase: <N | single>
mode: <A | B | single>
status: draft | approved | executing | complete
test-strategy: <TDD | tests-after | none>
---

## Context
<Why this change, problem it addresses, intended outcome. One paragraph.>

## Goals / Non-Goals
- Achieve X.
- Do NOT Y (explicit out-of-scope).

## Critical Files
- path/to/file.ts, purpose
- path/to/other.php, purpose

## Existing Code to Reuse
- path/to/helper.ts:findByKey, already handles X
- path/to/service.php:normalize, reuse for Y

## Tasks

### Task 1, <imperative verb + object>
- **Files**: exact paths, no globs
- **Action**: 1-3 sentence description of the change
- **Verify**: `<automated command>` (required by Nyquist rule)
- **Done when**: executable grep, test, or count check proving completion
- **Must NOT**: scope exclusions
- **Failure case**: one sentence on what failure looks like (for the debug retry in /ac:execute)
- **Notes**: non-obvious judgment calls, pattern references with file:line

### Task 2, ...

## Verification
<End-to-end test for the whole plan. CI command, manual smoke test.>

## Deviations Log
<Populated during /ac:execute. Auto-fixes applied, user asks, retries.>

## Open Questions
<Decisions deferred. Mode A: empty at approval. Mode B: items tagged by phase.>
```

---

## Ending a Turn

End every planning turn with one of:
- `AskUserQuestion` to gather the next decision
- Phase 6 approval confirmation after the user chose Approve

Never close the turn without an explicit next step for the user.
