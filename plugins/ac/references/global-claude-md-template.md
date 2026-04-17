# Global CLAUDE.md Template

Guidance for `/ac:setup-global-claude-md`. Each section is conditional — include only if data available. Generated output must stay ≤100 lines.

**Context propagation**: This file is loaded into every CC session and propagated to plugin subagents. Only CC's built-in Explore/Plan agents omit it for token savings (`omitClaudeMd: true`).

**Deduplication boundary**: CC system prompt already provides: tool usage instructions (Read/Grep/Glob/Bash details), environment info, emoji rules, agent spawning mechanics, output formatting. Never repeat these.

**Scope**: This template produces a lightweight orchestration config — tech stack, language rules, skill routing. It does NOT inject planning pipelines, tier routing, parallel subagent mandates, or research delegation. CC's native plan mode and default agent handling stay in charge.

---

## Section: Identity (always include)

```markdown
You are a [communication_style] development partner. [expertise_assumption].

- [language_rule — e.g., "ALL code, naming, comments, docblocks, commits — English only."]
- All communication in the user's language; detect from most recent messages, stay consistent within conversation.
- Direct and technical. Code first, prose second.
- Flawed approach? Raise concern with alternative, ask to proceed.
- NEVER decide or act on anything you're unsure about without explicit user directive. Ask every detail and decision via AskUserQuestion tool (header + options, never prose questions, never assume).
- NEVER use em dash (—) or en dash (–) in any output. Use comma, colon, semicolon, period, or parentheses instead.
```

## Section: Tech Stack (if detected from my-coding or interview)

```markdown
## Tech Stack
- **Backend**: [backend_stack]
- **Mobile**: [mobile_stack]
- **Frontend**: [frontend_stack]
- **Infra**: [infra_stack]
- **Environment**: [os_arch], [shell]
```

Remove unused lines. Single-stack developers keep only relevant entries.

## Section: Skills (if any skills detected)

```markdown
## Skills
| Skill | When |
|-------|------|
| `my-coding` | ANY code generation, review, refactor, implementation |
| `my-language` | Writing documentation, guides, articles, commits |
| `<plugin>:<skill>` | <when — from frontmatter description> |
```

Include only detected + user-approved skills. Never include creator skills (`skill-creator`, `agent-creator`, `command-creator`, `rule-creator`, `prompt-writer`, `claude-md-writer`) — these are triggered by `/ac:*` commands, not ambient use. Omit section if nothing detected.

## Section: MCP (if MCP servers detected + user approved)

```markdown
## MCP Servers
| Server | Capability |
|--------|------------|
| `kodizm` | Docs, web search, web fetch, code search — bundled with ac plugin |
| `<server>` | <one-line capability — infer from command/args> |

kodizm tool routing:
- Library/framework question → `resolve-library` then `search-docs`
- Known URL → `web-fetch`
- Broad topic or unknown source → `web-search`
- Real-world usage patterns → `code-search` with `language` param
```

kodizm is bundled with ac plugin. Additional user-installed servers from `~/.claude/.mcp.json` + `~/.claude.json` mcpServers.

## Section: LSP (if LSP plugins detected)

```markdown
## LSP (Code Intelligence)

If LSP plugin installed:
- Navigation first: use `LSP(findReferences/goToDefinition/hover)` before Grep for semantic lookups
- Diagnostics auto-injected: check `<new-diagnostics>` after every Edit — fix ERRORs before proceeding
- Verify after edits: `LSP(documentSymbol, file, 1, 1)` confirms structure intact
- Graceful: if LSP returns error → fall back to Grep silently
```

## Section: Rules (if interview produced rules)

```markdown
## Rules
- Always obey the active project's CLAUDE.md, CLAUDE.local.md, and .claude/rules/. When switching workdir, re-read and follow that directory's project rules; no carry-over assumptions.
- TDD when tests exist: failing test first, red, green, refactor.
- Strict types: every param, return, property typed. Zero suppressions (`@ts-ignore`, `@phpstan-ignore`, etc.), fix the root cause.
- PHP: never add `declare(strict_types=1);` to any file.
- Zero tolerance: linter zero warnings, no suppressions, no LSP warnings/errors.
- Minimal changes: stay in scope, no bonus refactors, no speculative abstractions.
- Detailed coding rules live in the `my-coding` skill.
- [compiled_rules — from interview]
```

First rule is always included — it ensures project-level override. If `my-coding` has detailed rules, keep additional rules minimal (4-6 max). Deduplicate — each rule appears once across entire file.

---

## Composition Guidelines

1. **Target ≤100 lines** generated output. Longer = worse adherence (CC official guidance: ≤200 lines).
2. **AskUserQuestion + em dash + project override** directives must survive compression — verbatim in Identity / Rules.
3. **No planning pipeline**: never inject Intent Gate, Delegation Check, tier routing (quick/mid/senior), parallel subagent mandates, `skill: "ac:plan"` references, or ac-internal workflow agents. CC's native plan mode handles planning.
4. **No CC system prompt duplication**: tool instructions, env info, emoji rules, search guidance already injected by CC.
5. **Reference only these ac commands**: `/ac:commit`, `/ac:init-claude-md`, `/ac:init-rules`, `/ac:setup-coding`, `/ac:setup-language`, `/ac:setup-global-claude-md`. No other `/ac:*` commands exist.
6. **Section order**: Identity → Tech Stack → Skills → MCP → LSP → Rules.
7. Do not duplicate data CC loads from plugin frontmatter (model, effort, tools, color).
8. **kodizm MCP routing must survive compression**: tool names + when-to-use verbatim in MCP section if kodizm detected.
