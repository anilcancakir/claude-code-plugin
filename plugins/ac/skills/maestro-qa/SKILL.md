---
name: maestro-qa
description: "Maestro QA workflow patterns and MCP tool integration. Loaded by /ac:maestro-qa command."
user-invocable: false
---

# Maestro QA — Testing Knowledge Base

Mobile QA testing via Maestro CLI's built-in MCP server. This skill provides workflow patterns, token efficiency strategies, and self-healing patterns used by the `/ac:maestro-qa` command. Report format lives in `references/report-format.md`. Shared cross-backend patterns (knowledge system, test modes, parallel execution, evidence persistence) live in the plugin-level `../../references/qa-patterns.md` — read it for conventions shared with browser-qa and flutter-qa. This file distills orchestration knowledge and MCP-specific patterns.

---

## Maestro MCP Essentials

### Installation and Verification

- Install (Homebrew): `brew install maestro`
- Install (curl): `curl -Ls "https://get.maestro.mobile.dev" | bash`
- Verify: `maestro --version`

### Prerequisites

- Java 17 or 21 (Maestro runtime dependency)
- iOS: Xcode with command-line tools, simulator runtime installed
- Android: Android SDK with platform-tools, ADB on PATH, emulator or physical device

### MCP Setup

User adds Maestro MCP server to `.mcp.json`:

```json
{
  "maestro": {
    "command": "maestro",
    "args": ["mcp"]
  }
}
```

### Architecture

MCP tools communicate over stdio JSON-RPC — each tool call is a single request/response. View hierarchy returns CSV (element_num, depth, attributes, parent_num) — token-efficient by design. Never dump full CSV into context; parse for target elements only.

### Device Management

- List devices: `mcp__maestro__list_devices` to discover available simulators/emulators
- Start device: `mcp__maestro__start_device` with `device_id` or `platform` (ios/android)
- **Parallel sessions** — each parallel agent uses its own device. Devices are fully isolated: independent app state, storage, and runtime — no cross-agent state bleed
- **Max concurrent devices**: 4 — beyond this, resource contention degrades reliability and emulator performance

### Element Targeting

Priority order for `mcp__maestro__tap_on`:

1. `id:` — testID / accessibilityIdentifier (most stable, preferred)
2. `text:` — visible label (fuzzy matching enabled by default)
3. `index:` — positional disambiguation when multiple matches exist
4. State filters — `enabled`, `checked`, `focused`, `selected` for narrowing

Platform-specific ID mapping:
- **React Native**: `testID` prop works as `id:` on both iOS and Android
- **Android native**: `contentDescription` for accessibility, `testTag` for Jetpack Compose
- **iOS native**: `.accessibilityIdentifier()` (SwiftUI), `accessibilityIdentifier` property (UIKit)

Combined filters: `mcp__maestro__tap_on(device_id, text: "Item", index: 2, enabled: true)`

---

## MCP Tool Reference

### Device Management

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__maestro__list_devices` | List available simulators and emulators | none |
| `mcp__maestro__start_device` | Start a simulator or emulator | `device_id` (string, optional) OR `platform` (string: `ios`/`android`, optional) — provide one |

### App Lifecycle

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__maestro__launch_app` | Launch app on device | `device_id` (required), `appId` (required) |
| `mcp__maestro__stop_app` | Stop app on device | `device_id` (required), `appId` (required) |

### Interaction

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__maestro__tap_on` | Tap a UI element | `device_id` (required), at least one of: `text` (string), `id` (string), `index` (int). Optional: `use_fuzzy_matching` (bool, default true), `enabled` (bool), `checked` (bool), `focused` (bool), `selected` (bool) |
| `mcp__maestro__input_text` | Type into focused field | `device_id` (required), `text` (required) |
| `mcp__maestro__back` | Press hardware back button | `device_id` (required) |

### Inspection

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__maestro__inspect_view_hierarchy` | Get screen elements as CSV | `device_id` (required). Returns: `element_num`, `depth`, `attributes`, `parent_num` — CSV format, token-efficient |
| `mcp__maestro__take_screenshot` | Capture screen as PNG | `device_id` (required) |

