---
name: flutter-qa
description: "Flutter QA workflow patterns and flutter-skill MCP tool routing for Claude Code agents. Reference for /ac:flutter-qa command."
user-invocable: false
---

# Flutter QA — Testing Knowledge Base

Flutter app QA testing via flutter-skill MCP server. This skill provides workflow patterns, token efficiency strategies, and self-healing patterns used by the `/ac:flutter-qa` command. Report format lives in `references/report-format.md`. Shared cross-backend patterns (knowledge system, test modes, parallel execution, evidence persistence) live in the plugin-level `../../references/qa-patterns.md` — read it for conventions shared with browser-qa and maestro-qa. This file distills orchestration knowledge and MCP-specific patterns.

---

## Flutter Skill MCP Essentials

### Installation and Verification

- Install: `npm install -g flutter-skill`
- MCP setup: add flutter-skill MCP server to `.mcp.json`:

```json
{
  "flutter-skill": {
    "command": "flutter-skill",
    "args": ["server"]
  }
}
```

### Connection Model

1. **Scan and connect** — `mcp__flutter_skill__scan_and_connect` discovers running Flutter apps on the local machine and connects to the first available one. Preferred for most workflows
2. **Launch fallback** — if no running app found, use `mcp__flutter_skill__launch_app` to start the app with `--dart-define` flags as needed
3. **Direct connect** — `mcp__flutter_skill__connect_app` with explicit observatory/VM service URI when targeting a specific instance

### Session Management

- List active sessions: `mcp__flutter_skill__list_sessions` — returns connected app instances with session IDs
- Disconnect: `mcp__flutter_skill__disconnect` — cleanly detach from app. Always disconnect at end of test run
- Connection status: `mcp__flutter_skill__get_connection_status` — verify connection is alive before resuming after long waits

### App Lifecycle

- **Hot reload** — `mcp__flutter_skill__hot_reload` pushes code changes without losing state. Use after minor code fixes during test iteration
- **Hot restart** — `mcp__flutter_skill__hot_restart` restarts app preserving connection but resetting state. Use between test cases for clean state
- **Reset app** — `mcp__flutter_skill__reset_app` full app reset including navigation stack. Use when hot restart is insufficient

### Widget Tree Inspection

`mcp__flutter_skill__snapshot` returns a compact JSON representation of the current widget tree — ~200 tokens for a typical screen. This is the primary inspection tool.

`mcp__flutter_skill__screenshot` captures a PNG screenshot — ~4000 tokens when read into context. Use only as FAIL evidence, never for routine inspection.

Rule: Always prefer `snapshot` over `screenshot`. The 20x token difference compounds across test cases.

### Element Targeting

Priority order for interaction tools:

1. `key:` — `ValueKey` / widget key (most stable, preferred)
2. `text:` — visible text content (fuzzy matching via smart_* tools)
3. `type:` — widget type name (e.g., `ElevatedButton`, `TextField`)
4. `semantic:` — semantic label from `Semantics` widget

Combined targeting: `mcp__flutter_skill__tap(key: "login_button")` or `mcp__flutter_skill__tap(text: "Login", type: "ElevatedButton")`

---

## MCP Tool Reference

### Connection (7 tools)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__scan_and_connect` | Discover running Flutter apps and connect | none — auto-discovers |
| `mcp__flutter_skill__connect_app` | Connect to specific app instance | `uri` (required, VM service URI) |
| `mcp__flutter_skill__launch_app` | Launch Flutter app and connect | `target` (optional, entry point path), `device` (optional, device ID), `args` (optional, additional flutter run args) |
| `mcp__flutter_skill__disconnect` | Disconnect from current app | none |
| `mcp__flutter_skill__list_sessions` | List active connected sessions | none |
| `mcp__flutter_skill__stop_app` | Stop the connected Flutter app | none |
| `mcp__flutter_skill__get_connection_status` | Check if connection is alive | none |

### Interaction (8 tools)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__tap` | Tap a widget | At least one of: `key` (string), `text` (string), `type` (string), `semantic` (string). Optional: `index` (int, disambiguate) |
| `mcp__flutter_skill__enter_text` | Enter text into focused field | `text` (required) |
| `mcp__flutter_skill__swipe` | Swipe gesture | `direction` (required: up/down/left/right), `key` or `text` or `type` (target widget) |
| `mcp__flutter_skill__scroll_to` | Scroll until widget is visible | `key` or `text` or `type` (target), `scrollable_key` (optional, specific scrollable) |
| `mcp__flutter_skill__long_press` | Long press a widget | Same targeting as `tap` |
| `mcp__flutter_skill__go_back` | Pop current route (Navigator.pop) | none |
| `mcp__flutter_skill__double_tap` | Double tap a widget | Same targeting as `tap` |
| `mcp__flutter_skill__drag` | Drag from one widget to another | `from_key` or `from_text` (required), `to_key` or `to_text` (required) |

