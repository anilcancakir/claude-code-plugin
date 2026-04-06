# QA Patterns — Shared Reference

Common patterns shared across all three QA backends: browser-qa (Playwright CLI), maestro-qa (Maestro MCP), and flutter-qa (Flutter integration test runner). Backend-specific details live in each skill's own `SKILL.md` and `references/` files. This document is the single source of truth for cross-backend conventions.

## Contents

- [Knowledge System](#knowledge-system)
- [Report Format](#report-format)
- [Test Modes](#test-modes)
- [Parallel Execution](#parallel-execution)
- [Evidence Persistence](#evidence-persistence)
- [State Persistence](#state-persistence)
- [Agent Architecture](#agent-architecture)

---

## Knowledge System

All three QA backends share one project-wide knowledge base at `.ac/qa/knowledge/project.jsonl`. Facts learned in any test run — regardless of backend — are available to all future runs.

### JSONL Schema

Each line in `project.jsonl` is a self-contained JSON object:

```json
{"type": "selector|flow|timing|gotcha|permission|navigation", "key": "kebab-case-id", "value": "human-readable discovery", "confidence": "high|medium", "source": "TC-001"}
```

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| `type` | string | `selector`, `flow`, `timing`, `gotcha`, `permission`, `navigation`, `widget_tree`, `state` | `permission` and `navigation` are mobile-only. `widget_tree` and `state` are flutter-qa-only — harmless in other contexts |
| `key` | string | Short stable identifier, kebab-case | Must be unique — dedup key for merge |
| `value` | string | Human-readable discovery — be specific | Never generic; include enough context to act on |
| `confidence` | string | `high`, `medium` | Only `high` and `medium` facts are written; `low` is discarded |
| `source` | string | Test case ID that discovered the fact | `TC-001`, `TC-042`, etc. |

### Temp File Naming Convention

Each parallel agent writes to its own temp file to avoid concurrent write collisions. Naming by backend:

| Backend | Temp file pattern | Example |
|---------|-------------------|---------|
| browser-qa | `.bqa-{SESSION_NAME}.jsonl` | `.bqa-bqa-0.jsonl` |
| maestro-qa | `.mqa-{SESSION_NAME}.jsonl` | `.mqa-device-0.jsonl` |
| flutter-qa | `.fqa-{SESSION_NAME}.jsonl` | `.fqa-fqa-0.jsonl` |

All temp files live in `.ac/qa/knowledge/` alongside `project.jsonl`.

### Merge Logic

After all agents complete, the parent command merges temp files into `project.jsonl`:

1. Read all `.{backend}-*.jsonl` temp files in `.ac/qa/knowledge/`
2. Parse every line as JSON — collect all facts into a list
3. Dedup by `key` — on collision, latest write wins (highest mtime temp file)
4. Append new/updated facts to `project.jsonl` (replace existing line for same key)
5. Delete all temp files after successful merge

### Bootstrap Pattern

At the start of every test run, before executing any test case:

```
1. Read .ac/qa/knowledge/project.jsonl via Read tool
   → If file not found, proceed with empty knowledge
2. Parse each line as JSON
3. Merge with PRIOR_KNOWLEDGE from parent command (if provided)
   → On same-key conflict: file-based knowledge wins over PRIOR_KNOWLEDGE
4. Store as EFFECTIVE_KNOWLEDGE
5. Use EFFECTIVE_KNOWLEDGE throughout execution for selector hints, timing guidance, and flow awareness
```

### Write Pattern

Write facts to disk immediately after each test case — not at end of run. Use Bash (agents have no Write tool):

```bash
mkdir -p .ac/qa/knowledge/
echo '{"type":"selector","key":"login-btn","value":"<working selector>","confidence":"high","source":"TC-001"}' >> .ac/qa/knowledge/.bqa-{SESSION_NAME}.jsonl
```

Replace `.bqa-` with `.mqa-` or `.fqa-` for the respective backend.

Only write facts with `high` or `medium` confidence. Skip if no new discoveries for the test case. Do not write obvious/trivial facts that the next agent would discover in a single inspect.

**Why immediate writes matter**:
- Parallel agents: agent B benefits from what agent A discovered mid-run
- Crash recovery: facts survive even if the agent terminates unexpectedly
- Cross-wave: Wave 2 agents receive Wave 1 knowledge via the merged `project.jsonl`

---

## Report Format

### Verdict Definitions

#### Test Case Verdicts

| Verdict | Meaning |
|---------|---------|
| PASS | Expected state reached — element present, behavior correct, no errors |
| FAIL | Unexpected state or errors — assertion failed, wrong output, crash |
| BLOCKED | Cannot execute — setup missing, device/URL unreachable, retries exhausted |

#### Summary Verdicts

| Verdict | Condition |
|---------|-----------|
| PASS_ALL | Every test case is PASS |
| FAILURES_FOUND | At least one FAIL (regardless of BLOCKED count) |
| BLOCKED | All non-PASS cases are BLOCKED, zero FAIL |

### Severity Scale

| Level | Definition | Common Examples |
|-------|------------|-----------------|
| High | Broken functionality, user cannot complete flow, data loss, security | Crash on submit, auth bypass, payment fails silently, navigation dead-end |
| Medium | Unexpected behavior, UI issue affecting usability | Wrong error message, layout shift, stale data displayed, wrong element state |
| Low | Cosmetic, non-blocking, minor inconsistency | Typo, 2px misalignment, hover/animation inconsistency |

### Report Markdown Template

All three backends use the same base template. Backend-specific fields (e.g., Device/Platform for mobile) are added after the common Summary fields.

```markdown
# QA Report — [target] — [YYYY-MM-DD]

## Summary
**Mode**: [AD_HOC / BUG_REPRO / PLAN_VERIFY / RECHECK]
**Backend**: [playwright-cli / maestro-mcp / flutter-test]
**Target**: [URL, app description, or flow path]
**Verdict**: PASS_ALL / FAILURES_FOUND / BLOCKED
**Stats**: [N passed] / [N failed] / [N blocked] out of [total]

## Results

| # | Test Case | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [description] | PASS | — |
| 2 | [description] | FAIL | screenshot, [backend-specific evidence] |
| 3 | [description] | BLOCKED | setup required |

## Failed Tests (detail)

### TC-002: [description]
**Expected**: [expected state]
**Actual**: [actual state]
**Evidence**:
- Screenshot: [saved path]
- [Backend-specific evidence: console/hierarchy/logs]
**Severity**: High / Medium / Low

## Blocked Tests (detail)

### TC-003: [description]
**Reason**: [why blocked]
**Action Required**: [what the user needs to do]

## Recommendations
[FAIL: specific fixes based on evidence]
[BLOCKED: setup steps to unblock]
[ALL PASS: confirm criteria met, suggest next steps]
```

**RECHECK diff section** — append after Recommendations in RECHECK mode only:

```markdown
## Re-check Diff (vs previous run)

| # | Test Case | Previous | Current | Change |
|---|-----------|----------|---------|--------|
| 2 | [description] | FAIL | PASS | Fixed |
| 3 | [description] | BLOCKED | FAIL | Unblocked, now failing |
| 5 | [description] | FAIL | FAIL | Still failing |
```

### JSON Persistence Schema

Common fields across all three backends. Saved to `.ac/{backend}-qa/{testName}.json`.

```json
{
  "timestamp": "2026-03-30T14:30:00Z",
  "mode": "AD_HOC",
  "backend": "playwright-cli | maestro-mcp | flutter-test",
  "target": "[URL, app description, or test target]",
  "verdict": "PASS_ALL | FAILURES_FOUND | BLOCKED",
  "stats": {"pass": 3, "fail": 1, "blocked": 0, "total": 4},
  "knowledge": [
    {"type": "selector", "key": "submit-btn", "value": "<discovery>", "confidence": "high", "source": "TC-001"}
  ],
  "results": [
    {
      "id": "TC-001",
      "description": "[test case description]",
      "verdict": "PASS | FAIL | BLOCKED",
      "evidence": {},
      "learned_facts": []
    }
  ],
  "diff": []
}
```

`diff` is present only in RECHECK mode. `learned_facts` is omitted when empty. Backend-specific fields (e.g., `device` for maestro-qa and flutter-qa) are added at the top level alongside the common fields.

---

## Test Modes

### Common Modes

All three backends support these four modes:

| Mode | Trigger | Context Gathered |
|------|---------|-----------------|
| `AD_HOC` | Freeform instruction — no structured input | Load EFFECTIVE_KNOWLEDGE; detect running target (port scan for web, device list for mobile) |
| `BUG_REPRO` | Bug document provided (file path or inline) | Parse numbered bugs with steps, expected/actual results; one fresh session per bug |
| `PLAN_VERIFY` | Plan file provided | Extract `Done when:` blocks; fall back to bulleted checklist items; generate one test case per criterion |
| `RECHECK` | Previous run exists at `.ac/{backend}-qa/{testName}.json` | Load prior results; filter to FAIL and BLOCKED; re-run only failing items; output diff |

### Mode Behaviors

**AD_HOC**: Explore freely, capture knowledge aggressively. No predefined test cases — agent generates them from the target and instructions. Favor breadth first, then depth on suspicious areas.

**BUG_REPRO**: Isolation is paramount. Each bug gets a completely fresh session/app state — never carry state between bugs. If the bug doc lacks structure, split by paragraph or section breaks.

**PLAN_VERIFY**: One test case per acceptance criterion, not per step. PASS only when expected state is reached with zero errors/failures. Use programmatic assertions (eval/assertVisible) over visual inspection.

**RECHECK**: Preserve original test case IDs from the prior run. Output a diff table — `previous → current` verdict changes. Load `project.jsonl` knowledge before re-running to benefit from prior discoveries.

### Wave 2 Re-check Logic

After Wave 1 completes, the orchestrating command evaluates whether a Wave 2 is warranted:

1. Count FAIL + BLOCKED items from Wave 1 results
2. If count > 0 AND `--no-recheck` not set: trigger Wave 2 automatically
3. Wave 2 receives merged `project.jsonl` (Wave 1 knowledge included)
4. Wave 2 agents run only the failing/blocked subset — not the full test suite
5. Final report merges Wave 1 PASS results + Wave 2 re-run results

### Backend-Specific Modes

Modes beyond the four common ones are backend extensions:

| Mode | Backend | Description |
|------|---------|-------------|
| `FLOW_RUN` | maestro-qa | Execute existing `.maestro/` YAML flow files directly — no test case generation |
| `TEST_RUN` | flutter-qa | Execute Dart integration test files via `flutter test --machine` — parse JSONL output for results |
| `VISUAL_REGRESSION` | flutter-qa | Save/compare visual baselines via `visual_baseline_save`/`visual_baseline_compare` — report match percentage vs threshold |

---

## Parallel Execution

### Grouping Formula

```
N = min(ceil(count / 3), 4, available_resources)
```

Where:
- `count` = total number of test cases
- `4` = max concurrent agents (browser sessions, devices, or test runners)
- `available_resources` = detected available slots (Playwright sessions, Maestro devices, Flutter devices)

Minimum threshold: parallelize only when count > 3. With ≤3 test cases, run sequentially in one agent.

### Wave 1 / Wave 2 Pattern

```
Wave 1: N parallel agents each run count/N test cases
         ↓ agents complete (foreground — orchestrator waits for all)
         ↓ orchestrator merges knowledge temp files → project.jsonl
         ↓ orchestrator merges result JSON files → combined results
Wave 2: M parallel agents re-run FAIL + BLOCKED items from Wave 1
         ↓ agents complete
         ↓ orchestrator merges Wave 2 knowledge
         ↓ final report = Wave 1 PASS + Wave 2 re-run results
```

Wave 2 is skipped when all Wave 1 results are PASS.

### Knowledge Merge Between Waves

Between Wave 1 and Wave 2, the orchestrator:

1. Collects all `.{backend}-*.jsonl` temp files written by Wave 1 agents
2. Merges into `project.jsonl` (dedup by key, latest wins)
3. Deletes Wave 1 temp files
4. Passes merged `project.jsonl` path to Wave 2 agents as `PRIOR_KNOWLEDGE`

Wave 2 agents bootstrap with this enriched knowledge — they benefit immediately from Wave 1 discoveries.

### Result Merge Logic

After each wave, the orchestrator merges agent result JSONs:

1. Each agent outputs a result array (test case objects with id, verdict, evidence, learned_facts)
2. Orchestrator collects all arrays — no overlap (each agent owns disjoint test case IDs)
3. Merge by concatenation, sort by original test case order
4. Compute aggregate stats: sum pass/fail/blocked counts
5. Derive summary verdict: all PASS → PASS_ALL; any FAIL → FAILURES_FOUND; only BLOCKED → BLOCKED

### Session / Device Naming Conventions

| Backend | Session/Device naming | Examples |
|---------|----------------------|---------|
| browser-qa | `-s=bqa-{index}` (Playwright CLI session flag) | `bqa-0`, `bqa-1`, `bqa-2`, `bqa-3` |
| maestro-qa | Device from `list_devices` pool, assigned by index | Device 0, Device 1 (actual device IDs from MCP) |
| flutter-qa | `-s=fqa-{index}` or device flag | `fqa-0`, `fqa-1` |

Agents must use their assigned session/device name on every interaction — no cross-agent session sharing.

---

## Evidence Persistence

### Common Directory Structure

```
.ac/qa/
  {testName}/
    {YYYYMMDD}-{HHmmss}-{context}.png    # Screenshot on FAIL
    {YYYYMMDD}-{HHmmss}-{context}.json   # Error/log data on FAIL or BLOCKED
    report.md                             # Latest report for this test
  knowledge/
    project.jsonl                         # Project-wide shared knowledge base
    .bqa-{SESSION_NAME}.jsonl            # browser-qa agent temp files
    .mqa-{SESSION_NAME}.jsonl            # maestro-qa agent temp files
    .fqa-{SESSION_NAME}.jsonl            # flutter-qa agent temp files
```

### Naming Convention

| Token | Source | Example |
|-------|--------|---------|
| `{testName}` | AD_HOC → target slug, BUG_REPRO → bug doc filename, PLAN_VERIFY → plan filename, RECHECK → `recheck-{original}` | `register`, `auth-plan`, `recheck-login` |
| `{YYYYMMDD}-{HHmmss}` | UTC timestamp of evidence capture | `20260330-143000` |
| `{context}` | URL path slug (web), screen name (mobile), or test ID slug | `settings-profile`, `checkout-summary`, `TC-002` |

### Evidence Types Per Backend

| Evidence Type | browser-qa | maestro-qa | flutter-qa |
|--------------|------------|------------|------------|
| Screenshot (PNG) | `playwright-cli screenshot` | `take_screenshot` MCP | Device screenshot via flutter driver |
| DOM / Hierarchy dump | `playwright-cli eval outerHTML` → `.html` | `inspect_view_hierarchy` → `.csv` | Widget tree → `.json` |
| Console / App logs | `playwright-cli console` → `.json` | `run_flow evalScript` / device logs → `.json` | Flutter test output → `.json` |
| Network failures | `playwright-cli network` → included in `.json` | n/a | n/a |
| Video recording | n/a (headed mode for manual observation) | `startRecording`/`stopRecording` in `run_flow` YAML | n/a |

Evidence is attached to FAIL and BLOCKED verdicts only. PASS verdicts use `{}`. Attempt screenshot on BLOCKED if the session/app is still accessible.

### `--no-evidence` Flag Behavior

When `--no-evidence` is passed:
- Skip screenshots, DOM/hierarchy dumps, log files, and video recording
- Do NOT skip knowledge writes — `project.jsonl` is always updated
- Do NOT skip the JSON persistence file (`.ac/{backend}-qa/{testName}.json`) — RECHECK needs it
- Report still includes failure descriptions and error messages captured from tool output

### testName Derivation Rules

Derive `testName` consistently so RECHECK can locate prior results:

| Mode | Derivation |
|------|------------|
| AD_HOC | URL path slug (web: last non-empty path segment) or app flow description slug |
| BUG_REPRO | Bug document filename without extension |
| PLAN_VERIFY | Plan filename without extension |
| RECHECK | `recheck-{original testName}` |
| FLOW_RUN (maestro) | Flow directory name or first flow filename without extension |
| TEST_RUN (flutter) | Test file or directory slug without extension |
| VISUAL_REGRESSION (flutter) | `vr-{target slug}` |

Slugify: lowercase, replace spaces and special chars with `-`, max 40 chars.

---

## State Persistence

### RECHECK State Pattern

State files that RECHECK mode reads from are saved by the prior run:

```
.ac/{backend}-qa/
  {testName}.json    # Structured results — used by RECHECK to diff
  {testName}.md      # Human-readable report — for developer reference
```

Where `{backend}` is `browser`, `maestro`, or `flutter`.

RECHECK load sequence:
1. Resolve testName from user input or `--recheck {target}` flag
2. Read `.ac/{backend}-qa/{testName}.json` — stop with error if not found
3. Filter results to FAIL and BLOCKED items only
4. Preserve original test case IDs (TC-001, TC-042, etc.) — do not renumber
5. Load EFFECTIVE_KNOWLEDGE from `project.jsonl` before re-running

### Evidence Archive

Evidence artifacts are never deleted automatically. The `.ac/qa/{testName}/` directory accumulates artifacts across multiple runs:

- Each run appends new files (timestamp prefix ensures no overwrites)
- `report.md` is overwritten with the latest report on each run
- The JSON state file (`.ac/{backend}-qa/{testName}.json`) is overwritten with the latest full results

### Knowledge Fallback Merge

If `project.jsonl` does not exist at bootstrap time (first-ever run):
- Proceed with empty EFFECTIVE_KNOWLEDGE
- Still write agent temp files normally
- After run completes, orchestrator creates `project.jsonl` from the temp files

This handles the cold-start case without special branching in agent logic.

---

## Agent Architecture

### Common Agent Structure

All three QA agents (browser-qa, maestro-qa, flutter-qa) follow the same top-level structure:

**Input params received from orchestrating command:**

```
MODE          — AD_HOC | BUG_REPRO | PLAN_VERIFY | RECHECK
TARGET        — URL, app ID/description, plan file path, or bug doc path
TEST_CASES    — Pre-assigned subset of test case IDs (parallel mode only)
SESSION_NAME  — Unique session/device identifier for this agent instance
PRIOR_KNOWLEDGE — Serialized knowledge facts from project.jsonl (optional)
FLAGS         — --headed, --no-evidence, --no-parallel (backend-specific)
```

**Knowledge bootstrap** (always first, before any test execution):
1. Read `project.jsonl`
2. Parse + merge with `PRIOR_KNOWLEDGE`
3. Store as `EFFECTIVE_KNOWLEDGE`

**Execution loop** (per test case):
1. Setup — fresh session/app/runner for this test case
2. Execute — step through actions using backend-specific tools
3. Assert — verify expected state using backend assertions
4. Self-heal — if element/selector fails, re-inspect and retry (max 3 attempts)
5. Evidence — capture on FAIL/BLOCKED
6. Write knowledge — append new facts to temp `.{prefix}-{SESSION_NAME}.jsonl`
7. Record result — `{id, verdict, evidence, learned_facts}`

**Self-healing ceiling**: Max 3 retries per element interaction. On 3rd failure → BLOCKED with note: "Element not found after 3 retries: [description]".

**Output JSON format** (returned to orchestrator):
```json
{
  "agent": "bqa-0 | mqa-device-0 | fqa-0",
  "results": [...],
  "knowledge_file": ".ac/qa/knowledge/.bqa-{SESSION_NAME}.jsonl"
}
```

### Per-Backend Adaptations

| Capability | browser-qa | maestro-qa | flutter-qa |
|------------|------------|------------|------------|
| Tool prefix | `playwright-cli` (Bash shell commands) | `mcp__maestro__*` (MCP tools) | `mcp__flutter_skill__*` (MCP tools) |
| Inspect / snapshot | `playwright-cli snapshot` → YAML | `inspect_view_hierarchy` → CSV | `mcp__flutter_skill__snapshot` → JSON (~200 tokens) |
| Primary selector | `ref` from snapshot YAML | `id:` (accessibilityId) | Widget key via `mcp__flutter_skill__smart_tap` |
| Fallback selector | `role=button[name=X]` | `text:` with fuzzy matching | Widget type + text via `find_by_type` |
| Multi-step batch | `playwright-cli run-code "async page => {...}"` | `mcp__maestro__run_flow` with inline YAML | `mcp__flutter_skill__assert_batch` for grouped assertions |
| Session model | Named session via `-s=bqa-{index}` | Device pool via `list_devices` | Session pool via `scan_and_connect` / `connect_app` |
| Evidence: screenshot | `playwright-cli screenshot` → PNG | `take_screenshot` → PNG | `mcp__flutter_skill__screenshot` → PNG |
| Evidence: structure | `eval outerHTML` → HTML | `inspect_view_hierarchy` → CSV | `mcp__flutter_skill__snapshot` → JSON |
| Evidence: logs | `playwright-cli console` + `network` → JSON | Device logs via `run_flow evalScript` → JSON | `mcp__flutter_skill__get_errors` / `get_logs` → JSON |
| State isolation | `playwright-cli close` + `playwright-cli open` per test | `stop_app` + `clearState` + `launchApp` per test | `mcp__flutter_skill__reset_app` per test |
| Context refresh | `close` + `open` after ~20 interactions | `stop_app` + `launch_app` after ~20 interactions | `mcp__flutter_skill__hot_restart` after ~20 interactions |
