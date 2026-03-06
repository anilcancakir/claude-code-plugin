---
description: Execute an approved plan — parallel worktree agents or sequential
argument-hint: Plan file path (e.g., auth-system)
model: sonnet
---

# Plan Execution

You are executing an approved plan. Read the plan, classify steps by independence, and execute using the optimal strategy.

**CRITICAL**: This command orchestrates execution only. It spawns agents to do the work — it does NOT implement code itself.

## Phase 1: Load Plan

**Goal**: Find and parse the approved plan file.

Plan identifier: $ARGUMENTS

**Actions**:

1. Derive plan storage path from auto memory directory (replace `memory/` with `plans/`)
2. If `$ARGUMENTS` is a full path, use it directly. If it's a slug (e.g., `auth-system`), resolve to `~/.claude/projects/<cwd-hash>/plans/$ARGUMENTS.md`
3. Read the plan file. If it doesn't exist, inform the user and stop
4. Parse the plan into structured steps:
   - Step number, title, description
   - Files to create or modify per step
   - Acceptance criteria (done-when conditions)
   - Dependencies between steps (if specified)

---

## Phase 2: Classify Execution Strategy

**Goal**: Determine parallel vs sequential execution.

**Actions**:

1. **Check for Work Units section** in the plan file:
   - If `### Work Units` section exists → use it directly (plan already decomposed by `ac:plan`)
   - Parse each Unit: name, step numbers, file list, verification command
   - Identify Sequential steps (if listed)
   - Skip to step 4

2. **Auto-analyze** (only if Work Units section absent):
   - Check each step's `Independence` field
   - Group independent steps (no shared files, no dependency chain)
   - Group dependent steps into sequential chains

3. **Validate** (whether plan-provided or auto-analyzed):
   - Verify no file overlaps between parallel units
   - Verify each unit can run in a worktree with no shared state

4. Select execution strategy:

| Condition | Strategy |
|-----------|----------|
| 1 step total | Execute directly (no agent needed) |
| 2 steps, all independent | Parallel background agents (no worktree needed if different files) |
| 3+ independent units | Parallel worktree agents + `run_in_background: true` |
| Mixed parallel + sequential | Parallel units first, then sequential steps |
| All sequential | Sequential agents — one at a time |

1. Present execution plan to the user:

```
## Execution Strategy

**Plan**: [plan name]
**Total Steps**: N
**Strategy**: [Parallel Waves / Sequential / Direct]

### Wave 1 (parallel)
- Step 1: [title] — [files]
- Step 3: [title] — [files]

### Wave 2 (after Wave 1)
- Step 2: [title] — depends on Step 1

Proceed? [Execute / Adjust Wave Grouping / Cancel]
```

---

## Phase 3: Reliability Preflight (MANDATORY)

**Goal**: Prevent stuck or non-deterministic execution before launching agents.

Apply this preflight before any agent launch. If preflight fails, do not start parallel background execution.

**Actions**:

1. Capture and report an execution mode snapshot before any launch using available runtime evidence:
   - Current permission mode (if surfaced by system/runtime reminders)
   - Whether bypassPermissions appears active or disabled
   - Any explicit disable reason if bypass is inactive (settings/runtime gate reminders)
2. Read `~/.claude/settings.json` if present and validate:
   - `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS == "1"`
   - `env.CLAUDE_CODE_ENABLE_TASKS == "true"`
3. Detect `teammateMode` if set:
   - If `teammateMode: "tmux"`, verify tmux runtime is available before spawning parallel teammates
   - If tmux is unavailable, do not attempt tmux teammate spawning
4. Check permission posture before execution:
   - If workflow requires write/edit but permission mode or hooks block it, do not continue with background execution
   - Prefer explicit remediation over silent retries
5. Check hook interference risk:
   - If PreToolUse hooks can block required tools (Write/Edit/Bash), switch to deterministic fallback mode
6. Enforce execution policy:

| Preflight Result | Allowed Strategy |
|------------------|------------------|
| PASS | Planned strategy (parallel/sequential) |
| SOFT FAIL (recoverable) | Sequential foreground fallback |
| HARD FAIL (blocking) | Stop and provide remediation |

