---
description: "Browser QA testing — ad-hoc tests, bug reproduction, plan verification. Uses Playwright CLI."
effort: medium
argument-hint: "URL, bug doc path, plan path, or --recheck (e.g., 'localhost:3000/register', '--bug repro.md', '--plan .ac/plans/auth.md', '--recheck')"
---

# Browser QA Test

You are orchestrating browser-based QA testing. Detect Playwright CLI availability, classify user intent into one of 4 modes, gather test context, delegate browser execution to the browser-qa agent, and produce a structured QA report.

Load the browser-qa skill for workflow patterns:
`${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/SKILL.md`

Load report format reference:
`${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/report-format.md`

## Core Principles

- **Accessibility snapshots over screenshots** — Token-efficient, deterministic, no vision model needed. Use screenshots only as evidence on FAIL
- **One command per action, re-snapshot after** — Observe-act-observe pattern mandatory
- **Clean state per test case** — Navigate fresh for each test case to avoid state pollution (except RECHECK, which preserves session)
- **Snapshots on disk** — CLI saves YAML snapshots to `.playwright-cli/`, read only when needed for element refs
- **Batch when possible** — Use `playwright-cli run-code` for multi-step flows (1 Bash call vs N)

---

## Phase 1: Mode Classification + CLI Detection

**Goal**: Determine what the user wants and verify Playwright CLI is available

**Actions**:

1. Parse `$ARGUMENTS` for mode flags:

| Condition | Mode | Description |
|-----------|------|-------------|
| Contains `--bug <path>` or file path with bug/repro keywords | `BUG_REPRO` | Parse bug document, execute reproduction steps |
| Contains `--plan <path>` or `.ac/plans/` path | `PLAN_VERIFY` | Extract acceptance criteria, generate test cases |
| Contains `--recheck` | `RECHECK` | Re-run failed test cases from previous session |
| URL or natural language instruction | `AD_HOC` | Navigate, interact, verify — freeform testing |
| No arguments | — | Ask user with mode options (below) |

Global flags (combinable with any mode):

| Flag | Effect |
|------|--------|
| `--no-evidence` | Skip saving evidence artifacts to `.ac/qa/`. Report still generated, just no file persistence |
| `--headed` | Launch browser in headed (visible) mode. Default: headless |
| `--no-parallel` | Force sequential single-agent execution even for >3 test cases. Default: parallel |

2. If no arguments provided, ask the user: "What would you like to test?" with these options:
   - **Ad-hoc test** — "Give me a URL and instructions — I'll navigate and test"
   - **Bug reproduction** — "Give me a bug document — I'll reproduce each bug"
   - **Plan verification** — "Give me a plan file — I'll verify acceptance criteria"
   - **Re-check previous failures** — "Re-run FAIL and BLOCKED items from the last QA session"

3. Announce: `"Mode: [MODE] — [description]"`

4. Detect Playwright CLI availability:
   Run `playwright-cli --version` to check if CLI is installed.
   - If found → announce: "Playwright CLI [version] detected."
   - If not found → display setup guide and stop:
     ```
     Playwright CLI not found. Install it (https://github.com/microsoft/playwright-cli):
       npm install -g @playwright/cli@latest
     After installing, re-run this command.
     ```

5. Store: `MODE`, `TARGET` (URL or file path), `HEADED_MODE` (boolean, default false), `PARALLEL_ENABLED` (boolean, default true)

---

## Phase 2: Context Gathering

**Goal**: Build the test case list based on mode

### AD_HOC mode

1. If TARGET is a URL → store as `TEST_URL`.
2. If TARGET is natural language → extract intent, infer URL from context:
   - Check for running dev servers: `lsof -i -P | grep LISTEN` to find local ports
   - If a port is found (e.g., 3000, 5173, 8080), suggest: "Found dev server on port {port}. Test at localhost:{port}?"
3. All tasks use Playwright CLI. For multi-step stateful flows, use named sessions (`-s=<name>`).
4. Build test case list: `[{id: "TC-001", description: "<user instruction>", url: TEST_URL, steps: [<extracted steps>], expected: "<expected outcome>"}]`

### BUG_REPRO mode

