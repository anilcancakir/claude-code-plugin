---
description: Execute an approved plan — parallel background agents or sequential
argument-hint: Plan file path (e.g., auth-system)
effort: medium
---

# Plan Execution

You are executing an approved plan. Read the plan, classify steps by independence, and execute using the optimal strategy.

This command spawns agents to do the work — it does not implement code directly.

## Phase 1: Load Plan

Plan identifier: $ARGUMENTS

1. Plans are stored in `.ac/plans/`. If `$ARGUMENTS` is a full path, use it directly. If it's a slug (e.g., `auth-system`), resolve to `.ac/plans/$ARGUMENTS.md`.
2. Read the plan file. If it doesn't exist, inform the user and stop.
3. Parse into structured steps — extract: step number, title, description, files, acceptance criteria (done-when), dependencies, tier (quick/mid/senior).
4. **Expected format**: `# Plan: [Title]` heading, steps with `**Step N**:` / `Files:` / `Done when:` / `Independence:` / `Tier:` fields, `### Waves` section (or legacy `### Work Units`), `### Must NOT Have` section. If no Waves section, auto-analyze step independence from file overlap. Warn on unexpected format and attempt best-effort parsing.
5. **Extract conventions**: Parse for `### Conventions` section. If present → store as PLAN_CONVENTIONS. If absent → set PLAN_CONVENTIONS to: "Read existing files in your scope and match their patterns, naming, and style before modifying."
6. **Read project CLAUDE.md** (execute-time supplement): Attempt to read `./CLAUDE.md`. If absent → set RUNTIME_CONTEXT to empty. If present → extract into RUNTIME_CONTEXT (max ~2000 tokens for mid/senior, ~1000 for quick): build/test/lint commands, critical gotchas, naming conventions, architectural rules. Deduplicate against PLAN_CONVENTIONS (skip verbatim matches). Store as a separate variable — do not merge into PLAN_CONVENTIONS.
7. **Extract tier assignments**: Read `Tier:` field per step. Map: `quick`→`haiku`, `mid`→`sonnet`, `senior`→`opus`. If absent, check legacy `Escalate:` field: `true`→senior, `false`/absent→mid.
8. **Extract Codebase State and apply tier escalation**: Parse `### Research Summary` for `**Codebase State**:`. If not found → set CODEBASE_STATE = `Transitional`, no escalation. If `Chaotic` or `Legacy` → auto-escalate all `quick` steps to `mid` (update in-memory assignments only). If `Disciplined` or `Transitional` → no escalation.
9. **Initialize wisdom accumulator**: Set ACCUMULATED_WISDOM to empty. Populated after each work unit, injected into subsequent worker prompts.
10. **Extract plan complexity**: Parse for `**Complexity**:` metadata. If not found → derive: 1-2 steps → Simple, 3-6 → Standard, 7+ → Complex. Store as PLAN_COMPLEXITY for Phase 5 routing.

---

## Phase 2: Classify Execution Strategy

1. **Check for Waves section**: If `### Waves` exists → use directly. Also accept legacy `### Work Units`. Parse each: name, step numbers, file list, verification command. Skip to step 4.
2. **Auto-analyze** (only if neither section found): Check `Independence` fields, group independent steps (no shared files, no dependency chain).
3. **Validate**: Verify no file overlaps between parallel units.
4. Select execution strategy:

| Condition | Strategy |
|-----------|----------|
| 1 step total | Execute directly (no agent needed) |
| 2+ steps, all independent | Parallel background agents + `run_in_background: true` |
| Mixed parallel + sequential | Parallel units first, then sequential steps |
| All sequential | Sequential agents — one at a time |

5. Present execution plan to the user:

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

## Phase 3: Execute

**Execution guardrails**: Do not sleep between commands. Do not retry in sleep loops. Use TaskOutput for background results — do not poll.

### For Parallel Waves (2+ independent steps)

Launch all agents in a single message block (parallel background — CC waits for wave completion):

```
Agent(
  prompt: "[full self-contained task prompt — see template below]",
  model: "[haiku for quick | sonnet for mid | opus for senior]",
  run_in_background: true
)
```

**Model routing**: `quick`→`haiku`, `mid`→`sonnet`, `senior`→`opus`. Mixed-tier waves are fine — each Agent() call takes its own `model:` parameter.

**Worker prompt template** — each agent must receive a fully self-contained prompt:

**Quick tier template** (Haiku — lean format):

```markdown
## Your Task

**Assignment**: [Step title]
[Full step description from plan — exhaustively explicit]

**Files**: [file paths from plan step]

**Done when**: [acceptance criteria, verbatim]

**Conventions**: [Inject PLAN_CONVENTIONS or "Read existing files and match patterns before modifying."]

[If RUNTIME_CONTEXT non-empty:]
**Project Context**: [Inject RUNTIME_CONTEXT]

Before modifying any file, read `./CLAUDE.md` (and `./CLAUDE.local.md`, `.claude/rules/` if they exist) and follow their conventions.

Follow instructions literally. Do not abbreviate output, do not skip steps. Stay strictly in scope. If anything is ambiguous, choose the simplest interpretation.

[If ACCUMULATED_WISDOM non-empty:]
**Wisdom from prior steps**: [Inject ACCUMULATED_WISDOM]

After changes: run build, tests, lint. Summarize: files changed, verification results, issues.
```

