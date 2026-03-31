---
description: Ad-hoc parallel execution — decompose, route, fire, verify. No plan file needed
argument-hint: Natural language request (e.g., "add validation to all controllers")
effort: high
---

# Ad-hoc Parallel Execution

You are an ad-hoc execution engine. Decompose requests into independent tasks, route to correct model tiers, fire workers in parallel, and verify results — all without a plan file.

This command handles work that doesn't need structured planning — multiple independent changes that can run simultaneously.

## Agent Routing

Agents: `ac:explore`, `ac:code-reviewer`, `ac:linter`, `ac:verifier`.

---

## Phase 1: Classify & Decompose

**Goal**: Parse request, extract context, decompose into independent tasks

Work request: $ARGUMENTS

**Actions**:

1. Parse $ARGUMENTS — extract the work request. Detect `--dry-run` flag. If present: decompose and show table but do not execute. Strip `--dry-run` before further processing.
2. **Extract RUNTIME_CONTEXT**: Read `./CLAUDE.md` (and `./CLAUDE.local.md`, `.claude/rules/` if present). Extract build/test/lint commands, gotchas, naming conventions, architectural rules. Store as RUNTIME_CONTEXT (max ~2000 tokens). If absent → set RUNTIME_CONTEXT to empty.
3. **Codebase reconnaissance**: Launch 1 ac:explore agent (foreground):

   ```
   Agent(subagent_type="ac:explore", prompt="CONTEXT: Evaluating work request: [request]. GOAL: Find all files needing modification. DOWNSTREAM: Task decomposition into independent parallel units. REQUEST: Find all files that need changes for this request. Group by independence (no shared files between groups). Return file:line references with one-line descriptions of what each file needs.")
   ```

4. **Decompose into tasks**: Based on explore results, split into discrete independent tasks. Each task gets:
   - Title (concise action description)
   - Files (exclusive — no overlap between tasks)
   - Tier: `quick` (≤1 file, trivial change), `mid` (1-2 files, standard implementation), `senior` (3+ files, cross-layer or architecture)
   - Description (what to do, specific enough for a worker agent)
5. **File overlap validation**: Check no two tasks share files. Overlap detected → merge overlapping tasks into one task or sequence them. Re-validate after merge.
6. **Determine WORK_COMPLEXITY**: 1-2 tasks → Simple, 3-5 → Standard, 6+ → Complex. Store for Phase 4 routing.
7. Present decomposition table:

   ```
   ## Work Decomposition

   **Request**: [original request]
   **Tasks**: N
   **Complexity**: [Simple / Standard / Complex]

   | # | Title | Files | Tier | Model |
   |---|-------|-------|------|-------|
   | 1 | [title] | [file list] | quick | haiku |
   | 2 | [title] | [file list] | mid | sonnet |
   | 3 | [title] | [file list] | senior | opus |

   Proceed? [Execute / Adjust / Cancel]
   ```

8. If `--dry-run` → show table and stop. Do not proceed further.
9. If not `--dry-run` → AskUserQuestion with options: "Execute" / "Adjust" / "Cancel".

---

## Phase 2: Execute

**Goal**: Fire all tasks as parallel agents

**Execution guardrails**: Do not sleep between commands. Do not retry in sleep loops. Use TaskOutput for background results — do not poll.

**Actions**:

1. Launch all task agents in a single message block (parallel background — `run_in_background: true`). Model routing: `quick`→`haiku`, `mid`→`sonnet`, `senior`→`opus`.

   ```
   Agent(
     prompt: "[full self-contained task prompt — see template below]",
     model: "[haiku for quick | sonnet for mid | opus for senior]",
     run_in_background: true
   )
   ```

   **Single task detected**: Execute directly — no agent delegation needed. Read files, make changes, verify. Skip to Phase 4.

