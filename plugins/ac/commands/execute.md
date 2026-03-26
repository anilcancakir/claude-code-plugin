---
description: Execute an approved plan — parallel background agents or sequential
argument-hint: Plan file path (e.g., auth-system)
effort: medium
---

# Plan Execution

You are executing an approved plan. Read the plan, classify steps by independence, and execute using the optimal strategy.

**IMPORTANT**: This command spawns agents to do the work — it does NOT implement code itself.

## Phase 1: Load Plan

**Goal**: Find and parse the approved plan file.

Plan identifier: $ARGUMENTS

**Actions**:

1. **Plan storage**: Plans are stored in .ac/plans/ relative to the working directory.
2. If `$ARGUMENTS` is a full path, use it directly. If it's a slug (e.g., `auth-system`), resolve to `.ac/plans/$ARGUMENTS.md`
3. Read the plan file. If it doesn't exist, inform the user and stop
4. Parse the plan into structured steps — extract: step number, title, description, files to create/modify, acceptance criteria (done-when), dependencies, tier field (quick/mid/senior)
5. **Expected Plan Format**: `# Plan: [Title]` heading, steps with `**Step N**:` / `Files:` / `Done when:` / `Independence:` / `Tier:` fields, `### Waves` section (or legacy `### Work Units`), `### Must NOT Have` section. If no Waves section found, auto-analyze step independence from file overlap. If format is unexpected, warn user and attempt best-effort parsing.

6. **Extract conventions**: Parse the plan file for a `### Conventions` section. If present, store its content as PLAN_CONVENTIONS for injection into worker prompts. If absent, set PLAN_CONVENTIONS to: "Read existing files in your scope and match their patterns, naming, and style before modifying."

7. **Read project CLAUDE.md** (execute-time context supplement):
   - Attempt to read `./CLAUDE.md` from the working directory
   - [If file is not present:] Set RUNTIME_CONTEXT to empty. Skip remaining sub-steps.
   - [If file is present:] Extract the following into RUNTIME_CONTEXT (keep concise — max ~2000 tokens for mid/senior steps, ~1000 for quick steps):
     - Build, test, and lint commands (exact commands and flags)
     - Critical gotchas and known pitfalls explicitly called out in the file
     - Naming conventions and code style rules
     - Architectural rules (e.g., "thin controllers, fat services", "no business logic in controllers")
   - **Deduplicate**: Before storing each extracted rule, perform a literal-string check against PLAN_CONVENTIONS. If the rule text already appears verbatim in PLAN_CONVENTIONS, skip it. Only add rules not already covered.
   - Store the deduplicated extracted content as **RUNTIME_CONTEXT**. Keep RUNTIME_CONTEXT as a separate variable — do not merge into PLAN_CONVENTIONS.

8. **Extract tier assignments**: For each step, read `Tier:` field. Map: `quick`→`haiku`, `mid`→`sonnet`, `senior`→`opus`. If absent, check legacy `Escalate:` field: `true`→senior, `false`/absent→mid. Maintains backward compatibility with pre-tier plans.

9. **Extract Codebase State and apply tier escalation**: Parse the plan file's `### Research Summary` section for a `**Codebase State**:` line. Store the value as **CODEBASE_STATE**.
   - [If not found:] Set **CODEBASE_STATE** = `Transitional`. No escalation.
   - [If **CODEBASE_STATE** is `Chaotic` or `Legacy`:] Auto-escalate all `quick` tier steps to `mid` (Haiku→Sonnet). These areas require more reasoning capability — Haiku is insufficient for establishing patterns or navigating degraded code. Update the in-memory tier assignments from step 8 (do not modify the plan file).
   - [If **CODEBASE_STATE** is `Disciplined` or `Transitional`:] No escalation needed. Proceed with tier assignments as-is.

10. **Initialize wisdom accumulator**: Set ACCUMULATED_WISDOM to empty. Populated after each work unit completes and injected into subsequent worker prompts to prevent repeated discovery and pattern drift.

