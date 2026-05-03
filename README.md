# ac Plugin Marketplace

Claude Code plugins for structured development workflows.

## Plugins

| Plugin | Description |
|--------|-------------|
| **[ac](plugins/ac/)** | Main-agent planning trio (`/ac:plan`, `/ac:execute`, `/ac:wisdom`) with autonomous execution mode (`--auto`, sticky state file, `ScheduleWakeup` cross-turn loop), setup + creator toolkit (`/ac:setup-*`, `/ac:init-*`, `/ac:commit`), skill/agent/command/rule/CLAUDE.md creators, two hooks (SessionStart twin-skill + autonomous resume, PreCompact state preservation) |
| **[github-cli](plugins/github-cli/)** | GitHub CLI skill: issues, PRs, releases, actions, `gh api` |
| **[git-master](plugins/git-master/)** | Git expert: atomic commits, rebase, history archaeology |
| **[github-actions](plugins/github-actions/)** | GitHub Actions workflow generator: CI/CD, releases, Docker, security hardening |
| **[frontend-design](plugins/frontend-design/)** | Frontend design: design systems, visual hierarchy, mobile patterns |
| **[dart-lsp](plugins/dart-lsp/)** | Dart/Flutter language server: definitions, references, diagnostics |
| **[json-lsp](plugins/json-lsp/)** | JSON language server: schema validation, hover |
| **[yaml-lsp](plugins/yaml-lsp/)** | YAML language server: schema validation, diagnostics |
| **[markdown-lsp](plugins/markdown-lsp/)** | Markdown language server: link navigation, document symbols |

## Install

```bash
claude plugin add anilcancakir/claude-code-plugin
```

## Update

```bash
claude plugin update anilcancakir/claude-code-plugin
```

After updating, sync your config:

```bash
/ac:setup-global-claude-md update
```

> `/ac:setup-global-claude-md` writes `~/.claude/settings.json` so the ac planning trio owns planning end-to-end:
>
> - Always denies `EnterPlanMode`, `ExitPlanMode`, `Agent(Plan)` (ac's `/ac:plan` replaces CC native plan mode; plans live in project-local `.ac/plans/`).
> - Conditionally denies `WebSearch` / `WebFetch` when kodizm MCP is operational (so CC uses kodizm's `web-search` / `web-fetch` instead).
> - Keeps `Agent(Explore)` allowed so users can still trigger read-only codebase surveys manually.
>
> Set `KODIZM_MCP_TOKEN` for the bundled kodizm MCP. Get your token at kodizm.com.

## Structure

```
├── .claude-plugin/
│   └── marketplace.json      # Plugin catalog
├── plugins/
│   ├── ac/                   # Main plugin: 9 commands, 6 creator skills, 2 hooks
│   │   ├── commands/         # plan, execute, wisdom, commit, init-*, setup-*
│   │   ├── skills/           # prompt-writer, skill-creator, agent-creator, command-creator, rule-creator, claude-md-writer
│   │   ├── hooks/            # SessionStart (twin-skill + resume), PreCompact (state preservation)
│   │   └── references/       # CLAUDE.md templates, style templates, execution-state schema
│   ├── github-cli/           # GitHub CLI skill
│   ├── github-actions/       # GitHub Actions workflow generator
│   ├── git-master/           # Git expert skill
│   ├── frontend-design/      # Frontend design skill
│   ├── dart-lsp/             # Dart/Flutter LSP
│   ├── json-lsp/             # JSON LSP
│   ├── yaml-lsp/             # YAML LSP
│   └── markdown-lsp/         # Markdown LSP
└── README.md
```

## Adding a Plugin

```
plugins/your-plugin/
├── .claude-plugin/
│   └── plugin.json           # name, description, author
├── commands/                 # Optional: slash commands
├── agents/                   # Optional: agent definitions
├── skills/                   # Optional: skill definitions
└── README.md
```

Add entry in `.claude-plugin/marketplace.json`:

```json
{
  "name": "your-plugin",
  "description": "What it does",
  "source": "./plugins/your-plugin",
  "category": "productivity"
}
```

## License

MIT
