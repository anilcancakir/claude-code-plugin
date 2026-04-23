---
description: Interview-driven planning. Writes .ac/plans/<slug>.md or .ac/plans/<slug>/phase-N.md in the active project. Main-agent only, no subagents. Opus-targeted for long-horizon decisions.
argument-hint: "[feature description | existing slug to continue Mode B]"
effort: high
---

# Plan

Pair-planning with the user: skeleton first, interview until convergence, approve. Writes an approved plan into `.ac/plans/` that `/ac:execute` can run end-to-end.

**Scope**: Main agent only. NEVER use the `Agent` tool. No subagent swarms, no tier routing, no wave parallelism. If the task is trivial, skip the plan file and hand control back.

**Style delegation**: Follow `my-language` skill's docs-mode tone for plan prose. Follow `my-coding` skill's conventions for code snippets inside Tasks. Plan file is English only, no em or en dash.

---

## Phase 1: Initialize

1. Parse `$ARGUMENTS` as the planning request. If empty, ask via AskUserQuestion before anything else:

   ```json
   {
     "questions": [{
       "question": "What should I plan?",
       "header": "Request",
       "multiSelect": false,
       "options": [
         {"label": "Describe new feature", "description": "Build something new from scratch."},
         {"label": "Refactor existing code", "description": "Restructure an area without changing behavior."},
         {"label": "Fix a bug", "description": "Reproduce, diagnose, fix with a test."},
         {"label": "Architecture / migration", "description": "Cross-cutting change requiring multi-phase planning."}
       ]
     }]
   }
   ```

   After the answer, re-prompt user for the specific description as free text.

2. Continuation check: if `$ARGUMENTS` matches an existing `.ac/plans/<slug>/ROADMAP.md` entry, this is a Mode B continuation. Read the ROADMAP, identify the next phase with `status: draft`, skip Phase 2, jump to Phase 5 scoped to that phase only. Announce: `Mode B continuation, planning phase-0N-<name>.`

3. Ensure working-dir `.ac/plans/` exists. If not, Bash `mkdir -p .ac/plans`.

4. Read project conventions into context (not into the plan body):

   ```bash
   cat CLAUDE.md 2>/dev/null
   cat CLAUDE.local.md 2>/dev/null
   ls .claude/rules/*.md 2>/dev/null | xargs -I {} cat {}
   ```

5. Pre-invoke user twin skills (silent no-op if missing):
   - `Skill("my-coding")` so Task snippets follow the coding baseline.
   - `Skill("my-language")` so plan prose matches the user's voice.

6. Generate a kebab-case slug from the request. Example: `"add rate limiting to auth endpoint"` becomes `add-rate-limiting-auth`. Keep under 40 chars. If a plan with that slug already exists (and is not a continuation), append a `-2` suffix or ask via AskUserQuestion.

---

## Phase 2: Classify

Decide Intent and Complexity from the request. No user question unless genuinely ambiguous.

1. **Intent**: Build / Refactor / Architecture / Migration / Bugfix / Research.

2. **Complexity heuristic**:
   - **Trivial**: 1 file, mechanical, zero design decisions (typo fix, dep bump, rename).
   - **Simple**: 1-5 tasks, 1-2 modules, mostly mechanical with at most one design call.
   - **Complex**: 6+ tasks OR 3+ modules OR architectural decisions OR multi-package work.

3. **Trivial bypass**: announce `Trivial task. No plan file needed, execute inline.` Stop. Return control to the main session.

4. **Simple**: proceed to Phase 3 (single-file path).

5. **Complex**: proceed to Phase 3, then ask mode in Phase 4.

---

## Phase 3: Scan (read-only)

Just enough context for the skeleton. Do NOT exhaust research, it blocks engagement.

1. Glob + Grep for entities named in the request (class names, route patterns, filenames, feature keywords).
2. Read 2-4 files that look directly relevant. Note helpers, patterns, existing utilities.
3. DO NOT write anything, DO NOT edit anything. Read-only.

---

## Phase 4: Skeleton Write

Branch on complexity.

### Simple (single-file)

Write `.ac/plans/<slug>.md` with the frontmatter and all section headers from the Plan File Format (see Format block at the bottom). Fill in rough notes from Phase 3 scan. Tasks section stays empty until Phase 5.

### Complex, ask mode first

AskUserQuestion (one question, three options):

```json
{
  "questions": [{
    "question": "Bu iş çok-fazlı görünüyor. Planlama ve execution akışı nasıl olsun?",
    "header": "Mode",
    "multiSelect": false,
    "options": [
      {
        "label": "Mode A, plan all then execute",
        "description": "Tüm phase'leri şimdi baştan sona planlarız. /ac:execute <slug>/ tek komutla hepsini aralıksız çalıştırır. Approval anında açık soru kalmaz."
      },
      {
        "label": "Mode B, plan and execute phase-by-phase",
        "description": "Tüm phase skeletonları oluşur. Sadece phase-01 detaylı planlanır. Execute bitince /ac:plan <slug> çalıştırıp phase-02'ye geçilir."
      },
      {
        "label": "Single file override",
        "description": "Complex olsa bile tek dosyada tutalım. Task listesi uzar ama phase bölünmesi olmaz."
      }
    ]
  }]
}
```

