---
description: Execute an approved plan end-to-end in the main agent. Auto-fix non-architectural deviations, ask on Rule 4. Per-task atomic commits via /ac:commit, Nyquist verify gate with one debug retry.
argument-hint: "[.ac/plans/<slug>.md | <slug>/phase-N.md | <slug>/ for all phases] [--no-push] [--force] [--auto | --no-auto] [--max-iterations=N] [--resume <slug>]"
effort: high
---

# Execute

Run an approved plan to completion in the main agent. Loop mode: do not pause between Tasks. Halt only on verify-fail after one debug retry, or on Rule 4 architectural asks.

---

## Phase 1: Load

1. Parse `$ARGUMENTS`:
   - `.md` path: single-file plan or a specific Mode B phase file.
   - Directory path (ends with `/` or `<slug>/`): Mode A, execute every approved phase sequentially.
   - Empty: Glob `.ac/plans/**/*.md`, filter `status: approved`, pick the most recent. AskUserQuestion if more than one.
   - Strip flags before resolving the path:
     - `--force`: allow re-running a `status: complete` plan.
     - `--no-push`: commit locally per Task but skip `git push`.
     - `--auto`: enter autonomous mode. Sticky, written to the state file, propagates across resumes and across remaining phases.
     - `--no-auto`: leave autonomous mode. Clears the state file's `autonomous: true`. Useful mid-flight when the user wants to take manual control again.
     - `--max-iterations=N`: cap the autonomous resume loop. Default 100. Override with `--max-iterations=999` for effectively unbounded runs.
     - `--resume <slug>`: resume an executing plan from its state file. See step 5.

2. Read the target. Validate frontmatter:
   - `status: approved` or `status: executing`: proceed.
   - `status: complete` without `--force`: refuse with `Plan already complete. Add --force to re-run.`
   - `status: draft`: refuse with `Plan not approved. Run /ac:plan <slug> first.`

3. State file resolution. State path is the schema location from `plugins/ac/references/execution-state-schema.md`:
   - Simple: `.ac/plans/<slug>.execution-state.md`.
   - Mode A or B: `.ac/plans/<slug>/.execution-state.md`.
   - On first run (no state file yet): create it with `iteration: 1`, `autonomous: <true if --auto else false>`, `max_iterations: <flag value or 100>`, `current_phase: 1`, `current_task: 1`, `attempt: 1`, `status: executing`, `started_at: <now>`.
   - On subsequent runs (state file exists): load frontmatter. If `--auto` was passed now, set `autonomous: true`. If `--no-auto`, set it to `false`. If neither, keep the stored value. Mid-flight switching is supported, the new value applies from the next Task forward.
   - If `--max-iterations=N` is passed, overwrite the stored cap.

4. Resume mode (`--resume <slug>` was passed):
   - State file MUST exist; if missing, refuse with `No execution state for <slug>. Run /ac:execute <slug> first.`
   - Increment `iteration` in the state frontmatter by 1 (`iteration += 1`).
   - Hard cap check: if `iteration > max_iterations`, set state `status: iteration-limit-hit`, leave plan `status: executing`, do NOT call ScheduleWakeup, exit cleanly with: `Iteration cap (<N>) reached. Resume manually: /ac:execute --resume <slug> --max-iterations=<bigger>.`
   - Jump directly to Phase 3 starting at the stored `current_phase` and `current_task`. Skip Phase 1 step 5 plan picker.
   - Phase 2 twin-skill re-invoke runs unconditionally on resume so compaction-dropped Skill state is restored.

5. Set `status: executing` on the plan target (and on ROADMAP for Mode A).

6. Mode A first-run path (no `--resume`): read ROADMAP, pick the first phase with `status: approved`, make its phase file the current target. Remember the ROADMAP path for Phase 4.

### Flag interaction examples

```
/ac:execute my-plan                   # interactive (default), iteration 1
/ac:execute my-plan --auto            # autonomous from the start, sticky
/ac:execute my-plan --auto --no-push  # autonomous + skip push
/ac:execute --resume my-plan          # resume from state file, mode preserved
/ac:execute my-plan --auto            # mid-flight switch to autonomous
/ac:execute my-plan --no-auto         # mid-flight switch back to interactive
/ac:execute my-plan --auto --max-iterations=300
```

