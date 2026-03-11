# ac Plugin Marketplace

A curated marketplace of Claude Code plugins for structured development workflows.

## Plugins

| Plugin | Description | Category |
|--------|-------------|----------|
| **[ac](plugins/ac/)** | Structured development partner — plans before coding, investigates bugs with Opus, delegates to specialized agents. Opus-quality decisions at Sonnet-level costs. | productivity |
| **[github-cli](plugins/github-cli/)** | GitHub CLI skill — comprehensive gh reference for issues, PRs, releases, actions, secrets, labels, search, gh api (REST + GraphQL), and scripting patterns. | productivity |
| **[git-master](plugins/git-master/)** | Git expert skill — atomic commits with style detection, interactive rebase/squash, and history archaeology (blame, bisect, pickaxe). | productivity |

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
│   │   ├── commands/            # 9 /ac:* commands
│   │   ├── agents/              # 4 read-only agents
│   │   ├── skills/              # Component creation skill
│   │   └── README.md
│   ├── github-cli/              # GitHub CLI skill plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/              # Comprehensive gh CLI reference
│   │   ├── README.md
│   │   └── LICENSE
│   └── git-master/              # Git expert skill plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/              # Atomic commits, rebase, history
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

## Contributing

Issues and pull requests are welcome at [github.com/anilcancakir/claude-code-plugin](https://github.com/anilcancakir/claude-code-plugin).

## License

MIT — See individual plugin directories for specific licenses.