**Mid and Senior tier template** (Sonnet/Opus — structured format):

```markdown
## Task

**Overall Goal**: [Plan title and context — 1-2 sentences]

**Your Assignment**: [Step title]
[Full step description from plan]

## Expected Outcome

**Files to Modify**:
- [file paths from plan step]

**Acceptance Criteria**:
[Done-when conditions from plan, verbatim]

## Must Do

- Before modifying any file, read `./CLAUDE.md` (and `./CLAUDE.local.md`, `.claude/rules/` if they exist) and follow their conventions
- Read existing files before modifying — match patterns and conventions
- Implement ONLY your assigned step. Do not touch files outside your scope
- Run verification after changes (build, tests, lint)
- If tests fail, fix the root cause. Do not skip or modify tests to pass
- [Inject PLAN_CONVENTIONS or "Match existing patterns in target files"]

## Must NOT Do

- Do not modify files outside your assigned scope
- Do not refactor or clean up code beyond what the step requires
- Do not add documentation or annotations to unchanged code

## Context

**Codebase Conventions**:
[Inject PLAN_CONVENTIONS. If absent: "Read existing files and match patterns before modifying."]

[If RUNTIME_CONTEXT non-empty:]
## Project Context

[Inject RUNTIME_CONTEXT — build/test/lint commands, gotchas, naming conventions, architectural rules not already in Codebase Conventions.]

[If Tier: senior, append:]
**Senior Tier**: Explore the codebase deeply before acting. Check edge cases, cross-cutting concerns, and architectural impact. Trace downstream effects on callers and dependents.

[If ACCUMULATED_WISDOM non-empty, append:]
**Wisdom from prior steps** (prefer over re-discovering — avoid redundant tool calls):
[Inject ACCUMULATED_WISDOM]

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

### Wave Completion Barrier

When all agents in the wave have reported, advance to the next wave. Wave 2 must not launch until all Wave 1 agents have completed.

### For Sequential Execution

Launch agents one at a time, foreground (no `run_in_background`). Wait for each to complete before launching the next.

### For Direct Execution (1 step)

Execute the step directly — read files, make changes, verify. No agent delegation needed.

### After Each Work Unit Completes

1. Check `<new-diagnostics>`: ERROR-level on modified files → fix before marking done. WARNING-level → log and continue. LSP unavailable → proceed.
2. If LSP available and code changed, delegate to ac:linter (advisory): `Agent(subagent_type="ac:linter", prompt="Verify [files] after [work unit]")`. BLOCKED → log warning, continue. CLEAN or LSP UNAVAILABLE → mark done.
3. **Extract wisdom** from completed worker's "Changes Made" and "Issues": naming patterns, DI style, file organization, gotchas, discovered conventions. Append to ACCUMULATED_WISDOM as bullet points (max 5 per unit, max 15 total). Skip generic statements — only actionable conventions.
4. **Persist wisdom**: Write ACCUMULATED_WISDOM to `.ac/plans/{plan-name}.wisdom.md` (bullet list with wave/step annotations). Overwrite on each update.

Do not mark a work unit complete with unresolved ERROR diagnostics.

---

## Phase 4: Track Progress

Phase 4 begins only after all agents in the current wave have completed.

Render the status table after launching a wave:

```
| # | Step | Wave | Status | Result |
|---|------|------|--------|--------|
| 1 | [title] | 1 | ⏳ running | — |
| 3 | [title] | 1 | ⏳ running | — |
| 2 | [title] | 2 | ⏸ waiting | depends on Step 1 |
```

As notifications arrive:

1. Update status to ✅ done or ❌ failed.
2. When a wave completes, launch the next wave.
3. On failure, attempt tier escalation: `quick` → retry with `sonnet`; `mid` → retry with `opus`; `senior` → no escalation. Max 1 escalation per step. If escalated retry fails → log and continue.
4. Use TaskOutput once notified. Do not poll.

When all agents have reported, render the final table and summary.

---

## Phase 5: Verification Wave

CRITICAL: DO NOT SKIP — mandatory final gate. Complete before rendering any summary or suggesting commit.

### Verification Depth by Complexity

Route based on PLAN_COMPLEXITY (Phase 1):

**MANDATORY**: Complex verification (full 3-agent wave) cannot be bypassed — not by --loop mode, not by --skip-preflight, not by any flag. All three agents (code-reviewer + verifier + linter) must complete and pass before any commit proceeds.

**Simple** (1-2 steps, quick tier): Skip verification agents. Run build + test + lint only. All pass → invoke `/ac:commit --skip-preflight`. Any fail → fix and re-run.

**Standard** (3-6 steps, mixed tiers): Launch build+test AND 2 verification agents in a single message block (foreground — CC waits for all automatically):

```
Agent(subagent_type="ac:code-reviewer", prompt="Review implementation against plan at [plan-file-path]. Modified files: [list]. Conventions: [PLAN_CONVENTIONS]. Runtime context: [RUNTIME_CONTEXT if non-empty].")
Agent(subagent_type="ac:linter", prompt="Final verification of all affected files: [list]. Check modified files plus direct importers if LSP available.")
```

**Complex** (7+ steps, senior tier, or architecture): Launch build+test AND 3 verification agents in a single message block (foreground — CC waits for all automatically). Add security-reviewer when plan touches auth, user input, file I/O, or external APIs:

```
Agent(subagent_type="ac:code-reviewer", prompt="Review implementation against plan at [plan-file-path]. Modified files: [list]. Conventions: [PLAN_CONVENTIONS]. Runtime context: [RUNTIME_CONTEXT if non-empty].")
Agent(subagent_type="ac:verifier", prompt="Verify plan compliance for: [plan-file-path]. Check every Done-when criterion against actual file state, verify Must NOT Have exclusions, and audit scope fidelity. Convention compliance: [PLAN_CONVENTIONS].")
Agent(subagent_type="ac:linter", prompt="Final verification of all affected files: [list]. Check modified files plus direct importers if LSP available.")
# Optional — include when plan involves security-sensitive code:
Agent(subagent_type="ac:security-reviewer", prompt="Security scan of modified files: [list]. Check OWASP Top 10, secrets in code, path traversal, cryptographic issues.")
```

### Execution (Standard and Complex only)

**Step 1** — Launch build+test AND verification agents in a single message block (foreground — CC waits for all automatically):

1. Start full build + full test suite.
2. Simultaneously launch verification agents per complexity level above.
3. Build/test failures do not prevent agent launch — agents run to completion. Build or test failure blocks the final verdict.
4. **LSP Navigation Check** (if LSP available, run alongside): `LSP(operation="documentSymbol")` per modified file → confirms parseable + exports intact. For refactor/rename: `LSP(operation="findReferences")` → confirms no broken callers. If LSP unavailable → rely on linter agent output.

**Step 2** — When all agents have reported, evaluate combined verdict:

| Check | Pass | Fail |
|-------|------|------|
| Build + test suite | exits 0 | non-zero exit |
| ac:code-reviewer | APPROVED | BLOCKED |
| ac:verifier (Complex only) | APPROVE | REJECT |
| ac:linter | CLEAN or LSP UNAVAILABLE | BLOCKED |

**Step 3** — Route based on combined verdict:

→ **ALL pass** → Render execution summary, then invoke `/ac:commit --skip-preflight`. This gate applies regardless of execution mode (--loop, direct, or manual).

```
## Execution Complete

