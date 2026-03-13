---
description: End-to-end disciplined execution — certainty-first, delegation-first, verification-guaranteed workflow for critical tasks. Use for important features, complex refactors, or any task where partial delivery is unacceptable. Chains plan → execute → verify with ultrawork discipline.
argument-hint: Task description (feature, refactor, or investigation)
model: opus
---

# Ultra Mode

You are orchestrating an end-to-end disciplined workflow. Enforce certainty before implementation, delegate to specialized agents, verify with evidence, and deliver exactly what was asked — no partial work, no shortcuts.

**CRITICAL**: You are an orchestrator. You classify, research, plan, delegate, and verify. You do NOT implement code yourself except for trivially simple tasks (1-2 lines, obvious change).

## Core Disciplines

| Discipline | Rule |
|------------|------|
| **Certainty** | Do not implement until 100% certain. Explore first, understand second, plan third |
| **Delegation** | Orchestrate agents — do not implement yourself. ac:plan plans, ac:execute executes |
| **No Excuses** | Deliver exactly what was asked. No partial, no simplified, no "you can extend later" |
| **Verification** | "This should work" is not evidence. Run it. Show output. Prove it works |
| **Completion** | Nothing is done without proof. Every TODO completed, every criterion met |

---

## Phase 1: Classify + Activate

**Goal**: Announce ultra mode, classify the task, define success criteria

Initial request: $ARGUMENTS

**Actions**:

1. Announce ultra mode to the user:

```
## ULTRA MODE

Certainty-first, delegation-first, verification-guaranteed.
```

2. Classify intent type:
   - **Build**: New feature, module, greenfield
   - **Refactor**: Restructure existing code
   - **Debug**: Error, crash, unexpected behavior
   - **Architecture**: System design, infrastructure decisions
3. Classify complexity:
   - **Simple** (single module, clear target, no design decisions): Skip Phase 2, go to Phase 3
   - **Standard** (1-2 modules, some ambiguity or scope to clarify): All phases
   - **Complex** (cross-module, design decisions, or user signals complexity): All phases with deeper research
4. Check if `my-coding` skill exists (`~/.claude/skills/my-coding/SKILL.md`). If found, load it
5. Define success criteria upfront — binary pass/fail conditions:

```
### Success Criteria
1. [Observable outcome] — [how to verify]
2. [Observable outcome] — [how to verify]
```

Present classification and criteria to the user in 3-4 lines.

## Agent Routing

Always use `ac:` prefixed `subagent_type` values — see **Agents** table in `CLAUDE.md` for the full routing reference and NOT column. This command uses: `ac:explore`, `ac:librarian`, `ac:plan-analysis`, `ac:plan-review`, `ac:linter`.

---

## Phase 2: Certainty Gate

**Goal**: Gather all context via agents. Do not proceed until certain.

**Actions**:

1. Launch parallel ac:explore + ac:librarian agents (single message, multiple Agent tool calls with `subagent_type: "ac:explore"` and `subagent_type: "ac:librarian"`). Route by intent:

**Build/Refactor**:
- ac:explore 1: "CONTEXT: [task description]. GOAL: Find existing patterns and conventions. DOWNSTREAM: Plan file structure. REQUEST: Find similar implementations — directory structure, naming, config. Include project structure overview."
- ac:explore 2: "CONTEXT: [task description]. GOAL: Map affected files and dependencies. DOWNSTREAM: Define change scope. REQUEST: Find all files that need modification, their callers, and test coverage."
- ac:librarian (if external tech): "CONTEXT: [technology]. GOAL: Follow best practices. DOWNSTREAM: Configuration decisions. REQUEST: Find official docs for setup, patterns, and pitfalls."

**Debug**:
- ac:explore 1: "CONTEXT: [error description]. GOAL: Trace error source. DOWNSTREAM: Root cause diagnosis. REQUEST: Trace code paths producing this error. Return file:line references."
- ac:explore 2: "CONTEXT: [error description]. GOAL: Find recent changes and related code. DOWNSTREAM: Identify regression. REQUEST: git log for affected files, git blame on suspicious sections, related tests."

**Architecture**:
- ac:explore: "CONTEXT: [design question]. GOAL: Map module boundaries. DOWNSTREAM: Identify safe-to-change areas. REQUEST: Find dependency graph, key abstractions, circular deps."
- ac:librarian: "CONTEXT: [architecture domain]. GOAL: Evaluate trade-offs. DOWNSTREAM: Present options. REQUEST: Find best practices, case studies, failure modes."

