---
description: "Browser QA testing — ad-hoc tests, bug reproduction, plan verification. Auto-detects MCP backends."
argument-hint: "URL, bug doc path, plan path, or --recheck (e.g., 'localhost:3000/register', '--bug repro.md', '--plan .ac/plans/auth.md', '--recheck')"
---

# Browser QA Test

You are orchestrating browser-based QA testing. Detect available MCP browser backends, classify user intent into one of 4 modes, gather test context, delegate browser execution to the browser-qa agent, and produce a structured QA report.

Load the browser-qa skill for workflow patterns:
`${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/SKILL.md`

Load report format reference:
`${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/report-format.md`

## Core Principles

- **Accessibility snapshots over screenshots** — Token-efficient, deterministic, no vision model needed. Use screenshots only as evidence on FAIL
- **One tool call per action, re-snapshot after** — Observe-act-observe pattern mandatory for all backends
- **Clean state per test case** — Navigate fresh for each test case to avoid state pollution (except RECHECK, which preserves session)
- **Semantic element targeting** — Use `ref` (Playwright), `uid` (DevTools), or semantic role/label — never brittle CSS classes
- **Batch when possible** — Use `browser_run_code` / `execute` for multi-step flows (1 tool call vs N)

---

## Phase 1: Mode Classification + Backend Detection

**Goal**: Determine what the user wants and which MCP backends are available

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

2. If no arguments provided, ask the user: "What would you like to test?" with these options:
   - **Ad-hoc test** — "Give me a URL and instructions — I'll navigate and test"
   - **Bug reproduction** — "Give me a bug document — I'll reproduce each bug"
   - **Plan verification** — "Give me a plan file — I'll verify acceptance criteria"
   - **Re-check previous failures** — "Re-run FAIL and BLOCKED items from the last QA session"

3. Announce: `"Mode: [MODE] — [description]"`

4. Detect available MCP backends by probing for tool patterns:

| Backend | Probe Tool | Detection |
|---------|-----------|-----------|
| Playwright MCP | `mcp__playwright__browser_navigate` | Look for any `mcp__playwright__*` tool |
| Chrome DevTools MCP | `mcp__chrome-devtools__navigate_page` | Look for any `mcp__chrome-devtools__*` tool |
| mcp-chrome | `mcp__chrome__chrome_navigate` | Look for any `mcp__chrome__*` tool |
| playwriter | `mcp__playwriter__execute` | Look for any `mcp__playwriter__*` tool |

Probe in priority order: Playwright MCP first, then Chrome DevTools, mcp-chrome, playwriter.

5. If **NO backends detected** — display setup guide and stop:

```
No browser MCP backends detected. Install at least one:

**Playwright MCP** (recommended — lowest token cost, most tools):
  claude mcp add playwright -- npx @playwright/mcp@latest

**Chrome DevTools MCP** (best for debugging, performance):
  claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --autoConnect

**mcp-chrome** (existing Chrome session via extension):
  npm i -g mcp-chrome-bridge && claude mcp add chrome -- npx mcp-chrome-bridge

**playwriter** (full Playwright API, stateful sessions):
  claude mcp add playwriter -- playwriter mcp

After installing, restart Claude Code and re-run this command.
```

6. Store: `AVAILABLE_BACKENDS` (list), `MODE`, `TARGET` (URL or file path)

---

## Phase 2: Context Gathering

**Goal**: Build the test case list based on mode

### AD_HOC mode

1. If TARGET is a URL → store as `TEST_URL`
2. If TARGET is natural language → extract intent, infer URL from context:
   - Check for running dev servers: `lsof -i -P | grep LISTEN` to find local ports
   - If a port is found (e.g., 3000, 5173, 8080), suggest: "Found dev server on port {port}. Test at localhost:{port}?"
3. Determine task type from user instruction → route to best backend using the routing matrix from mcp-backends.md:
   - Console/network inspection → Chrome DevTools MCP
   - Multi-step stateful flow → playwriter
   - Performance audit → Chrome DevTools MCP
   - Default → Playwright MCP