---

## Phase 2: Pre-invoke Twin Skills

Once at the start of execution, before the first code-writing tool call:

1. `Skill("my-coding")` for coding conventions.
2. `Skill("my-language")` for commit and prose conventions.

Both are silent no-ops when not installed. Re-invoke at Phase 4 phase boundaries in case compaction dropped them.

---

## Phase 3: Task Loop

The core loop. Do not pause between Tasks except for Rule 4 asks or verify-fail after one retry.

For each Task in declared order, skip when already marked complete. Then:

1. Announce `Task <N>: <title>`.
2. Read the Task's `Files` and any immediate neighbors clearly needed for context.
3. Implement the `Action`. Handle deviations per the rules below.
4. Run `Verify`. On failure, one debug retry; on second failure, AskUserQuestion.
5. On success, invoke `/ac:commit` for an atomic commit (and push unless `--no-push`).
6. Continue.

### Deviation Rules

**Rule 1, auto-fix bugs silently, log in Deviations.**
Applies to: broken behavior, logic errors, type errors, wrong imports, incorrect signatures, stale references.
Log entry: `- Task <N> (Rule 1): <what was wrong> at <file:line>, fixed by <what you did>.`

**Rule 2, auto-add missing critical functionality silently, log.**
Applies to: input validation on user-facing endpoints, error handling around external calls (DB, HTTP, filesystem), auth on protected routes, CSRF or CORS on state-changing endpoints, rate limiting where obviously warranted, indexes on columns used in WHERE or JOIN.
Log entry: `- Task <N> (Rule 2): added <what> to <file>, rationale: <one-liner>.`

**Rule 3, auto-fix blocking issues silently, log.**
Applies to: missing deps (append to `package.json`, `composer.json`, `pubspec.yaml`), build config errors, wrong imports, package name mismatches.
Log entry: `- Task <N> (Rule 3): <fix> in <file>.`

**Rule 4, ASK via AskUserQuestion in interactive mode, AUTO-SKIP in autonomous mode.**
Applies to: new DB table, non-trivial schema change (rename, drop, type change), new service layer, library switch, breaking API change, scope expansion beyond the Task's listed Files.

If `state.autonomous == false`, ask:

```json
{
  "questions": [{
    "question": "Task <N> requires <architectural change>. How should we proceed?",
    "header": "Architecture",
    "multiSelect": false,
    "options": [
      {"label": "Approve change", "description": "Apply the proposed deviation and continue with the Task."},
      {"label": "Alternative approach", "description": "<summarize an alternative that avoids the architectural change>"},
      {"label": "Skip task", "description": "Skip this Task, log in Open Questions, continue with the next Task."},
      {"label": "Stop execution", "description": "Pause the plan (status returns to approved); leave the rest for manual completion."}
    ]
  }]
}
```

Log entry (interactive): `- Task <N> (Rule 4): asked <summary>, decision: <choice>, outcome: <what was done>.`

If `state.autonomous == true`, do NOT ask. Skip the Task, append a one-line note to `Open Questions` (so the user can resolve it later), and append to Deviations Log:

`- Task <N> (Rule 4 autonomous skip): <architectural-change summary>, deferred to Open Questions, continuing.`

### Verify Gate

Run the Task's Verify command via Bash.

- **Pass**: proceed to commit.
- **First failure**: debug retry. Read the error output; locate the cause in the Task's files first, then immediate neighbors; apply the fix inline; re-run the same Verify. Use the Task's `Failure case` hint when present.
- **Second failure**: branch on `state.autonomous`.

If `state.autonomous == false`, AskUserQuestion:

```json
{
  "questions": [{
    "question": "Task <N> verify still failing: <error snippet>. What now?",
    "header": "Verify Fail",
    "multiSelect": false,
    "options": [
      {"label": "Retry once more", "description": "Deeper inspection, one more fix-and-verify cycle."},
      {"label": "Skip this task", "description": "Skip the Task, append a note to Deviations Log, continue with the next Task."},
      {"label": "Rollback", "description": "Revert this Task's git changes and pause the plan for manual resolution."},
      {"label": "Show me the failure", "description": "Print the full failure output and stop for manual debug."}
    ]
  }]
}
```

