# QA Report Format

Deep-dive reference for Flutter QA report structure, evidence schema, and persistence format.

---

## Verdict Definitions

### Test Case Verdicts

| Verdict | Meaning |
|---------|---------|
| PASS | Expected state reached — widget present, behavior correct, no errors |
| FAIL | Unexpected state or errors — assertion failed, widget missing, app crash, wrong output |
| BLOCKED | Cannot execute — app not running, device/emulator unavailable, session init failed, retries exhausted |

### Summary Verdicts

| Verdict | Condition |
|---------|-----------|
| PASS_ALL | Every test case is PASS |
| FAILURES_FOUND | At least one FAIL (regardless of BLOCKED count) |
| BLOCKED | All non-PASS cases are BLOCKED, zero FAIL |

---

## Severity Scale

| Level | Definition | Examples |
|-------|------------|---------|
| High | App crash on widget rebuild, data loss, auth bypass, navigation dead-end, unhandled exception | setState on disposed widget crashes app, payment data lost on hot restart, auth route bypassed via deep link, Navigator stack exhausted |
| Medium | Layout overflow on specific device, wrong widget state, stale data after navigation, state not reset between tests | RenderFlex overflow on iPhone SE, checkbox shows wrong value, list not rebuilt after pop, leaked provider state from prior test |
| Low | Wrong animation duration, minor spacing drift, inconsistent font on specific platform | Fade transition 200ms instead of 300ms, 4px padding offset, caption font differs on Android vs iOS |

---

## Evidence Schema

Evidence is attached only to FAIL and BLOCKED verdicts. PASS verdicts use `{}`.

**Screenshot**
- Capture on FAIL only (attempt on BLOCKED if app is in foreground)
- Tool: `mcp__flutter_skill__screenshot` MCP tool
- Format: PNG, persisted to `.ac/qa/{testName}/{timestamp}-{screenName}.png`
- Reference by path in the report

**Widget Tree Snapshot**
- Capture on FAIL via `mcp__flutter_skill__snapshot` MCP tool
- Format: JSON (~200 tokens), persisted to `.ac/qa/{testName}/{timestamp}-{screenName}.json`
- Contains widget hierarchy, keys, types, and accessibility properties
- Replaces web's page HTML snapshot and mobile's CSV view hierarchy — Flutter exposes a structured widget tree, not a DOM or accessibility tree

**Error Logs**
- Capture on FAIL or BLOCKED with errors via `mcp__flutter_skill__get_errors` and `mcp__flutter_skill__get_logs` MCP tools
- Format: JSON, persisted to `.ac/qa/{testName}/{timestamp}-{screenName}-logs.json`
- Schema: `{test_id, timestamp, log_entries[], error_entries[], stack_traces[]}`
- Includes runtime exceptions, assertion errors, and stack traces
- Filter out: verbose Flutter framework lifecycle logs, harmless image cache warnings, non-actionable system noise

**Visual Regression Diff** (VISUAL_REGRESSION mode only)
- Captured via `mcp__flutter_skill__visual_baseline_compare` MCP tool
- Format: PNG diff image persisted to `.ac/qa/{testName}/{timestamp}-{screenName}-diff.png`
- Reports pixel match percentage against stored baseline

---

## Report Markdown Template

```markdown
# QA Report — [target] — [YYYY-MM-DD]

## Summary
**Mode**: [AD_HOC / BUG_REPRO / PLAN_VERIFY / RECHECK / TEST_RUN / VISUAL_REGRESSION]
**Backend**: flutter-skill-mcp
**Target**: [widget, screen, or flow description]
**Session**: [session ID from flutter-skill MCP]
**Platform**: ios / android / web / desktop
**Verdict**: PASS_ALL / FAILURES_FOUND / BLOCKED
**Stats**: [N passed] / [N failed] / [N blocked] out of [total]

## Results

| # | Test Case | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [description] | PASS | — |
| 2 | [description] | FAIL | screenshot, widget tree, error logs |
| 3 | [description] | BLOCKED | session unavailable |

## Failed Tests (detail)

### TC-002: [description]
**Expected**: [expected widget state or behavior]
**Actual**: [actual state — widget missing, wrong value, crash]
**Evidence**:
- Screenshot: [inline description or saved path]
- Widget tree: [relevant widget keys, types, or hierarchy excerpt]
- Error logs: [relevant exceptions, stack trace lines]
**Severity**: High / Medium / Low

## Blocked Tests (detail)

### TC-003: [description]
**Reason**: [why blocked — app not running, session init failed, emulator offline, flow prerequisite missing]
**Action Required**: [what the user needs to do]

## Recommendations
[If FAIL: suggest fixes based on evidence — be specific about which widget, state, or provider needs attention]
[If BLOCKED: show setup steps needed to unblock]
[If ALL PASS: confirm all criteria met, suggest next steps]
```