- **Mode A or Mode B chosen**:
  1. Bash `mkdir -p .ac/plans/<slug>`.
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
     One paragraph describing the whole effort.

     ## Phases

     | # | Name | Goal | Estimated Tasks | Depends On | Status |
     |---|------|------|-----------------|------------|--------|
     | 1 | <name> | <one-line> | <count> | , | draft |
     | 2 | <name> | <one-line> | <count> | 1 | draft |
     ```

  3. Create empty `phase-0N-<kebab-name>.md` shells with frontmatter only (status: draft).
  4. Touch empty `open-questions.md` in the plan directory.

- **Single file override**: fall back to the Simple skeleton above.

---

## Phase 5: Interview Loop

Pair-planning cycle: explore, update plan file, ask user, repeat.

Loop until convergence:

1. Identify the next ambiguity that only the user can resolve. Priority order: requirements, scope boundaries, tradeoffs, edge case priorities, preferences.
2. Ask ONE question at a time via AskUserQuestion, 2-4 options. Use the `preview` field for code snippets, file excerpts, or config samples when comparing concrete approaches side by side.
3. Write the answer into the plan file IMMEDIATELY. Don't batch.
4. If the question implies more scan is needed, do a narrow Read / Glob / Grep pass and come back.
5. NEVER ask what the code can answer. Read the code.

**Mode A**: loop through every phase in the ROADMAP in order, fully populating every `phase-0N-*.md`. Convergence means all phases have complete Tasks, Verification, Critical Files, Existing Code to Reuse. `open-questions.md` must be EMPTY at approval time (invariant).

**Mode B**: interview ONLY the next `status: draft` phase. Other phases stay as skeletons. Assumptions about later phases go into `open-questions.md` tagged with the phase number.

**Simple**: interview the single plan file until all Tasks are populated.

Interview discipline:
- Batch related follow-ups in the same AskUserQuestion only when they share the same decision. Never batch unrelated topics.
- Max 5 rounds per phase. If still ambiguous at 5, AskUserQuestion: `Ready to converge with current understanding, or more rounds?` with Proceed as an option.

Convergence criterion (per CC native plan mode, adapted):

> The plan is ready when you've addressed all ambiguities relevant to the current scope, and it covers: what to change, which files to modify, what existing code to reuse with paths, and how to verify end-to-end.

---

## Phase 6: Nyquist Pass

Every Task needs an automated `Verify` command. Walk each Task:

1. `Verify` field present and runnable? If missing or vague (like "make sure it works"):
   - Add a preceding Wave 0 scaffold Task that creates a test file, OR
   - AskUserQuestion: `Task N has no automated Verify. Options: add test scaffold Wave 0 / use build check / define grep criterion.`
2. If Verify references a test file that does not exist yet, the Wave 0 scaffold Task is required.
3. `Critical Files` and `Existing Code to Reuse` sections must each have at least one entry.

Mode A: pass every phase. Mode B: pass the current phase. Simple: pass the single file.

---

## Phase 7: Approval

Present a compact summary:

```
Plan: <slug>
Mode: <A | B | single>
Phases: <N>   (omit for single)
Total Tasks: <N>
Files touched: <unique count>
Open Questions: <N>
```

Then AskUserQuestion:

```json
{
  "questions": [{
    "question": "Plan hazır. Ne yapalım?",
    "header": "Approval",
    "multiSelect": false,
    "options": [
      {"label": "Approve", "description": "Plan status=approved olur, /ac:execute için hazır."},
      {"label": "Edit specific section", "description": "Hangi bölümü değiştirmek istediğini söyle, o bölüm için interview loop'a dönelim."},
      {"label": "Restart", "description": "Phase 2'ye dön, baştan classify ve skeleton."}
    ]
  }]
}
```

- **Approve**: set `status: approved` in frontmatter(s). For Mode A, update all phase files. For Mode B, update only the current phase file (plus ROADMAP). Print the exact execute command:
  - Simple: `/ac:execute .ac/plans/<slug>.md`
  - Mode A: `/ac:execute .ac/plans/<slug>/`
  - Mode B: `/ac:execute .ac/plans/<slug>/phase-0N-<name>.md`
- **Edit**: AskUserQuestion which section, loop back to the relevant Phase 5 scope.
- **Restart**: go to Phase 2.

---

## Plan File Format

```markdown
---
slug: <slug>
created: <ISO date>
phase: <N | "single">
mode: <A | B | single>
status: draft | approved | executing | complete
---

## Context
Why this change. What problem it addresses. Intended outcome.

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
- **Files**: exact paths (no globs)
- **Action**: 1-3 sentence description of the change
- **Verify**: `npm test -- foo.test.ts` (automated command, required by Nyquist rule)
- **Done when**: executable grep / test / count check that proves completion
- **Must NOT**: scope exclusions
- **Notes**: non-obvious judgment calls, references to existing patterns

### Task 2, ...

## Verification
How to test the whole plan end-to-end. CI command, manual smoke test.

## Deviations Log
Populated during /ac:execute. Auto-fixes applied, user asks, retries.

## Open Questions
Decisions deferred. Mode A: must be empty at approval. Mode B: can hold items for later phases.
```

---

## Guards

- NEVER use the `Agent` tool. Main agent only.
- NEVER use em dash or en dash in plan file body.
- English only in plan content.
- NEVER assume decisions. AskUserQuestion for anything the code cannot answer.
- NEVER run Edit or Write on files outside `.ac/plans/`. Planning phase is read-plus-plan-file only.
- If a decision requires experimenting (running a script, hitting an API), ask the user instead of executing.