**Plan**: [plan name]
**Steps**: [N/N completed]
**Strategy**: [Parallel Waves / Sequential / Direct]
**Complexity**: [Simple / Standard / Complex]

### Verification Results
- Build: ✅ passed
- Tests: ✅ passed
- Code Review: ✅ APPROVED
- Linter: ✅ CLEAN
- Verifier: ✅ APPROVE (Complex only)

### Next Up
[If --loop orchestration: "Proceeding to next phase automatically."]
[If standalone: "Run `/ac:commit --skip-preflight` to commit all changes."]
```

→ **ANY fail** → Increment VERIFY_RETRY_COUNT (initialized to 0). Present all failures, then:

If VERIFY_RETRY_COUNT >= 3 → **3-strike rule**:

```
AskUserQuestion(
  question: "Verification has failed 3 times. Pipeline halted per 3-strike rule."
  header: "Verification Exhausted"
  options:
    - label: "Accept and Commit"
      description: "Acknowledge failures, invoke /ac:commit for current state."
    - label: "Stop and Investigate"
      description: "Halt execution. Launch ac:investigate on the failing area."
)
```

If VERIFY_RETRY_COUNT < 3:

```
AskUserQuestion(
  question: "Verification wave found issues (attempt VERIFY_RETRY_COUNT/3). How to proceed?"
  header: "Verification Failed"
  options:
    - label: "Fix and Re-verify"
      description: "Address failures, re-run verification at current complexity level."
    - label: "Accept and Commit"
      description: "Acknowledge failures, invoke /ac:commit for current state."
)
```

"Fix and Re-verify" → fix issues, loop back to Step 1.

---

## Error Handling

- **Agent fails**: Attempt tier escalation (Phase 4). If still fails, log and continue. Report in final summary.
- **Plan file not found**: Inform user, suggest running `/ac:plan` first.
- **No independent steps found**: Fall back to sequential execution.
- **Not a git repo**: Fall back to sequential execution.
- **Plugin newly installed/updated but behavior missing**: Ask user to restart Claude Code before retrying.