1. Read the bug document at TARGET path.
2. Parse numbered bugs — extract: title/ID, preconditions, reproduction steps, expected result, actual result.
3. Store as `BUG_LIST`: `[{id: "BUG-001", title, preconditions, steps[], expected, url}]`
4. No structured format → treat entire doc as natural language, extract by paragraph/section.
5. Use fresh `playwright-cli open`/`close` per bug for isolation. For cross-bug state, use named sessions.

### PLAN_VERIFY mode

1. Read plan file at TARGET path.
2. Extract `Done when:` / acceptance criteria blocks.
3. For each criterion: `{id: "AC-001", criterion_text, action_sequence[], expected_outcome, url_hint}`
4. No `Done when:` blocks → extract bulleted checklist items as test cases.
5. Verify via `playwright-cli snapshot` + `playwright-cli eval` for assertions.

### RECHECK mode

1. Derive `{testName}` from the original target (same naming convention as evidence persistence). Read `.ac/browser-qa/{testName}.json`. If `$ARGUMENTS` includes a specific report name, use that instead.
2. If file not found → inform user: "No previous QA report found for '{testName}'. Run a test first." Stop.
3. Filter to `FAIL` and `BLOCKED` items only.
4. Rebuild test case list from failed items — preserve original IDs.
5. Always uses Playwright CLI.
6. Announce: "Re-checking {N} failed items from {timestamp}"

### Cross-run Knowledge Injection (all modes)

Agents read `.ac/qa/knowledge/project.jsonl` directly at execution start. The parent command also loads it as a supplementary prompt injection:

1. Check for existing `.ac/qa/knowledge/project.jsonl`.
   - If found: read file, parse each JSONL line as JSON, store as `EXISTING_KNOWLEDGE`. Announce: "Loaded {N} knowledge facts from previous runs."
   - If not found: set `EXISTING_KNOWLEDGE` to empty array `[]`.
2. Create knowledge directory: `mkdir -p .ac/qa/knowledge/` (ensures agents can write temp files during execution).

---

## Phase 3: Agent Delegation

**Goal**: Delegate browser test execution to browser-qa agents with parallel orchestration and two-wave knowledge sharing

Serialize the `TEST_CASES` list from Phase 2 as a JSON array.

### 3a. Grouping Logic

Determine execution strategy:
- If test case count is **<= 3** OR `PARALLEL_ENABLED` is false (`--no-parallel`) → **single agent mode**
- If test case count is **> 3** AND `PARALLEL_ENABLED` is true → **parallel mode**: chunk into groups of ~3, max 4 agents: `N = min(ceil(count/3), 4)`. Each group gets a unique `SESSION_NAME` (`bqa-1`, `bqa-2`, ...), `DISPLAY_MODE` derived from `HEADED_MODE` ("headed" if true, "headless" if false), and its subset of `TEST_CASES`.

### 3b. Wave 1 — Test Execution

**Single agent mode** (<=3 test cases or --no-parallel):

```
Agent(
  subagent_type: "ac:browser-qa",
  prompt: "Execute browser QA tests.
    **Mode**: [MODE]
    **Session Name**: bqa-0
    **Display Mode**: [headless|headed]
    **Test Cases**: [TEST_CASES JSON]
    **Prior Knowledge**: [EXISTING_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/SKILL.md
    Return results + learned_facts as JSON array.",
)
```

Agents also read `.ac/qa/knowledge/project.jsonl` directly at start. PRIOR_KNOWLEDGE is supplementary — agents merge both sources, file takes priority for same-key conflicts.

**Parallel mode** (>3 test cases):

Launch N browser-qa agents in a single message block (foreground):

```
Agent(
  subagent_type: "ac:browser-qa",
  prompt: "Execute browser QA tests.
    **Mode**: [MODE]
    **Session Name**: bqa-1
    **Display Mode**: [headless|headed]
    **Test Cases**: [GROUP_1 JSON]
    **Prior Knowledge**: [EXISTING_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/SKILL.md
    Return results + learned_facts as JSON array.",
)
// Repeat for bqa-2, bqa-3, bqa-4 with their respective GROUP_N test case subsets
```

Agents also read `.ac/qa/knowledge/project.jsonl` directly at start. PRIOR_KNOWLEDGE is supplementary — agents merge both sources, file takes priority for same-key conflicts.

Note: `EXISTING_KNOWLEDGE` is loaded from `.ac/qa/knowledge/` in Phase 2. Do NOT hardcode `[]` — use the loaded value.