### Execution

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__maestro__run_flow` | Execute inline YAML commands | `device_id` (required), `flow_yaml` (required, string), `env` (optional, object). Accepts single command or full flow with headers |
| `mcp__maestro__run_flow_files` | Execute YAML flow files from disk | `device_id` (required), `flow_files` (required, comma-separated paths), `env` (optional, object) |
| `mcp__maestro__check_flow_syntax` | Validate YAML flow syntax | `flow_yaml` (required) |

### Reference

| Tool | Purpose | Key Params |
|---|---|---|
| `mcp__maestro__cheat_sheet` | Get Maestro command reference | none |
| `mcp__maestro__query_docs` | Query Maestro documentation | `question` (required) |

### run_flow Usage Patterns

`mcp__maestro__run_flow` is the workhorse for multi-step batching and assertions. Pass inline YAML:

**Single command:**
```yaml
- tapOn: Login
```

**Multi-step batch (form fill):**
```yaml
- tapOn:
    id: "email_field"
- inputText: "user@example.com"
- tapOn:
    id: "password_field"
- inputText: "secretpass"
- tapOn:
    id: "login_button"
```

**Assertions:**
```yaml
- assertVisible: "Welcome back"
- assertTrue:
    condition: "${output.loggedIn} == true"
```

**Clear state launch (fresh app start):**
```yaml
- clearState: com.example.app
- launchApp: com.example.app
```

**Video recording (YAML flow commands, NOT MCP tools):**
```yaml
- startRecording: test-evidence
- tapOn: Login
- inputText: "user@test.com"
- stopRecording
```

`startRecording` and `stopRecording` are Maestro YAML flow commands executed inside `run_flow` — they are NOT standalone MCP tools. Use sparingly, only for bug reproduction evidence.

---

## Workflow Patterns

### AD_HOC — Freeform Testing

1. **Detect device** — `mcp__maestro__list_devices` to find available simulators/emulators. `mcp__maestro__start_device` if none running
2. **Launch** — `mcp__maestro__launch_app` with target `appId` on the selected `device_id`
3. **Inspect** — `mcp__maestro__inspect_view_hierarchy` returns CSV of current screen. Parse for target elements only — never dump full CSV into context
4. **Interact** — execute instructions step-by-step using `mcp__maestro__tap_on`, `mcp__maestro__input_text`, `mcp__maestro__back`. Re-inspect after each action (observe-act-observe)
5. **Check** — `mcp__maestro__inspect_view_hierarchy` after error-likely interactions (form submits, navigation, assertions)
6. **Evidence on fail** — `mcp__maestro__take_screenshot` + `mcp__maestro__inspect_view_hierarchy` on every FAIL
7. **Report** — build test case results with evidence on failures

When running in parallel mode, each agent uses its own `device_id` from the device pool. Devices are fully isolated — no cross-agent state bleed.

### BUG_REPRO — Bug Reproduction

1. **Parse** bug document — extract numbered bugs with steps, expected/actual results
2. **Fresh app per bug** — `mcp__maestro__stop_app` + clear state via `mcp__maestro__run_flow` (`- clearState: <appId>` + `- launchApp: <appId>`) per bug to avoid state pollution
3. **Execute steps** — follow reproduction steps exactly as documented. Re-inspect after each step
4. **Evidence on fail** — `mcp__maestro__take_screenshot` + `mcp__maestro__inspect_view_hierarchy`. Evidence is mandatory for FAIL verdicts
5. **Fresh launch between bugs** — never carry app state from one bug to the next

Key: Isolation is paramount. Each bug gets a fresh clear-state launch cycle. If bug doc lacks structure, extract bugs by paragraph/section breaks.

When running in parallel mode, each agent uses its own `device_id`. `stop_app` + `clearState` + `launchApp` per bug on that device.

### PLAN_VERIFY — Acceptance Criteria Verification

1. **Extract** `Done when:` blocks from plan file. Fall back to bulleted checklist items
2. **Generate test cases** — one per acceptance criterion with action sequence and expected outcome
3. **Execute** using MCP tools — `mcp__maestro__launch_app`, `mcp__maestro__inspect_view_hierarchy`, interact by id/text, assertions via `mcp__maestro__run_flow` (`- assertVisible:`, `- assertTrue:`)
4. **Verdict per criterion** — PASS only when expected state is reached. Use `mcp__maestro__inspect_view_hierarchy` to confirm UI state matches expectations

Key: Use `mcp__maestro__run_flow` with `assertVisible` / `assertTrue` for programmatic assertions. Clean state per test case via `stop_app` + `clearState` + `launchApp`.

When running in parallel mode, each agent uses its own `device_id` for all MCP calls in that agent's scope.

### RECHECK — Re-run Previous Failures

1. **Load** `.ac/maestro-qa/{testName}.json` (testName derived from original target) — stop if not found
2. **Filter** to FAIL and BLOCKED items only — preserve original test case IDs
3. **Re-run** each item using MCP tools with fresh app state
4. **Diff report** — compare current vs previous verdicts, show which items changed status

Key: Output a diff table showing previous to current verdict changes.

When running in parallel mode, each agent uses its own `device_id` to keep re-run sessions isolated from any concurrently running agents.

### FLOW_RUN — Execute Existing YAML Flows

1. **List** YAML files in target directory (typically `.maestro/`) via Glob
2. **Validate** syntax with `mcp__maestro__check_flow_syntax` for each flow file
3. **Execute** via `mcp__maestro__run_flow_files` with comma-separated paths. Pass `env` object if environment variables needed
4. **Parse results** — extract pass/fail per flow file from execution output
5. **Report** — structured results with flow file paths, verdicts, and failure details

Key: No flow generation — runs existing `.maestro/` flows only. Use `mcp__maestro__run_flow_files` for batch execution, not `mcp__maestro__run_flow` with inline YAML.

When running in parallel mode, each agent runs a subset of flow files on its own `device_id`.

---

## Token Efficiency Strategies

1. **Hierarchy CSV from `inspect_view_hierarchy`** — returns CSV (element_num, depth, attributes, parent_num). Parse for target elements only; never dump full CSV output into context
2. **Screenshots via `take_screenshot`** — saved to disk, only paths in context. Screenshots are FAIL evidence only — do not screenshot after every step
3. **`run_flow` for multi-step batching** — replaces N individual MCP tool calls with 1 inline YAML block. Use for form fills, assertion sequences, clear-state launches
4. **App restart after ~20 interactions** — `mcp__maestro__stop_app` + `mcp__maestro__launch_app` to prevent context bloat from accumulated tool responses
5. **Hierarchy/screenshot checks only after error-likely interactions** — form submits, navigation, assertions. Not after every tap
6. **Video recording via `run_flow`** — `startRecording`/`stopRecording` are YAML flow commands inside `run_flow`, not separate MCP tools. Use sparingly — only for bug reproduction evidence where screenshots alone are insufficient

---

## Self-Healing Pattern

When an element interaction fails (element not found, selector mismatch, stale state):

1. **Re-inspect** — `mcp__maestro__inspect_view_hierarchy` to get fresh CSV of current screen state
2. **Search by semantic selector** — `id:` first, then `text:` with fuzzy matching enabled, then parent-relative context from CSV hierarchy. Check EFFECTIVE_KNOWLEDGE for known selectors that survived previous retries
3. **Retry** with updated selector — `mcp__maestro__tap_on` with new `id`, `text`, or `index` parameters
4. **Max 3 retries** — if all fail, mark test case `BLOCKED` with note: "Element not found after 3 retries: [description]"

Never fall back to coordinate-based selectors (`point: "50%,50%"`) — they are brittle and break across device sizes, orientations, and platform differences. `id:` and `text:` selectors are the only acceptable targeting strategies.

---

## Knowledge Capture Patterns

During a test run, capture non-obvious discoveries that would save the next agent time. Do not capture trivial facts (e.g., "app has a tab bar" — the next agent can see that). Only capture what required effort to discover.

### Reading Knowledge at Start

Before executing any test cases, load existing project knowledge:

1. Read `.ac/qa/knowledge/project.jsonl` via Read tool. If the file doesn't exist, proceed with empty knowledge.
2. Parse each line as a JSON object — each represents a previously learned fact.
3. Merge with `PRIOR_KNOWLEDGE` from the parent command (if provided). On same-key conflict, file-based knowledge wins.
4. Store as `EFFECTIVE_KNOWLEDGE` — use throughout execution for selector hints, timing guidance, permission dialog handling, and navigation awareness.

Project knowledge is cumulative across all test runs. A fact learned during ad-hoc testing of the login screen benefits a later plan-verify run that touches the same flows.

### What to capture

- **selector** — stable element IDs or text labels that survived retries or self-healing
- **flow** — unexpected navigation, multi-step auth sequences, deep link resolution paths
- **timing** — splash screen delays, animation waits, network-gated UI that required retries
- **gotcha** — OS dialogs, keyboard overlays, orientation changes, WebView quirks, error recoveries
- **permission** — OS permission dialogs (camera, location, notifications) — which button text to tap, timing delays before dialog appears
- **navigation** — deep link patterns (`myapp://path`), tab bar structure, drawer navigation paths, back stack behavior