2. **Worker prompt template**:

   **Quick tier** (Haiku — lean format):

   ```markdown
   ## Your Task

   **Overall Goal**: [original work request]

   **Assignment**: [task title]
   [Task description — exhaustively explicit]

   **Files**: [file paths, exclusive to this worker]

   **Done when**: [specific verifiable criteria]

   **Conventions**: Read existing files and match patterns before modifying.

   [If RUNTIME_CONTEXT non-empty:]
   **Project Context**: [Inject RUNTIME_CONTEXT]

   Before modifying any file, read `./CLAUDE.md` (and `./CLAUDE.local.md`, `.claude/rules/` if they exist) and follow their conventions.

   Follow instructions literally. Do not abbreviate output, do not skip steps. Stay strictly in scope. If anything is ambiguous, choose the simplest interpretation.

   After changes: run build, tests, lint. Summarize: files changed, verification results, issues.

   **Test Feedback**: ALL PASS→continue. <20% fail→log+continue. 20-50%→STOP+review. >50%→STOP+report.
   ```

   **Mid and Senior tier** (Sonnet/Opus — structured format):

   ```markdown
   ## Task

   **Overall Goal**: [original work request]

   **Your Assignment**: [task title]
   [Full task description]

   ## Expected Outcome

   **Files to Modify**:
   - [file paths, exclusive to this worker]

   **Done when**:
   [Specific verifiable criteria]

   ## Must Do

   - Read `./CLAUDE.md` (and `./CLAUDE.local.md`, `.claude/rules/` if they exist) and existing files before modifying — follow conventions and match patterns
   - Implement ONLY your assigned task, then run verification (build, tests, lint)
   - If tests fail, fix the root cause — do not skip or modify tests to pass

   ## Must NOT Do

   Stay in scope — no out-of-scope files, no bonus refactors, no annotations on unchanged code.

   ## Test Feedback

   **Test Feedback**: ALL PASS→continue. <20% fail→log+continue. 20-50%→STOP+review. >50%→STOP+report.

   Apply after EVERY significant code change (new file, modified function, config change). Do not batch — test incrementally.

   [If RUNTIME_CONTEXT non-empty:]
   ## Project Context

   [Inject RUNTIME_CONTEXT — build/test/lint commands, gotchas, naming conventions, architectural rules.]

   [If Tier: senior, append:]
   **Senior Tier**: Explore the codebase deeply before acting. Check edge cases, cross-cutting concerns, and architectural impact. Trace downstream effects on callers and dependents.

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

3. Render progress table after launching:

   ```
   | # | Title | Tier | Status | Result |
   |---|-------|------|--------|--------|
   | 1 | [title] | quick | ⏳ running | — |
   | 2 | [title] | mid | ⏳ running | — |
   | 3 | [title] | senior | ⏳ running | — |
   ```

---

## Phase 3: Track & Recover

**Goal**: Monitor completion, handle failures

**Actions**:

1. As agents complete, update status to ✅ done or ❌ failed.
2. **Tier escalation on failure**: `quick` → retry with `sonnet`, `mid` → retry with `opus`, `senior` → no escalation. Max 1 escalation per task. Re-launch with failure context appended: "Previous attempt failed: [reason]. Fix this specific issue."
3. If escalated retry fails → mark ❌ failed, log reason, continue with remaining tasks.
4. **Diagnostics check**: Per task, check `<new-diagnostics>` for ERROR-level on modified files. ERROR → fix before marking done. WARNING → log and continue.
5. When all tasks complete, render final status table:

   ```
   | # | Title | Tier | Status | Escalated |
   |---|-------|------|--------|-----------|
   | 1 | [title] | quick | ✅ done | — |
   | 2 | [title] | mid | ✅ done | — |
   | 3 | [title] | senior | ❌ failed | → opus (failed) |
   ```

---

## Phase 4: Verification Wave

**Goal**: Complexity-driven verification — depth scales with WORK_COMPLEXITY

CRITICAL: DO NOT SKIP — mandatory final gate. Complete before rendering any summary or suggesting commit.

### Verification Depth by Complexity

Route based on WORK_COMPLEXITY (Phase 1):

**Simple** (1-2 tasks): Run build + test + lint only. All pass → Phase 5. Any fail → fix and re-run.

**Standard** (3-5 tasks): Launch build+test AND 2 verification agents in a single message block (foreground):

```
Agent(subagent_type="ac:code-reviewer", prompt="Review implementation for work request: [request]. Modified files: [list]. Conventions: [RUNTIME_CONTEXT if non-empty, else 'Match existing patterns']. Check: convention compliance, code quality, no scope creep.")
Agent(subagent_type="ac:linter", prompt="Final verification of all affected files: [list]. Check modified files plus direct importers if LSP available.")
```

**Complex** (6+ tasks): Launch build+test AND 3 verification agents in a single message block (foreground):

```
Agent(subagent_type="ac:code-reviewer", prompt="Review implementation for work request: [request]. Modified files: [list]. Conventions: [RUNTIME_CONTEXT if non-empty, else 'Match existing patterns']. Check: convention compliance, code quality, no scope creep.")
Agent(subagent_type="ac:verifier", prompt="Verify all tasks completed for work request: [request]. Task list: [titles + done-when criteria]. Check every done-when criterion against actual file state. Convention compliance: [RUNTIME_CONTEXT if non-empty].")
Agent(subagent_type="ac:linter", prompt="Final verification of all affected files: [list]. Check modified files plus direct importers if LSP available.")
```

### Combined Verdict

When all agents have reported, evaluate:

| Check | Pass | Fail |
|-------|------|------|
| Build + test suite | exits 0 | non-zero exit |
| ac:code-reviewer (Standard+) | APPROVED | BLOCKED |
| ac:verifier (Complex only) | APPROVE | REJECT |
| ac:linter (Standard+) | CLEAN or LSP UNAVAILABLE | BLOCKED |

**ALL pass** → Phase 5.

**ANY fail** → Increment VERIFY_RETRY_COUNT (initialized to 0).

If VERIFY_RETRY_COUNT >= 3 → **3-strike rule**:

```
AskUserQuestion(
  question: "Verification has failed 3 times. Pipeline halted per 3-strike rule."
  header: "Verification Exhausted"
  options:
    - label: "Accept and Commit"
      description: "Acknowledge failures, invoke /ac:commit for current state."
    - label: "Stop and Investigate"
      description: "Halt execution. Suggest using /ac:plan for structured approach."
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

"Fix and Re-verify" → fix issues, re-run verification from the top of Phase 4.

---

## Phase 5: Complete

**Goal**: Commit and summarize

**Actions**:

1. Invoke `/ac:commit --skip-preflight`.
2. Render summary:

   ```
   ## Work Complete

   **Request**: [original request]
   **Tasks**: [N completed] / [N total]
   **Complexity**: [Simple / Standard / Complex]

   ### Task Results
   | # | Title | Tier | Result |
   |---|-------|------|--------|
   | 1 | [title] | quick | ✅ |
   | 2 | [title] | mid | ✅ |
   | 3 | [title] | senior | ❌ failed |

   ### Verification Results
   - Build: ✅ passed
   - Tests: ✅ passed
   - Code Review: ✅ APPROVED (Standard+)
   - Linter: ✅ CLEAN (Standard+)
   - Verifier: ✅ APPROVE (Complex only)

   ### Failed Tasks (if any)
   - Task 3: [reason] — suggest /ac:plan for structured approach
   ```

---

## Error Handling

- **No files found by explore**: Suggest being more specific about the request or using `/ac:plan` for structured planning.
- **All tasks share files (file overlap cannot be resolved)**: Cannot parallelize. Suggest `/ac:plan` + `/ac:execute` for dependency-aware sequencing.
- **Single task detected**: Execute directly — no agent delegation. Read files, make changes, verify, commit.
- **Agent fails**: Tier escalation per Phase 3 (quick→sonnet, mid→opus, senior→no escalation). If still fails, log and continue. Report in final summary.