### 3c. Knowledge Merge

After all Wave 1 agents complete:

1. Read all agent temp files: `.ac/qa/knowledge/.bqa-*.jsonl` (glob pattern). Each file contains JSONL facts written by one agent during execution.
2. Read existing `.ac/qa/knowledge/project.jsonl` if present — parse as JSONL.
3. Merge all sources: temp files + existing project.jsonl. Deduplicate by `key` — latest occurrence wins (temp file facts override existing).
4. Write merged result back to `.ac/qa/knowledge/project.jsonl` (overwrite — deduped merge is the new source of truth).
5. Delete temp files: remove all `.ac/qa/knowledge/.bqa-*.jsonl` after successful merge.
6. Store merged knowledge as `AGGREGATED_KNOWLEDGE` for Wave 2 prompt injection (if triggered).

### 3d. Wave 2 — Knowledge-enriched Re-check (conditional)

**Trigger condition**: Wave 1 has FAIL or BLOCKED results AND `AGGREGATED_KNOWLEDGE` is non-empty.

If triggered:
- Re-run only FAIL/BLOCKED test cases with `PRIOR_KNOWLEDGE` set to `AGGREGATED_KNOWLEDGE`.
- Single agent, session name `bqa-rewave`, same `DISPLAY_MODE`.

```
Agent(
  subagent_type: "ac:browser-qa",
  prompt: "Execute browser QA tests — knowledge-enriched re-check.
    **Mode**: [MODE]
    **Session Name**: bqa-rewave
    **Display Mode**: [headless|headed]
    **Test Cases**: [FAIL/BLOCKED test cases from Wave 1 JSON]
    **Prior Knowledge**: [AGGREGATED_KNOWLEDGE]
    Load: ${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/SKILL.md
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
**Mode**: [AD_HOC / BUG_REPRO / PLAN_VERIFY / RECHECK]
**Backend**: playwright-cli
**Target**: [URL or file path]
**Verdict**: PASS_ALL / FAILURES_FOUND / BLOCKED
**Stats**: [N passed] / [N failed] / [N blocked] out of [total]

## Results

| # | Test Case | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [description] | PASS | — |
| 2 | [description] | FAIL | screenshot, console |
| 3 | [description] | BLOCKED | setup required |

## Failed Tests (detail)

### TC-002: [description]
**Expected**: [expected state]
**Actual**: [actual state]
**Evidence**:
- Screenshot: [inline description or saved path]
- Console errors: [relevant lines]
- Network failures: [if any]
**Severity**: High / Medium / Low

## Blocked Tests (detail)

### TC-003: [description]
**Reason**: [why blocked — missing dependency, element not found, URL unreachable]
**Action Required**: [what the user needs to do]

## Recommendations
[If FAIL: suggest fixes based on evidence — be specific about what code/element needs attention]
[If BLOCKED: show setup steps needed to unblock]
[If ALL PASS: confirm all criteria met, suggest next steps]
```

Severity classification:
- **High**: Functionality broken, user cannot complete flow, data loss, security issue
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

---

## Phase 5: State Persistence

**Goal**: Save results for RECHECK mode, audit trail, and QA evidence archive

### 5a. RECHECK State (always)

1. Create `.ac/browser-qa/` directory if it doesn't exist.
2. Derive `{testName}` from mode + target (same naming convention as evidence persistence: AD_HOC → URL path slug, BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original}`).
3. Save human-readable report to `.ac/browser-qa/{testName}.md` — the full report from Phase 4.
4. Save structured data to `.ac/browser-qa/{testName}.json`:
   ```json
   {
     "timestamp": "ISO8601", "mode": "AD_HOC", "backend": "playwright-cli",
     "target": "http://localhost:3000/register", "verdict": "FAILURES_FOUND",
     "stats": {"pass": 3, "fail": 1, "blocked": 0, "total": 4},
     "results": [
       {"id": "TC-001", "verdict": "PASS", "evidence": {}},
       {"id": "TC-002", "verdict": "FAIL", "evidence": {
         "screenshot": ".ac/qa/register-validation/20260326-143000-register.png",
         "console": ["TypeError: Cannot read property 'validate' of undefined"],
         "expected": "...", "actual": "..."
       }}
     ]
   }
   ```
4. RECHECK mode: include a `diff` field — `[{"id": "TC-002", "previous": "FAIL", "current": "PASS", "change": "fixed"}, ...]`

### 5b. Evidence Archive (default ON, skip with `--no-evidence`)

Persist key test artifacts to `.ac/qa/` for audit trail, debugging, and historical comparison. Similar to `.ac/plans/` and `.ac/tasks/` — project-local, not gitignored by default.

**Directory structure**:
```
.ac/qa/
  {testName}/
    {YYYYMMDD}-{HHmmss}-{pagePath}.png        # Screenshot evidence
    {YYYYMMDD}-{HHmmss}-{pagePath}.html        # Page HTML snapshot
    {YYYYMMDD}-{HHmmss}-{pagePath}.json        # Console + network errors
    report.md                                   # Latest report for this test
