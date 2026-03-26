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
- Capture on FAIL only
- Format: PNG, saved to `.browser-qa/screenshots/tc-{id}.png` (e.g. `tc-002.png`)
- Reference inline or by path in the report

**Console Errors**
- Capture JS exceptions, unhandled rejections, and `console.error` calls
- Filter out: third-party analytics noise, favicon 404s, non-actionable warnings
- Include the full error message and stack origin line

**Network Failures**
- Record: HTTP status, full URL, response excerpt (max 200 chars)
- Flag: 4xx/5xx responses, CORS failures, request timeouts

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

Saved to `.browser-qa/last-report.json` after every run. Used by RECHECK mode to diff against prior results.

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
        "screenshot": ".browser-qa/screenshots/tc-002.png",
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

## Defect Taxonomy

| Category | Description | Examples |
|----------|-------------|---------|
| Functional | Logic error, broken user flow | Button does nothing, wrong calculation, form skips validation |
| Visual | Layout, spacing, responsive breakpoint | Element overlaps on mobile, grid misaligned, wrong font applied |
| Performance | Slow load, oversized payload | Page TTI > 3s, image uncompressed (>1MB), bundle bloat |
| Accessibility | Missing labels, keyboard trap, contrast | Input has no aria-label, modal traps Tab, contrast ratio < 4.5:1 |
| Console | JS error, unhandled rejection | TypeError in handler, unhandled Promise rejection, missing module |
| Network | Failed request, CORS, timeout | 404 on API call, OPTIONS blocked by CORS, fetch aborts after 10s |
