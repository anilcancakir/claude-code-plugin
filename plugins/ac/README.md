# ac

**Main-agent planning trio + autonomous execution + setup and creator toolkit.**

`ac` is a plugin for structured development workflows. It owns planning end-to-end: `/ac:plan` interviews you into a plan file, `/ac:execute` runs it task-by-task with atomic commits, `/ac:wisdom` summarizes the run. `/ac:execute --auto` flips on autonomous mode (skip-and-log defaults at every stop point, sticky state file, ScheduleWakeup cross-turn loop). `/ac:setup-global-claude-md` denies `EnterPlanMode`, `ExitPlanMode`, and `Agent(Plan)` in `~/.claude/settings.json` so CC's native plan mode cannot hijack the ac interview flow. Setup, init, and creator skills round out the toolkit.

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
| `/ac:plan` | Interview-driven planning, writes `.ac/plans/<slug>.md`. Auto-detects Simple vs multi-phase (Mode A: plan-then-execute-all, Mode B: plan-and-execute per phase). Approval can chain straight into `/ac:execute --auto`. Main agent only |
| `/ac:execute` | Runs an approved plan end-to-end. Auto-fix bugs / missing validation / blocking issues. Interactive: ask on architectural deviations. Autonomous (`--auto`): skip-and-log every stop point, ScheduleWakeup cross-turn loop. Per-task atomic commits + Nyquist verify gate |
| `/ac:wisdom` | SUMMARY.md + open-questions.md generator. Auto-invoked at `/ac:execute` completion; callable standalone for re-summarization |
| `/ac:commit` | Preflight checks → atomic commit → push. Delegates to `git-master` if installed |
| `/ac:init-claude-md` | Generate project CLAUDE.md from codebase discovery + interview |
| `/ac:init-rules` | Generate path-scoped `.claude/rules/` from stack + directory analysis |
| `/ac:setup-coding` | Scan projects, interview, generate `my-coding` skill |
| `/ac:setup-language` | Scan writing samples, interview, generate `my-language` skill |
| `/ac:setup-global-claude-md` | Generate global `~/.claude/CLAUDE.md` — tech stack, skill table, lightweight rules |

Every command runs in the main context with Read / Glob / Grep / Bash. No hidden subagent orchestration. The planning trio (`plan` / `execute` / `wisdom`) runs entirely in the main agent.

## Autonomous Execution Mode

`/ac:execute --auto` runs an approved plan end-to-end without stopping for architectural questions, verify failures, or preflight failures. Every stop point becomes "skip + log + continue", so the run completes in one pass and the deviation log captures whatever needs human attention afterward.

The mode is sticky: passing `--auto` writes `autonomous: true` to `.ac/plans/<slug>.execution-state.md` (Simple) or `.ac/plans/<slug>/.execution-state.md` (Mode A or B). Compaction-survival is built in: `SessionStart` re-injects the resume reminder after CC's native auto-compaction, and `PreCompact` preserves plan position in the summarization prompt. When a Mode A phase finishes in autonomous mode, the boundary calls `ScheduleWakeup` so the next phase resumes in a fresh turn (gsd-style anti-rot). Phase 5 only enters at one of four conditions: plan complete, iteration cap, Mode A boundary, or user interrupt. Mid-task context warnings never bail the run.

```bash
# Start an approved plan in autonomous mode
/ac:execute my-plan --auto

# Mid-flight switch from interactive to autonomous
/ac:execute my-plan --auto

# Switch back to interactive
/ac:execute my-plan --no-auto

# Resume after a session ends or after a ScheduleWakeup-triggered turn
/ac:execute --resume my-plan

# Override the iteration cap (default 100)
/ac:execute my-plan --auto --max-iterations=300
```

| Knob | Default | Purpose |
|------|---------|---------|
| `--auto` | off | Sets `autonomous: true` in the state file. Sticky. |
| `--no-auto` | off | Clears `autonomous`, returns to interactive prompts. |
| `--max-iterations=N` | 100 | Hard cap on `/ac:execute --resume` re-entries. |
| `--resume <slug>` | n/a | Loads state, increments iteration, jumps to current_phase + current_task. |

Escape hatches stay available: any Ctrl-C / "stop" leaves `status: executing` so manual `/ac:execute --resume` works. The state file is deleted automatically on completion. See `references/execution-state-schema.md` for the full schema.

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

Every component is YAML frontmatter + markdown. The two hooks (`session-start.mjs`, `pre-compact.mjs`) are short Node scripts with zero runtime dependencies. 9 commands, 6 creator skills, 2 hooks, all text files you can read and modify.

## License

MIT
