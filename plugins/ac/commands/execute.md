---
description: Execute an approved plan end-to-end in the main agent. Auto-fix bugs, missing validation, and blocking issues silently. Ask only on architectural changes. Per-task atomic commits, Nyquist verify gate. Loop mode until done or verify-fail.
argument-hint: "[.ac/plans/<slug>.md | <slug>/phase-N.md | <slug>/ for all phases] [--no-push] [--force]"
effort: high
---

# Execute

Runs an approved plan to completion in the main agent. Loop mode: does not stop between tasks. Halts only on verify-fail (after one debug retry) or Rule 4 architectural deviation.

**Delegations**: Invokes `my-coding` once before the first code change, `my-language` once before the first commit. No subagent spawns. Per-task atomic commits follow Conventional Commits.

---

## Phase 1: Load

1. Parse `$ARGUMENTS`:
   - Path ending in `.md` → single-file plan or a specific Mode B phase file.
   - Path ending in `/` or `<slug>/` → Mode A, execute all phases sequentially.
   - Empty → Glob `.ac/plans/**/*.md`, filter `status: approved`, pick the most recent. If more than one, AskUserQuestion to pick.
   - Includes `--force` token → allow re-running a `status: complete` plan. Strip before resolving path.
   - Includes `--no-push` token → suppress per-task `git push` (still commits locally via `/ac:commit --interactive`). Strip before resolving path. Useful for offline work or protected branches.

2. Read the target. Validate frontmatter:
   - `status: approved` or `status: executing` → proceed.
   - `status: complete` without `--force` → refuse: `Plan already complete. Add --force to re-run.`
   - `status: draft` → refuse: `Plan not approved. Run /ac:plan <slug> first.`

3. Set `status: executing` in the target file (and in ROADMAP for Mode A).

4. Mode A specifics: read `ROADMAP.md`, pick the first phase with `status: approved`. Make that phase file the current target. Record the ROADMAP path for Phase 4.

---

## Phase 2: Pre-invoke Twin Skills

Once at the start of execution:

1. `Skill("my-coding")`, so all code changes respect the user's coding baseline (no `declare(strict_types=1)`, 120-char max, TDD, clean imports, constructor DI, enums, etc.).
2. `Skill("my-language")`, so commit messages and any prose output match the user's voice (Conventional Commits with scope, no em dash, WHY not WHAT).
3. Both are silent no-ops if the skill is not installed.

Re-invoke at Phase 4 phase boundaries (the SessionStart hook reminder noted post-compact skills may need re-loading).

---

## Phase 3: Task Loop

The heart of loop mode. Do not pause except on the explicit conditions listed.

For each Task in the plan file, in declared order:

1. Skip if the Task is already marked complete (checkbox `[x]` in Done when, or `status: done` inline).
2. Announce: `Task <N>: <title>`.
3. Read the `Files` listed. Read immediate neighbors if obviously needed for context.
4. Implement the `Action`. Handle deviations per rules:

### Rule 1, auto-fix bugs silently, log in Deviations

Applies to: broken behavior, logic errors, type errors, wrong imports, incorrect signatures, stale references.

Action: fix inline. Append to the plan file's Deviations Log:

```markdown
- Task <N> (Rule 1): <what was wrong> at <file:line>, fixed by <what you did>.
```

### Rule 2, auto-add missing critical functionality silently, log

Applies to: input validation on user-facing endpoints, error handling around external calls (DB, HTTP, filesystem), auth on protected routes, CSRF / CORS on state-changing endpoints, rate limiting where obviously warranted, indexes on columns used in WHERE or JOIN.

Action: add inline. Log:

```markdown
- Task <N> (Rule 2): added <what> to <file>, rationale: <one-liner>.
```

### Rule 3, auto-fix blocking issues silently, log

Applies to: missing deps (append to `package.json`, `composer.json`, `pubspec.yaml`), build config errors, wrong imports, package name mismatches.

Action: fix inline. Log:

```markdown
- Task <N> (Rule 3): <fix> in <file>.
```

### Rule 4, ASK via AskUserQuestion, do not proceed until answered

Applies to: new DB table, non-trivial schema change (rename, drop, type change), new service layer, library switch, breaking API change, scope expansion beyond the Task's listed Files (new file outside Files list).

```json
{
  "questions": [{
    "question": "Task <N> requires <architectural change>. How should we proceed?",
    "header": "Architecture",
    "multiSelect": false,
    "options": [
      {"label": "Approve change", "description": "Öneriyle devam et, bu deviation'ı uygula."},
      {"label": "Alternative approach", "description": "<ikinci seçenek özeti>"},
      {"label": "Skip task", "description": "Bu task'ı atla, Open Questions'a düş, devam et."},
      {"label": "Stop execution", "description": "Plan'ı pause et, status approved'a döner, elle tamamlanır."}
    ]
  }]
}
```

After the answer, log to Deviations:

```markdown
- Task <N> (Rule 4): asked user <question>, decision: <choice>, outcome: <what was done>.
```

---

5. Run the Task's `Verify` command via Bash:

   First attempt:
   ```bash
   <verify-command-from-task>
   ```

   - **Pass** → go to step 6.
   - **Fail** → debug retry:
     - Read the error output, locate the cause (same Task's files first, then immediate neighbors).
     - Apply the fix inline.
     - Re-run the same Verify command. Max 1 debug retry.

   Second failure (after 1 debug retry):

   ```json
   {
     "questions": [{
       "question": "Task <N> verify still failing: <error snippet>. What now?",
       "header": "Verify Fail",
       "multiSelect": false,
       "options": [
         {"label": "Retry once more", "description": "Hatayı daha ayrıntılı incele, tekrar dene."},
         {"label": "Skip this task", "description": "Task'ı skip et, Deviations'a not düş, bir sonrakine geç."},
         {"label": "Rollback", "description": "Bu task için yapılan git değişikliklerini geri al, planı pause et."},
         {"label": "Show me the failure", "description": "Detayları göster, manuel debug için dur."}
       ]
     }]
   }
   ```

6. On success:
   - Mark the Task complete in the plan file. Update `Done when` with `[x]` prefix or append `(done <ISO date>)`.
   - Atomic commit AND push via `/ac:commit`. Invoke it as a nested command call with a scope hint:

     ```
     /ac:commit <slug> task <N>, <imperative short description>
     ```

     `/ac:commit` handles: preflight checks (lint, tests), convention detection (Conventional Commits via `my-language`), staging, atomic commit, and push by default (auto mode). One task means one atomic commit pushed to the remote.

   - **If `/ac:commit` preflight fails** (lint or tests broke project-wide even though the Task's Verify passed): treat this as a verification failure equivalent. Announce what preflight reported, then run the Verify-Fail AskUserQuestion flow from step 5 (retry, skip, rollback, show the failure). Do NOT proceed to the next Task until the tree is clean.

   - **If the project does not want per-task pushes** (CLAUDE.md says so, or user passes `--no-push`): detect `--no-push` in `$ARGUMENTS` before Phase 3. If set, substitute the invocation with `/ac:commit --interactive <slug> task <N>` or inline `git commit` without push. Default is push-per-task.

7. Continue to the next Task. DO NOT pause between tasks.

---

## Phase 4: Phase-boundary (Mode A only)

Triggered when Mode A finishes the last Task of the current phase.

1. Append this phase to the plan directory's `SUMMARY.md`:

   ```markdown
   ## Phase <N>: <name>
   - Completed: <ISO date>
   - Tasks: <count>
   - Deviations auto-fixed: <count> (R1: <x>, R2: <y>, R3: <z>), Rule 4 asks: <count>
   - Key files: <top 3-5 paths>
   - Commits: <SHA range or count>
   ```

2. Set the phase file's frontmatter `status: complete`.
3. Update ROADMAP: this phase row becomes `status: complete`.
4. Pick the next phase in ROADMAP with `status: approved`. If none: all phases done, go to Phase 5.
5. Set that phase's `status: executing`. Re-invoke twin skills (Phase 2), then restart Phase 3 with the new phase file.
6. Loop until no approved phases remain. Only halts on verify-fail or Rule 4.

Single-file and Mode B: skip Phase 4 entirely, go to Phase 5 after the last Task.

---

## Phase 5: Completion

1. Set `status: complete` on the target plan file. For Mode A: also on ROADMAP (meta `status: complete`) and every phase file.

2. Invoke `/ac:wisdom` logic inline (do not spawn a command runner, just do the work):
   - Generate or append `SUMMARY.md` (Mode A: consolidate all phase summaries).
   - Update `open-questions.md` with any deferred items raised during execute.

3. Report:

   ```
   Plan <slug> complete.
   Tasks: <N>
   Deviations auto-fixed: <N>  (R1: <x>, R2: <y>, R3: <z>)
   Rule 4 user asks: <N>
   Commits: <N>
   Open questions: <N>
   SUMMARY: <path>
   ```

4. Suggest next step:
   - Single / Mode A: `Plan closed. Review SUMMARY.md.`
   - Mode B: `Next phase pending. Run /ac:plan <slug> to plan phase-0<N+1>.`

---

## Guards

- NEVER spawn subagents via the `Agent` tool. Main agent only.
- NEVER edit files outside declared Task Files. Scope expansion triggers Rule 4.
- NEVER skip the Verify step. Nyquist rule is the completion gate.
- NEVER use em or en dash in plan file edits, Deviations Log, commit messages, or SUMMARY.
- NEVER auto-fix something that looks architectural. If unsure between Rule 2 (silent add) and Rule 4 (ask), ask.
- If the user interrupts mid-loop or types `stop`, leave the plan at `status: executing`, announce the current Task, and exit cleanly.