11. **Extract plan complexity**: Parse the plan file for `**Complexity**:` metadata. Extract value: `Simple`, `Standard`, or `Complex`. If not found, derive from step count: 1-2 steps → Simple, 3-6 steps → Standard, 7+ steps → Complex. Store as PLAN_COMPLEXITY for Phase 5 verification depth routing.

---

## Phase 2: Classify Execution Strategy

**Goal**: Determine parallel vs sequential execution.

**Actions**:

1. **Check for Waves section** in the plan file:
   - If `### Waves` section exists → use it directly (plan already decomposed by `ac:plan`)
   - Also accept legacy `### Work Units` section for backward compatibility
   - Parse each Wave/Unit: name, step numbers, file list, verification command
   - Identify Sequential steps (if listed)
   - Skip to step 4

2. **Auto-analyze** (only if neither Waves nor Work Units section found):
   - Check each step's `Independence` field
   - Group independent steps (no shared files, no dependency chain)
   - Group dependent steps into sequential chains

3. **Validate** (whether plan-provided or auto-analyzed):
   - Verify no file overlaps between parallel units

4. Select execution strategy:

| Condition | Strategy |
|-----------|----------|
| 1 step total | Execute directly (no agent needed) |
| 2+ steps, all independent | Parallel background agents + `run_in_background: true` |
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

## Phase 3: Execute

**Goal**: Launch agents and track progress with deterministic behavior.

**Execution guardrails (official-aligned):**
- Do not sleep between commands that can run immediately
- Do not retry failing commands in sleep loops
- If waiting on background tasks, rely on completion notifications and TaskOutput checks

### For Parallel Waves (2+ independent steps)

For each wave, launch ALL agents in a **single message block** (multiple Agent tool calls):

```
Agent(
  prompt: "[full self-contained task prompt — see template below]",
  model: "[tier-based: \"haiku\" for quick, \"sonnet\" for mid, \"opus\" for senior]",
  run_in_background: true
)
```

**Model routing**: Each step gets its own model based on tier — launch multiple Agent() calls in the same message, each with its own `model:` parameter:

- `quick` → `model: "haiku"`
- `mid` → `model: "sonnet"`
- `senior` → `model: "opus"`

Mixed-tier waves are fine — CC supports different `model:` values per Agent() call in the same message block. Each worker runs independently on its assigned model.

**Worker prompt template** — each agent must receive a fully self-contained prompt:

**Quick tier template** (Haiku — lean format, no Atlas overhead):

```markdown
## Your Task

**Assignment**: [Step title]
[Full step description from plan — exhaustively explicit]

**Files**: [file paths from plan step]

**Done when**: [acceptance criteria, verbatim]

**Conventions**: [Inject PLAN_CONVENTIONS or "Read existing files and match patterns before modifying."]

[If RUNTIME_CONTEXT is non-empty:]
**Project Context**: [Inject RUNTIME_CONTEXT — supplementary project rules from CLAUDE.md not already in PLAN_CONVENTIONS]

Follow instructions literally. Do not abbreviate output, do not skip steps. Stay strictly in scope. If anything is ambiguous, choose the simplest interpretation.

[If ACCUMULATED_WISDOM is non-empty:]
**Wisdom from prior steps**: [Inject ACCUMULATED_WISDOM]

After changes: run build, tests, lint. Summarize: files changed, verification results, issues.
```

**Mid and Senior tier template** (Sonnet/Opus — structured Atlas format):

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

- Read existing files before modifying — match patterns and conventions
- Implement ONLY your assigned step. Do not touch files outside your scope
- Run verification after changes (build, tests, lint)
- If tests fail, fix the root cause. Do not skip or modify tests to pass
- [Inject PLAN_CONVENTIONS or "Match existing patterns in target files"]

## Must NOT Do

- Do not modify files outside your assigned scope
- Do not refactor, clean up, or improve code beyond what the step requires
- Do not add documentation, comments, or type annotations to unchanged code

## Context

**Codebase Conventions**:
[Inject PLAN_CONVENTIONS extracted from plan file in Phase 1. If no conventions section was found in the plan, use: "Read existing files and match patterns before modifying."]

[If RUNTIME_CONTEXT is non-empty:]
## Project Context

