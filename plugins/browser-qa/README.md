# browser-qa

**Browser QA testing for Claude Code — control real browsers via MCP, reproduce bugs, verify plan acceptance criteria.**

## Install

```bash
# Requires ac marketplace
/plugin install browser-qa@ac
```

## What It Provides

A single command (`/browser-qa:test`) with 4 modes:

- **Ad-hoc** — Navigate, interact, and verify any URL freeform
- **Bug reproduction** (`--bug <file>`) — Parse bug docs, execute repro steps, confirm failure
- **Plan verification** (`--plan <file>`) — Extract acceptance criteria from a plan, auto-test each one
- **Re-check** (`--recheck`) — Re-run previous session failures after a fix

## Which Backend?

| Need | Backend |
|------|---------|
| Attach to existing Chrome session + DevTools/performance | Chrome DevTools MCP |
| Attach to existing Chrome session + semantic tab/bookmarks | mcp-chrome |
| Stateful multi-step flows with full Playwright API | playwriter |
| Headless CI / Docker | Playwright MCP |
| **Default (recommended)** | **Playwright MCP** — lowest token cost, most tools |

## Setup

```bash
# Playwright MCP (recommended)
claude mcp add playwright -- npx @playwright/mcp@latest

# Chrome DevTools MCP
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --autoConnect

# mcp-chrome
npm i -g mcp-chrome-bridge && claude mcp add chrome -- npx mcp-chrome-bridge

# playwriter
claude mcp add playwriter -- playwriter mcp
```

## Quick Start

```
/browser-qa:test localhost:3000/register
/browser-qa:test --bug ./bugs/RYTC-369.md
/browser-qa:test --plan .ac/plans/auth-system.md
/browser-qa:test --recheck
```

## License

MIT
