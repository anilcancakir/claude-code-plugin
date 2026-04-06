---
name: browser-qa
description: "Browser QA workflow patterns and Playwright CLI integration. Loaded by /ac:browser-qa command."
user-invocable: false
---

# Browser QA — Testing Knowledge Base

Browser-based QA testing via Playwright CLI (`playwright-cli`). This skill provides workflow patterns, token efficiency strategies, and self-healing patterns used by the `/ac:browser-qa` command. Report format lives in `references/report-format.md`. Shared cross-backend patterns (knowledge system, test modes, parallel execution, evidence persistence) live in the plugin-level `../../references/qa-patterns.md` — read it for conventions shared with maestro-qa and flutter-qa. This file distills orchestration knowledge and CLI-specific patterns.

---

## Playwright CLI Essentials

### Installation and Verification

- Install: `npm install -g @playwright/cli@latest` ([docs](https://github.com/microsoft/playwright-cli))
- Verify: `playwright-cli --version`

### Architecture

Snapshots and screenshots write to disk (`.playwright-cli/`), never into context — ~4x token reduction vs tool-call-based approaches. Read only the relevant portion of snapshot YAML when targeting elements; never dump the entire tree into context.

### Session Management

- Start named session: `playwright-cli open -s=<name> <url>`
- Default session via env: `PLAYWRIGHT_CLI_SESSION=<name>`
- Close session: `playwright-cli close -s=<name>`
- **Parallel sessions** — each parallel agent uses its own `-s=bqa-{index}` (e.g., `bqa-0`, `bqa-1`). Sessions are fully isolated: independent cookies, storage, and cache — no cross-agent state bleed
- Cleanup: `playwright-cli close -s=bqa-{index}` per agent when done; `playwright-cli close-all` as fallback if agents exit without closing
- **Max concurrent sessions**: 4 — beyond this, resource contention degrades reliability and screenshot timing

### Headed Mode

- Add `--headed` to `playwright-cli open` to show the browser UI: `playwright-cli open --headed <url>`
- Use for: debugging failures visually, demoing to stakeholders, recording screen captures
- Default is headless (no flag) — preferred for CI and automated runs
- Env var alternative: `PLAYWRIGHT_MCP_HEADLESS=false` (applies to all sessions in the process)

### Element Targeting

- `ref` values from snapshot YAML (e.g., `e15`) — preferred, most stable
- CSS selectors (`#id`, `.class`) — acceptable for stable, semantic selectors
- Role selectors (`role=button[name=Submit]`) — preferred for semantic recovery

### Key Commands Quick Reference

| Command | Purpose |
|---------|---------|
| `playwright-cli open <url>` | Open browser and navigate to URL |
| `playwright-cli goto <url>` | Navigate current session to URL |
| `playwright-cli snapshot` | Capture accessibility tree as YAML to disk |
| `playwright-cli click <ref>` | Click element by ref or selector |
| `playwright-cli fill <ref> <value>` | Fill input field |
| `playwright-cli type <ref> <value>` | Type into focused element |
| `playwright-cli screenshot --filename=<path>` | Capture screenshot to disk |
| `playwright-cli console` | Read current console messages |
| `playwright-cli network` | Read current network request log |
| `playwright-cli eval <expression>` | Evaluate JavaScript in page context |
| `playwright-cli close` | Close browser session |
| `playwright-cli run-code "async page => { ... }"` | Execute multi-step code batch |

---

## Workflow Patterns

### AD_HOC — Freeform Testing

1. **Detect dev server** — `lsof -i -P | grep LISTEN` to find local ports. Suggest URL if found
2. **Open** — `playwright-cli open <url>` to start session
3. **Snapshot** — `playwright-cli snapshot` writes YAML to disk. Read only the relevant subtree — search for target element by ref or role, never read entire file into context
4. **Interact** — execute instructions step-by-step using ref values from snapshot. Re-snapshot after each action (observe-act-observe)
5. **Check** — `playwright-cli console` and `playwright-cli network` after error-likely interactions (form submits, navigations, API calls)
6. **Report** — build test case results with evidence on failures
7. **Close** — `playwright-cli close` when done

When running in parallel mode, use the session name provided by the command (e.g., `-s=bqa-0`) on every `playwright-cli open` call.

### BUG_REPRO — Bug Reproduction

1. **Parse** bug document — extract numbered bugs with steps, expected/actual results
2. **Fresh session per bug** — `playwright-cli open` + `playwright-cli close` per bug to avoid state pollution
3. **Execute steps** — follow reproduction steps exactly as documented using playwright-cli commands. Re-snapshot after each step
4. **Evidence on fail** — `playwright-cli screenshot --filename=<path>` + `playwright-cli console` + `playwright-cli network`. Evidence is mandatory for FAIL verdicts
5. **Fresh open between bugs** — never carry session state from one bug to the next

Key: Isolation is paramount. Each bug gets a fresh `playwright-cli open` / `playwright-cli close` cycle. If bug doc lacks structure, extract bugs by paragraph/section breaks.

When running in parallel mode, use the session name provided by the command (e.g., `-s=bqa-1`) so each parallel agent's sessions remain isolated.

### PLAN_VERIFY — Acceptance Criteria Verification

1. **Extract** `Done when:` blocks from plan file. Fall back to bulleted checklist items
2. **Generate test cases** — one per acceptance criterion with action sequence and expected outcome
3. **Execute** using playwright-cli — `playwright-cli open`, `playwright-cli snapshot`, interact by ref, `playwright-cli eval` for assertions
4. **Verdict per criterion** — PASS only when expected state is reached with no console errors or network failures

Key: Use `playwright-cli eval` for programmatic assertions (e.g., `document.querySelector('.result').textContent`). Clean state per test case via fresh `open`/`close`.

When running in parallel mode, use the session name provided by the command (e.g., `-s=bqa-2`) on every `playwright-cli open` call in this agent's scope.

### RECHECK — Re-run Previous Failures

1. **Load** `.ac/browser-qa/{testName}.json` (testName derived from original target) — stop if not found
2. **Filter** to FAIL and BLOCKED items only — preserve original test case IDs
3. **Re-run** each item using playwright-cli (no backend field lookup needed)
4. **Diff report** — compare current vs previous verdicts, show which items changed status

Key: Output a diff table showing previous→current verdict changes.

When running in parallel mode, use the session name provided by the command (e.g., `-s=bqa-3`) to keep re-run sessions isolated from any concurrently running agents.

---

## Token Efficiency Strategies

1. **Snapshots on disk (YAML)** — `playwright-cli snapshot` writes to `.playwright-cli/`. Files never enter context unless explicitly read. Search YAML for target element, read only relevant lines
2. **Screenshots on disk (PNG)** — `playwright-cli screenshot` writes to disk. Only file paths enter context, never image data. Screenshots are FAIL evidence only
3. **`run-code` for multi-step batching** — `playwright-cli run-code "async page => { ... }"` replaces N individual playwright-cli calls with 1 Bash call
4. **Read only relevant snapshot portion** — search snapshot YAML for target ref or role, extract 5-20 lines around the element. Never dump entire YAML into context
5. **Re-navigate after ~20 interactions** — `playwright-cli close` + `playwright-cli open` to prevent accumulated stdout bloating context
6. **Console/network only after error-likely interactions** — check after form submits, navigations, and API calls — not after every step

---

## Self-Healing Pattern

When an element interaction fails (ref not found, selector mismatch, stale element):

1. **Re-snapshot** — `playwright-cli snapshot` to get fresh YAML of current DOM state
2. **Search by semantic role/label** — find element by accessible role (`button`, `link`, `textbox`), accessible name, or nearby landmark context
3. **Retry** with updated ref — use the new `ref` value from the fresh snapshot YAML
4. **Max 3 retries** — if all fail, mark test case `BLOCKED` with note: "Element not found after 3 retries: [description]"

Never fall back to generic CSS class selectors — they are brittle and break on class rename or build hash change. Role selectors (`role=button[name=Submit]`) are the only acceptable fallback after ref-based targeting fails.

---

## Knowledge Capture Patterns

During a test run, capture non-obvious discoveries that would save the next agent time. Do not capture trivial facts (e.g., "page has a header" — the next agent can see that). Only capture what required effort to discover.

### Reading Knowledge at Start

Before executing any test cases, load existing project knowledge:

1. Read `.ac/qa/knowledge/project.jsonl` via Read tool. If the file doesn't exist, proceed with empty knowledge.
2. Parse each line as a JSON object — each represents a previously learned fact.
3. Merge with `PRIOR_KNOWLEDGE` from the parent command (if provided). On same-key conflict, file-based knowledge wins.
4. Store as `EFFECTIVE_KNOWLEDGE` — use throughout execution for selector hints, timing guidance, and flow awareness.

Project knowledge is cumulative across all test runs. A fact learned during ad-hoc testing of `/register` benefits a later plan-verify run that touches the same pages.

### What to capture

- **Reliable selectors** — recovered during self-healing (the winning ref or role selector after a retry cycle)
- **Auth/nav flows** — redirect chains, multi-step login sequences, session setup paths
- **Timing requirements** — waits or retries that were necessary before an element appeared or an assertion passed
- **Unexpected behaviors** — error recoveries, edge-case states, undocumented side effects that affected the test

### When to capture

- After successful self-healing (selector) — record the working ref or role that survived after the stale one failed
- After a redirect chain resolved (flow) — record the actual final URL and intermediate steps
- After a wait-based retry succeeded (timing) — record the minimum wait or retry count required
- After recovering from an unexpected error (gotcha) — record what happened and what resolved it

### Capture format

```json
{ "type": "selector|flow|timing|gotcha", "key": "<human-readable identifier>", "value": "<what to remember>", "confidence": "high|medium|low" }
```

Anti-pattern: Do not log obvious/trivial facts. If the next agent would discover it in one snapshot, skip it. Only capture discoveries that required multiple attempts or non-obvious reasoning to reach.

### Writing Knowledge to Disk

Write facts to disk immediately after each test case — do not wait until the end of the run.

**Write pattern** (via Bash — agent has no Write tool):

```bash
mkdir -p .ac/qa/knowledge/
echo '{"type":"selector","key":"cookie-dismiss-btn","value":"role=button[name=Accept All]","confidence":"high"}' >> .ac/qa/knowledge/.bqa-{SESSION_NAME}.jsonl
```

**File naming**: `.bqa-{SESSION_NAME}.jsonl` — each agent writes to its own temp file. Parent merges all temp files into `project.jsonl` after execution.

**When to write**:

- After each test case completes (step 8 in Execution Loop), not at end of run
- Only write facts with `high` or `medium` confidence
- Skip if no new discoveries for this test case

**Why immediate writes matter**:

- Parallel agents: agent B can read what agent A wrote mid-run (if reading project.jsonl between test cases)
- Crash recovery: facts survive even if the agent terminates unexpectedly
- Cross-wave: Wave 2 agents get Wave 1 knowledge via the merged project.jsonl

---

## Reference Files

- **Report format specification**: `${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/report-format.md`

Load report-format.md for the structured JSON schema used in `.ac/browser-qa/{testName}.json` persistence.

---

## Anti-Patterns

| Anti-Pattern | Why Wrong | Do Instead |
|---|---|---|
| Reading full snapshot YAML into context | Wastes tokens — YAML files can be large | Search for target ref/role, read only relevant lines |
| Screenshots when snapshot suffices | PNG files large if read into context | Use `playwright-cli snapshot`; screenshots only as FAIL evidence (saved to disk) |
| 20+ interactions without re-opening | Accumulated stdout bloats context | `playwright-cli close` + `playwright-cli open` after ~20 |
| Hardcoding CSS selectors | Brittle — break on class rename | Use `ref` from snapshot YAML, or role selectors |
| Skipping evidence on FAIL | Unverifiable failures waste debugging time | `playwright-cli screenshot --filename=<path>` + `playwright-cli console` + `playwright-cli network` |
| One command per form field | N Bash calls wastes round trips | Batch with `playwright-cli run-code "async page => { ... }"` |
| Waiting until all tests finish to write knowledge | Facts lost on crash, parallel agents can't benefit mid-run | Write to `.bqa-{SESSION_NAME}.jsonl` after each test case via Bash echo |
