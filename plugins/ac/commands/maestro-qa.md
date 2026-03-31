---
description: "Mobile QA testing — ad-hoc tests, bug reproduction, plan verification, flow execution. Uses Maestro MCP."
argument-hint: "App description, bug doc path, plan path, flow path, or --recheck (e.g., 'test login flow', '--bug repro.md', '--plan .ac/plans/auth.md', '--flows .maestro/', '--recheck')"
---

# Maestro QA Test

You are orchestrating mobile QA testing. Detect Maestro MCP availability, classify user intent into one of 5 modes, gather test context, delegate execution to the maestro-qa agent, and produce a structured QA report.

Load the maestro-qa skill for workflow patterns:
`${CLAUDE_PLUGIN_ROOT}/skills/maestro-qa/SKILL.md`

Load report format reference:
`${CLAUDE_PLUGIN_ROOT}/skills/maestro-qa/references/report-format.md`

## Core Principles

- **View hierarchy inspection over screenshots** — Token-efficient, deterministic. Use `inspect_view_hierarchy` for element discovery, screenshots only as evidence on FAIL
- **One action per step, re-inspect after** — Observe-act-observe pattern mandatory
- **Clean app state per test case** — `launch_app` with `clearState` via `run_flow` for isolation (except RECHECK, which preserves session)
- **Hierarchy on disk** — CSV from `inspect_view_hierarchy`, read only when needed for element refs
- **Batch when possible** — Use `run_flow` for multi-step sequences (1 MCP call vs N)

---

## Phase 1: Mode Classification + MCP Detection

**Goal**: Determine what the user wants and verify Maestro MCP is available

**Actions**:

1. Parse `$ARGUMENTS` for mode flags:

| Condition | Mode | Description |
|-----------|------|-------------|
| Contains `--bug <path>` or file path with bug/repro keywords | `BUG_REPRO` | Parse bug document, execute reproduction steps |
| Contains `--plan <path>` or `.ac/plans/` path | `PLAN_VERIFY` | Extract acceptance criteria, generate test cases |
| Contains `--recheck` | `RECHECK` | Re-run failed test cases from previous session |
| Contains `--flows <path>` or `.maestro/` path | `FLOW_RUN` | Execute existing Maestro YAML flow files directly |
| App description or natural language | `AD_HOC` | Tap, swipe, inspect — freeform mobile testing |
| No arguments | — | Ask user with mode options (below) |

Global flags (combinable with any mode):

| Flag | Effect |
|------|--------|
| `--no-evidence` | Skip saving evidence artifacts to `.ac/qa/`. Report still generated, just no file persistence |
| `--no-parallel` | Force sequential single-agent execution even for >3 test cases. Default: parallel |
| `--platform <ios\|android>` | Filter available devices by platform. Default: all platforms |

2. If no arguments provided, ask the user: "What would you like to test?" with these options:
   - **Ad-hoc test** — "Describe the app and what to test — I'll navigate and verify"
   - **Bug reproduction** — "Give me a bug document — I'll reproduce each bug"
   - **Plan verification** — "Give me a plan file — I'll verify acceptance criteria"
   - **Re-check previous failures** — "Re-run FAIL and BLOCKED items from the last QA session"
   - **Flow execution** — "Give me a path to Maestro YAML flows — I'll execute them and report results"

3. Announce: `"Mode: [MODE] — [description]"`

4. Detect Maestro MCP availability:
   Check if `mcp__maestro__list_devices` tool is available.
   - If available → announce: "Maestro MCP detected."
   - If not available → display setup guide and stop:
     ```
     Maestro MCP not available. Setup required:
     1. Install Maestro: brew install maestro (or: curl -Ls "https://get.maestro.mobile.dev" | bash)
     2. Add to your .mcp.json:
        {"maestro": {"command": "maestro", "args": ["mcp"]}}
     3. Restart Claude Code
     ```

5. Device discovery: call `mcp__maestro__list_devices()`.
   - If devices found → store as `AVAILABLE_DEVICES` (array of `{id, platform, name}`). Announce: "Found {N} device(s): [list names and platforms]."
   - If no devices found → display guidance and stop:
     ```
     No devices found. Start a device first:
       iOS:     maestro start-device --platform ios
       Android: maestro start-device --platform android
     Then re-run this command.
     ```

6. If `--platform` flag provided: filter `AVAILABLE_DEVICES` to matching platform only. If filter yields zero → inform user: "No {platform} devices found among connected devices." Stop.

7. Store: `MODE`, `TARGET` (app description, file path, or flow path), `APP_ID`, `PARALLEL_ENABLED` (boolean, default true), `AVAILABLE_DEVICES`

---

## Phase 2: Context Gathering

**Goal**: Build the test case list based on mode

### AD_HOC mode