[Inject RUNTIME_CONTEXT — supplementary project rules from CLAUDE.md not already covered by Codebase Conventions above. Includes: build/test/lint commands, gotchas, naming conventions, architectural rules.]

[If step has Tier: senior, append:]
**Senior Tier**: This task was flagged for senior-level reasoning. Explore the codebase deeply before acting. Consider edge cases, cross-cutting concerns, and architectural impact. Quality over speed. Consider downstream effects on callers and dependents before modifying.

[If ACCUMULATED_WISDOM is non-empty, append:]
**Wisdom from prior steps** (prefer this context over re-discovering — avoid redundant tool calls for information already captured here):
[Inject ACCUMULATED_WISDOM content here]

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

### After Each Work Unit Completes

Before marking a work unit done:

1. Check `<new-diagnostics>` context:
   - If ERROR-level diagnostics appear for modified files → fix in this turn before marking done
   - If WARNING-level only → log to final report, continue
   - If LSP not available → proceed to Phase 5 verification wave

2. If LSP tool is available and work unit involved code changes, delegate to ac:linter (advisory — early feedback only):
   - `Agent(subagent_type="ac:linter", prompt="Verify [files] after [work unit description]")`
   - BLOCKED verdict → log warning with details, continue to next unit. Phase 5 linter agent is the authoritative final check
   - CLEAN or LSP UNAVAILABLE verdict → mark unit done

3. **Extract wisdom** from the completed worker's output. Scan the worker's "Changes Made" and "Issues" sections for:
   - Naming patterns discovered (e.g., "services use `handle` prefix, not `process`")
   - Dependency injection style (e.g., "constructor injection, not facades")
   - File organization conventions (e.g., "one class per file, matching directory to namespace")
   - Gotchas encountered (e.g., "migration requires `--seed` flag after running")
   - Any convention the worker had to discover by reading existing code

   Append extracted patterns to ACCUMULATED_WISDOM as bullet points (max 5 per unit, max 15 total). Skip if the worker's output contains no discoverable patterns. Do not accumulate verification results or generic statements — only actionable conventions that help the next worker avoid re-discovery.

4. **Persist wisdom to file**: After updating ACCUMULATED_WISDOM, write it to `.ac/plans/{plan-name}.wisdom.md` (same directory as the plan file). Format: bullet list with wave/step source annotations. This file survives the session — subsequent ac:execute runs or manual inspection can reuse discovered patterns. Overwrite on each update (latest wisdom replaces previous).

Do NOT mark a work unit complete with unresolved ERROR diagnostics.

---

## Phase 4: Track Progress

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
3. If an agent fails, attempt **tier escalation** before logging failure:
   - `quick` (Haiku) failed → retry once with `model: "sonnet"` (mid)
   - `mid` (Sonnet) failed → retry once with `model: "opus"` (senior)
   - `senior` (Opus) failed → no escalation possible, log failure
   - Maximum 1 escalation per step. If escalated retry also fails → log failure and continue
4. For background task result retrieval, use TaskOutput once notified. Do not poll in loops while waiting.

When all agents complete, render the final table and summary.

---

## Phase 5: Verification Wave

**Goal**: Verify the full plan was executed correctly. Verification depth scales with PLAN_COMPLEXITY.

CRITICAL: DO NOT SKIP PHASE 5 — MANDATORY FINAL GATE. Complete verification before rendering any summary or suggesting commit.

### Verification Depth by Complexity

Route based on PLAN_COMPLEXITY (extracted in Phase 1):

**Simple** (1-2 steps, quick tier): Skip verification wave agents entirely. Only run build + test + lint as the final check. If all pass → invoke `/ac:commit --skip-preflight`. If any fail → fix and re-run.

**Standard** (3-6 steps, mixed tiers): Launch build+test AND 2 verification agents concurrently (skip verifier — Opus is expensive for standard work):

```
Agent(subagent_type="ac:code-reviewer", prompt="Review implementation against plan at [plan-file-path]. Modified files: [list]. Project conventions to check against: [PLAN_CONVENTIONS]. Runtime context: [RUNTIME_CONTEXT if non-empty].", run_in_background: true)
Agent(subagent_type="ac:linter", prompt="Final verification of all affected files: [list]. Check all modified files plus their direct importers if LSP available.", run_in_background: true)
```