4. Build test case list: `[{id: "TC-001", description: "<user instruction>", url: TEST_URL, steps: [<extracted steps>], expected: "<expected outcome>"}]`

### BUG_REPRO mode

1. Read the bug document at TARGET path
2. Parse structure — look for numbered bugs, each with:
   - Bug title/ID
   - Preconditions (if any)
   - Reproduction steps (numbered)
   - Expected result
   - Actual result (if documented)
3. Store as `BUG_LIST`:
   ```
   [{id: "BUG-001", title: "...", preconditions: "...", steps: ["Step 1", "Step 2", ...], expected: "...", url: "..."}]
   ```
4. If bug doc lacks structured format → treat entire doc as natural language instructions, extract bugs by paragraph/section breaks
5. Route: Playwright MCP (default — clean state per bug) or playwriter (if steps require state persistence across bugs)

### PLAN_VERIFY mode

1. Read plan file at TARGET path
2. Extract `Done when:` / acceptance criteria blocks
3. For each criterion, generate a test case:
   ```
   {id: "AC-001", criterion_text: "...", action_sequence: ["navigate to...", "click...", "verify..."], expected_outcome: "...", url_hint: "<inferred from criterion>"}
   ```
4. If plan has no `Done when:` blocks → fall back to extracting any bulleted checklist items as test cases
5. Route: Playwright MCP (default — clean state, assertion tools with `--caps=testing`)

### RECHECK mode

1. Read `.browser-qa/last-report.json`
2. If file not found → inform user: "No previous QA session found. Run a test first." Stop.
3. Filter to `FAIL` and `BLOCKED` items only
4. Rebuild test case list from failed items — preserve original IDs
5. Route: same backend as original run (read from `last-report.json` → `backend` field)
6. Announce: "Re-checking {N} failed items from {timestamp}"

---

## Phase 3: Agent Delegation

**Goal**: Delegate browser test execution to the browser-qa agent

Determine the `SELECTED_BACKEND` for this session based on Phase 1 detection and Phase 2 routing decisions. Serialize the `TEST_CASES` list from Phase 2 as a JSON array.

Launch the browser-qa agent to execute all test cases:

Agent(
  subagent_type: "ac:browser-qa",
  prompt: "Execute browser QA tests.

    **Mode**: [MODE]
    **Selected Backend**: [SELECTED_BACKEND from Phase 1]
    **Available Backends**: [AVAILABLE_BACKENDS list]
    **Test Cases**: [TEST_CASES JSON array from Phase 2]

    Load workflow patterns and tool routing:
    ${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/SKILL.md
    ${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/mcp-backends.md

    Execute each test case using the selected backend's MCP tools. Follow the execution loop, self-healing, and token efficiency patterns from the skill.

    Return results as a JSON array:
    [{id, title, verdict, severity, page_url, evidence: {screenshot_taken?, page_html_captured?, console_errors?, network_errors?, failure_detail?}, steps_executed}]

    On FAIL: capture screenshot + page HTML (document.documentElement.outerHTML). On BLOCKED: attempt screenshot if page loaded. Include page_url on every result.",
  model: "sonnet"
)

Store the agent's returned results as `AGENT_RESULTS` — a JSON array of test case outcomes.

---

## Phase 4: Report Generation

**Goal**: Produce a structured QA report from the agent's execution results

Parse `AGENT_RESULTS` to extract verdicts, evidence, and severity for each test case.

Generate the report in this format:

```markdown
# QA Report — [target] — [YYYY-MM-DD]

## Summary
**Mode**: [AD_HOC / BUG_REPRO / PLAN_VERIFY / RECHECK]
**Backend**: [which MCP backend(s) used]
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

**Severity classification**:
- **High**: Functionality broken, user cannot complete flow, data loss, security issue
- **Medium**: Feature works but with unexpected behavior, UI glitch affecting usability
- **Low**: Cosmetic issue, minor inconsistency, non-blocking annoyance

**RECHECK diff section** (RECHECK mode only — append after Recommendations):

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

1. Create `.browser-qa/` directory if it doesn't exist

2. Save human-readable report to `.browser-qa/last-report.md` — the full report from Phase 4

3. Save structured data to `.browser-qa/last-report.json`:
   ```json
   {
     "timestamp": "2026-03-26T14:30:00Z",
     "mode": "AD_HOC",
     "backend": "playwright",
     "target": "http://localhost:3000/register",
     "verdict": "FAILURES_FOUND",
     "stats": {"pass": 3, "fail": 1, "blocked": 0, "total": 4},
     "results": [
       {
         "id": "TC-001",
         "description": "Register form accepts valid input",
         "verdict": "PASS",
         "evidence": {}
       },
       {
         "id": "TC-002",
         "description": "Register form validates email format",
         "verdict": "FAIL",
         "evidence": {
           "screenshot": ".ac/qa/register-validation/20260326-143000-register.png",
           "console": ["TypeError: Cannot read property 'validate' of undefined"],
           "expected": "Validation error shown for invalid email",
           "actual": "Form submitted without validation, JS error in console"
         }
       }
     ]
   }
   ```

4. For RECHECK mode: include a `diff` field in JSON showing which items changed:
   ```json
   {
     "diff": [
       {"id": "TC-002", "previous": "FAIL", "current": "PASS", "change": "fixed"},
       {"id": "TC-005", "previous": "FAIL", "current": "FAIL", "change": "still_failing"}
     ]
   }
   ```

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
1. **Screenshots** (`.png`) — captured by agent on FAIL verdicts. Save the raw screenshot data returned by MCP screenshot tools
2. **HTML snapshots** (`.html`) — page HTML at the moment of failure or key checkpoint. Capture via `document.documentElement.outerHTML` through `browser_run_code` / `evaluate_script` / `execute`
3. **Error logs** (`.json`) — console errors + network failures for that test case:
   ```json
   {
     "test_id": "TC-002",
     "timestamp": "2026-03-26T14:30:12Z",
     "console_errors": ["TypeError: Cannot read property 'validate' of undefined"],
     "network_errors": ["POST /api/register → 422 Unprocessable Entity"],
     "page_url": "http://localhost:3000/register"
   }
   ```
4. **Report copy** (`report.md`) — overwrite with the latest Phase 4 report for this test name

**Actions**:
1. Derive `{testName}` from mode + target
2. Create `.ac/qa/{testName}/` directory
3. For each FAIL test case: save screenshot `.png`, HTML snapshot `.html`, and error log `.json` using the naming convention above
4. For PASS test cases at key milestones (first page load, final state): optionally save HTML snapshot only (lightweight audit trail)
5. Copy the Phase 4 report to `.ac/qa/{testName}/report.md`
6. Update evidence paths in `.browser-qa/last-report.json` to point to `.ac/qa/` files

### 5c. Present Report

Present the full markdown report to the user — output the Phase 4 report directly.

If evidence was saved, append a summary:
```
📁 Evidence saved to .ac/qa/{testName}/ — {N} screenshots, {M} HTML snapshots, {K} error logs
```

---

## Error Handling

| Condition | Action |
|-----------|--------|
| No MCP backends detected | Display setup guide with install commands (Phase 1 step 5), stop |
| MCP tool call fails | Retry once with same parameters. If retry fails → mark test case `BLOCKED` with error message |
| Target URL unreachable | Report `CONNECTION_FAILED` for that test case. Suggest: "Check that your dev server is running. Found these listening ports: [lsof results]" |
| Bug document parse failure | Fall back to treating entire document as natural language instructions — extract test steps from prose |
| Plan file not found | Inform user: "Plan file not found at [path]. Run `/ac:plan` to create one, or check the path." Stop |
| `.browser-qa/last-report.json` not found (RECHECK) | Inform user: "No previous QA session found. Run a test first, then use --recheck." Stop |
| Element not found after 3 self-healing retries | Mark test case `BLOCKED`: "Element not found: [description]. Page structure may have changed." |
| Browser session crash / timeout | Close session, re-navigate, retry test case once. If still fails → `BLOCKED` |
| MCP server not responding | Inform user: "MCP server [name] is not responding. Try restarting it: [restart command]" |
