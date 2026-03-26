---
name: browser-qa
description: "Browser QA workflow patterns and MCP backend routing. Loaded by /ac:browser-qa command."
user-invocable: false
---

# Browser QA — Testing Knowledge Base

Browser-based QA testing via MCP backends. This skill provides the routing logic, workflow patterns, token efficiency strategies, and self-healing patterns used by the `/ac:browser-qa` command. Tool schemas live in `references/mcp-backends.md` — this file distills decision patterns and orchestration knowledge.

---

## Quick Routing Reference

### Decision Tree

```
1. Existing Chrome session needed?
   ├─ + DevTools/performance → Chrome DevTools MCP
   ├─ + Semantic tab search  → mcp-chrome
   └─ + Full Playwright API  → playwriter
2. Performance profiling / Lighthouse? → Chrome DevTools MCP
3. Headless CI / Docker?              → Playwright MCP
4. Stateful multi-step flows?         → playwriter
5. Default                            → Playwright MCP
```

### Capability Overview

| | Playwright MCP | Chrome DevTools MCP | mcp-chrome | playwriter |
|-|---------------|-------------------|------------|------------|
| Tool count | 21 + 38 optional | 29 | 22 | 2 |
| Existing Chrome | No | Yes | Yes | Yes |
| Headless | Yes | No | No | Yes |
| Token cost | ~13.7K (lowest) | ~19K | Unknown | Low |

Full tool schemas and parameters → `${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/mcp-backends.md`

---

## Workflow Patterns

### AD_HOC — Freeform Testing

1. **Detect dev server** — `lsof -i -P | grep LISTEN` to find local ports. Suggest URL if found
2. **Navigate** to target URL with selected backend's navigate tool
3. **Snapshot** — take accessibility snapshot (NOT screenshot). Scope to relevant subtree with `selector` param when page is large
4. **Interact** — execute user's instructions step-by-step. Re-snapshot after each action (observe-act-observe)
5. **Check** — inspect console messages and network requests for errors after each interaction
6. **Report** — build test case results with evidence on failures

Key: Scope snapshots to subtree (`{selector: "#main-content"}`) to reduce token usage. Default to Playwright MCP unless task signals suggest another backend.

### BUG_REPRO — Bug Reproduction

1. **Parse** bug document — extract numbered bugs with steps, expected/actual results
2. **Clean state per bug** — navigate fresh for each bug to avoid state pollution
3. **Execute steps** — follow reproduction steps exactly as documented. Re-snapshot after each step
4. **Evidence on fail** — screenshot + console errors + network failures. Evidence is mandatory for FAIL verdicts
5. **Navigate fresh** between bugs — never carry session state from one bug to the next

Key: Isolation is paramount. Each bug gets a fresh navigation. If bug doc lacks structure, extract bugs by paragraph/section breaks.

### PLAN_VERIFY — Acceptance Criteria Verification

1. **Extract** `Done when:` blocks from plan file. Fall back to bulleted checklist items
2. **Generate test cases** — one per acceptance criterion with action sequence and expected outcome
3. **Execute** with assertion tools — use `--caps=testing` for Playwright MCP to enable `browser_expect_*` tools
4. **Verdict per criterion** — PASS only when expected state is reached with no errors

Key: Use `--caps=testing` to unlock Playwright's assertion tools. Clean state per test case.

### RECHECK — Re-run Previous Failures

1. **Load** `.browser-qa/last-report.json` — stop if not found
2. **Filter** to FAIL and BLOCKED items only — preserve original test case IDs
3. **Re-run** each item using the same backend as the original run (from `backend` field in JSON)
4. **Diff report** — compare current vs previous verdicts, show which items changed status

Key: Preserve original backend selection. Output a diff table showing previous→current verdict changes.

---

## Token Efficiency Strategies

1. **Batch multi-step flows** — use `browser_run_code` (Playwright MCP) or `execute` (playwriter) for sequences. 1 tool call replaces N individual calls
2. **Snapshots over screenshots** — accessibility snapshots are text (cheap). Screenshots are images (expensive). Use screenshots only as FAIL evidence
3. **Scope snapshots to subtree** — pass `selector` param to `browser_snapshot` (e.g., `{selector: "#registration-form"}`) to get only the relevant DOM subtree
4. **Re-navigate after ~20 interactions** — close and re-navigate to prevent context window bloat from accumulated snapshot data
5. **Auto-return snapshots** — for Chrome DevTools MCP, pass `includeSnapshot: true` on interaction tools to get snapshot in the same response (halves round trips)
6. **Prefer evaluate for data extraction** — use `browser_evaluate` / `evaluate_script` / `chrome_inject_script` to extract structured data instead of parsing snapshot text
7. **Minimize console/network polling** — check console and network only after interactions that could produce errors, not after every single step

---

## Self-Healing Pattern

When an element interaction fails (ref not found, selector mismatch, stale element):

1. **Re-snapshot** — get fresh accessibility tree of current DOM state
2. **Search by semantic role/label** — find element by accessible role (`button`, `link`, `textbox`), accessible name, or nearby landmark context. Never fall back to CSS class selectors
3. **Retry** with updated ref/uid — use the new identifier from the fresh snapshot
4. **Max 3 retries** — if all fail, mark test case `BLOCKED` with note: "Element not found after 3 retries: [description]"

Never fall back to CSS selectors — they are brittle and break across deploys. Semantic targeting (role + label) is the only acceptable recovery strategy.

---

## Reference Files

- **MCP backend tool schemas and routing matrix**: `${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/mcp-backends.md`
- **Report format specification (JSON + Markdown)**: `${CLAUDE_PLUGIN_ROOT}/skills/browser-qa/references/report-format.md`

Load mcp-backends.md for complete tool parameter schemas when constructing tool calls. Load report-format.md for the structured JSON schema used in `.browser-qa/last-report.json` persistence.

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do Instead |
|-------------|---------------|------------|
| Screenshots when snapshot suffices | Image tokens 10-50x more expensive than text snapshots | Use `browser_snapshot` / `take_snapshot`; screenshots only as FAIL evidence |
| 20+ interactions without re-navigating | Context window bloats with accumulated snapshot data | Close and re-navigate after ~20 interactions |
| Hardcoding CSS selectors | Brittle — break on any class rename or build hash change | Use `ref` (Playwright), `uid` (DevTools), or semantic role/label |
| Skipping evidence on FAIL | Unverifiable failures waste the user's debugging time | Always capture screenshot + console + network on FAIL |
| Testing in existing Chrome when clean state needed | Session cookies, local storage, extensions pollute test environment | Use Playwright MCP (own browser) for tests requiring clean state |
| One tool call per form field | N tool calls for N fields wastes tokens and round trips | Batch with `browser_fill_form` or `browser_run_code` / `execute` |
| Polling console after every step | Unnecessary round trips when most steps produce no errors | Check console after interactions likely to trigger errors (form submits, navigations) |
