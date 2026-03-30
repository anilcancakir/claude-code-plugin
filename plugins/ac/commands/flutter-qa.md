---
description: "Flutter QA testing — ad-hoc tests, bug reproduction, plan verification, integration test execution, visual regression. Uses flutter-skill MCP."
argument-hint: "App description, bug doc path, plan path, test path, or --recheck (e.g., 'test login flow', '--bug repro.md', '--plan .ac/plans/auth.md', '--test integration_test/', '--visual screens/', '--recheck')"
---

# Flutter QA Test

You are orchestrating Flutter QA testing. Detect flutter-skill MCP availability, classify user intent into one of 6 modes, gather test context, delegate execution to the flutter-qa agent, and produce a structured QA report.

Load the flutter-qa skill for workflow patterns:
`${CLAUDE_PLUGIN_ROOT}/skills/flutter-qa/SKILL.md`

Load report format reference:
`${CLAUDE_PLUGIN_ROOT}/skills/flutter-qa/references/report-format.md`

## Core Principles

- **Widget tree snapshot over screenshots** — ~95% fewer tokens, deterministic, structured. Use `mcp__flutter_skill__get_widget_tree` for element discovery, screenshots only as evidence on FAIL
- **One action per step, re-snapshot after** — Observe-act-observe pattern mandatory
- **Clean app state per test case** — `mcp__flutter_skill__reset_app` between test cases for isolation (except RECHECK, which preserves session)
- **Smart actions for self-healing** — Use `smart_tap`, `smart_enter_text`, `smart_scroll` for self-healing element resolution before falling back to coordinate-based actions
- **Session isolation for parallel** — Each parallel agent calls `mcp__flutter_skill__scan_and_connect` or `mcp__flutter_skill__connect_app` independently with unique session names

---

## Phase 1: Mode Classification + MCP Detection

**Goal**: Determine what the user wants and verify flutter-skill MCP is available

**Actions**:

1. Parse `$ARGUMENTS` for mode flags:

| Condition | Mode | Description |
|-----------|------|-------------|
| Contains `--bug <path>` or file path with bug/repro keywords | `BUG_REPRO` | Parse bug document, execute reproduction steps |
| Contains `--plan <path>` or `.ac/plans/` path | `PLAN_VERIFY` | Extract acceptance criteria, generate test cases |
| Contains `--recheck` | `RECHECK` | Re-run failed test cases from previous session |
| Contains `--test <path>` or `integration_test/` path | `TEST_RUN` | Execute existing Dart integration test files directly |
| Contains `--visual <path>` | `VISUAL_REGRESSION` | Capture and compare widget screenshots against baselines |
| App description or natural language | `AD_HOC` | Tap, swipe, inspect — freeform Flutter app testing |
| No arguments | — | Ask user with mode options (below) |

Global flags (combinable with any mode):

| Flag | Effect |
|------|--------|
| `--no-evidence` | Skip saving evidence artifacts to `.ac/qa/`. Report still generated, just no file persistence |
| `--no-parallel` | Force sequential single-agent execution even for >3 test cases. Default: parallel |
| `--platform <ios\|android\|web\|desktop>` | Target platform context. Default: auto-detect from connected app |
| `--uri <vm_service_uri>` | Connect to a specific Flutter app VM service URI directly, bypassing scan |

2. If no arguments provided, ask the user: "What would you like to test?" with these options:
   - **Ad-hoc test** — "Describe the app and what to test — I'll navigate and verify"
   - **Bug reproduction** — "Give me a bug document — I'll reproduce each bug"
   - **Plan verification** — "Give me a plan file — I'll verify acceptance criteria"
   - **Re-check previous failures** — "Re-run FAIL and BLOCKED items from the last QA session"
   - **Test execution** — "Give me a path to Dart integration tests — I'll run them and report results"
   - **Visual regression** — "Give me screens/widgets to baseline — I'll capture and compare"

3. Announce: `"Mode: [MODE] — [description]"`

