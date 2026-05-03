# Execution State Schema

The autonomous execution mode persists run state to `.execution-state.md` so a plan can resume after compaction or after a `ScheduleWakeup` re-entry. This file is the source of truth for "where are we?" during `/ac:execute`. The plan file itself stays clean; it describes intent, not progress.

## Location

| Plan mode | State file path |
|-----------|-----------------|
| Simple    | `.ac/plans/<slug>.execution-state.md` |
| Mode A    | `.ac/plans/<slug>/.execution-state.md` |
| Mode B    | `.ac/plans/<slug>/.execution-state.md` |

A leading dot for Mode A and B keeps the file out of the phase listing (`phase-0N-*.md`). Simple has no directory, so a sibling `<slug>.execution-state.md` is used.

## Frontmatter

```yaml
---
slug: my-plan                         # plan slug, mirrors plan frontmatter
mode: single | A | B                  # plan mode, mirrors plan frontmatter
status: executing                     # executing | iteration-limit-hit | complete
current_phase: 2                      # 1-indexed; for Simple this is always 1
current_task: 5                       # 1-indexed within current_phase
total_tasks: 12                       # task count for current_phase
attempt: 1                            # current task verify attempt count (1 or 2)
iteration: 7                          # /ac:execute --resume entry count
max_iterations: 100                   # safety cap, override via --max-iterations=N
autonomous: true                      # sticky flag, true after --auto, false after --no-auto
started_at: 2026-05-03T10:00:00Z      # ISO timestamp, plan execution start
last_updated: 2026-05-03T10:42:13Z    # ISO timestamp, last task commit or hook write
---
```

## Body sections

```markdown
## Last Action
Completed Task 5 (Add validation to UserService).
Next: Task 6 (Wire validator to controller).

## Recent Deviations
- Task 3: Skipped (architectural deviation logged)

## Stagnation Window
Task 5 attempt 1 ok, Task 6 attempt 1 ok

## Last Context Warning
2026-05-03T10:40:00Z severity=WARNING tool_count=42
```

`Last Action` is a one-line free-text summary so a resumed session understands the last completed step without re-reading the plan body. `Recent Deviations` mirrors the plan's Deviations Log but only the last 5 entries (rolling). `Stagnation Window` tracks the last 3 task attempts (used by future stagnation detection if added). `Last Context Warning` lets the PostToolUse hook throttle warnings (5 tool call cooldown).

## Lifecycle

```
/ac:execute <slug>           ->  state file created
                                 status: executing, iteration: 1
  Task 1 done                ->  current_task += 1, last_updated bumped, commit
  Task 2 done                ->  ...
  Task N (last) done         ->  status check, plan frontmatter status: complete
                                 state file DELETED

/ac:execute --resume <slug>  ->  state file read
                                 iteration += 1
                                 if iteration > max_iterations:
                                   status: iteration-limit-hit, stop, notify user
                                 else: resume from current_phase/current_task

Compaction (auto)            ->  PreCompact hook reads state file, injects
                                 newCustomInstructions with plan slug + current
                                 phase/task + remaining tasks + twin skill
                                 directives + last 3 deviations.
                                 SessionStart (post-compact) reads state and
                                 injects additionalContext resume reminder.

ScheduleWakeup (Phase 5)     ->  if status executing AND autonomous AND
                                   iteration < max_iterations: schedule wakeup,
                                   exit cleanly.
                                 if status complete: do not schedule, exit.

Plan complete                ->  plan file frontmatter status: complete
                                 state file deleted
                                 wisdom step run inline
```

## Examples

### Example 1, Simple plan, mid-execution

```yaml
---
slug: rate-limit-fix
mode: single
status: executing
current_phase: 1
current_task: 3
total_tasks: 8
attempt: 1
iteration: 1
max_iterations: 100
autonomous: false
started_at: 2026-05-03T09:30:00Z
last_updated: 2026-05-03T09:51:22Z
---

## Last Action
Completed Task 2 (Wire RateLimiter middleware to /api routes).
Next: Task 3 (Add Redis store binding).

## Recent Deviations
- Task 1 (Rule 3): added predis/predis to composer.json.

## Stagnation Window
Task 1 attempt 1 ok, Task 2 attempt 1 ok

## Last Context Warning
(none)
```

### Example 2, Mode A plan with autonomous resume after compaction

```yaml
---
slug: payment-rewrite
mode: A
status: executing
current_phase: 3
current_task: 2
total_tasks: 6
attempt: 1
iteration: 4
max_iterations: 100
autonomous: true
started_at: 2026-05-02T22:10:00Z
last_updated: 2026-05-03T01:14:08Z
---

## Last Action
Completed Phase 2 (provider integration). Resumed phase-03-checkout.md after compaction at iteration 4.
Next: Task 2 (Move CheckoutController to new namespace).

## Recent Deviations
- Phase 2 Task 5 (Rule 1): fixed null pointer in StripeAdapter at line 142.
- Phase 2 Task 7 (Rule 4 autonomous skip): logged StripeWebhookSignature scope creep, skipped.
- Phase 3 Task 1 (verify 2nd fail autonomous): logged failed checkout E2E, skipped, continuing.

## Stagnation Window
Phase 2 Task 6 attempt 1 ok, Phase 2 Task 7 skip, Phase 3 Task 1 skip

## Last Context Warning
2026-05-03T01:10:55Z severity=CRITICAL tool_count=148
```

### Example 3, plan complete, state file about to be deleted

```yaml
---
slug: small-feature
mode: single
status: complete
current_phase: 1
current_task: 4
total_tasks: 4
attempt: 1
iteration: 2
max_iterations: 100
autonomous: true
started_at: 2026-05-03T08:00:00Z
last_updated: 2026-05-03T08:47:01Z
---

## Last Action
Completed Task 4 (Update README). Plan frontmatter status set to complete. State file scheduled for deletion.

## Recent Deviations
- Task 2 (Rule 2): added input validation to /api/widgets POST.

## Stagnation Window
Task 3 attempt 1 ok, Task 4 attempt 1 ok

## Last Context Warning
(none)
```

## Notes

- The `attempt` field counts verify attempts within a single task (resets to 1 on next task). The Verify Gate in `/ac:execute` Phase 3 has a max of 2 attempts before AskUserQuestion (interactive) or skip+log (autonomous).
- `iteration` counts entire `/ac:execute` re-entries (including the initial start as 1). Each `--resume` increments. The cap is hard, not advisory.
- `autonomous: true` only after `--auto` is passed, sticky until `--no-auto`. Default for new plans is `false`.
- `last_updated` is bumped by every task commit AND by hook writes (PostToolUse warning, PreCompact). This makes it a reliable "alive" timestamp.
- The state file is parseable with `sed -n '/^---$/,/^---$/p'` for frontmatter and standard markdown for body. No external tools needed.
