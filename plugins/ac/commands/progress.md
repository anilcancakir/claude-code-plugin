---
description: "Show execution progress — active plans, task status, next action. Use when checking status or resuming work."
argument-hint: "Optional: project name or plan slug to filter"
effort: low
---

# Progress Dashboard

## Identity

You read .ac/plans/ and .ac/tasks/ to display a structured execution status dashboard. Read files, parse state, present a concise report. No agents needed — read and present only.

## Capabilities & Constraints

**You CAN:**
- Read .ac/plans/, .ac/tasks/, and .ac/qa/ directories
- Parse YAML frontmatter, markdown structure, and wisdom files
- Present structured dashboard tables

**You CANNOT:**
- Modify any files
- Spawn agents
- Execute plans or tasks

**You MUST:**
- Check for .report.md files (dev reports from execute)
- Check for .wisdom.md files (accumulated wisdom)
- Show layered verification status if execution is in progress

Filter: $ARGUMENTS (empty → show all; provided → filter by project name or plan slug)

---

## Phase 1: Scan

Collect all relevant files from project-local storage.

1. Glob `.ac/plans/*.md` — collect all plan files. Exclude any file ending in `.wisdom.md`.
2. Glob `.ac/tasks/*-overview.md` — collect all project overview files.
3. Glob `.ac/tasks/*.md` — collect all task files. Exclude any file ending in `-overview.md`.
4. If `$ARGUMENTS` is non-empty, filter each list: keep only files whose filename or frontmatter `project:` field contains `$ARGUMENTS` (case-insensitive match). For plans, also match against the plan title (`# Plan: [Title]`).
5. Glob `.ac/plans/*.report.md` — collect all dev report files.
6. If all three lists are empty after filtering → print "No active plans or tasks. Start with `/ac:ideate` or `/ac:plan`." and stop.

---

## Phase 2: Parse

Extract status data from scanned files.

### Plans

For each plan file:

1. Read the file.
2. Extract title from `# Plan: [Title]` heading.
3. Extract complexity from `**Complexity**:` line (Simple / Standard / Complex).
4. Count total steps: count occurrences of `**Step N**:` pattern.
5. Infer current status from the Waves section:
   - If `### Waves` section is present, note how many waves are defined.
   - No additional execution state is stored in plan files — status is "Pending execution" unless a `.wisdom.md` counterpart exists.
6. If a matching `.ac/plans/{slug}.wisdom.md` exists, read it and extract the most recent wave/step progress note. Use this as the Status column value (e.g., "Executing Wave 2", "Wave 1 complete").
7. If a matching `.ac/plans/{slug}.report.md` exists, read summary line. Status = "Completed — [summary]".
8. If no wisdom file and no report file → Status = "Pending execution".

### Overview Files

For each overview file:

1. Read the file.
2. Extract project name from the H1 heading (`# [Project Name] — PRD`).
3. Find the Phase Tracking checklist section — look for lines matching `- [marker] Phase N: [Title]`.
4. Status markers: `[ ]` = pending, `[~]` = in progress, `[x]` = done, `[!]` = partial/failed.
5. For each phase line, record: phase number, title, marker.
6. Count tasks per phase by cross-referencing task files with matching `phase:` and `project:` frontmatter values.

### Task Files

For each task file (excluding overview files):

1. Read YAML frontmatter.
2. Extract: `type`, `size`, `priority`, `status`, `project`, `phase`.
3. Derive slug from filename (strip path and `.md` extension).
4. Group by project if `project:` is set. Ungrouped tasks go into a "Standalone" bucket.

---

## Phase 3: Present

Render the dashboard. Use tables. Keep output compact — one row per item.

```
## Progress Dashboard

### Active Plans
| Plan | Complexity | Steps | Status |
|------|-----------|-------|--------|
| [title] | [complexity] | [N steps] | [status] |
```

If no plan files found → print `### Active Plans\nNo active plans.`

```
### Active Project: [name]
| Phase | Title | Tasks | Status |
|-------|-------|-------|--------|
| 1 | [title] | [done]/[total] | [~] in progress |
| 2 | [title] | [done]/[total] | [ ] pending |
```

Print one "Active Project" block per overview file. If no overview files found → omit this section.

Tasks done count = tasks with `status: done` in that phase. Total = all tasks with matching `project:` and `phase:`.

```
### Task Status
| Task | Type | Size | Priority | Status |
|------|------|------|----------|--------|
| [slug] | [type] | [size] | [priority] | [status] |
```

Sort rows: `ready` first, then `planned`, then `draft`, then `done`. If no task files found → print `### Task Status\nNo active tasks.`

```
### Next Action
[recommendation]
```

Derive recommendation from state:

- Has plan files with "Pending execution" status AND no wisdom file → "Run `/ac:execute [plan-slug]` to start execution."
- Has plan files currently executing (wisdom file present with wave progress) → "Resume `/ac:execute [plan-slug]` — [current wave status]."
- Has plan with wisdom file showing "Layer N" progress → "Layered verification in progress — [current layer status]."
- Has task files with `status: ready` but no corresponding plan files → "Run `/ac:plan [task-path]` to plan the next ready task."
- Has task files with `status: draft` only → "Tasks need refinement. Run `/ac:ideate` to improve or add acceptance criteria."
- All task files have `status: done` AND no pending plan files → "All tasks complete — run `/ac:commit` to commit changes."
- No `.ac/` content or all lists empty → "No active plans or tasks. Start with `/ac:ideate` or `/ac:plan`."

If multiple conditions apply, list the highest-priority one (executing plan > pending plan > ready tasks > draft tasks > all done).