4. Detect flutter-skill MCP availability:
   Check if `mcp__flutter_skill__scan_and_connect` tool is available.
   - If available → announce: "flutter-skill MCP detected."
   - If not available → display setup guide and stop:
     ```
     flutter-skill MCP not available. Setup required:
     1. Install flutter-skill: npm install -g flutter-skill
     2. Add to your .mcp.json:
        {"flutter-skill": {"command": "flutter-skill", "args": ["server"]}}
     3. Restart Claude Code
     ```

5. App connection:
   - If `--uri` flag provided → call `mcp__flutter_skill__connect_app(uri)` directly. If connection fails → inform user: "Cannot connect to VM service at [uri]. Verify the app is running and the URI is correct." Stop.
   - If no `--uri` → call `mcp__flutter_skill__scan_and_connect()`.
     - If one app found → connected. Announce: "Connected to Flutter app: [app description]."
     - If no apps found → inform user and stop:
       ```
       No running Flutter apps found. Start your app first:
         flutter run
       Or use launch_app:
         mcp__flutter_skill__launch_app(project_path: ".")
       Then re-run this command.
       ```
     - If multiple apps found → display list and stop:
       ```
       Multiple Flutter apps detected. Specify which app to connect to:
       [list each app with VM service URI]
       Re-run with: /ac:flutter-qa --uri <vm_service_uri> [your test instructions]
       ```

6. Store: `MODE`, `TARGET` (app description, file path, or test path), `APP_SESSION`, `PARALLEL_ENABLED` (boolean, default true), `PLATFORM`

---

## Phase 2: Context Gathering

**Goal**: Build the test case list based on mode

### AD_HOC mode

1. Discover app structure: call `mcp__flutter_skill__get_widget_tree` to get current widget tree snapshot.
2. Identify navigable screens, key widgets, and interactive elements from the tree.
3. Build test case list from user instructions: `[{id: "TC-001", description: "<user instruction>", steps: [<extracted steps>], expected: "<expected outcome>"}]`

### BUG_REPRO mode

1. Read the bug document at TARGET path.
2. Parse numbered bugs — extract: title/ID, preconditions, reproduction steps, expected result, actual result.
3. Store as `BUG_LIST`: `[{id: "BUG-001", title, preconditions, steps[], expected}]`
4. No structured format → treat entire doc as natural language, extract by paragraph/section.
5. Use `mcp__flutter_skill__reset_app` per bug for isolation.

### PLAN_VERIFY mode

1. Read plan file at TARGET path.
2. Extract `Done when:` / acceptance criteria blocks.
3. For each criterion: `{id: "AC-001", criterion_text, action_sequence[], expected_outcome}`
4. No `Done when:` blocks → extract bulleted checklist items as test cases.
5. Verify via `mcp__flutter_skill__get_widget_tree` + `smart_tap` / `smart_assert` for assertions.

### RECHECK mode

1. Derive `{testName}` from the original target (same naming convention as evidence persistence). Read `.ac/flutter-qa/{testName}.json`. If `$ARGUMENTS` includes a specific report name, use that instead.
2. If file not found → inform user: "No previous QA report found for '{testName}'. Run a test first." Stop.
3. Filter to `FAIL` and `BLOCKED` items only.
4. Rebuild test case list from failed items — preserve original IDs.
5. Announce: "Re-checking {N} failed items from {timestamp}"

### TEST_RUN mode

1. List Dart test files in TARGET path: `Glob("**/*_test.dart")` in the target directory.
2. If no test files found → inform user: "No Dart test files found at [path]. Expected *_test.dart files." Stop.
3. Build test execution list: `[{id: "TEST-001", file_path: "<absolute path>", test_name: "<filename without extension>"}]`
4. TEST_RUN uses `flutter test --machine <path>` via Bash directly — no MCP interaction needed.

### VISUAL_REGRESSION mode

1. Identify screens/widgets to baseline from TARGET path or user description.
2. Check for existing baselines in `.ac/qa/baselines/{testName}/`.
   - If baselines exist → comparison mode. Announce: "Found {N} existing baselines. Will compare current state."
   - If no baselines → baseline capture mode. Announce: "No baselines found. Will capture initial baselines."