```

**Naming rules**:
- `{testName}` — slugified from test context: AD_HOC → URL path slug (e.g., `register`, `dashboard-settings`), BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original-testName}`
- `{YYYYMMDD}-{HHmmss}` — UTC timestamp of the test run
- `{pagePath}` — short slug of the page URL path (e.g., `/app/settings/profile` → `settings-profile`). Max 40 chars, truncate with trailing hash if longer

**What to save** (per test case with FAIL or key milestone steps):
1. **Screenshots** (`.png`) — agent captures on FAIL. Save raw screenshot data from playwright-cli.
2. **HTML snapshots** (`.html`) — page HTML at failure/checkpoint via `playwright-cli eval "document.documentElement.outerHTML"`.
3. **Error logs** (`.json`) — `{test_id, timestamp, console_errors[], network_errors[], page_url}`.
4. **Report copy** (`report.md`) — overwrite with the latest Phase 4 report for this test name.

1. Derive `{testName}` from mode + target. Create `.ac/qa/{testName}/` directory.
2. For each FAIL: save `.png`, `.html`, `.json` using the naming convention above.
3. For PASS at key milestones: optionally save `.html` only (lightweight audit trail).
4. Copy Phase 4 report to `.ac/qa/{testName}/report.md`.
5. Update evidence paths in `.ac/browser-qa/{testName}.json` to `.ac/qa/` files.

### 5d. Knowledge Persistence

Knowledge merge is handled in Phase 3c after agent execution. For single-agent mode where Phase 3c may have been skipped:

1. Check for remaining temp files: `.ac/qa/knowledge/.bqa-*.jsonl`.
2. If found: read temp files + existing `project.jsonl` → dedup by key → write merged `project.jsonl` → delete temp files.
3. If no temp files exist: Phase 3c already handled the merge — no action needed.

Knowledge persistence is independent of `--no-evidence` flag — knowledge is always saved. `--no-evidence` only skips screenshots, HTML snapshots, and error logs.

### 5c. Present Report

Output the Phase 4 report directly. If evidence was saved, append:
```
Evidence saved to .ac/qa/{testName}/ — {N} screenshots, {M} HTML snapshots, {K} error logs
```

---

## Error Handling

| Condition | Action |
|-----------|--------|
| Playwright CLI not found | Display setup guide: `npm install -g @playwright/cli@latest` ([docs](https://github.com/microsoft/playwright-cli)), stop |
| CLI command fails (non-zero exit) | Retry once. If retry fails → mark test case `BLOCKED` with error message |
| Target URL unreachable | Report `CONNECTION_FAILED` for that test case. Suggest: "Check that your dev server is running. Found these listening ports: [lsof results]" |
| Bug document parse failure | Fall back to treating entire document as natural language instructions — extract test steps from prose |
| Plan file not found | Inform user: "Plan file not found at [path]. Run `/ac:plan` to create one, or check the path." Stop |
| `.ac/browser-qa/{testName}.json` not found (RECHECK) | Inform user: "No previous QA report found for '{testName}'. Run a test first, then use --recheck." Stop |
| Element not found after 3 self-healing retries | Mark test case `BLOCKED`: "Element not found: [description]. Page structure may have changed." |
| Browser session crash / timeout | Close session, re-navigate, retry test case once. If still fails → `BLOCKED` |
| One parallel agent fails or times out | Collect results from successful agents. Mark timed-out group's test cases as BLOCKED with note: "Agent timeout — test case not executed" |
| All parallel agents fail | Fall back to single-agent sequential mode. Announce: "Parallel execution failed — falling back to sequential." Re-run all test cases with single agent |
