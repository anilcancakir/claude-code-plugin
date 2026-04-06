# QA Report Format

Deep-dive reference for Maestro QA report structure, evidence schema, and persistence format.

## Contents

- [Verdict Definitions](#verdict-definitions)
- [Severity Scale](#severity-scale)
- [Evidence Schema](#evidence-schema)
- [Report Markdown Template](#report-markdown-template)
- [JSON Schema](#json-schema-testnamejson)
- [Evidence Persistence](#evidence-persistence-acqa)
- [Defect Taxonomy](#defect-taxonomy)

---

## Verdict Definitions

### Test Case Verdicts

| Verdict | Meaning |
|---------|---------|
| PASS | Expected state reached — element present, behavior correct, no errors |
| FAIL | Unexpected state or errors — assertion failed, app crash, wrong output |
| BLOCKED | Cannot execute — app not installed, device unavailable, retries exhausted |

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
| High | App crash on gesture, data loss, auth bypass, navigation dead-end | Tap crashes app, payment data lost on background, auth bypassed via deep link, back stack exhausted |
| Medium | Layout breaks on rotation, wrong element state, stale data after navigation | UI misaligns in landscape, toggle shows wrong state, list not refreshed after return |
| Low | Animation jank, minor alignment, inconsistent font on specific device | Transition stutter on low-end device, 4px spacing drift, caption font differs on tablet |

---

## Evidence Schema

Evidence is attached only to FAIL and BLOCKED verdicts. PASS verdicts use `{}`.

**Screenshot**
- Capture on FAIL only (attempt on BLOCKED if app is in foreground)
- Tool: `take_screenshot` MCP tool
- Format: PNG, persisted to `.ac/qa/{testName}/{timestamp}-{screenName}.png`
- Reference by path in the report

**View Hierarchy**
- Capture on FAIL via `inspect_view_hierarchy` MCP tool
- Format: CSV, persisted to `.ac/qa/{testName}/{timestamp}-{screenName}.csv`
- Useful for identifying element accessibility IDs and tree structure without re-running tests
- Replaces web's page HTML snapshot — mobile apps do not have a DOM

**App Logs**
- Capture device or in-app logs on FAIL via `run_flow` with `evalScript` commands or native device log capture
- Format: JSON, persisted to `.ac/qa/{testName}/{timestamp}-{screenName}.json`
- Schema: `{test_id, timestamp, log_entries[], failure_detail}`
- Filter out: verbose lifecycle events, harmless library warnings, non-actionable system noise

**Video Recording**
- Optional — captured via `startRecording` / `stopRecording` YAML flow commands inside `run_flow`
- These are Maestro YAML commands, NOT MCP tools
- Example YAML snippet passed to `run_flow`:
  ```yaml
  - startRecording:
      path: recording.mp4
  - tapOn: "Submit"
  - stopRecording
  ```
- Useful for reproducing timing-sensitive interactions and animation defects

---

## Report Markdown Template

```markdown
# QA Report — [target] — [YYYY-MM-DD]

## Summary
**Mode**: [AD_HOC / BUG_REPRO / PLAN_VERIFY / RECHECK / FLOW_RUN]
**Backend**: maestro-mcp
**Target**: [app description or flow path]
**Device**: [device name] ([platform])
**Platform**: ios / android
**Verdict**: PASS_ALL / FAILURES_FOUND / BLOCKED
**Stats**: [N passed] / [N failed] / [N blocked] out of [total]

## Results

| # | Test Case | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [description] | PASS | — |
| 2 | [description] | FAIL | screenshot, hierarchy |
| 3 | [description] | BLOCKED | device unavailable |

## Failed Tests (detail)

### TC-002: [description]
**Expected**: [expected state]
**Actual**: [actual state]
**Evidence**:
- Screenshot: [inline description or saved path]
- View hierarchy: [relevant accessibility IDs or tree excerpt]
- App logs: [relevant lines]
**Severity**: High / Medium / Low

## Blocked Tests (detail)

### TC-003: [description]
**Reason**: [why blocked — app not installed, device offline, flow prerequisite missing]
**Action Required**: [what the user needs to do]

## Recommendations
[If FAIL: suggest fixes based on evidence — be specific about what flow/element/state needs attention]
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

Saved to `.ac/maestro-qa/{testName}.json` after every run, where `{testName}` is derived from mode + target (e.g., `login-flow`, `checkout-plan`, `onboarding`). Used by RECHECK mode to diff against prior results. Evidence paths point to `.ac/qa/` directory.

```json
{
  "timestamp": "2026-03-26T14:30:00Z",
  "mode": "AD_HOC",
  "backend": "maestro-mcp",
  "target": "checkout flow — iOS simulator",
  "device": {"id": "booted", "platform": "ios", "name": "iPhone 16 Pro"},
  "verdict": "FAILURES_FOUND",
  "stats": {"pass": 3, "fail": 1, "blocked": 0, "total": 4},
  "knowledge": [
    {"type": "selector", "key": "checkout-submit-btn", "value": "accessibilityId: checkout-confirm — label=Confirm Order", "confidence": "high", "source": "TC-001"},
    {"type": "flow", "key": "checkout-success-nav", "value": "Successful checkout navigates to OrderConfirmation screen after ~1200ms", "confidence": "high", "source": "TC-001"},
    {"type": "gotcha", "key": "keyboard-obscures-submit", "value": "Soft keyboard covers Submit button — scroll down before tap assertion", "confidence": "medium", "source": "TC-002"},
    {"type": "timing", "key": "cart-refresh-delay", "value": "Cart badge updates after ~500ms network round-trip — assert after waitForAnimationToEnd", "confidence": "medium", "source": "TC-002"}
  ],
  "results": [
    {
      "id": "TC-001",
      "description": "Checkout accepts valid payment and navigates to confirmation",
      "verdict": "PASS",
      "evidence": {},
      "learned_facts": [
        {"type": "selector", "key": "checkout-submit-btn", "value": "accessibilityId: checkout-confirm — label=Confirm Order", "confidence": "high"},
        {"type": "flow", "key": "checkout-success-nav", "value": "Successful checkout navigates to OrderConfirmation screen after ~1200ms", "confidence": "high"}
      ]
    },
    {
      "id": "TC-002",
      "description": "Checkout validates card expiry format",
      "verdict": "FAIL",
      "evidence": {
        "screenshot_taken": true,
        "hierarchy_captured": true,
        "app_logs": ["WARN CardValidator: expiry parse failed — input=13/26"],
        "failure_detail": "Validation error not shown for invalid expiry — form submitted without error message"
      },
      "learned_facts": [
        {"type": "gotcha", "key": "keyboard-obscures-submit", "value": "Soft keyboard covers Submit button — scroll down before tap assertion", "confidence": "medium"},
        {"type": "timing", "key": "cart-refresh-delay", "value": "Cart badge updates after ~500ms network round-trip — assert after waitForAnimationToEnd", "confidence": "medium"}
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

---

## Evidence Persistence (`.ac/qa/`)

QA evidence is persisted by default to `.ac/qa/` for audit trail, debugging, and historical comparison. Disable with `--no-evidence` flag.

### Directory Structure

```
.ac/qa/
  {testName}/
    {YYYYMMDD}-{HHmmss}-{screenName}.png        # Screenshot on FAIL
    {YYYYMMDD}-{HHmmss}-{screenName}.csv        # View hierarchy on FAIL
    {YYYYMMDD}-{HHmmss}-{screenName}.json       # App logs on FAIL
    report.md                                    # Latest report for this test
```

### Naming Convention

| Token | Source | Example |
|-------|--------|---------|
| `{testName}` | AD_HOC → app/flow slug, BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original}`, FLOW_RUN → flow filename | `checkout-flow`, `auth-plan`, `recheck-login` |
| `{YYYYMMDD}-{HHmmss}` | UTC timestamp of test run | `20260326-143000` |
| `{screenName}` | Current screen name or accessibility label, max 40 chars | `checkout-summary`, `order-confirmation` |

### What Gets Saved

| Artifact | When | Format |
|----------|------|--------|
| Screenshot | FAIL verdict (attempt on BLOCKED if app is in foreground) | PNG |
| View hierarchy | FAIL verdict | CSV |
| App log | FAIL or BLOCKED with errors | JSON |
| Report copy | Every run | Markdown |

### Knowledge Persistence (`.ac/qa/knowledge/`)

```
.ac/qa/knowledge/
  project.jsonl                  # Project-wide knowledge base (merged, deduped) — shared with browser-qa
  .mqa-{SESSION_NAME}.jsonl      # Agent temp files (deleted after merge)
```

Agents write discoveries to temp files (`.mqa-{SESSION_NAME}.jsonl`) via Bash during execution. The parent command merges all temp files into `project.jsonl` after agents complete — deduplicated by `key`, latest wins. Temp files are deleted after merge. Knowledge is project-scoped: all test runs share one knowledge base, so an accessibility ID learned during ad-hoc testing benefits all future runs. Maestro QA shares `project.jsonl` with browser-qa — cross-platform knowledge coexists in the same file. Each line is a self-contained JSON object:

```json
{"type": "selector", "key": "checkout-submit-btn", "value": "accessibilityId: checkout-confirm — label=Confirm Order", "confidence": "high", "source": "TC-001"}
```

| Field | Type | Values |
|-------|------|--------|
| `type` | string | `selector`, `flow`, `timing`, `gotcha`, `permission`, `navigation` |
| `key` | string | Short stable identifier, kebab-case |
| `value` | string | Human-readable discovery — be specific |
| `confidence` | string | `high`, `medium` |
| `source` | string | Test case ID that discovered the fact (`TC-001`) |

The accumulated `project.jsonl` file serves as a cross-run knowledge base. All test runs load this file and inject the facts into agent context to avoid re-learning known behaviors.

Knowledge persistence is independent of `--no-evidence` — knowledge is always saved. The `--no-evidence` flag only skips screenshots, view hierarchies, and app logs.

---

## Defect Taxonomy

| Category | Description | Examples |
|----------|-------------|---------|
| Functional | Logic error, broken user flow, dead-end navigation | Button does nothing, form skips validation, back stack exhausted with no exit |
| Visual | Layout on rotation, spacing, responsive breakpoint | UI misaligns in landscape, card overlaps on large font, grid broken on tablet |
| Performance | Slow launch, frame drops, memory leak | App cold start > 3s, scroll drops below 60fps, memory grows unbounded |
| Accessibility | Missing labels, screen reader issues, contrast | Interactive element has no accessibilityLabel, VoiceOver skips control, text contrast < 4.5:1 |
| Crash | App crash on gesture, ANR (Android), watchdog kill (iOS) | Fatal exception on swipe, ANR during heavy computation, iOS watchdog terminates after 20s |
| Network | Failed API call, timeout, offline handling | 404 on REST call, fetch aborts after 10s, no offline fallback screen shown |