3. Build screen list: `[{id: "VR-001", screen_name: "<name>", navigation_steps: [<steps to reach screen>], widgets_to_capture: [<specific widgets or "full_screen">]}]`

### Cross-run Knowledge Injection (all modes)

Agents read `.ac/qa/knowledge/project.jsonl` directly at execution start. The parent command also loads it as a supplementary prompt injection:

1. Check for existing `.ac/qa/knowledge/project.jsonl`.
   - If found: read file, parse each JSONL line as JSON, store as `EXISTING_KNOWLEDGE`. Announce: "Loaded {N} knowledge facts from previous runs."
   - If not found: set `EXISTING_KNOWLEDGE` to empty array `[]`.
2. Create knowledge directory: `mkdir -p .ac/qa/knowledge/` (ensures agents can write temp files during execution).

---

## Phase 3: Agent Delegation

**Goal**: Delegate Flutter test execution to flutter-qa agents with session-constrained parallel orchestration and two-wave knowledge sharing

Serialize the `TEST_CASES` list from Phase 2 as a JSON array.

### 3a. Grouping Logic

Determine execution strategy:
- If test case count is **<= 3** OR `PARALLEL_ENABLED` is false (`--no-parallel`) → **single agent mode**
- If test case count is **> 3** AND `PARALLEL_ENABLED` is true → **parallel mode**: chunk into groups of ~3, max constrained by available sessions: `N = min(ceil(count/3), 4, available_sessions)`. Each group gets a unique `SESSION_NAME` (`fqa-0`, `fqa-1`, ..., `fqa-3`). For parallel, each agent calls `mcp__flutter_skill__scan_and_connect` or `mcp__flutter_skill__connect_app` independently to establish its own session.

### 3b. Wave 1 — Test Execution

**Single agent mode** (<=3 test cases or --no-parallel):

```
Agent(
  subagent_type: "ac:flutter-qa",
  prompt: "Execute Flutter QA tests.
    **Mode**: [MODE]
    **Session Name**: fqa-0
    **App URI**: [APP_URI]
    **Platform**: [PLATFORM]
    **Test Cases**: [TEST_CASES JSON]
    **Prior Knowledge**: [EXISTING_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/flutter-qa/SKILL.md
    Return results + learned_facts as JSON array.",
  model: "sonnet"
)
```

Agents also read `.ac/qa/knowledge/project.jsonl` directly at start. PRIOR_KNOWLEDGE is supplementary — agents merge both sources, file takes priority for same-key conflicts.

**Parallel mode** (>3 test cases):

Launch N flutter-qa agents in a single message block (foreground — CC waits for all automatically):

```
Agent(
  subagent_type: "ac:flutter-qa",
  prompt: "Execute Flutter QA tests.
    **Mode**: [MODE]
    **Session Name**: fqa-0
    **App URI**: [APP_URI]
    **Platform**: [PLATFORM]
    **Test Cases**: [GROUP_1 JSON]
    **Prior Knowledge**: [EXISTING_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/flutter-qa/SKILL.md
    Return results + learned_facts as JSON array.",
  model: "sonnet"
)
// Repeat for fqa-1, fqa-2, fqa-3 with their respective GROUP_N test case subsets
```

Agents also read `.ac/qa/knowledge/project.jsonl` directly at start. PRIOR_KNOWLEDGE is supplementary — agents merge both sources, file takes priority for same-key conflicts.

Note: `EXISTING_KNOWLEDGE` is loaded from `.ac/qa/knowledge/` in Phase 2. Do NOT hardcode `[]` — use the loaded value.

**TEST_RUN special handling**: Agent runs `flutter test --machine <path>` via Bash for each test file. No MCP interaction — parse JSON machine output for results. Each test file is an independent test case — results reported per file.

**VISUAL_REGRESSION special handling**: Agent uses `mcp__flutter_skill__visual_baseline_save` (first run, no existing baselines) or `mcp__flutter_skill__visual_baseline_compare` (subsequent runs with baselines). Baselines stored in `.ac/qa/baselines/{testName}/`.