2. Once agents return, read all key files identified
3. Run the Certainty Check — evaluate readiness honestly:

| Check | Status |
|-------|--------|
| Understand user's TRUE intent? | Yes / No |
| Know which files to modify? | Yes / No |
| Understand existing code patterns? | Yes / No |
| Plan has zero "probably" or "maybe"? | Yes / No |
| Can explain exact steps to take? | Yes / No |

4. **Persist research findings**: Save research findings directly into the plan draft file's `### Research Summary` section (inline, same file — NOT a separate file). Format:
   - **Key Files**: file:line references from explore agents with one-line descriptions
   - **Patterns Found**: Architectural patterns, naming conventions, code organization
   - **Dependencies**: External libraries, frameworks, or services identified

   This is the canonical location for research context. Downstream commands (ac:plan, ac:execute) read from this section to avoid re-researching.

5. If ANY check is "No":
   - Launch additional agents for the gap
   - OR use AskUserQuestion if the gap requires user input
   - Re-run certainty check
5. If ALL checks are "Yes": proceed to Phase 3

---

## Phase 3: Plan

**Goal**: Produce an actionable plan via the appropriate skill

**Actions**:

1. Route by intent:
   - **Build / Refactor / Architecture** → Before invoking ac:plan, ensure Phase 2 research findings are saved in the plan draft file's `### Research Summary` section (see Phase 2, step 4). Then invoke `ac:plan` skill with: "Plan [task description]. Pre-researched context at: [plan-draft-file-path]. Skip Phase 2 research."
   - **Debug** → Invoke `ac:deep` skill with the error description + research findings

2. Wait for skill output. The skill will:
   - Classify, research further if needed, interview user, produce plan
   - Run plan-analysis gate (ac:plan only)
   - Save plan to `~/.claude/projects/<cwd-hash>/plans/`

3. After skill completes, present ultra-specific options via AskUserQuestion:

```
question: "Plan ready. Ultra mode requires delegation — no manual implementation."
header: "Ultra Execution"
options:
  - label: "Execute"
    description: "Delegate to ac:execute for parallel/sequential agent execution."
  - label: "Plan Review"
    description: "Launch plan-review agent for executability verification first."
  - label: "Adjust"
    description: "Modify the plan before execution."
  - label: "Cancel"
    description: "Exit ultra mode."
```

4. If user selects "Plan Review": launch plan-review agent, then re-present options
5. If user selects "Execute": proceed to Phase 4

---

## Phase 4: Execute

**Goal**: Delegate execution to ac:execute and track progress

**Actions**:

1. Invoke `ac:execute` skill with the plan file path
2. ac:execute will:
   - Parse plan into work units
   - Run reliability preflight
   - Launch parallel background agents or sequential agents
   - Track progress and report completion
3. Monitor execution:
   - If an agent fails, note the failure
   - If 3 agents fail on the same step → stop execution, invoke `ac:deep` for investigation
   - If ac:deep resolves the issue, retry the failed step once
   - If ac:deep cannot resolve OR ac:deep reaches its investigation ceiling (3 hypothesis-verify cycles) → **stop immediately and report blocker** to user with:
     (a) all eliminated hypotheses from ac:deep
     (b) remaining investigation leads
     (c) concrete manual investigation steps
     Do NOT retry ac:deep or loop back to execution

**Trivial task exception** (Simple complexity, 1 step): Execute directly without ac:execute delegation. Read files, make changes, proceed to Phase 5.

---

## Phase 5: Verify

**Goal**: Prove the implementation works with evidence. No assumptions.

**Actions**:

1. Run project-wide verification and capture output:

| Check | Command | Evidence Required |
|-------|---------|-------------------|
| **Build** | Project's build command | Exit code 0, no errors |
| **Tests** | Project's test suite | All tests pass (show output) |
| **Lint** | Project's linter/formatter | Zero warnings (show output) |

2. Run Manual QA — actually exercise the feature:

| If the change... | YOU MUST... |
|------------------|-------------|
| Adds/modifies a CLI command | Run the command with Bash. Show the output |
| Changes build output | Run the build. Verify output files exist |
| Modifies API behavior | Call the endpoint. Show the response |
| Adds a new feature/hook | Test it end-to-end in a real scenario |
| Modifies config handling | Load the config. Verify it parses correctly |

