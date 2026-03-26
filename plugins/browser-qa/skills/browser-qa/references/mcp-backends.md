## Version Pin

| Backend | Source | Snapshot Date |
|---------|--------|---------------|
| Playwright MCP | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | 2026-03-26 |
| Chrome DevTools MCP | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | 2026-03-26 |
| mcp-chrome | [hangwin/mcp-chrome](https://github.com/hangwin/mcp-chrome) | 2026-03-26 |
| playwriter | [remorses/playwriter](https://github.com/remorses/playwriter) | 2026-03-26 |

Update policy: Re-verify tool names before each major version bump. Tool names are the contract — parameter changes are less critical.

---

## Routing Decision Matrix

### Which Backend Should I Use?

```
1. Need to attach to user's existing Chrome session?
   ├─ Yes, need DevTools/performance → chrome-devtools-mcp (autoConnect)
   ├─ Yes, need semantic tab search or bookmarks → mcp-chrome
   └─ Yes, need full Playwright API on real Chrome → playwriter

2. Need performance profiling / Lighthouse?
   └─ Yes → chrome-devtools-mcp (exclusive capability)

3. Need headless CI / Docker?
   └─ Yes → Playwright MCP (only backend with headless + Docker)

4. Need stateful multi-step flows with full Playwright API?
   └─ Yes → playwriter (state persists between execute calls)

5. Default → Playwright MCP
   (lowest token cost, most tools, cleanest API, snapshot-based)
```

### Task Routing Table

| Task Type | Best Backend | Fallback | Why |
|-----------|-------------|----------|-----|
| Ad-hoc page test (navigate, click, verify) | Playwright MCP | playwriter | Clean state, snapshot-based, lowest token cost (~13.7K) |
| Console error inspection | Chrome DevTools MCP | mcp-chrome | Deep console access with message types, preserved messages |
| Network request debugging | Chrome DevTools MCP | mcp-chrome | Request/response body access, resource type filtering |
| Existing Chrome session access | chrome-devtools-mcp (autoConnect) | mcp-chrome, playwriter | Attaches to user's running Chrome without restart |
| Multi-step form flow | playwriter | Playwright MCP (`browser_run_code`) | Stateful sessions, full Playwright API in single execute call |
| Performance audit | Chrome DevTools MCP | — | Lighthouse, traces, Core Web Vitals (exclusive capability) |
| Headless CI testing | Playwright MCP | — | `--headless` flag, cross-browser, Docker support |
| Screenshot comparison | Playwright MCP | Chrome DevTools MCP | Full-page screenshots, element targeting, file save |
| Bug reproduction (from doc) | Playwright MCP | playwriter | Clean state per bug, structured tool calls match step-by-step |
| Plan AC verification | Playwright MCP | playwriter | Clean state, assertion tools (`--caps=testing`) |
| Accessibility audit (WCAG) | Chrome DevTools MCP | Playwright MCP (`browser_snapshot`) | `lighthouse_audit` covers a11y/SEO/best-practices |
| Cookie/storage manipulation | Playwright MCP (`--caps=storage`) | — | 17 dedicated storage tools |
| Network mocking/interception | Playwright MCP (`--caps=network`) | — | `browser_route` with pattern matching |
| Browser history/bookmarks | mcp-chrome | — | Only backend with `chrome_history`, `chrome_bookmark_*` |
| Video recording | playwriter | Playwright MCP (`--caps=devtools`) | `recording.start/stop()` built-in |

### Capability Comparison

| Capability | Playwright MCP | Chrome DevTools MCP | mcp-chrome | playwriter |
|------------|---------------|-------------------|------------|------------|
| Tool count | 21 core + 38 optional | 29 | 22 | 2 (execute, reset) |
| Existing Chrome | No (own browser) | Yes (autoConnect) | Yes (extension) | Yes (extension) |
| Headless | Yes (`--headless`) | No | No | Yes (`--headless`) |
| Token cost | ~13.7K | ~19K | Unknown | Low (single execute) |
| Accessibility tree | `browser_snapshot` | `take_snapshot` | `chrome_get_interactive_elements` | `snapshot()` built-in |
| Console access | `browser_console_messages` | `list_console_messages` / `get_console_message` | `chrome_console` | `getLatestLogs()` |
| Network access | `browser_network_requests` | `list_network_requests` / `get_network_request` | `chrome_network_*` (4 tools) | Via CDP |
| JS execution | `browser_evaluate`, `browser_run_code` | `evaluate_script` | `chrome_inject_script` | `execute` (full Playwright) |
| Screenshot | `browser_take_screenshot` | `take_screenshot` | `chrome_screenshot` | Via `execute` |
| Performance | No (unless `--caps=devtools`) | Lighthouse + traces + heap | No | No |
| Session state | Stateless (per-tool) | Stateful (page selected) | Stateful (extension) | Stateful (session + state obj) |
| Network interception | `browser_route` (`--caps=network`) | No | No | Via CDP |
| Storage manipulation | 17 tools (`--caps=storage`) | No | No | Via `execute` |
| Video recording | `browser_start_video` (`--caps=devtools`) | No | No | `recording.start/stop()` |
| Cross-browser | Yes (Chromium, Firefox, WebKit) | Chrome only | Chrome only | Chrome only |
| Docker support | Yes (`mcr.microsoft.com/playwright/mcp`) | No | No | No |

---

## Runtime Detection

The browser-qa command detects available backends by probing for known MCP tool patterns. The `mcp__<name>__` prefix depends on what the user passes to `claude mcp add <name>`.

### Recommended Setup Commands (Standardized Names)

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --autoConnect
npm i -g mcp-chrome-bridge && claude mcp add chrome -- npx mcp-chrome-bridge
claude mcp add playwriter -- playwriter mcp
```

### Detection Patterns

| Backend | Recommended Name | Probe Tool | Detection Pattern |
|---------|-----------------|------------|-------------------|
| Playwright MCP | `playwright` | `mcp__playwright__browser_navigate` | Any `mcp__playwright__*` |
| Chrome DevTools MCP | `chrome-devtools` | `mcp__chrome-devtools__navigate_page` | Any `mcp__chrome-devtools__*` |
| mcp-chrome | `chrome` | `mcp__chrome__chrome_navigate` | Any `mcp__chrome__*` |
| playwriter | `playwriter` | `mcp__playwriter__execute` | Any `mcp__playwriter__*` |

**Detection order**: Probe in priority order (Playwright MCP first, then chrome-devtools, mcp-chrome, playwriter). Use the first available backend that matches the task type from the routing table.

**Fallback**: If no MCP browser tools are detected, display setup guide with recommended install commands.

---

## Backend 1: Playwright MCP

**Package**: `@playwright/mcp` by Microsoft
**Stars**: 18K+ | **License**: Apache-2.0
**MCP prefix**: `mcp__playwright__<tool>`
**Setup**: `claude mcp add playwright -- npx @playwright/mcp@latest`

### Modes

| Mode | Flag | Behavior |
|------|------|----------|
| Snapshot (default) | none | Accessibility tree — token-efficient, deterministic, no vision model needed |
| Vision | `--caps=vision` | Coordinate-based mouse interactions, requires screenshots |
| Headless | `--headless` | No visible browser window — CI/Docker ready |
| Headed (default) | none | Visible browser window |

### Core Tools (21 — always available)

#### Navigation

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_navigate` | Navigate to URL | `url: string` (required) |
| `browser_navigate_back` | Go back in history | — |
| `browser_close` | End browser session | — |
| `browser_resize` | Set viewport size | `width: number` (required), `height: number` (required) |

#### Interaction

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_click` | Click element | `ref: string` (required — from snapshot), `element?: string`, `selector?: string`, `doubleClick?: boolean`, `button?: string`, `modifiers?: array` |
| `browser_type` | Type text into element | `ref: string` (required), `text: string` (required), `element?: string`, `selector?: string`, `submit?: boolean`, `slowly?: boolean` |
| `browser_fill_form` | Fill multiple form fields | `fields: array` (required — `[{ref, value}]`) |
| `browser_select_option` | Select dropdown option | `ref: string` (required), `values: array` (required), `element?: string`, `selector?: string` |
| `browser_hover` | Hover over element | `ref: string` (required), `element?: string`, `selector?: string` |
| `browser_drag` | Drag and drop | `startRef: string` (required), `endRef: string` (required), `startElement?: string`, `startSelector?: string`, `endElement?: string`, `endSelector?: string` |
| `browser_press_key` | Press keyboard key | `key: string` (required — e.g. `"Enter"`, `"Control+A"`) |
| `browser_file_upload` | Upload file(s) | `paths: array` (required) |
| `browser_handle_dialog` | Handle alert/confirm/prompt | `accept: boolean` (required), `promptText?: string` |

#### Observation

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_snapshot` | Get accessibility tree (default capture) | `filename?: string`, `selector?: string` |
| `browser_take_screenshot` | Capture visual screenshot | `type: string` (required), `filename?: string`, `element?: string`, `ref?: string`, `selector?: string`, `fullPage?: boolean` |
| `browser_console_messages` | Get console output | `level: string` (required), `all?: boolean`, `filename?: string` |
| `browser_network_requests` | Get network activity since load | `includeStatic: boolean` (required), `filename?: string` |

#### Execution

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_evaluate` | Execute JS on page | `function: string` (required), `element?: string`, `ref?: string`, `selector?: string` |
| `browser_run_code` | Run Playwright script | `code: string` (required — async function receiving `page` object) |

#### Tabs & Wait

| Tool | Description | Parameters |
|------|-------------|------------|
| `browser_tabs` | Tab management | `action: string` (required — list/create/close/select), `index?: number` |
| `browser_wait_for` | Wait for condition | `time?: number`, `text?: string`, `textGone?: string` (at least one required) |

### Optional Capabilities (`--caps=<cap>`)

Enable with comma-separated flags: `--caps=storage,network,devtools,testing`

**`--caps=storage`** (17 tools):
`browser_cookie_get`, `browser_cookie_set`, `browser_cookie_delete`, `browser_cookie_list`, `browser_cookie_clear`,
`browser_localstorage_get`, `browser_localstorage_set`, `browser_localstorage_delete`, `browser_localstorage_list`, `browser_localstorage_clear`,
`browser_sessionstorage_get`, `browser_sessionstorage_set`, `browser_sessionstorage_delete`, `browser_sessionstorage_list`, `browser_sessionstorage_clear`,
`browser_storage_state` (save), `browser_set_storage_state` (restore)

**`--caps=network`** (4 tools):
`browser_route` (`pattern: string`, `status?: number`, `body?: string`, `contentType?: string`, `headers?: object`),
`browser_unroute`, `browser_route_list`, `browser_network_state_set`

**`--caps=vision`** (6 tools):
`browser_mouse_click_xy` (`x`, `y`, `button?`, `clickCount?`, `delay?`),
`browser_mouse_drag_xy` (`startX`, `startY`, `endX`, `endY`),
`browser_mouse_move_xy`, `browser_mouse_wheel` (`deltaX`, `deltaY`),
`browser_mouse_down`, `browser_mouse_up`

**`--caps=devtools`** (4 tools):
`browser_start_tracing`, `browser_stop_tracing`,
`browser_start_video` (`size?: {width, height}`), `browser_stop_video` (`filename?: string`)

**`--caps=pdf`** (1 tool):
`browser_pdf_save` (`filename?: string`)

**`--caps=testing`** (5 tools):
`browser_verify_element_visible` (`role`, `accessibleName`),
`browser_verify_text_visible` (`text`),
`browser_verify_value`, `browser_verify_list_visible`,
`browser_generate_locator`

**`--caps=config`** (1 tool):
`browser_get_config`

**Total**: 21 core + 38 optional = 59 registered tools

### Token Efficiency Notes

- Default snapshot mode uses accessibility tree — structured text, not images. ~50K tokens per full page snapshot
- `browser_run_code` executes multi-step Playwright scripts in 1 tool call — only script output returns to context (vs N individual tool calls)
- Limit `browser_snapshot` calls — each returns full a11y tree. Use `selector` param to scope
- Close and re-navigate vs 20+ interactions in one session (context buildup)

---

## Backend 2: Chrome DevTools MCP

**Package**: `chrome-devtools-mcp` by Google Chrome DevTools team
**Stars**: 31.7K+ | **License**: Apache-2.0
**MCP prefix**: `mcp__chrome-devtools__<tool>`
**Setup**: `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --autoConnect`

### autoConnect Mode

Automatically attaches to a locally running Chrome (v144+) without launching a new browser instance:
1. User navigates to `chrome://inspect/#remote-debugging` in Chrome
2. Enables the remote debugging toggle
3. MCP server shows a permission dialog — clicking Allow grants DevTools access
4. No `--remote-debugging-port` flag needed (unlike older versions)

Flag: `--autoConnect` (boolean). Optional `--channel` param selects which user data directory (default, canary, etc.).

### Tools by Category (29 total)

#### Navigation (8 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_pages` | List open pages with IDs | — |
| `select_page` | Set context for future calls | `pageId: number` (required), `bringToFront?: boolean` |
| `new_page` | Open URL in new tab | `url: string` (required), `background?: boolean`, `isolatedContext?: string`, `timeout?: number` |
| `navigate_page` | Navigate or reload | `type?: "url"\|"back"\|"forward"\|"reload"`, `url?: string`, `ignoreCache?: boolean`, `handleBeforeUnload?: "accept"\|"decline"`, `initScript?: string`, `timeout?: number` |
| `close_page` | Close tab (not last) | `pageId: number` (required) |
| `resize_page` | Set viewport dimensions | `width: number` (required), `height: number` (required) |
| `wait_for` | Wait for text to appear | `text: string[]` (required, min 1), `timeout?: number` |
| `get_tab_id` | Get Chrome tab ID | `pageId: number` (required) — experimental |

#### Input Automation (9 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `click` | Click element by uid | `uid: string` (required — from `take_snapshot`), `dblClick?: boolean`, `includeSnapshot?: boolean` |
| `click_at` | Click at coordinates | `x: number` (required), `y: number` (required), `dblClick?: boolean`, `includeSnapshot?: boolean` |
| `hover` | Hover over element | `uid: string` (required), `includeSnapshot?: boolean` |
| `fill` | Fill input or select option | `uid: string` (required), `value: string` (required), `includeSnapshot?: boolean` |
| `type_text` | Type into focused element | `text: string` (required), `submitKey?: string` |
| `drag` | Drag element to element | `from_uid: string` (required), `to_uid: string` (required), `includeSnapshot?: boolean` |
| `fill_form` | Fill multiple fields | `elements: array` (required — `[{uid, value}]`), `includeSnapshot?: boolean` |
| `upload_file` | Upload file | `uid: string` (required), `filePath: string` (required), `includeSnapshot?: boolean` |
| `press_key` | Press key combination | `key: string` (required — e.g. `"Enter"`, `"Control+A"`), `includeSnapshot?: boolean` |

#### Emulation (1 tool)

| Tool | Description | Parameters |
|------|-------------|------------|
| `emulate` | Emulate device | device params (varies) |

#### Debugging (6 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `take_snapshot` | Get a11y tree of current page | `verbose?: boolean` (default false), `filePath?: string` |
| `take_screenshot` | Capture screenshot | `format?: "png"\|"jpeg"\|"webp"`, `quality?: number` (0-100), `uid?: string`, `fullPage?: boolean`, `filePath?: string`. Cannot combine `uid` + `fullPage`. Auto-saves if >2MB |
| `evaluate_script` | Run JS on page | `function: string` (required), `args?: string[]` (element uids), `pageId?: string`, `serviceWorkerId?: string`. Return must be JSON-serializable |
| `list_console_messages` | List console entries | `pageSize?: number`, `pageIdx?: number`, `types?: array`, `includePreservedMessages?: boolean` (default false — last 3 navs) |
| `get_console_message` | Get single message | `msgid: number` (required) |
| `lighthouse_audit` | Run Lighthouse audit | `mode?: "navigation"\|"snapshot"` (default navigation), `device?: "desktop"\|"mobile"` (default desktop), `outputDirPath?: string`. Covers: accessibility, SEO, best-practices (excludes performance) |

**Console message types**: log, debug, info, error, warn, dir, dirxml, table, trace, clear, startGroup, startGroupCollapsed, endGroup, assert, profile, profileEnd, count, timeEnd, verbose, issue

#### Network (2 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_network_requests` | List requests since navigation | `pageSize?: number`, `pageIdx?: number`, `resourceTypes?: array`, `includePreservedRequests?: boolean` (default false) |
| `get_network_request` | Get request details + body | `reqid?: number` (if omitted, returns DevTools-selected request), `requestFilePath?: string`, `responseFilePath?: string` |

**Resource types**: document, stylesheet, image, media, font, script, texttrack, xhr, fetch, prefetch, eventsource, websocket, manifest, signedexchange, ping, cspviolationreport, preflight, fedcm, other

#### Performance (3 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `performance_start_trace` | Start perf trace | `reload?: boolean` (default true), `autoStop?: boolean` (default true), `filePath?: string` |
| `performance_stop_trace` | Stop trace recording | `filePath?: string` |
| `performance_analyze_insight` | Deep-dive on trace insight | `insightSetId: string` (required), `insightName: string` (required) |

### Key Differences from Playwright MCP

- Uses `uid` (from `take_snapshot`) instead of `ref` for element targeting
- `includeSnapshot` param on input tools — returns a11y tree after action (reduces separate snapshot calls)
- `pageId`-based multi-page orchestration (explicit page selection vs implicit)
- Network tools return full response bodies via `get_network_request`
- Exclusive: Lighthouse, performance traces, memory snapshots, console message preservation across navigations

---

## Backend 3: mcp-chrome (hangwin)

**Package**: `mcp-chrome` / `mcp-chrome-bridge`
**Stars**: 10.9K+ | **License**: MIT
**MCP prefix**: `mcp__chrome__<tool>`
**Setup**:
```bash
# 1. Install Chrome extension from GitHub releases
# https://github.com/hangwin/mcp-chrome/releases

# 2. Install bridge
npm i -g mcp-chrome-bridge

# 3. Register with Claude Code
npm i -g mcp-chrome-bridge && claude mcp add chrome -- npx mcp-chrome-bridge
```

### Architecture

Two-part system: Chrome extension (runs in browser, exposes Chrome APIs) + bridge server (Node.js, translates MCP protocol to extension messages). Extension auto-connects to bridge on startup.

### Tools by Category (22 total)

#### Browser & Tab Management (7 tools)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `get_windows_and_tabs` | List all windows and tabs | — |
| `chrome_navigate` | Navigate to URL | `url: string` (required), `tabId?: number`, `viewport?: {width, height}` |
| `chrome_switch_tab` | Switch active tab | `tabId: number` (required) |
| `chrome_close_tabs` | Close tabs | `tabIds: number[]` (required) |
| `chrome_go_back_or_forward` | History navigation | `tabId?: number`, `direction: "back"\|"forward"` |
| `chrome_inject_script` | Inject content script | `tabId: number` (required), `code: string` (required), `scriptId?: string` |
| `chrome_send_command_to_inject_script` | Message injected script | `tabId: number` (required), `scriptId: string` (required), `command: string` (required), `args?: any` |

#### Visual (1 tool)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `chrome_screenshot` | Screenshot with targeting | `tabId?: number`, `selector?: string`, `fullPage?: boolean`, `width?: number`, `height?: number` |

#### Network Monitoring (5 tools)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `chrome_network_capture_start` | Start webRequest API capture | `tabId?: number` |
| `chrome_network_capture_stop` | Stop capture, return data | `tabId?: number` |
| `chrome_network_debugger_start` | Start debugger API capture (includes response bodies) | `tabId?: number` |
| `chrome_network_debugger_stop` | Stop debugger capture | `tabId?: number` |
| `chrome_network_request` | Send HTTP request from browser | `url: string` (required), `method?: string`, `headers?: object`, `body?: string` |

#### Content Analysis (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `search_tabs_content` | AI semantic search across tabs | `query: string` (required), `tabIds?: number[]` |
| `chrome_get_web_content` | Extract page content | `tabId?: number`, `format?: "html"\|"text"`, `selector?: string` |
| `chrome_get_interactive_elements` | Find clickable elements | `tabId?: number`, `selector?: string` |
| `chrome_console` | Get console output | `tabId?: number`, `types?: string[]` |

#### Interaction (3 tools)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `chrome_click_element` | Click by CSS selector | `selector: string` (required), `tabId?: number` |
| `chrome_fill_or_select` | Fill inputs / select options | `selector: string` (required), `value: string` (required), `tabId?: number` |
| `chrome_keyboard` | Keyboard input | `key: string` (required), `text?: string`, `tabId?: number` |

#### Data Management (4 tools — exclusive to mcp-chrome)

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `chrome_history` | Search browser history | `query?: string`, `startTime?: number`, `endTime?: number`, `maxResults?: number` |
| `chrome_bookmark_search` | Find bookmarks | `query: string` (required) |
| `chrome_bookmark_add` | Add bookmark | `url: string` (required), `title: string` (required), `parentId?: string` |
| `chrome_bookmark_delete` | Delete bookmark | `id: string` (required) |

### Key Differences from Other Backends

- Uses CSS selectors for element targeting (not a11y tree refs)
- `search_tabs_content` — AI-powered semantic search across open tabs (unique capability)
- Two network capture modes: webRequest API (headers only) vs debugger API (full response bodies)
- `chrome_inject_script` + `chrome_send_command_to_inject_script` — persistent content script injection (unique)
- Browser history and bookmark access (unique)
- Extension-based — works with user's existing Chrome profile, cookies, sessions

### Parameter Schema Note

Parameter schemas above are inferred from documentation, tool descriptions, and community references. The source repo does not publish a machine-readable MCP schema file. Treat tool names as authoritative; verify exact parameter details via local install if needed. See: [hangwin/mcp-chrome docs/TOOLS.md](https://github.com/hangwin/mcp-chrome/blob/main/docs/TOOLS.md)

---

## Backend 4: playwriter (remorses)

**Package**: `playwriter`
**Stars**: 3.2K+ | **License**: MIT
**MCP prefix**: `mcp__playwriter__<tool>`
**Setup**:
```bash
# 1. Install Chrome extension from Chrome Web Store
# https://chromewebstore.google.com/detail/playwriter/...

# 2. Install CLI
npm i -g playwriter

# 3. Launch browser with extension
playwriter browser start

# 4. Create session
playwriter session new    # outputs session ID (e.g. 1)

# 5. Register with Claude Code
claude mcp add playwriter -- playwriter mcp
```

### Architecture

Single-tool MCP design: one `execute` tool handles all browser automation via inline Playwright code. Stateful sessions persist data between calls. Chrome extension provides CDP bridge to user's real Chrome.

### MCP Tools (2 total)

#### `execute`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `code` | string | Yes | — | JavaScript/Playwright code to execute. Has access to `page`, `context`, `state`, `require`. Use `;` for multi-statement. |
| `timeout` | number | No | 10000 | Execution timeout in milliseconds |

**Returns**: `{ content: [{ type: "text", text: string }, ...{ type: "image", data: base64, mimeType: "image/png" }] }` on success, `{ content: [...], isError: true }` on failure.

**Context variables in scope**:

| Variable | Type | Description |
|----------|------|-------------|
| `page` | Playwright Page | Default shared page (prefer `state.page` for persistence) |
| `context` | BrowserContext | Access to all pages in context |
| `state` | `Record<string, any>` | Persists between `execute` calls within session |
| `require` | Function | Node.js module loader |
| `console` | Console | Captured output returned in response |

**Built-in utility functions** (callable in `code`):

| Function | Description | Key Parameters |
|----------|-------------|---------------|
| `snapshot()` | Accessibility tree snapshot | `page?`, `locator?`, `search?`, `showDiffSinceLastCall?` |
| `waitForPageLoad()` | Detect page readiness | `page?`, `timeout?`, `pollInterval?` |
| `getCDPSession()` | Raw CDP protocol access | `page?` |
| `getLatestLogs()` | Console log retrieval | `page?`, `count?`, `search?` |
| `getCleanHTML()` | Cleaned HTML extraction | `locator?`, `search?`, `includeStyles?` |
| `getPageMarkdown()` | Page content as markdown | `page?`, `search?` |
| `screenshotWithAccessibilityLabels()` | Screenshot with a11y labels overlay | `page?` |
| `recording.start()` | Begin video recording | `page?`, `outputPath?`, `frameRate?` |
| `recording.stop()` | End video recording | `page?` |
| `createDemoVideo()` | Speed up idle sections | `recordingPath`, `executionTimestamps`, `speed?` |
| `resizeImage()` | Shrink image (save tokens) | `input`, `width?`, `height?`, `maxDimension?` |
| `getReactSource()` | Extract React component source | `locator?` |

#### `reset`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none) | — | — | No parameters |

**Behavior**: Recreates CDP connection. Clears `state.browser`, `state.page`, `state.context`, `userState`. Preserves `browserLogs`, `cdpSessionCache`.

**Returns**: `{ content: [{ type: "text", text: "Connection reset successfully" }] }`

### Session Management

```bash
playwriter session new          # Create session → returns ID
playwriter session list         # Show active sessions + state keys
playwriter session reset <id>   # Reset stale connection
```

- Each session has its own `state` object — persists between `execute` calls
- Pages are **shared** across sessions — sessions see the same browser tabs
- State is **isolated** per session — different sessions can't read each other's `state`

### Key Constraints

- **Observe-act-observe pattern**: Always `snapshot()` before and after interactions to verify state changes
- **No window control**: Never call `browser.close()`, `context.close()`, or `page.bringToFront()` inside `code`
- **Quote syntax**: Wrap code in single quotes (`'...'`) or heredoc to prevent shell interpretation
- **Short code preferred**: Call `execute` multiple times with short code rather than one complex script
- **CDP access**: `getCDPSession()` provides raw Chrome DevTools Protocol for advanced debugging

### Token Efficiency

- Single `execute` call replaces N individual tool calls — only output returns to context
- Use `snapshot()` (a11y tree) over screenshots — structured data, smaller context
- `resizeImage()` shrinks screenshots before returning — saves tokens
- `getPageMarkdown()` extracts main content without HTML noise

### Key Differences from Other Backends

- **2 tools vs 20+** — all automation happens via inline Playwright code in `execute`
- **Stateful sessions** — `state` object persists across calls (unique persistence model)
- **Full Playwright API** — no artificial restrictions; anything Playwright can do
- **CDP access** — raw Chrome DevTools Protocol via `getCDPSession()` (beyond what other MCP backends expose)
- **React source extraction** — `getReactSource()` is unique to playwriter
- **Video recording** — built-in `recording.start/stop()` with demo video post-processing