### 3c. Knowledge Merge

After all Wave 1 agents complete:

1. Read all agent temp files: `.ac/qa/knowledge/.fqa-*.jsonl` (glob pattern). Each file contains JSONL facts written by one agent during execution.
2. Read existing `.ac/qa/knowledge/project.jsonl` if present — parse as JSONL.
3. Merge all sources: temp files + existing project.jsonl. Deduplicate by `key` — latest occurrence wins (temp file facts override existing).
4. Write merged result back to `.ac/qa/knowledge/project.jsonl` (overwrite — deduped merge is the new source of truth).
5. Delete temp files: remove all `.ac/qa/knowledge/.fqa-*.jsonl` after successful merge.
6. Store merged knowledge as `AGGREGATED_KNOWLEDGE` for Wave 2 prompt injection (if triggered).

### 3d. Wave 2 — Knowledge-enriched Re-check (conditional)

**Trigger condition**: Wave 1 has FAIL or BLOCKED results AND `AGGREGATED_KNOWLEDGE` is non-empty.

If triggered:
- Re-run only FAIL/BLOCKED test cases with `PRIOR_KNOWLEDGE` set to `AGGREGATED_KNOWLEDGE`.
- Single agent, session name `fqa-rewave`.

```
Agent(
  subagent_type: "ac:flutter-qa",
  prompt: "Execute Flutter QA tests — knowledge-enriched re-check.
    **Mode**: [MODE]
    **Session Name**: fqa-rewave
    **App URI**: [APP_URI]
    **Platform**: [PLATFORM]
    **Test Cases**: [FAIL/BLOCKED test cases from Wave 1 JSON]
    **Prior Knowledge**: [AGGREGATED_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/flutter-qa/SKILL.md
    Return results + learned_facts as JSON array.",
  model: "sonnet"
)
```

If Wave 1 has no failures OR `AGGREGATED_KNOWLEDGE` is empty → skip Wave 2 silently.

`AGGREGATED_KNOWLEDGE` is the merged content of `project.jsonl` after Phase 3c. Wave 2 agent will also read `project.jsonl` directly — it was just updated in 3c.

### 3e. Result Merge

1. Combine all agent results (Wave 1 + Wave 2 if run) into single `AGENT_RESULTS` array.
2. Wave 2 results override Wave 1 for same test case IDs (re-checked items).
3. Merge all `learned_facts` into final `AGGREGATED_KNOWLEDGE`.

---

## Phase 4: Report Generation

**Goal**: Produce a structured QA report from the agent's execution results

Parse `AGENT_RESULTS` to extract verdicts, evidence, and severity for each test case.

Generate the report in this format:

```markdown
# QA Report — [target] — [YYYY-MM-DD]

## Summary
**Mode**: [AD_HOC / BUG_REPRO / PLAN_VERIFY / RECHECK / TEST_RUN / VISUAL_REGRESSION]
**Backend**: flutter-skill-mcp
**Session**: [APP_SESSION]
**Platform**: [ios / android / web / desktop]
**Verdict**: PASS_ALL / FAILURES_FOUND / BLOCKED
**Stats**: [N passed] / [N failed] / [N blocked] out of [total]

## Results

| # | Test Case | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [description] | PASS | — |
| 2 | [description] | FAIL | screenshot, widget tree |
| 3 | [description] | BLOCKED | setup required |

## Failed Tests (detail)

### TC-002: [description]
**Expected**: [expected state]
**Actual**: [actual state]
**Evidence**:
- Screenshot: [inline description or saved path]
- Widget tree: [relevant widget subtree excerpt]
- Logs: [relevant lines]
**Severity**: High / Medium / Low

## Blocked Tests (detail)

### TC-003: [description]
**Reason**: [why blocked — widget not found, app not running, MCP unavailable]
**Action Required**: [what the user needs to do]

## Recommendations
[If FAIL: suggest fixes based on evidence — be specific about what widget/screen needs attention]
[If BLOCKED: show setup steps needed to unblock]
[If ALL PASS: confirm all criteria met, suggest next steps]
```

