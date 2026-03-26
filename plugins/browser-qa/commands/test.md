---
description: "Browser QA testing — detect MCP backends, run ad-hoc tests, reproduce bugs, verify plan acceptance criteria, re-check fixes. Supports Playwright MCP, Chrome DevTools MCP, mcp-chrome, and playwriter. Use when: testing UI changes, reproducing bugs, verifying plan completion."
argument-hint: "URL, bug doc path, plan path, or --recheck (e.g., 'localhost:3000/register', '--bug repro.md', '--plan .ac/plans/auth.md', '--recheck')"
---

# Browser QA Test

You are orchestrating browser-based QA testing. Detect available MCP browser backends, classify user intent into one of 4 modes, route to the best backend, execute browser tests, and produce a structured QA report.

Load the browser-qa skill for MCP backend reference and workflow patterns:
`${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/SKILL.md`

Load the MCP backends reference for tool schemas and routing:
`${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/mcp-backends.md`

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

## Phase 3: Test Execution

**Goal**: Execute each test case using the best available backend

### Backend Selection (per test case)

Use the routing matrix from mcp-backends.md. Per-case override:

| Task Signal | Best Backend | Fallback |
|-------------|-------------|----------|
| Console error inspection | Chrome DevTools MCP | mcp-chrome |
| Network debugging | Chrome DevTools MCP | mcp-chrome |
| Standard UI automation | Playwright MCP | playwriter |
| Multi-step stateful flow | playwriter | Playwright MCP (`browser_run_code`) |
| Performance audit | Chrome DevTools MCP | — |
| Default | Playwright MCP | First available |

If the best backend is not in `AVAILABLE_BACKENDS`, fall back. If no fallback available, mark test case `BLOCKED` with reason.

### Execution Loop (per test case)

For each test case in the list:

1. **Navigate** to target URL using selected backend's navigate tool:
   - Playwright MCP: `mcp__playwright__browser_navigate`
   - Chrome DevTools MCP: `mcp__chrome-devtools__navigate_page`
   - mcp-chrome: `mcp__chrome__chrome_navigate`
   - playwriter: `mcp__playwriter__execute` with `page.goto(url)`

2. **Snapshot** — take accessibility snapshot (token-efficient, NOT screenshot):
   - Playwright MCP: `mcp__playwright__browser_snapshot`
   - Chrome DevTools MCP: `mcp__chrome-devtools__take_snapshot`
   - mcp-chrome: `mcp__chrome__chrome_get_interactive_elements`
   - playwriter: `mcp__playwriter__execute` with `snapshot()`

3. **Execute test steps** — for each step in the test case, use the appropriate interaction tools from the selected backend. Refer to mcp-backends.md for complete tool parameter schemas.

   **Playwright MCP** — use `ref` values from snapshot for element targeting:
   - Click: `mcp__playwright__browser_click`
   - Type: `mcp__playwright__browser_type`
   - Fill form: `mcp__playwright__browser_fill_form`
   - Select: `mcp__playwright__browser_select_option`
   - Wait: `mcp__playwright__browser_wait_for`
   - Multi-step batch: `mcp__playwright__browser_run_code`

   **Chrome DevTools MCP** — use `uid` values from snapshot, pass `includeSnapshot: true` to auto-return snapshot after action:
   - Click: `mcp__chrome-devtools__click`
   - Fill: `mcp__chrome-devtools__fill`
   - Type: `mcp__chrome-devtools__type_text`
   - Form: `mcp__chrome-devtools__fill_form`
   - Wait: `mcp__chrome-devtools__wait_for`
   - Script: `mcp__chrome-devtools__evaluate_script`

   **mcp-chrome** — use CSS selectors for element targeting:
   - Click: `mcp__chrome__chrome_click_element`
   - Fill: `mcp__chrome__chrome_fill_or_select`
   - Script: `mcp__chrome__chrome_inject_script`
   - Content: `mcp__chrome__chrome_get_web_content`

   **playwriter** — all interactions via `mcp__playwriter__execute` with inline Playwright code:
   - Use `page` object for interactions (`page.click()`, `page.fill()`, etc.)
   - Use `state` object for cross-step data persistence
   - Always call `snapshot()` after interactions

4. **Re-snapshot** after each action to verify state change

5. **Check for errors**:
   - Console messages: `browser_console_messages` / `list_console_messages` / `chrome_console` / `getLatestLogs()`
   - Network failures: `browser_network_requests` / `list_network_requests` / `chrome_network_capture_*`
   - JS exceptions in console output

6. **Capture evidence** on failure:
   - Screenshot: `browser_take_screenshot` / `take_screenshot` / `chrome_screenshot` / via `execute`
   - Console log excerpt (relevant error lines only)
   - Network error details (status code, URL, response body excerpt)

7. **Determine verdict**:
   - `PASS` — expected state reached, no errors
   - `FAIL` — unexpected state, errors found, or assertion failed
   - `BLOCKED` — setup dependency missing, URL unreachable, or 3 consecutive selector failures

### Self-Healing (on selector/ref failure)

When an element interaction fails (ref not found, selector mismatch):

1. Re-snapshot current DOM — get fresh accessibility tree
2. Find element by semantic role/label (not brittle CSS class):
   - Search by role: `button`, `link`, `textbox`, `heading`
   - Search by accessible name / label text
   - Search by nearby landmark or heading context
3. Retry interaction with updated ref/uid/selector
4. Max 3 retries → `BLOCKED` if all fail, with note: "Element not found after 3 retries: [description]"

### Token Efficiency Rules

- Use `browser_run_code` (Playwright MCP) or `execute` (playwriter) for multi-step flows — 1 tool call instead of N
- Prefer accessibility snapshots over screenshots (text vs image tokens)
- Use `selector` param to scope snapshots to relevant subtree (Playwright MCP: `browser_snapshot` → `{selector: "#main-content"}`)
- Close and re-navigate rather than 20+ interactions in one session — prevents context bloat
- For Chrome DevTools MCP: use `includeSnapshot: true` on input tools to auto-return snapshot after action (reduces round trips)

---

## Phase 4: Report Generation

**Goal**: Produce a structured QA report

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

**Goal**: Save results for RECHECK mode and audit trail

**Actions**:

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
           "screenshot": ".browser-qa/screenshots/tc-002.png",
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

5. Present the report to the user — output the full markdown report

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