1. Extract `APP_ID` from project context — search for:
   - `bundleIdentifier` in `package.json` or Xcode project files
   - `applicationId` in `build.gradle` / `build.gradle.kts`
   - `CFBundleIdentifier` in `Info.plist`
2. If `APP_ID` not found → ask user: "What is the app's bundle/application ID? (e.g., com.example.myapp)"
3. Build test case list from user instructions: `[{id: "TC-001", description: "<user instruction>", app_id: APP_ID, steps: [<extracted steps>], expected: "<expected outcome>"}]`

### BUG_REPRO mode

1. Read the bug document at TARGET path.
2. Parse numbered bugs — extract: title/ID, preconditions, reproduction steps, expected result, actual result.
3. Store as `BUG_LIST`: `[{id: "BUG-001", title, preconditions, steps[], expected, app_id}]`
4. No structured format → treat entire doc as natural language, extract by paragraph/section.
5. Use `launch_app` with `clearState` per bug for isolation.

### PLAN_VERIFY mode

1. Read plan file at TARGET path.
2. Extract `Done when:` / acceptance criteria blocks.
3. For each criterion: `{id: "AC-001", criterion_text, action_sequence[], expected_outcome}`
4. No `Done when:` blocks → extract bulleted checklist items as test cases.
5. Verify via `inspect_view_hierarchy` + `tap_element` / `assert_element_visible` for assertions.

### RECHECK mode

1. Derive `{testName}` from the original target (same naming convention as evidence persistence). Read `.ac/maestro-qa/{testName}.json`. If `$ARGUMENTS` includes a specific report name, use that instead.
2. If file not found → inform user: "No previous QA report found for '{testName}'. Run a test first." Stop.
3. Filter to `FAIL` and `BLOCKED` items only.
4. Rebuild test case list from failed items — preserve original IDs.
5. Announce: "Re-checking {N} failed items from {timestamp}"

### FLOW_RUN mode

1. List YAML flow files in TARGET path: `Glob("*.yaml")` and `Glob("*.yml")` in the target directory.
2. If no flow files found → inform user: "No Maestro flow files found at [path]. Expected .yaml/.yml files." Stop.
3. Build flow execution list: `[{id: "FLOW-001", file_path: "<absolute path>", flow_name: "<filename without extension>"}]`
4. FLOW_RUN uses `run_flow_files` MCP tool directly — no step-by-step decomposition needed.

### Cross-run Knowledge Injection (all modes)

Agents read `.ac/qa/knowledge/project.jsonl` directly at execution start. The parent command also loads it as a supplementary prompt injection:

1. Check for existing `.ac/qa/knowledge/project.jsonl`.
   - If found: read file, parse each JSONL line as JSON, store as `EXISTING_KNOWLEDGE`. Announce: "Loaded {N} knowledge facts from previous runs."
   - If not found: set `EXISTING_KNOWLEDGE` to empty array `[]`.
2. Create knowledge directory: `mkdir -p .ac/qa/knowledge/` (ensures agents can write temp files during execution).

---

## Phase 3: Agent Delegation

**Goal**: Delegate mobile test execution to maestro-qa agents with device-constrained parallel orchestration and two-wave knowledge sharing

Serialize the `TEST_CASES` list from Phase 2 as a JSON array.

### 3a. Grouping Logic

Determine execution strategy:
- If test case count is **<= 3** OR `PARALLEL_ENABLED` is false (`--no-parallel`) → **single agent mode**
- If test case count is **> 3** AND `PARALLEL_ENABLED` is true → **parallel mode**: chunk into groups of ~3, max constrained by available devices: `N = min(ceil(count/3), 4, len(AVAILABLE_DEVICES))`. Each group gets a unique `DEVICE_ID` from `AVAILABLE_DEVICES`, `SESSION_NAME` (`mqa-0`, `mqa-1`, ..., `mqa-3`), and its subset of `TEST_CASES`.

### 3b. Wave 1 — Test Execution

**Single agent mode** (<=3 test cases or --no-parallel):

```
Agent(
  subagent_type: "ac:maestro-qa",
  prompt: "Execute mobile QA tests.
    **Mode**: [MODE]
    **Device ID**: [DEVICE_ID]
    **App ID**: [APP_ID]
    **Session Name**: mqa-0
    **Test Cases**: [TEST_CASES JSON]
    **Prior Knowledge**: [EXISTING_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/maestro-qa/SKILL.md
    Return results + learned_facts as JSON array.",
)
```

Agents also read `.ac/qa/knowledge/project.jsonl` directly at start. PRIOR_KNOWLEDGE is supplementary — agents merge both sources, file takes priority for same-key conflicts.

**Parallel mode** (>3 test cases):

Launch N maestro-qa agents in a single message block (foreground):