**Complex** (7+ steps, senior tier, or architecture): Launch build+test AND 3 verification agents concurrently (full wave). Optionally add security-reviewer if plan touches auth, user input, file I/O, or external APIs:

```
Agent(subagent_type="ac:code-reviewer", prompt="Review implementation against plan at [plan-file-path]. Modified files: [list]. Project conventions to check against: [PLAN_CONVENTIONS]. Runtime context: [RUNTIME_CONTEXT if non-empty].", run_in_background: true)
Agent(subagent_type="ac:verifier", prompt="Verify plan compliance for: [plan-file-path]. Check every Done-when criterion against actual file state, verify Must NOT Have exclusions, and audit scope fidelity. Also verify convention compliance: check that implementation follows project conventions from [PLAN_CONVENTIONS].", run_in_background: true)
Agent(subagent_type="ac:linter", prompt="Final verification of all affected files: [list]. Check all modified files plus their direct importers if LSP available.", run_in_background: true)
# Optional — include when plan involves security-sensitive code:
Agent(subagent_type="ac:security-reviewer", prompt="Security scan of modified files: [list]. Check OWASP Top 10 categories, secrets in code, path traversal, and cryptographic issues.", run_in_background: true)
```

### Execution (Standard and Complex only)

**Step 1** — Launch build+test AND verification agents concurrently (single message block):

1. Start full build + full test suite execution
2. Simultaneously launch verification agents per complexity level above
3. Build/test failures do NOT prevent agent launch — agents run to completion regardless. Build or test failure blocks the final verdict.
4. **LSP Navigation Check** (if LSP tool available, run alongside above):
   - For each modified file: `LSP(operation="documentSymbol", filePath=<file>, line=1, character=1)` → confirms parseable + exports intact
   - For refactor/rename work: `LSP(operation="findReferences", ...)` → confirms no broken callers
   - If LSP not available → skip, rely on linter agent output only

**Step 2** — Collect ALL results — ALL must pass:

| Check | Pass | Fail |
|-------|------|------|
| Build + test suite | exits 0 | non-zero exit |
| ac:code-reviewer | APPROVED | BLOCKED |
| ac:verifier (Complex only) | APPROVE | REJECT |
| ac:linter | CLEAN or LSP UNAVAILABLE | BLOCKED |

**Step 3** — Route based on combined verdict:

→ **ALL pass** → Render execution summary and continuation format, then invoke `/ac:commit --skip-preflight` to commit and push all changes.

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
[If part of --loop orchestration: "Proceeding to next phase automatically."]
[If standalone execution: "Run `/ac:commit --skip-preflight` to commit all changes."]
```

→ **ANY fail** → Increment VERIFY_RETRY_COUNT (initialized to 0 at start of Phase 5). Present all failures with evidence from agent outputs, then:

If VERIFY_RETRY_COUNT >= 3 → **3-strike rule**: Do not offer Fix and Re-verify. Present:

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

If VERIFY_RETRY_COUNT < 3 → Present:

```
AskUserQuestion(
  question: "Verification wave found issues (attempt VERIFY_RETRY_COUNT/3). How to proceed?"
  header: "Verification Failed"
  options:
    - label: "Fix and Re-verify"
      description: "Address the failed criteria, then re-run verification at current complexity level."
    - label: "Accept and Commit"
      description: "Acknowledge failures, invoke /ac:commit for current state."
)
```

If user selects "Fix and Re-verify" → fix issues, then loop back to Step 1 (re-run build+test and re-launch verification agents concurrently).


---

## Error Handling

- **Agent fails**: Attempt tier escalation first (Phase 4). If still fails, log failure and continue other agents. Report in final summary
- **Plan file not found**: Inform user, suggest running `/ac:plan` first
- **No independent steps found**: Fall back to sequential execution
- **Not a git repo**: Fall back to sequential execution
- **Plugin newly installed/updated but behavior missing**: Ask user to restart Claude Code before retrying execution