If `state.autonomous == true`, skip + log + continue. Append to Deviations Log:

`- Task <N> (Verify 2nd fail autonomous skip): <error snippet>, marked task failed, continuing.`

Mark the Task with `(skipped <ISO date>)` instead of `(done <ISO date>)`. Skip the commit step (nothing to commit). Continue to the next Task.

### Commit

On Verify pass:

1. Mark the Task done in the plan file (checkbox on `Done when`, or append `(done <ISO date>)`).
2. Invoke `/ac:commit` with a scope hint, for example: `/ac:commit <slug> task <N>, <imperative short description>`. `/ac:commit` handles preflight (lint, tests), convention detection, staging, atomic commit, and push by default.
3. Preflight fail: if `/ac:commit` reports lint or test failure across the project (even though the Task's Verify passed), branch on `state.autonomous`.
   - Interactive: run the Verify-Fail AskUserQuestion above; do NOT advance until the tree is clean.
   - Autonomous: skip the commit, append to Deviations Log:
     `- Task <N> (Preflight fail autonomous skip): <commit error snippet>, working tree left dirty, continuing.`
     Mark the Task with `(skipped <ISO date>)` and continue. The next task may inherit the dirty tree; that is acceptable in autonomous mode and will be reflected in the final report.
4. `--no-push` variant: call `/ac:commit --interactive <slug> task <N>` so it commits but waits for manual push.
5. Update the state file (`.ac/plans/<slug>.execution-state.md` for Simple, `.ac/plans/<slug>/.execution-state.md` for Mode A or B): bump `current_task` to the next task index, refresh `last_updated`, reset `attempt: 1`, append a one-line `Last Action` summary in the body. Use a heredoc:

   ```bash
   cat > "<state-path>" <<EOF
   ---
   slug: <slug>
   mode: <mode>
   status: executing
   current_phase: <N>
   current_task: <next>
   total_tasks: <count>
   attempt: 1
   iteration: <stored>
   max_iterations: <stored>
   autonomous: <stored>
   started_at: <stored>
   last_updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
   ---

   ## Last Action
   Completed Task <N-1> (<short title>).
   Next: Task <N> (<short title>).

   ## Recent Deviations
   <last 5 entries from plan Deviations Log>

   ## Stagnation Window
   <last 3 task attempts>

   ## Last Context Warning
   <preserved from previous state if any>
   EOF
   ```

   See `plugins/ac/references/execution-state-schema.md` for the full schema.

Continue to the next Task without pausing.

---

## Phase 4: Phase Boundary (Mode A only)

Triggered after the last Task of the current phase in Mode A.

1. Append this phase to the plan directory's `SUMMARY.md`:

   ```markdown
   ## Phase <N>: <name>
   - Completed: <ISO date>
   - Tasks: <count>
   - Deviations auto-fixed: <count> (R1: <x>, R2: <y>, R3: <z>), Rule 4 asks: <count>
   - Key files: <top 3-5 paths>
   - Commits: <SHA range or count>
   ```

2. Set the phase file's `status: complete`.
3. Update ROADMAP: mark this phase `status: complete`.
4. Pick the next phase with `status: approved`. If none remain, go to Phase 5.
5. Set the next phase's `status: executing`. Re-invoke twin skills (Phase 2), restart Phase 3 on the new phase file.

Only halts on verify-fail or Rule 4. Single-file and Mode B plans skip Phase 4 entirely.

---

## Phase 5: Completion or Schedule

Phase 5 is the exit point. Two paths: full completion, or voluntary mid-run exit with autonomous resume scheduled.

### Decision tree

```
state.status == 'iteration-limit-hit'
  -> notify user, exit cleanly, no schedule
plan complete (all phases done, all tasks done or skipped)
  -> finalize completion (steps below), no schedule
plan incomplete AND state.autonomous == true AND state.iteration < state.max_iterations
  -> ScheduleWakeup, exit cleanly
plan incomplete AND interactive
  -> exit cleanly, no schedule (user resumes manually)
```

### Path A, completion

1. Set `status: complete` on the plan target. Mode A: also on ROADMAP (meta `status: complete`) and every phase file.
2. Delete the execution state file:
   - Simple: `rm -f .ac/plans/<slug>.execution-state.md`.
   - Mode A or B: `rm -f .ac/plans/<slug>/.execution-state.md`.

   The plan frontmatter `status: complete` is the single source of truth from this point. The state file is recreated only if `--force` re-runs the plan.
3. Run the wisdom step inline (no need to spawn `/ac:wisdom`):
   - Append or consolidate `SUMMARY.md`.
   - Update `open-questions.md` with anything deferred during execute.
   - Memory Reflection (per `/ac:wisdom` Phase 4): evaluate whether the plan produced architectural decisions, codebase evolution, or validated external references worth saving to CC's auto-memory. Save at most 2; save 0 for routine work. Note each saved memory in the plan's Deviations Log so later `/ac:wisdom` runs do not double-save.
4. Report:

   ```
   Plan <slug> complete.
   Tasks: <N>
   Deviations auto-fixed: <N>  (R1: <x>, R2: <y>, R3: <z>)
   Rule 4 user asks: <N>
   Commits: <N>
   Open questions: <N>
   Memories saved: <N>
   SUMMARY: <path>
   ```

5. Suggest next step:
   - Single or Mode A: `Plan closed. Review SUMMARY.md.`
   - Mode B: `Next phase pending. Run /ac:plan <slug> to plan phase-0<N+1>.`

### Path B, autonomous schedule

When the plan is incomplete AND `state.autonomous == true` AND `state.iteration < state.max_iterations`:

1. Update the state file's `last_updated` and confirm `current_phase` and `current_task` reflect the next executable position.
2. Call `ScheduleWakeup`:

   ```
   ScheduleWakeup(
     delaySeconds: 60,
     prompt: "/ac:execute --resume <slug>",
     reason: "autonomous resume: phase <P>, task <T>, iteration <I>/<MAX>"
   )
   ```

3. Print the schedule confirmation: `Scheduled autonomous resume in 60s. Plan: <slug>, position: phase <P> task <T>, iteration <I>/<MAX>.`
4. Exit cleanly. No wisdom step yet (plan is not complete). The next `/ac:execute --resume <slug>` turn picks up from the state file.

`ScheduleWakeup` is a deferred tool. If it has not been loaded yet in the current turn, run `ToolSearch(query: "select:ScheduleWakeup", max_results: 1)` first to load its schema.

### Path C, iteration cap reached

When `state.iteration >= state.max_iterations` (already set in Phase 1 resume guard):

1. Confirm state file `status: iteration-limit-hit` is persisted.
2. Print: `Iteration cap (<N>) reached for plan <slug> at phase <P> task <T>. Resume manually with /ac:execute --resume <slug> --max-iterations=<bigger>.`
3. Exit cleanly. No schedule, no wisdom step.

### Path D, interactive incomplete exit

When the plan is incomplete AND `state.autonomous == false` (rare, e.g., user pressed stop or interactive verify-fail rollback chosen):

1. Leave `status: executing` on the plan and the state file untouched.
2. Print: `Paused at phase <P> task <T>. Resume with /ac:execute --resume <slug>.`
3. Exit cleanly.

---

## Guards

- Main agent runs the loop. Never spawn custom subagents, never call `Agent(Plan)`. The built-in `Agent(subagent_type: "Explore")` is allowed only when a Rule 4 investigation, a Verify-Fail debug retry, or a Task's `Failure case` clearly needs more than 3 directed queries (broad codebase survey). Prefer inline Read / Glob / Grep for narrow scans.
- Never edit files outside declared Task Files; scope expansion is a Rule 4 trigger.
- Never skip the Verify step; it is the Task completion gate.
- If the user interrupts or says `stop`, leave `status: executing`, announce the current Task, exit cleanly.