Severity classification:
- **High**: Functionality broken, user cannot complete flow, data loss, crash
- **Medium**: Feature works but with unexpected behavior, UI glitch affecting usability
- **Low**: Cosmetic issue, minor inconsistency, non-blocking annoyance

RECHECK diff section (RECHECK mode only — append after Recommendations):

```markdown
## Re-check Diff (vs previous run)

| # | Test Case | Previous | Current | Change |
|---|-----------|----------|---------|--------|
| 2 | [description] | FAIL | PASS | Fixed |
| 3 | [description] | BLOCKED | FAIL | Unblocked, now failing |
| 5 | [description] | FAIL | FAIL | Still failing |
```

TEST_RUN results section (TEST_RUN mode only — append after Results table):

```markdown
## Test Execution Details

| # | Test File | Status | Duration | Notes |
|---|-----------|--------|----------|-------|
| 1 | login_test.dart | PASS | 4.2s | — |
| 2 | checkout_test.dart | FAIL | 8.1s | Expected: "Order placed" — Actual: timeout |
```

VISUAL_REGRESSION results section (VISUAL_REGRESSION mode only — append after Results table):

```markdown
## Visual Regression Details

| # | Screen | Status | Diff % | Baseline | Current |
|---|--------|--------|--------|----------|---------|
| 1 | login_screen | PASS | 0.0% | .ac/qa/baselines/{testName}/login_screen.png | — |
| 2 | settings_screen | FAIL | 12.3% | .ac/qa/baselines/{testName}/settings_screen.png | .ac/qa/{testName}/settings_screen_current.png |
```

---

## Phase 5: State Persistence

**Goal**: Save results for RECHECK mode, audit trail, and QA evidence archive

### 5a. RECHECK State (always)

1. Create `.ac/flutter-qa/` directory if it doesn't exist.
2. Derive `{testName}` from mode + target (same naming convention as evidence persistence: AD_HOC → app description slug, BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original}`, TEST_RUN → test directory slug, VISUAL_REGRESSION → `vr-{target slug}`).
3. Save human-readable report to `.ac/flutter-qa/{testName}.md` — the full report from Phase 4.
4. Save structured data to `.ac/flutter-qa/{testName}.json`:
   ```json
   {
     "timestamp": "ISO8601", "mode": "AD_HOC", "backend": "flutter-skill-mcp",
     "session": "fqa-0", "platform": "ios",
     "verdict": "FAILURES_FOUND",
     "stats": {"pass": 3, "fail": 1, "blocked": 0, "total": 4},
     "results": [
       {"id": "TC-001", "verdict": "PASS", "evidence": {}},
       {"id": "TC-002", "verdict": "FAIL", "evidence": {
         "screenshot": ".ac/qa/login-flow/20260330-143000-login.png",
         "widget_tree": ".ac/qa/login-flow/20260330-143000-login.json",
         "expected": "...", "actual": "..."
       }}
     ]
   }
   ```
5. RECHECK mode: include a `diff` field — `[{"id": "TC-002", "previous": "FAIL", "current": "PASS", "change": "fixed"}, ...]`

### 5b. Evidence Archive (default ON, skip with `--no-evidence`)

Persist key test artifacts to `.ac/qa/` for audit trail, debugging, and historical comparison. Similar to `.ac/plans/` and `.ac/tasks/` — project-local, not gitignored by default.

**Directory structure**:
```
.ac/qa/
  {testName}/
    {YYYYMMDD}-{HHmmss}-{screenName}.png       # Screenshot evidence
    {YYYYMMDD}-{HHmmss}-{screenName}.json       # Widget tree snapshot
    {YYYYMMDD}-{HHmmss}-{screenName}-errors.json # Logs and errors
    report.md                                    # Latest report for this test
  baselines/
    {testName}/
      {screenName}.png                           # Visual regression baselines