### Inspection (6 tools)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__snapshot` | Get compact widget tree JSON (~200 tokens) | none — returns current screen state |
| `mcp__flutter_skill__inspect` | Get detailed properties of a specific widget | `key` or `text` or `type` (target widget) |
| `mcp__flutter_skill__find_by_type` | Find all widgets of a given type | `type` (required, e.g., `TextField`, `ElevatedButton`) |
| `mcp__flutter_skill__get_widget_tree` | Get full widget tree (verbose) | `depth` (optional, max depth). Warning: can be very large — prefer `snapshot` |
| `mcp__flutter_skill__wait_for_element` | Wait until widget appears | `key` or `text` or `type` (target), `timeout` (optional, ms) |
| `mcp__flutter_skill__wait_for_idle` | Wait for animations/async to settle | `timeout` (optional, ms) |

### Screenshot (1 tool)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__screenshot` | Capture screen as PNG | `path` (optional, save location). ~4000 tokens — use only as FAIL evidence |

### Assertions (4 tools)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__assert_visible` | Assert widget is visible on screen | `key` or `text` or `type` (target) |
| `mcp__flutter_skill__assert_text` | Assert specific text exists | `text` (required), `exact` (optional, bool, default false) |
| `mcp__flutter_skill__assert_not_visible` | Assert widget is NOT visible | `key` or `text` or `type` (target) |
| `mcp__flutter_skill__assert_batch` | Run multiple assertions in one call | `assertions` (required, array of assertion objects: `{type, key?, text?, exact?}`) |

### Self-Healing (3 tools)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__smart_tap` | Tap with fuzzy matching and auto-retry | Same targeting as `tap` — flutter-skill handles retry internally |
| `mcp__flutter_skill__smart_enter_text` | Enter text with field discovery and retry | `text` (required), `key` or `type` (optional hint) — finds best matching field |
| `mcp__flutter_skill__smart_assert` | Assert with fuzzy matching and tolerance | `text` or `key` (required), `type` (optional) — tolerates minor text differences |

### App Lifecycle (3 tools)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__hot_reload` | Push code changes, preserve state | none |
| `mcp__flutter_skill__hot_restart` | Restart app, reset state | none |
| `mcp__flutter_skill__reset_app` | Full reset including navigation stack | none |

