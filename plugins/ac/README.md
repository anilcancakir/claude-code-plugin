# ac

**Claude Code setup + creator toolkit.**

`ac` is a lean plugin that helps you set up Claude Code the way you like it and build new Claude Code components (skills, agents, commands, rules, CLAUDE.md files). It does NOT override CC's native planning, agents, or `Task` tool. Use `/plan` (CC native), spawn CC's default agents, and let `ac` handle the paperwork.

## Install

```bash
claude plugin add anilcancakir/claude-code-plugin
```

## Setup (one-time)

```bash
# 1. Scan your projects and generate a personal coding style skill
/ac:setup-coding

# 2. Scan your writing samples and generate a personal language skill
/ac:setup-language

# 3. Generate your global CLAUDE.md (loaded in every session)
/ac:setup-global-claude-md

# 4. In each project: generate project CLAUDE.md and scoped rules
/ac:init-claude-md
/ac:init-rules
```

Re-run any command with `update` to sync after plugin updates, e.g. `/ac:setup-global-claude-md update`.

## Commands

| Command | Purpose |
|---------|---------|
| `/ac:plan` | Interview-driven planning, writes `.ac/plans/<slug>.md`. Auto-detects Simple vs multi-phase (Mode A: plan-then-execute-all, Mode B: plan-and-execute per phase). Main agent only |
| `/ac:execute` | Runs an approved plan end-to-end. Auto-fix bugs / missing validation / blocking issues. Asks only on architectural deviations. Per-task atomic commits + Nyquist verify gate |
| `/ac:wisdom` | SUMMARY.md + open-questions.md generator. Auto-invoked at `/ac:execute` completion; callable standalone for re-summarization |
| `/ac:commit` | Preflight checks → atomic commit → push. Delegates to `git-master` if installed |
| `/ac:init-claude-md` | Generate project CLAUDE.md from codebase discovery + interview |
| `/ac:init-rules` | Generate path-scoped `.claude/rules/` from stack + directory analysis |
| `/ac:setup-coding` | Scan projects, interview, generate `my-coding` skill |
| `/ac:setup-language` | Scan writing samples, interview, generate `my-language` skill |
| `/ac:setup-global-claude-md` | Generate global `~/.claude/CLAUDE.md` — tech stack, skill table, lightweight rules |

Every command runs in the main context with Read / Glob / Grep / Bash. No hidden subagent orchestration — the planning trio (`plan` / `execute` / `wisdom`) runs entirely in the main agent.

## Creator Skills

The `ac` plugin also ships creator skills for building new Claude Code components:

| Skill | Purpose |
|-------|---------|
| `prompt-writer` | Shared foundation — CC-optimal prompt writing patterns |
| `skill-creator` | Create skills with progressive disclosure architecture |
| `agent-creator` | Create agents following the kodizm 5-section format |
| `command-creator` | Create commands with phase-based structure |
| `rule-creator` | Create path-scoped `.claude/rules/` files |
| `claude-md-writer` | Write CC-optimal CLAUDE.md and CLAUDE.local.md files |

These are triggered by the setup/init commands above, or invoked directly when you need to author a new component.

## Companion Plugins

| Plugin | What it adds |
|--------|-------------|
| `github-cli` | `gh` CLI reference — issues, PRs, releases, actions |
| `github-actions` | GitHub Actions workflows — CI/CD, releases, Docker, security |
| `git-master` | Atomic commits, rebase, history archaeology |
| `frontend-design` | Design systems, hierarchy, color, mobile patterns |
| `dart-lsp` / `json-lsp` / `yaml-lsp` / `markdown-lsp` | Language servers — go-to-definition, hover, diagnostics |

## MCP

kodizm MCP is bundled — docs, web search, web fetch, code search. Creator skills use it to look up library documentation when generating components.

Requires `KODIZM_MCP_TOKEN`:

```bash
export KODIZM_MCP_TOKEN="your-token-here"  # add to ~/.zshrc
```

Get your token at [kodizm.com](https://kodizm.com). Without it, kodizm tools are unavailable but every command still functions.

## Pure Markdown

Every component is YAML frontmatter + markdown. No compiled code, no runtime dependencies. 6 commands, 6 creator skills, all text files you can read and modify.

## License

MIT