```
Agent(
  subagent_type: "ac:maestro-qa",
  prompt: "Execute mobile QA tests.
    **Mode**: [MODE]
    **Device ID**: [DEVICE_ID_1]
    **App ID**: [APP_ID]
    **Session Name**: mqa-0
    **Test Cases**: [GROUP_1 JSON]
    **Prior Knowledge**: [EXISTING_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/maestro-qa/SKILL.md
    Return results + learned_facts as JSON array.",
)
// Repeat for mqa-1, mqa-2, mqa-3 with their respective DEVICE_ID_N and GROUP_N test case subsets
```

Agents also read `.ac/qa/knowledge/project.jsonl` directly at start. PRIOR_KNOWLEDGE is supplementary — agents merge both sources, file takes priority for same-key conflicts.

Note: `EXISTING_KNOWLEDGE` is loaded from `.ac/qa/knowledge/` in Phase 2. Do NOT hardcode `[]` — use the loaded value.

**FLOW_RUN special handling**: Agent uses `mcp__maestro__run_flow_files` MCP tool directly — pass comma-separated file paths for batch execution. Each flow file is an independent test case — results reported per flow.

### 3c. Knowledge Merge

After all Wave 1 agents complete:

1. Read all agent temp files: `.ac/qa/knowledge/.mqa-*.jsonl` (glob pattern). Each file contains JSONL facts written by one agent during execution.
2. Read existing `.ac/qa/knowledge/project.jsonl` if present — parse as JSONL.
3. Merge all sources: temp files + existing project.jsonl. Deduplicate by `key` — latest occurrence wins (temp file facts override existing).
4. Write merged result back to `.ac/qa/knowledge/project.jsonl` (overwrite — deduped merge is the new source of truth).
5. Delete temp files: remove all `.ac/qa/knowledge/.mqa-*.jsonl` after successful merge.
6. Store merged knowledge as `AGGREGATED_KNOWLEDGE` for Wave 2 prompt injection (if triggered).

### 3d. Wave 2 — Knowledge-enriched Re-check (conditional)

**Trigger condition**: Wave 1 has FAIL or BLOCKED results AND `AGGREGATED_KNOWLEDGE` is non-empty.

If triggered:
- Re-run only FAIL/BLOCKED test cases with `PRIOR_KNOWLEDGE` set to `AGGREGATED_KNOWLEDGE`.
- Single agent, session name `mqa-rewave`, uses first available device from `AVAILABLE_DEVICES`.

```
Agent(
  subagent_type: "ac:maestro-qa",
  prompt: "Execute mobile QA tests — knowledge-enriched re-check.
    **Mode**: [MODE]
    **Device ID**: [DEVICE_ID]
    **App ID**: [APP_ID]
    **Session Name**: mqa-rewave
    **Test Cases**: [FAIL/BLOCKED test cases from Wave 1 JSON]
    **Prior Knowledge**: [AGGREGATED_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/maestro-qa/SKILL.md
    Return results + learned_facts as JSON array.",
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
**Mode**: [AD_HOC / BUG_REPRO / PLAN_VERIFY / RECHECK / FLOW_RUN]
**Backend**: maestro-mcp
**Device**: [device name] ([platform])
**Platform**: [ios / android]
**App ID**: [APP_ID]
**Verdict**: PASS_ALL / FAILURES_FOUND / BLOCKED
**Stats**: [N passed] / [N failed] / [N blocked] out of [total]

## Results

| # | Test Case | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [description] | PASS | — |
| 2 | [description] | FAIL | screenshot, hierarchy |
| 3 | [description] | BLOCKED | setup required |

## Failed Tests (detail)

### TC-002: [description]
**Expected**: [expected state]
**Actual**: [actual state]
**Evidence**:
- Screenshot: [inline description or saved path]
- View hierarchy: [relevant element tree excerpt]
- Logs: [relevant lines]
**Severity**: High / Medium / Low

## Blocked Tests (detail)

### TC-003: [description]
**Reason**: [why blocked — app not installed, element not found, device unavailable]
**Action Required**: [what the user needs to do]

## Recommendations
[If FAIL: suggest fixes based on evidence — be specific about what element/screen needs attention]
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

FLOW_RUN results section (FLOW_RUN mode only — append after Results table):

```markdown
## Flow Execution Details

