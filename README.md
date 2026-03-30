# ac Plugin Marketplace

A curated marketplace of Claude Code plugins for structured development workflows.

## Plugins

| Plugin | Description | Category |
|--------|-------------|----------|
| **[ac](plugins/ac/)** | Structured development partner — plans before coding, investigates bugs with Opus, delegates to specialized agents with model routing, browser QA testing with evidence persistence. | productivity |
| **[github-cli](plugins/github-cli/)** | GitHub CLI skill — comprehensive gh reference for issues, PRs, releases, actions, secrets, labels, search, gh api (REST + GraphQL), and scripting patterns. | productivity |
| **[git-master](plugins/git-master/)** | Git expert skill — atomic commits with style detection, interactive rebase/squash, and history archaeology (blame, bisect, pickaxe). | productivity |
| **[frontend-design](plugins/frontend-design/)** | Frontend design skill — production-grade UI for web and mobile with design systems, visual hierarchy, and distinctive aesthetics. | productivity |
| **[dart-lsp](plugins/dart-lsp/)** | Dart/Flutter language server — go-to-definition, find references, hover, and real-time diagnostics for Claude Code. | development |
| **[json-lsp](plugins/json-lsp/)** | JSON language server — schema validation, hover, and diagnostics for .json and .jsonc files. | development |
| **[yaml-lsp](plugins/yaml-lsp/)** | YAML language server — schema validation, hover, and diagnostics for .yaml and .yml files. | development |
| **[markdown-lsp](plugins/markdown-lsp/)** | Markdown language server (marksman) — link navigation, find references, and document symbols for .md files. | development |

## Installation

```bash
# Step 1: Add marketplace
/plugin marketplace add anilcancakir/claude-code-plugin

# Step 2: Install a plugin
/plugin install ac@ac
```

### Updating

```bash
/plugin marketplace update ac
```

After updating, sync your global config with new plugin features:

```
/ac:setup-global-claude-md update
```

## Structure

```
├── .claude-plugin/
│   └── marketplace.json         # Plugin catalog
├── plugins/
│   ├── ac/                      # Main plugin — structured development partner
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── commands/            # 10 /ac:* commands (incl. browser-qa)
│   │   ├── agents/              # 14 read-only agents (incl. browser-qa)
│   │   ├── skills/              # ac-skill-creator + browser-qa workflow
│   │   └── README.md
│   ├── github-cli/              # GitHub CLI skill plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/              # Comprehensive gh CLI reference
│   │   ├── README.md
│   │   └── LICENSE
│   ├── git-master/              # Git expert skill plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/              # Atomic commits, rebase, history
│   │   ├── README.md
│   │   └── LICENSE
│   ├── frontend-design/         # Frontend design skill plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/              # Design systems, hierarchy, aesthetics
│   │   │   └── references/      # Deep-dive: hierarchy, color, mobile
│   │   ├── README.md
│   │   └── LICENSE
│   ├── dart-lsp/                # Dart/Flutter LSP plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── README.md
│   │   └── LICENSE
│   ├── json-lsp/                # JSON LSP plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── README.md
│   │   └── LICENSE
│   ├── yaml-lsp/                # YAML LSP plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── README.md
│   │   └── LICENSE
│   └── markdown-lsp/            # Markdown LSP plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── README.md
│       └── LICENSE
├── README.md                    # This file
└── LICENSE
```

## Adding a Plugin

Each plugin lives in its own directory under `plugins/`:

```
plugins/your-plugin/
├── .claude-plugin/
│   └── plugin.json              # Required: name, description, author
├── commands/                    # Optional: slash commands
├── agents/                      # Optional: agent definitions
├── skills/                      # Optional: skill definitions
└── README.md                    # Plugin documentation
```

Then add an entry in `.claude-plugin/marketplace.json`:

```json
{
    "name": "your-plugin",
    "description": "What it does",
    "source": "./plugins/your-plugin",
    "category": "productivity"
}
```

## Browser QA Testing

The ac plugin includes `/ac:browser-qa` — a browser-based QA testing command with 4 modes:

| Mode | Trigger | Description |
|------|---------|-------------|
| **Ad-hoc** | URL or instructions | Navigate and test freeform |
| **Bug repro** | `--bug <path>` | Reproduce bugs from a document |
| **Plan verify** | `--plan <path>` | Verify plan acceptance criteria |
| **Re-check** | `--recheck` | Re-run previously failed tests |

### Evidence Persistence

Test evidence is saved by default to `.ac/qa/` in the project directory:

```
.ac/qa/{testName}/
  {YYYYMMDD}-{HHmmss}-{pagePath}.png    # Screenshots (on FAIL)
  {YYYYMMDD}-{HHmmss}-{pagePath}.html   # Page HTML snapshots
  {YYYYMMDD}-{HHmmss}-{pagePath}.json   # Console + network errors
  report.md                              # Latest report
```

Disable with `--no-evidence` flag.

### Required: Playwright CLI

```bash
npm install -g @playwright/cli@latest
```

## Contributing

Issues and pull requests are welcome at [github.com/anilcancakir/claude-code-plugin](https://github.com/anilcancakir/claude-code-plugin).

## License

MIT — See individual plugin directories for specific licenses.