### Visual Regression (2 tools)

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__flutter_skill__visual_baseline_save` | Save current screen as baseline | `name` (required, baseline identifier), `path` (optional, save directory) |
| `mcp__flutter_skill__visual_baseline_compare` | Compare current screen against saved baseline | `name` (required, baseline identifier), `threshold` (optional, diff tolerance 0.0-1.0) |

---

## Workflow Patterns

### AD_HOC — Freeform Testing

1. **Connect** — `mcp__flutter_skill__scan_and_connect` to discover and attach to running app. Fall back to `mcp__flutter_skill__launch_app` if none found
2. **Snapshot** — `mcp__flutter_skill__snapshot` returns compact widget tree JSON. Parse for target widgets only — never dump full tree into context
3. **Interact** — execute instructions step-by-step using `mcp__flutter_skill__tap`, `mcp__flutter_skill__enter_text`, `mcp__flutter_skill__go_back`. Re-snapshot after each action (observe-act-observe)
4. **Assert** — `mcp__flutter_skill__assert_visible`, `mcp__flutter_skill__assert_text` after interactions that change state
5. **Evidence on fail** — `mcp__flutter_skill__screenshot` + `mcp__flutter_skill__snapshot` on every FAIL
6. **Report** — build test case results with evidence on failures
7. **Disconnect** — `mcp__flutter_skill__disconnect` when done

When running in parallel mode, each agent uses its own session via separate `scan_and_connect` or `launch_app` targeting different devices. Sessions are fully isolated — no cross-agent state bleed.

### BUG_REPRO — Bug Reproduction

1. **Parse** bug document — extract numbered bugs with steps, expected/actual results
2. **Fresh state per bug** — `mcp__flutter_skill__hot_restart` (or `mcp__flutter_skill__reset_app` for deeper reset) per bug to avoid state pollution
3. **Execute steps** — follow reproduction steps exactly as documented. Re-snapshot after each step
4. **Evidence on fail** — `mcp__flutter_skill__screenshot` + `mcp__flutter_skill__snapshot`. Evidence is mandatory for FAIL verdicts
5. **Fresh restart between bugs** — never carry app state from one bug to the next

Key: Isolation is paramount. Each bug gets a fresh `hot_restart` or `reset_app` cycle. If bug doc lacks structure, extract bugs by paragraph/section breaks.

When running in parallel mode, each agent connects to its own device instance. `hot_restart` per bug on that device.

### PLAN_VERIFY — Acceptance Criteria Verification

1. **Extract** `Done when:` blocks from plan file. Fall back to bulleted checklist items
2. **Generate test cases** — one per acceptance criterion with action sequence and expected outcome
3. **Execute** using MCP tools — `mcp__flutter_skill__scan_and_connect`, `mcp__flutter_skill__snapshot`, interact by key/text, assertions via `mcp__flutter_skill__assert_visible`, `mcp__flutter_skill__assert_text`, `mcp__flutter_skill__assert_batch`
4. **Verdict per criterion** — PASS only when expected state is reached. Use `mcp__flutter_skill__snapshot` to confirm widget tree matches expectations

Key: Use `mcp__flutter_skill__assert_batch` for multi-assertion criteria. Clean state per test case via `mcp__flutter_skill__hot_restart`.

When running in parallel mode, each agent connects to its own device for all MCP calls in that agent's scope.

### RECHECK — Re-run Previous Failures

1. **Load** `.ac/flutter-qa/{testName}.json` (testName derived from original target) — stop if not found
2. **Filter** to FAIL and BLOCKED items only — preserve original test case IDs
3. **Re-run** each item using MCP tools with fresh app state via `mcp__flutter_skill__hot_restart`
4. **Diff report** — compare current vs previous verdicts, show which items changed status

Key: Output a diff table showing previous to current verdict changes.

When running in parallel mode, each agent uses its own device to keep re-run sessions isolated from any concurrently running agents.

### TEST_RUN — Execute Flutter Unit/Widget Tests

This mode uses `flutter test` CLI via Bash — NOT MCP tools.

1. **Discover** test files — Glob for `*_test.dart` in target directory (typically `test/`)
2. **Execute** via Bash: `flutter test --machine <path>` — outputs JSONL events to stdout
3. **Parse JSONL events** — each line is a JSON object with `type` field:
   - `start` — test run started
   - `testStart` — individual test started (`id`, `name`, `groupIDs`)
   - `testDone` — individual test completed (`id`, `result`: `success`/`failure`/`error`)
   - `error` — test error details (`testID`, `error`, `stackTrace`)
   - `done` — test run complete (`success`: bool, `time`: ms)
4. **Report** — structured results with test names, verdicts, and failure details (error message + stack trace)

Key: This is the only mode that does NOT use flutter-skill MCP. Run `flutter test --machine` for machine-parseable output. Use `flutter test --machine --name=<pattern>` to filter specific tests. For integration tests, use `flutter test --machine integration_test/` with a running device.

### VISUAL_REGRESSION — Baseline Screenshot Comparison

1. **Connect** — `mcp__flutter_skill__scan_and_connect` to running app
2. **Navigate** to target screen using interaction tools
3. **Wait for idle** — `mcp__flutter_skill__wait_for_idle` to ensure animations complete
4. **First run (save baseline)** — `mcp__flutter_skill__visual_baseline_save(name: "screen-name")` saves current screen as golden reference
5. **Subsequent runs (compare)** — `mcp__flutter_skill__visual_baseline_compare(name: "screen-name", threshold: 0.05)` compares current screen against saved baseline
6. **Report diffs** — if comparison fails, capture `mcp__flutter_skill__screenshot` as evidence alongside the diff report
7. **Update baseline** — if visual change is intentional, re-run `mcp__flutter_skill__visual_baseline_save` with same name to update the golden file

Key: Always `wait_for_idle` before saving or comparing — animation frames cause false positives. Start with a low threshold (0.01-0.05) and increase only if platform rendering differences cause false failures. Baseline files persist across runs — store in a project-local directory.

---

## Token Efficiency Strategies

1. **Snapshot over screenshot** — `mcp__flutter_skill__snapshot` returns ~200 tokens (compact JSON widget tree) vs `mcp__flutter_skill__screenshot` at ~4000 tokens (PNG). ~95% fewer tokens. Always snapshot first; screenshot only as FAIL evidence
2. **Widget tree JSON to disk** — for complex screens, write `mcp__flutter_skill__get_widget_tree` output to a file via Bash, then search it with Grep. Never dump verbose trees into context
3. **Batch assertions** — `mcp__flutter_skill__assert_batch` replaces N individual assertion calls with 1 MCP call. Use for multi-criteria verification
4. **Smart tools reduce retry noise** — `mcp__flutter_skill__smart_tap`, `mcp__flutter_skill__smart_enter_text`, `mcp__flutter_skill__smart_assert` handle fuzzy matching and retry internally. One tool call instead of 3-retry loops in agent logic
5. **Disconnect only at end** — maintain connection across test cases. `hot_restart` between cases resets state without reconnection overhead. Only `mcp__flutter_skill__disconnect` when the full run is complete
6. **Snapshot checks only after error-likely interactions** — form submits, navigation, async operations. Not after every tap

---

## Self-Healing Pattern

Flutter-skill provides built-in self-healing via `smart_*` tools. These handle fuzzy matching and retry internally — the agent receives a clean success/failure response without retry noise.

### Primary Path — Smart Tools

Use `mcp__flutter_skill__smart_tap`, `mcp__flutter_skill__smart_enter_text`, `mcp__flutter_skill__smart_assert` as default interaction tools. Flutter-skill handles:

- Fuzzy text matching (minor label changes, trailing whitespace, case differences)
- Key fallback (tries key → text → type → semantic in sequence)
- Wait-and-retry for elements not yet rendered (animation, async loading)

### Agent Fallback — Manual Recovery

When smart tools return failure (element genuinely not found):

1. **Re-snapshot** — `mcp__flutter_skill__snapshot` to get fresh widget tree
2. **Search by key/text/type** — scan snapshot JSON for the target widget. Check EFFECTIVE_KNOWLEDGE for known selectors that survived previous retries
3. **Retry with found selector** — `mcp__flutter_skill__tap` (or other interaction tool) with updated targeting
4. **Max 3 retries** — if all fail, mark test case `BLOCKED` with note: "Element not found after 3 retries: [description]"

Never fall back to coordinate-based taps — they are brittle and break across device sizes, orientations, and text scale settings. Key and text selectors are the only acceptable targeting strategies.

---

## Knowledge Capture Patterns

During a test run, capture non-obvious discoveries that would save the next agent time. Do not capture trivial facts (e.g., "app has a bottom navigation bar" — the next agent can see that). Only capture what required effort to discover.

### Reading Knowledge at Start

Before executing any test cases, load existing project knowledge:

1. Read `.ac/qa/knowledge/project.jsonl` via Read tool. If the file doesn't exist, proceed with empty knowledge.
2. Parse each line as a JSON object — each represents a previously learned fact.
3. Merge with `PRIOR_KNOWLEDGE` from the parent command (if provided). On same-key conflict, file-based knowledge wins.
4. Store as `EFFECTIVE_KNOWLEDGE` — use throughout execution for selector hints, timing guidance, widget tree structure awareness, and state management patterns.

Project knowledge is cumulative across all test runs. A fact learned during ad-hoc testing of the login screen benefits a later plan-verify run that touches the same flows.

### Writing Knowledge to Disk

Write facts to disk immediately after each test case — do not wait until the end of the run.

**Write pattern** (via Bash — agent has no Write tool):

```bash
mkdir -p .ac/qa/knowledge/
echo '{"type":"selector","key":"login-btn","value":"key:login_button works, text:Login flaky on Android emulator","confidence":"high"}' >> .ac/qa/knowledge/.fqa-{SESSION_NAME}.jsonl
```

**File naming**: `.fqa-{SESSION_NAME}.jsonl` — each agent writes to its own temp file. Parent merges all temp files into `project.jsonl` after execution.

**When to write**:

- After each test case completes, not at end of run
- Only write facts with `high` or `medium` confidence
- Skip if no new discoveries for this test case

**Why immediate writes matter**:

- Parallel agents: agent B can read what agent A wrote mid-run (if reading project.jsonl between test cases)
- Crash recovery: facts survive even if the agent terminates unexpectedly
- Cross-wave: Wave 2 agents get Wave 1 knowledge via the merged project.jsonl

### What to Capture (8 types)

- **selector** — stable widget keys or text labels that survived retries or self-healing
- **flow** — unexpected navigation paths, multi-step auth sequences, deep link resolution
- **timing** — splash screen delays, animation waits, async-gated UI that required retries
- **gotcha** — platform dialogs, keyboard overlays, orientation changes, error recoveries
- **permission** — OS permission dialogs (camera, location, notifications) — which button text to tap, timing delays before dialog appears
- **navigation** — route patterns (`/home`, `/profile/:id`), navigator structure, drawer paths, back stack behavior
- **widget_tree** — non-obvious widget hierarchy relationships that affect targeting. Example:

```jsonl
{"type":"widget_tree","key":"settings-toggle","value":"DarkMode toggle is inside CustomScrollView > SliverList > SettingsTile, not directly in Column. Use scroll_to(key:'dark_mode_switch') before tap","confidence":"high"}
{"type":"widget_tree","key":"nested-form-fields","value":"Email field is inside Form > AnimatedContainer > Column > TextField(key:'email'). Container animates on focus — wait_for_idle before assert","confidence":"medium"}
```

- **state** — app state patterns that affect test execution — provider/bloc states, persisted preferences, cached data. Example:

```jsonl
{"type":"state","key":"onboarding-gate","value":"App shows onboarding on first launch. SharedPreferences 'onboarding_complete' must be true to skip. hot_restart resets in-memory state but NOT SharedPreferences — use reset_app for clean onboarding test","confidence":"high"}
{"type":"state","key":"auth-token-cache","value":"Login persists auth token in secure storage. hot_restart preserves it — user stays logged in. reset_app clears it. For logged-out test cases, always reset_app not hot_restart","confidence":"high"}
```

### When to Capture

- After successful self-healing (selector) — record the working key/text that survived after the stale one failed
- After permission dialog handling (permission) — record the button text, timing, and platform differences
- After deep link navigation resolved (navigation) — record the route pattern and resulting screen
- After a wait-based retry succeeded (timing) — record the minimum wait or retry count required
- After recovering from an unexpected error (gotcha) — record what happened and what resolved it
- After redirect chain resolved (flow) — record the actual navigation path and intermediate screens
- After discovering non-obvious widget nesting (widget_tree) — record the hierarchy path and targeting strategy
- After discovering state dependency (state) — record what state affects behavior and how to reset it

### Capture Format

```json
{"type": "selector|flow|timing|gotcha|permission|navigation|widget_tree|state", "key": "<kebab-case-id>", "value": "<what to remember>", "confidence": "high|medium"}
```

Anti-pattern: Do not log obvious/trivial facts. If the next agent would discover it in one snapshot, skip it. Only capture discoveries that required multiple attempts or non-obvious reasoning to reach.

---

## Reference Files

- **Report format specification**: `${CLAUDE_PLUGIN_ROOT}/skills/flutter-qa/references/report-format.md`

Load report-format.md for the structured JSON schema used in `.ac/flutter-qa/{testName}.json` persistence.

---

## Anti-Patterns

| Anti-Pattern | Why Wrong | Do Instead |
|---|---|---|
| Using `screenshot` when `snapshot` suffices | ~4000 tokens vs ~200 tokens per call — 20x waste | Use `mcp__flutter_skill__snapshot`; screenshots only as FAIL evidence |
| Coordinate-based taps | Brittle — break across device sizes, orientations, text scale | Use `key:`, `text:`, or `type:` selectors exclusively |
| Not disconnecting at end of run | Leaked connections consume device resources, block subsequent runs | Always `mcp__flutter_skill__disconnect` when done |
| Using all 253 flutter-skill tools in agent | Bloated tool list wastes context tokens and confuses routing | Only expose the ~30 core agent tools listed in this reference |
| Using flutter-skill MCP for unit tests | MCP tools test the running app UI — unit tests need `flutter test` CLI | Use `flutter test --machine <path>` via Bash for TEST_RUN mode |
| `visual_baseline_compare` without prior baseline | Comparison fails with no reference — wastes a tool call | Always `visual_baseline_save` first, then `visual_baseline_compare` on subsequent runs |
| Dumping full `get_widget_tree` into context | Verbose tree can be thousands of tokens on complex screens | Write to file via Bash, search with Grep. Use `snapshot` for routine inspection |
| Waiting until end to write knowledge | Facts lost on crash, parallel agents can't benefit mid-run | Write to `.fqa-{SESSION_NAME}.jsonl` after each test case |
| `hot_restart` when `reset_app` needed | `hot_restart` preserves SharedPreferences and secure storage | Use `reset_app` when persistent storage must be cleared |