```

**Naming rules**:
- `{testName}` — slugified from test context: AD_HOC → app description slug (e.g., `login-flow`, `checkout-cart`), BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original-testName}`, TEST_RUN → test directory slug, VISUAL_REGRESSION → `vr-{target slug}`
- `{YYYYMMDD}-{HHmmss}` — UTC timestamp of the test run
- `{screenName}` — short slug of the current screen/widget (e.g., `login-screen`, `settings-profile`). Max 40 chars, truncate with trailing hash if longer

**What to save** (per test case with FAIL or key milestone steps):
1. **Screenshots** (`.png`) — agent captures on FAIL. Save raw screenshot data from flutter-skill MCP.
2. **Widget tree snapshots** (`.json`) — widget tree at failure/checkpoint via `mcp__flutter_skill__get_widget_tree`.
3. **Error logs** (`-errors.json`) — `{test_id, timestamp, errors[], platform, screen_name}`.
4. **Report copy** (`report.md`) — overwrite with the latest Phase 4 report for this test name.

Steps:
1. Derive `{testName}` from mode + target. Create `.ac/qa/{testName}/` directory.
2. For each FAIL: save `.png`, `.json`, `-errors.json` using the naming convention above.
3. For PASS at key milestones: optionally save widget tree `.json` only (lightweight audit trail).
4. Copy Phase 4 report to `.ac/qa/{testName}/report.md`.
5. Update evidence paths in `.ac/flutter-qa/{testName}.json` to `.ac/qa/` files.

### 5c. Present Report

Output the Phase 4 report directly. If evidence was saved, append:
```
Evidence saved to .ac/qa/{testName}/ — {N} screenshots, {M} widget tree snapshots, {K} error logs
```

### 5d. Knowledge Persistence

Knowledge merge is handled in Phase 3c after agent execution. For single-agent mode where Phase 3c may have been skipped:

1. Check for remaining temp files: `.ac/qa/knowledge/.fqa-*.jsonl`.
2. If found: read temp files + existing `project.jsonl` → dedup by key → write merged `project.jsonl` → delete temp files.
3. If no temp files exist: Phase 3c already handled the merge — no action needed.

Knowledge persistence is independent of `--no-evidence` flag — knowledge is always saved. `--no-evidence` only skips screenshots, widget tree snapshots, and error logs.

---

## Error Handling

| Condition | Action |
|-----------|--------|
| flutter-skill MCP not available | Display setup guide (`npm install -g flutter-skill` + `.mcp.json` config), stop |
| No running Flutter app found | Suggest `flutter run` or `mcp__flutter_skill__launch_app(project_path: ".")`, stop |
| Multiple Flutter apps detected | Display list with VM service URIs. Suggest re-run with `--uri <vm_service_uri>`, stop |
| MCP tool call fails | Retry once. If retry fails → mark test case `BLOCKED` with error message |
| Widget not found after 3 retries | Mark test case `BLOCKED`: "Widget not found: [description]. Widget tree may have changed." |
| App disconnected mid-test | Mark remaining test cases `BLOCKED`: "App disconnected." Collect completed results |
| `flutter test` not found (TEST_RUN) | Suggest Flutter SDK install: "Flutter SDK not found. Install from https://flutter.dev/docs/get-started/install", stop |
| TEST_RUN test file parse failure | Mark test as `BLOCKED`: "Failed to parse test output for [path]. Check test file syntax." |
| VISUAL_REGRESSION no baseline | Auto-save baseline via `mcp__flutter_skill__visual_baseline_save`, skip comparison. Announce: "Baseline captured for [screen]. Re-run to compare." |
| One parallel agent fails or times out | Collect results from successful agents. Mark timed-out group's test cases as BLOCKED with note: "Agent timeout — test case not executed" |
| All parallel agents fail | Fall back to single-agent sequential mode. Announce: "Parallel execution failed — falling back to sequential." Re-run all test cases with single agent |
| `.ac/flutter-qa/{testName}.json` not found (RECHECK) | Inform user: "No previous QA report found for '{testName}'. Run a test first, then use --recheck." Stop |