**RECHECK diff section** (append after Recommendations in RECHECK mode only):

```markdown
## Re-check Diff (vs previous run)

| # | Test Case | Previous | Current | Change |
|---|-----------|----------|---------|--------|
| 2 | [description] | FAIL | PASS | Fixed |
| 3 | [description] | BLOCKED | FAIL | Unblocked, now failing |
| 5 | [description] | FAIL | FAIL | Still failing |
```

---

## JSON Schema ({testName}.json)

Saved to `.ac/flutter-qa/{testName}.json` after every run, where `{testName}` is derived from mode + target (e.g., `login-flow`, `checkout-plan`, `counter-widget`). Used by RECHECK mode to diff against prior results. Evidence paths point to `.ac/qa/` directory.

```json
{
  "timestamp": "2026-03-26T14:30:00Z",
  "mode": "AD_HOC",
  "backend": "flutter-skill-mcp",
  "target": "checkout flow — iOS simulator",
  "session": {
    "id": "fqa-20260326-143000",
    "project_path": "/Users/dev/myapp",
    "platform": "ios"
  },
  "verdict": "FAILURES_FOUND",
  "stats": {"pass": 3, "fail": 1, "blocked": 0, "total": 4},
  "knowledge": [
    {"type": "selector", "key": "checkout-submit-btn", "value": "Key('checkout-confirm') — label=Confirm Order", "confidence": "high", "source": "TC-001"},
    {"type": "flow", "key": "checkout-success-nav", "value": "Successful checkout navigates to OrderConfirmation route after ~1200ms", "confidence": "high", "source": "TC-001"},
    {"type": "gotcha", "key": "keyboard-obscures-submit", "value": "Soft keyboard covers Submit button — scroll down or dismiss keyboard before widget assertion", "confidence": "medium", "source": "TC-002"},
    {"type": "timing", "key": "cart-badge-update", "value": "Cart badge count updates after ~500ms setState cycle — assert after pump(Duration(milliseconds: 600))", "confidence": "medium", "source": "TC-002"},
    {"type": "widget_tree", "key": "checkout-form-structure", "value": "CheckoutScreen uses Column > SingleChildScrollView > Form with keys: name-field, card-field, expiry-field, submit-btn", "confidence": "high", "source": "TC-001"},
    {"type": "state", "key": "cart-provider-reset", "value": "CartProvider.clear() must be called in tearDown — state leaks between tests if not disposed", "confidence": "high", "source": "TC-003"}
  ],
  "results": [
    {
      "id": "TC-001",
      "description": "Checkout accepts valid payment and navigates to confirmation",
      "verdict": "PASS",
      "evidence": {},
      "learned_facts": [
        {"type": "selector", "key": "checkout-submit-btn", "value": "Key('checkout-confirm') — label=Confirm Order", "confidence": "high"},
        {"type": "flow", "key": "checkout-success-nav", "value": "Successful checkout navigates to OrderConfirmation route after ~1200ms", "confidence": "high"}
      ]
    },
    {
      "id": "TC-002",
      "description": "Checkout validates card expiry format",
      "verdict": "FAIL",
      "evidence": {
        "screenshot_taken": true,
        "widget_tree_snapshot": true,
        "error_logs": ["FlutterError: CardExpiryValidator assertion failed — input='13/26' not a valid MM/YY", "at CardValidator._validateExpiry (card_validator.dart:42)"],
        "failure_detail": "Validation error widget not rendered for invalid expiry — form submitted without showing error text"
      },
      "learned_facts": [
        {"type": "gotcha", "key": "keyboard-obscures-submit", "value": "Soft keyboard covers Submit button — scroll down or dismiss keyboard before widget assertion", "confidence": "medium"},
        {"type": "timing", "key": "cart-badge-update", "value": "Cart badge count updates after ~500ms setState cycle — assert after pump(Duration(milliseconds: 600))", "confidence": "medium"}
      ]
    }
  ],
  "diff": [
    {"id": "TC-002", "previous": "FAIL", "current": "PASS", "change": "fixed"},
    {"id": "TC-005", "previous": "FAIL", "current": "FAIL", "change": "still_failing"}
  ]
}
```