**Remediation message requirements** (when preflight fails):
- State exactly what failed (missing env key, tmux unavailable, permission denied, hook block)
- Include mode snapshot details from available evidence (permission mode, bypassPermissions active/inactive, disable reason if known)
- State why execution cannot proceed safely
- Provide concrete fix steps

---

## Phase 4: Execute

**Goal**: Launch agents and track progress with deterministic behavior.

**Execution guardrails (official-aligned):**
- Do not sleep between commands that can run immediately
- Do not retry failing commands in sleep loops
- If waiting on background tasks, rely on completion notifications and TaskOutput checks

### For Parallel Waves (3+ independent steps)

For each wave, launch ALL agents in a **single message block** (multiple Agent tool calls):

```
Agent(
  prompt: "[full self-contained task prompt — see template below]",
  isolation: "worktree",
  run_in_background: true
)
```

**Worker prompt template** — each agent must receive a fully self-contained prompt:

```markdown
## Your Task

**Overall Goal**: [Plan title and context — 1-2 sentences]

**Your Assignment**: [Step title]
[Full step description from plan]

**Files to Modify**:
- [file paths from plan step]

**Acceptance Criteria**:
[Done-when conditions from plan, verbatim]

**Codebase Conventions** (follow these):
[Any conventions discovered during planning — naming, patterns, structure]

## Execution Rules

1. Read existing files before modifying — match patterns and conventions
2. Implement ONLY your assigned step. Do not touch files outside your scope
3. Run verification after changes:
   - Build: run the project's build command
   - Tests: run tests relevant to modified files
   - Lint: run the project's linter
4. If tests fail, fix the root cause. Do not skip or modify tests to pass
5. After completion, summarize: files changed, verification results, any issues

## Output Format

### Changes Made
- `file:line` — [what changed]

### Verification
- Build: [command] → [result]
- Tests: [command] → [result]
- Lint: [command] → [result]

### Issues (if any)
- [description]
```

### For Sequential Execution

Launch agents one at a time. Wait for each to complete before launching the next. Use foreground agents (no `run_in_background`).

### For Direct Execution (1 step)

Execute the step directly — read files, make changes, verify. No agent delegation needed.

---

## Phase 5: Track Progress

**Goal**: Monitor agent completion and report status.

After launching a wave, render the status table:

```
| # | Step | Wave | Status | Result |
|---|------|------|--------|--------|
| 1 | [title] | 1 | ⏳ running | — |
| 3 | [title] | 1 | ⏳ running | — |
| 2 | [title] | 2 | ⏸ waiting | depends on Step 1 |
```

As background agent notifications arrive:

1. Update status to ✅ done or ❌ failed
2. If a wave completes, launch the next wave
3. If an agent fails, log the failure and continue with other agents
4. For background task result retrieval, use TaskOutput once notified. Do not poll in loops while waiting.

When all agents complete, render the final table and summary.

---

## Phase 6: Final Verification

**Goal**: Verify the full plan was executed correctly.

**Actions**:

1. If worktree agents were used, show the branches created and their status
2. Run project-wide verification:
   - Full build
   - Full test suite
   - Lint check
3. Summary:

```
## Execution Complete

**Plan**: [plan name]
**Steps**: N/N completed
**Strategy**: [what was used]

### Results
| Step | Status | Branch/PR |
|------|--------|-----------|
| 1 | ✅ | worktree/step-1 |
| 2 | ✅ | worktree/step-2 |

### Verification
- Build: [pass/fail]
- Tests: [pass/fail]
- Lint: [pass/fail]

### Next Steps
- Merge branches (if worktree): [commands]
- Or: all changes are on current branch (if sequential)
```

---

## Error Handling

- **Preflight hard fail**: Stop execution before agent launch. Provide explicit remediation steps
- **Agent fails**: Log failure, continue other agents. Report in final summary
- **Permission denied in don't-ask mode**: Attempt only reasonable alternatives; if required capability remains blocked, stop and explain why permission is essential
- **Execution stopped by PreToolUse hook**: Report the hook stop reason and switch to sequential fallback when possible
- **Plan file not found**: Inform user, suggest running `/ac:plan` first
- **No independent steps found**: Fall back to sequential execution
- **Worktree not available** (not a git repo): Fall back to sequential execution without worktree isolation
- **Plugin newly installed/updated but behavior missing**: Ask user to restart Claude Code before retrying execution
