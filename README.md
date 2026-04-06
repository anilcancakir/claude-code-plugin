# ac Plugin Marketplace

Claude Code plugins for structured development workflows.

## Plugins

| Plugin | Description |
|--------|-------------|
| **[ac](plugins/ac/)** | Structured development partner — plans before coding, parallel execution with model routing, specialized agents, QA testing |
| **[github-cli](plugins/github-cli/)** | GitHub CLI skill — issues, PRs, releases, actions, `gh api` |
| **[git-master](plugins/git-master/)** | Git expert — atomic commits, rebase, history archaeology |
| **[github-actions](plugins/github-actions/)** | GitHub Actions workflow generator — CI/CD, releases, Docker, security hardening |
| **[frontend-design](plugins/frontend-design/)** | Frontend design — design systems, visual hierarchy, mobile patterns |
| **[dart-lsp](plugins/dart-lsp/)** | Dart/Flutter language server — definitions, references, diagnostics |
| **[json-lsp](plugins/json-lsp/)** | JSON language server — schema validation, hover |
| **[yaml-lsp](plugins/yaml-lsp/)** | YAML language server — schema validation, diagnostics |
| **[markdown-lsp](plugins/markdown-lsp/)** | Markdown language server — link navigation, document symbols |

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

## Structure

```
├── .claude-plugin/
│   └── marketplace.json      # Plugin catalog
├── plugins/
│   ├── ac/                   # Main plugin — 15 agents, 12 commands
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