`diff` field is present only in RECHECK mode runs. Omit entirely for all other modes.
`learned_facts` is omitted from result entries when empty.

### TEST_RUN Result Schema

When mode is TEST_RUN, each result entry contains a `test_result` block instead of `evidence`:

```json
{
  "id": "TC-001",
  "description": "Run auth integration test suite",
  "verdict": "PASS",
  "test_result": {
    "test_file": "integration_test/auth_test.dart",
    "exit_code": 0,
    "test_count": 8,
    "pass_count": 8,
    "fail_count": 0,
    "errors": []
  }
}
```

Failed TEST_RUN entry:

```json
{
  "id": "TC-002",
  "description": "Run checkout integration test suite",
  "verdict": "FAIL",
  "test_result": {
    "test_file": "integration_test/checkout_test.dart",
    "exit_code": 1,
    "test_count": 6,
    "pass_count": 4,
    "fail_count": 2,
    "errors": [
      "Expected widget with key 'confirm-btn' to be visible, found nothing",
      "Timeout waiting for navigation to OrderConfirmation after 5000ms"
    ]
  }
}
```

### VISUAL_REGRESSION Result Schema

When mode is VISUAL_REGRESSION, each result entry contains a `visual_result` block:

```json
{
  "id": "TC-001",
  "description": "HomeScreen matches baseline on iOS 17",
  "verdict": "PASS",
  "visual_result": {
    "baseline_path": ".ac/qa/home-screen/baseline-ios-20260101.png",
    "diff_path": null,
    "match_percentage": 99.8,
    "threshold": 98.0
  }
}
```

Failed VISUAL_REGRESSION entry (match_percentage below threshold):

```json
{
  "id": "TC-002",
  "description": "CheckoutScreen matches baseline on iOS 17",
  "verdict": "FAIL",
  "visual_result": {
    "baseline_path": ".ac/qa/checkout-screen/baseline-ios-20260101.png",
    "diff_path": ".ac/qa/checkout-screen/20260326-143000-diff.png",
    "match_percentage": 94.2,
    "threshold": 98.0,
    "diff_regions": ["bottom-right corner — CTA button position shifted 8px down"]
  }
}
```

---

## Evidence Persistence (`.ac/qa/`)

QA evidence is persisted by default to `.ac/qa/` for audit trail, debugging, and historical comparison. Disable with `--no-evidence` flag.

### Directory Structure

```
.ac/qa/
  {testName}/
    {YYYYMMDD}-{HHmmss}-{screenName}.png           # Screenshot on FAIL
    {YYYYMMDD}-{HHmmss}-{screenName}.json          # Widget tree snapshot on FAIL
    {YYYYMMDD}-{HHmmss}-{screenName}-logs.json     # Error logs on FAIL or BLOCKED
    {YYYYMMDD}-{HHmmss}-{screenName}-diff.png      # Visual diff (VISUAL_REGRESSION only)
    report.md                                       # Latest report for this test
```

### Naming Convention