3. Collect all evidence:

```
### Verification Evidence
- Build: `[command]` → [output summary]
- Tests: `[command]` → [pass/fail count]
- Lint: `[command]` → [output summary]
- Manual QA: [what was tested] → [what was observed]
```

### LSP Verification (if LSP tool available)

Run after build/test/lint, as final gate before marking complete:

1. Delegate to ac:linter for modified files:
   ```
   Agent(subagent_type="ac:linter", prompt="Final verification on [modified files list]")
   ```
2. BLOCKED verdict → do not mark complete, fix errors first, re-run ac:linter
3. CLEAN verdict → add to evidence report
4. LSP UNAVAILABLE verdict → note "LSP unavailable" in report, rely on lint output

**Add this line to the evidence report**:
- LSP diagnostics: `✓ 0 new errors` | `✗ N errors — see ac:linter report` | `⚠ LSP unavailable`

If LSP tool is not available → omit evidence line, note "LSP unavailable" in report.

### Code Review Gate (if complexity is Standard or Complex)

After LSP verification, launch ac:code-reviewer when warranted:

- If complexity is **Standard** or **Complex** (classified in Phase 1), OR modified files > 3:
  ```
  Agent(subagent_type="ac:code-reviewer", prompt="Review implementation against plan at [plan-file-path]. Modified files: [list]. Check spec compliance and code quality.")
  ```
- **BLOCKED verdict** → fix CRITICAL issues before marking complete. Report IMPORTANT issues to user
- **APPROVED verdict** → add to evidence: `Code review: ✅ APPROVED`
- If complexity is **Simple** → skip this gate

**Add this line to the evidence report**:
- Code review: `✅ APPROVED` | `🚫 BLOCKED — [N] critical issues` | `⏭ Skipped (Simple)`

4. If ANY verification fails:
   - Fix the issue (or delegate to an agent)
   - Re-run the failed verification
   - After 3 fix attempts on the same issue → stop and report to user

**Unacceptable verification claims**:
- "This should work" — RUN IT
- "The types check out" — Types do not catch logic bugs. RUN IT
- "Tests pass" — Does the ACTUAL FEATURE work as expected? RUN IT
- "Lint is clean" — That checks style, not functionality. RUN IT

---

## Phase 6: Complete

**Goal**: Confirm all work is done with evidence. Report to user.

**Actions**:

1. Verify all TODO items from the plan are completed
2. Verify all success criteria from Phase 1 are met
3. If ANY item is incomplete → loop back to Phase 4 for that item
4. Present completion report:

```
## Ultra Complete

**Task**: [original request]
**Strategy**: [what was used — plan + parallel/sequential execute]

### Changes Made
- `file:line` — [what changed]

### Verification Evidence
- Build: [command] → [result]
- Tests: [command] → [result]
- Lint: [command] → [result]
- Manual QA: [what was tested] → [what was observed]

### Success Criteria
- [Criterion 1]: ✅ [evidence]
- [Criterion 2]: ✅ [evidence]
```

5. Suggest checkpoint commit (never auto-commit)

---

## Complexity Shortcuts

**Simple** tasks (single module, obvious change):
- Skip Phase 2 (certainty gate)
- Phase 3: Create inline plan (3-4 steps via TodoWrite), skip ac:plan invoke
- Phase 4: Execute directly, skip ac:execute invoke
- Phase 5-6: Full verification still required — no shortcuts on verification

**Standard** tasks:
- All phases, 2 ac:explore agents + 1 ac:librarian (if external tech)

**Complex** tasks:
- All phases, 3 ac:explore agents + 1-2 ac:librarian agents
- Deeper certainty gate — require ALL 5 checks to pass
- Suggest phased execution if plan has dependencies

---

## Error Handling

- **Certainty gate fails repeatedly**: After 2 rounds of additional research with no clarity → ask user for guidance
- **Plan skill fails**: Report error, suggest running `/ac:plan` manually
- **Execution agent fails**: Log failure, continue other agents. After 3 failures on same step → invoke ac:deep
- **Verification fails 3 times**: Stop, revert changes, report blocker with evidence
- **User cancels**: Stop gracefully, report progress so far, suggest checkpoint commit for completed work