| # | Flow File | Status | Duration | Notes |
|---|-----------|--------|----------|-------|
| 1 | login.yaml | PASS | 4.2s | — |
| 2 | checkout.yaml | FAIL | 8.1s | Element not found: "Place Order" button |
```

---

## Phase 5: State Persistence

**Goal**: Save results for RECHECK mode, audit trail, and QA evidence archive

### 5a. RECHECK State (always)

1. Create `.ac/maestro-qa/` directory if it doesn't exist.
2. Derive `{testName}` from mode + target (same naming convention as evidence persistence: AD_HOC → app description slug, BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original}`, FLOW_RUN → flow directory slug).
3. Save human-readable report to `.ac/maestro-qa/{testName}.md` — the full report from Phase 4.
4. Save structured data to `.ac/maestro-qa/{testName}.json`:
   ```json
   {
     "timestamp": "ISO8601", "mode": "AD_HOC", "backend": "maestro-mcp",
     "device": {"id": "...", "name": "...", "platform": "ios"},
     "app_id": "com.example.myapp", "verdict": "FAILURES_FOUND",
     "stats": {"pass": 3, "fail": 1, "blocked": 0, "total": 4},
     "results": [
       {"id": "TC-001", "verdict": "PASS", "evidence": {}},
       {"id": "TC-002", "verdict": "FAIL", "evidence": {
         "screenshot": ".ac/qa/login-flow/20260330-143000-login.png",
         "hierarchy": ".ac/qa/login-flow/20260330-143000-login.csv",
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
    {YYYYMMDD}-{HHmmss}-{screenName}.csv        # View hierarchy snapshot
    {YYYYMMDD}-{HHmmss}-{screenName}.json       # Logs and errors
    report.md                                    # Latest report for this test
```

**Naming rules**:
- `{testName}` — slugified from test context: AD_HOC → app description slug (e.g., `login-flow`, `checkout-cart`), BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original-testName}`, FLOW_RUN → flow directory slug
- `{YYYYMMDD}-{HHmmss}` — UTC timestamp of the test run
- `{screenName}` — short slug of the current screen/activity (e.g., `login-screen`, `settings-profile`). Max 40 chars, truncate with trailing hash if longer

**What to save** (per test case with FAIL or key milestone steps):
1. **Screenshots** (`.png`) — agent captures on FAIL. Save raw screenshot data from Maestro MCP.
2. **View hierarchy** (`.csv`) — hierarchy snapshot at failure/checkpoint via `inspect_view_hierarchy`.
3. **Error logs** (`.json`) — `{test_id, timestamp, errors[], device_id, screen_name}`.
4. **Report copy** (`report.md`) — overwrite with the latest Phase 4 report for this test name.

Steps:
1. Derive `{testName}` from mode + target. Create `.ac/qa/{testName}/` directory.
2. For each FAIL: save `.png`, `.csv`, `.json` using the naming convention above.
3. For PASS at key milestones: optionally save `.csv` only (lightweight audit trail).
4. Copy Phase 4 report to `.ac/qa/{testName}/report.md`.
5. Update evidence paths in `.ac/maestro-qa/{testName}.json` to `.ac/qa/` files.

### 5c. Present Report

Output the Phase 4 report directly. If evidence was saved, append:
```
Evidence saved to .ac/qa/{testName}/ — {N} screenshots, {M} hierarchy snapshots, {K} error logs
```

### 5d. Knowledge Persistence

Knowledge merge is handled in Phase 3c after agent execution. For single-agent mode where Phase 3c may have been skipped:

1. Check for remaining temp files: `.ac/qa/knowledge/.mqa-*.jsonl`.
2. If found: read temp files + existing `project.jsonl` → dedup by key → write merged `project.jsonl` → delete temp files.
3. If no temp files exist: Phase 3c already handled the merge — no action needed.

Knowledge persistence is independent of `--no-evidence` flag — knowledge is always saved. `--no-evidence` only skips screenshots, hierarchy snapshots, and error logs.

---

## Error Handling

| Condition | Action |
|-----------|--------|
| Maestro MCP not available | Display setup guide (brew install + .mcp.json config), stop |
| No devices found | Suggest `maestro start-device --platform <ios\|android>`, stop |
| MCP tool call fails | Retry once. If retry fails → mark test case `BLOCKED` with error message |
| App not installed on device | Report error, suggest install steps (e.g., `maestro install <apk/app path>`), stop |
| Element not found after 3 retries | Mark test case `BLOCKED`: "Element not found: [description]. View hierarchy may have changed." |
| Device disconnected mid-test | Mark remaining test cases `BLOCKED`: "Device disconnected." Collect completed results |
| One parallel agent fails or times out | Collect results from successful agents. Mark timed-out group's test cases as BLOCKED with note: "Agent timeout — test case not executed" |
| All parallel agents fail | Fall back to single-agent sequential mode. Announce: "Parallel execution failed — falling back to sequential." Re-run all test cases with single agent |
| `.ac/maestro-qa/{testName}.json` not found (RECHECK) | Inform user: "No previous QA report found for '{testName}'. Run a test first, then use --recheck." Stop |
| FLOW_RUN with invalid YAML | Mark flow as `BLOCKED`: "Invalid flow file: [path]. Check YAML syntax." |
