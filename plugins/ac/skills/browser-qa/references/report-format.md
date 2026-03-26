# QA Report Format

Deep-dive reference for QA report structure, evidence schema, and persistence format.

---

## Verdict Definitions

### Test Case Verdicts

| Verdict | Meaning |
|---------|---------|
| PASS | Expected state reached — element present, behavior correct, no errors |
| FAIL | Unexpected state or errors — assertion failed, JS error, wrong output |
| BLOCKED | Cannot execute — setup missing, URL unreachable, retries exhausted |

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
| High | Broken functionality, user cannot complete flow, data loss, security | Form crashes on submit, auth bypass, payment fails silently |
| Medium | Unexpected behavior, UI glitch affecting usability | Wrong error message shown, layout shift on input focus, stale data displayed |
| Low | Cosmetic, non-blocking, minor inconsistency | Typo in label, element misaligned by 2px, hover state missing |

---

## Evidence Schema

Evidence is attached only to FAIL and BLOCKED verdicts. PASS verdicts use `{}`.

**Screenshot**
- Capture on FAIL only (attempt on BLOCKED if page loaded)
- Format: PNG, persisted to `.ac/qa/{testName}/{timestamp}-{pagePath}.png`
- Reference by path in the report

**Page HTML Snapshot**
- Capture on FAIL via `document.documentElement.outerHTML`
- Format: HTML, persisted to `.ac/qa/{testName}/{timestamp}-{pagePath}.html`
- Useful for post-mortem DOM inspection without re-running tests

**Console Errors**
- Capture JS exceptions, unhandled rejections, and `console.error` calls
- Filter out: third-party analytics noise, favicon 404s, non-actionable warnings
- Include the full error message and stack origin line

**Network Failures**
- Record: HTTP status, full URL, response excerpt (max 200 chars)
- Flag: 4xx/5xx responses, CORS failures, request timeouts

**Error Logs**
- Combined console + network errors persisted to `.ac/qa/{testName}/{timestamp}-{pagePath}.json`
- Schema: `{test_id, timestamp, console_errors[], network_errors[], page_url}`

**Accessibility Snapshot**
- Include only the relevant subtree (the component under test)
- Omit full-page dumps — target the failing element's accessible name/role

---

## Report Markdown Template

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

## JSON Schema (last-report.json)

Saved to `.browser-qa/last-report.json` after every run. Used by RECHECK mode to diff against prior results. Evidence paths point to `.ac/qa/` directory.

```json
{
  "timestamp": "2026-03-26T14:30:00Z",
  "mode": "AD_HOC",
  "backend": "playwright",
  "target": "http://localhost:3000/register",
  "verdict": "FAILURES_FOUND",
  "stats": { "pass": 3, "fail": 1, "blocked": 0, "total": 4 },
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
  ],
  "diff": [
    { "id": "TC-002", "previous": "FAIL", "current": "PASS", "change": "fixed" },
    { "id": "TC-005", "previous": "FAIL", "current": "FAIL", "change": "still_failing" }
  ]
}
```

`diff` field is present only in RECHECK mode runs. Omit entirely for all other modes.

---

## Evidence Persistence (`.ac/qa/`)

QA evidence is persisted by default to `.ac/qa/` for audit trail, debugging, and historical comparison. Disable with `--no-evidence` flag.

### Directory Structure

```
.ac/qa/
  {testName}/
    {YYYYMMDD}-{HHmmss}-{pagePath}.png        # Screenshot on FAIL
    {YYYYMMDD}-{HHmmss}-{pagePath}.html        # Page HTML snapshot
    {YYYYMMDD}-{HHmmss}-{pagePath}.json        # Console + network errors
    report.md                                   # Latest report for this test
```

### Naming Convention

| Token | Source | Example |
|-------|--------|---------|
| `{testName}` | AD_HOC → URL path slug, BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original}` | `register`, `auth-plan`, `recheck-register` |
| `{YYYYMMDD}-{HHmmss}` | UTC timestamp of test run | `20260326-143000` |
| `{pagePath}` | URL path slug, max 40 chars | `settings-profile`, `app-dashboard` |

### What Gets Saved

| Artifact | When | Format |
|----------|------|--------|
| Screenshot | FAIL verdict (attempt on BLOCKED if page loaded) | PNG |
| HTML snapshot | FAIL verdict, key PASS milestones (optional) | HTML |
| Error log | FAIL or BLOCKED with errors | JSON |
| Report copy | Every run | Markdown |

---

## Defect Taxonomy

| Category | Description | Examples |
|----------|-------------|---------|
| Functional | Logic error, broken user flow | Button does nothing, wrong calculation, form skips validation |
| Visual | Layout, spacing, responsive breakpoint | Element overlaps on mobile, grid misaligned, wrong font applied |
| Performance | Slow load, oversized payload | Page TTI > 3s, image uncompressed (>1MB), bundle bloat |
| Accessibility | Missing labels, keyboard trap, contrast | Input has no aria-label, modal traps Tab, contrast ratio < 4.5:1 |
| Console | JS error, unhandled rejection | TypeError in handler, unhandled Promise rejection, missing module |
| Network | Failed request, CORS, timeout | 404 on API call, OPTIONS blocked by CORS, fetch aborts after 10s |
