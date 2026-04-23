---
description: Generate SUMMARY and open-questions artifacts for an executed plan. Auto-invoked by /ac:execute at completion, callable standalone for post-hoc analysis or re-summarization.
argument-hint: "[.ac/plans/<slug>.md | <slug>/]"
effort: medium
---

# Wisdom

Post-execute report generation. Captures what was built, deviations applied, patterns discovered, and decisions deferred. Runs automatically at `/ac:execute` completion; can also run standalone against any `status: complete` plan.

---

## Phase 1: Load

1. Parse `$ARGUMENTS`:
   - File path → single-plan or Mode B phase wisdom.
   - Directory path → multi-phase Mode A consolidation.
   - Empty → Glob `.ac/plans/**/*.md`, filter `status: complete` without a SUMMARY alongside, pick the most recent. If more than one candidate, AskUserQuestion to pick.

2. Read the plan file (or all phase files for Mode A) and any existing SUMMARY / open-questions files.

3. Extract the `status: executing` timestamp from the frontmatter history or the first commit SHA matching the slug. This is the start of the execution window.

4. Run Bash to collect commit and change data:

   ```bash
   START_REF=<commit or ISO timestamp>
   git log --since="$START_REF" --oneline --no-merges | grep -E "<slug>" || \
     git log --since="$START_REF" --oneline --no-merges
   git diff --stat "$START_REF"..HEAD
   ```

5. Pre-invoke `Skill("my-language")` for prose tone. Silent no-op if not installed.

6. Parse the plan file's `Deviations Log` and `Open Questions` sections into structured lists for Phase 2 and Phase 3.

---

## Phase 2: Generate SUMMARY.md

Target:
- Multi-phase Mode A: `.ac/plans/<slug>/SUMMARY.md` (append or replace this phase's section).
- Single-file or Mode B: `.ac/plans/<slug>-summary.md`.

Format:

```markdown
---
slug: <slug>
completed: <ISO date>
mode: <A | B | single>
phase: <N or "single">
task-count: <N>
deviations: <N>
commits: <N>
---

## What was built

One concise line per completed Task:
- Task 1 (<primary file>): <outcome in one sentence>
- Task 2 (<primary file>): <outcome>

## Key files changed

- `path/to/file.ts`, <what changed, why, one sentence>
- `path/to/other.php`, <what changed>

## Deviations applied

Grouped by rule:
- Rule 1 (bugs): <count>, examples: <one liner per notable case>
- Rule 2 (critical additions): <count>, examples
- Rule 3 (blocking fixes): <count>, examples
- Rule 4 (user asks): <count>, examples

## Patterns discovered

- Existing helper `path/to/x.ts:fnName` matched Task <N> needs, saved an implementation.
- <pattern name>, observed when <context>, reusable for <future scenario>.

## Verification status

- Per-task Verify commands: all passed.
- End-to-end Verification (from plan): <result>.
- Build: <pass | fail>.
- Lint: <zero warnings | N warnings>.

## Open questions forwarded

See `<path>/open-questions.md` or inline (single-file). Count: <N>.
```

For Mode A consolidated SUMMARY: each phase becomes its own `## Phase <N>: <name>` section under `## What was built`. Preserve phase boundaries.

---

## Phase 3: Update open-questions.md

Append any items the Deviations Log or this run raised.

Format, one per line:

```markdown
- [ ] <question>, <why it matters>, raised at task <N> (<file:line>).
```

After appending:
- If `open-questions.md` is empty (no items), delete the file. Mode A invariant should leave zero open questions; absence signals that invariant is met.
- If items remain, leave the file in place.

---

## Phase 4: Memory Reflection

Evaluate whether the work warrants writing to Claude Code's auto-memory. CC already knows the memory system, types, and file layout; this phase decides WHAT (if anything) to save for future sessions.

**Save when the plan produced**:
- **Architectural decisions**: a new pattern introduced, a significant design choice made, a constraint discovered that future plans should respect. Memory type: `project` or `feedback`.
- **Codebase evolution**: a new module, layer, or convention added that shifts how similar work should be approached next time. Memory type: `project`.
- **Validated assumptions or external references**: facts about the system (infra endpoints, dashboards, external tracker IDs) confirmed during execution that would otherwise need re-discovery. Memory type: `reference` or `project`.

**Skip when the plan was**:
- Routine CRUD, straightforward bug fix, config tweak, dependency bump, cosmetic change.
- Already entirely described by the code diff or git log; nothing Claude could not re-derive next session.

**Limits**:
- At most 2 memories per plan. Zero is normal for routine work.
- Match each candidate against the memory-type definitions CC injects (user, feedback, project, reference); skip if it fits none.
- Never duplicate memories that already exist. Scan the current MEMORY.md index before writing; update an existing entry instead of adding a redundant one.

**Process**:
1. Re-read the plan's Context, Tasks, Deviations Log, and SUMMARY.
2. Nominate up to 2 candidates, each with a proposed memory type and a one-sentence "why saving this".
3. Filter against the "skip when" list. If nothing survives, announce `No memory worth saving` and move on.
4. For survivors: save them via CC's auto-memory flow (CC handles the file creation and MEMORY.md index update).
5. Append a line to the `Deviations Log` noting each memory saved (so future runs of `/ac:wisdom` on this plan do not double-save).

---

## Phase 5: Announce

Print to the user, concise:

```
Wisdom generated for <slug>.
SUMMARY: <path>
Open questions: <N>  (see <path> or none)
Memories saved: <N>  (0 is normal for routine work)
```

Use `my-language` tone: direct, no marketing phrases, no trailing `Have a nice day` (this is docs-mode, not article-mode). Under 5 lines total.

---

## Guards

- Never re-run when auto-invoked by `/ac:execute` if a SUMMARY already exists with a timestamp newer than the plan's `status: complete` timestamp. Announce `Already generated` and exit.
- Never edit the plan file's body sections (Context, Tasks, etc.). Only SUMMARY, open-questions, and the Deviations Log memory-note are writeable plan-side targets.
- Memory reflection writes to CC's auto-memory path (handled by CC); this command decides WHAT to save, not WHERE. Do not hand-write paths under `~/.claude/projects/...`.
- Respect the 2-memory cap per plan. Err on the side of saving nothing when uncertain.