### When to capture

- After successful self-healing (selector) — record the working id/text that survived after the stale one failed
- After permission dialog handling (permission) — record the button text, timing, and platform differences
- After deep link navigation resolved (navigation) — record the URI pattern and resulting screen
- After a wait-based retry succeeded (timing) — record the minimum wait or retry count required
- After recovering from an unexpected error (gotcha) — record what happened and what resolved it
- After redirect chain resolved (flow) — record the actual navigation path and intermediate screens

### Capture format

```json
{"type": "selector|flow|timing|gotcha|permission|navigation", "key": "<kebab-case-id>", "value": "<what to remember>", "confidence": "high|medium"}
```

Anti-pattern: Do not log obvious/trivial facts. If the next agent would discover it in one hierarchy inspect, skip it. Only capture discoveries that required multiple attempts or non-obvious reasoning to reach.

### Writing Knowledge to Disk

Write facts to disk immediately after each test case — do not wait until the end of the run.

**Write pattern** (via Bash — agent has no Write tool):

```bash
mkdir -p .ac/qa/knowledge/
echo '{"type":"selector","key":"login-btn","value":"id:login_button works, text:Login flaky on Android","confidence":"high"}' >> .ac/qa/knowledge/.mqa-{SESSION_NAME}.jsonl
```