| Token | Source | Example |
|-------|--------|---------|
| `{testName}` | AD_HOC → widget/screen slug, BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original}`, VISUAL_REGRESSION → screen slug | `checkout-flow`, `auth-plan`, `recheck-login`, `home-screen` |
| `{YYYYMMDD}-{HHmmss}` | UTC timestamp of test run | `20260326-143000` |
| `{screenName}` | Current route name or widget key, max 40 chars | `checkout-summary`, `order-confirmation` |

### What Gets Saved

| Artifact | When | Format |
|----------|------|--------|
| Screenshot | FAIL verdict (attempt on BLOCKED if app is in foreground) | PNG |
| Widget tree snapshot | FAIL verdict | JSON |
| Error logs | FAIL or BLOCKED with errors | JSON |
| Visual diff | FAIL verdict in VISUAL_REGRESSION mode | PNG |
| Report copy | Every run | Markdown |

### Knowledge Persistence (`.ac/qa/knowledge/`)

```
.ac/qa/knowledge/
  project.jsonl                  # Project-wide knowledge base (merged, deduped) — shared with browser-qa and maestro-qa
  .fqa-{SESSION_NAME}.jsonl      # Agent temp files (deleted after merge)
```

Agents write discoveries to temp files (`.fqa-{SESSION_NAME}.jsonl`) via Bash during execution. The parent command merges all temp files into `project.jsonl` after agents complete — deduplicated by `key`, latest wins. Temp files are deleted after merge. Knowledge is project-scoped: all test runs share one knowledge base, so a widget key learned during ad-hoc testing benefits all future runs. Flutter QA shares `project.jsonl` with browser-qa and maestro-qa — cross-platform knowledge coexists in the same file. Each line is a self-contained JSON object:

```json
{"type": "widget_tree", "key": "checkout-form-structure", "value": "CheckoutScreen uses Column > Form with keys: name-field, card-field, expiry-field, submit-btn", "confidence": "high", "source": "TC-001"}
```

| Field | Type | Values |
|-------|------|--------|
| `type` | string | `selector`, `flow`, `timing`, `gotcha`, `permission`, `navigation`, `widget_tree`, `state` |
| `key` | string | Short stable identifier, kebab-case |
| `value` | string | Human-readable discovery — be specific |
| `confidence` | string | `high`, `medium` |
| `source` | string | Test case ID that discovered the fact (`TC-001`) |

**Flutter-specific knowledge types:**

| Type | Purpose | Example value |
|------|---------|---------------|
| `widget_tree` | Widget hierarchy and key structure for a screen or component | `"HomeScreen root: Scaffold > CustomScrollView > SliverList — use Key('item-{id}') for list items"` |
| `state` | Provider / Bloc / Riverpod state lifecycle gotchas | `"CartProvider.clear() must be called in tearDown — state leaks between tests if not disposed"` |

The accumulated `project.jsonl` file serves as a cross-run knowledge base. All test runs load this file and inject the facts into agent context to avoid re-learning known behaviors.

Knowledge persistence is independent of `--no-evidence` — knowledge is always saved. The `--no-evidence` flag only skips screenshots, widget tree snapshots, error logs, and visual diffs.

---

## Defect Taxonomy

| Category | Description | Examples |
|----------|-------------|---------|
| Functional | Logic error, broken user flow, dead-end navigation, wrong output | Button does nothing, form skips validation, Navigator stack exhausted with no exit, wrong computed total |
| Visual | Layout overflow, spacing drift, responsive breakpoint failure | RenderFlex overflow on iPhone SE, card overlaps on large font, grid broken on Android tablet, misaligned on landscape |
| Performance | Slow frame build, jank, memory leak, excessive rebuilds | Scroll drops below 60fps, widget rebuild loop on every setState, memory grows unbounded during image scroll |
| Accessibility | Missing semantics, screen reader issues, insufficient contrast | Interactive widget has no Semantics label, TalkBack skips control, text contrast below WCAG 4.5:1, touch target < 48px |
| Crash | Unhandled exception on widget rebuild, setState on disposed widget, stack overflow | Fatal FlutterError on hot reload, setState called after dispose(), widget build throws RangeError |
| Network | Failed API call, timeout, offline handling, deserialisation error | 404 on REST call, Dio timeout after 10s, no offline fallback screen shown, JSON parse fails on nullable field |
| State Management | Leaked provider state, Bloc not closed, Riverpod ref disposed prematurely | Previous test state bleeds into next, StreamController not closed causes memory leak, provider throws after widget disposal |