**File naming**: `.mqa-{SESSION_NAME}.jsonl` — each agent writes to its own temp file. Parent merges all temp files into `project.jsonl` after execution.

**When to write**:

- After each test case completes, not at end of run
- Only write facts with `high` or `medium` confidence
- Skip if no new discoveries for this test case

**Why immediate writes matter**:

- Parallel agents: agent B can read what agent A wrote mid-run (if reading project.jsonl between test cases)
- Crash recovery: facts survive even if the agent terminates unexpectedly
- Cross-wave: Wave 2 agents get Wave 1 knowledge via the merged project.jsonl

---

## Reference Files

- **Report format specification**: `${CLAUDE_PLUGIN_ROOT}/skills/maestro-qa/references/report-format.md`

Load report-format.md for the structured JSON schema used in `.ac/maestro-qa/{testName}.json` persistence.

---

## Anti-Patterns

| Anti-Pattern | Why Wrong | Do Instead |
|---|---|---|
| Dumping full hierarchy CSV into context | Wastes tokens — CSV can be large on complex screens | Parse CSV for target elements only |
| Screenshots when hierarchy suffices | `take_screenshot` returns image data, costs tokens | Use `inspect_view_hierarchy`; screenshots only as FAIL evidence |
| 20+ interactions without app restart | Accumulated state may cause flakiness | `stop_app` + `launch_app` after ~20 interactions |
| Hardcoded coordinates (`point: "50%,50%"`) | Brittle — breaks across devices, orientations, platforms | Use `id:` or `text:` selectors exclusively |
| Skipping evidence on FAIL | Unverifiable failures waste debugging time | `take_screenshot` + `inspect_view_hierarchy` on every FAIL |
| One MCP call per form field | N round trips wastes time and tokens | Batch with `run_flow` inline YAML |
| Waiting until end to write knowledge | Facts lost on crash, parallel agents can't benefit mid-run | Write to `.mqa-{SESSION_NAME}.jsonl` after each test case |
| Using Maestro Studio for element discovery | Browser-based UI, not agent-drivable | Use `inspect_view_hierarchy` MCP tool |
