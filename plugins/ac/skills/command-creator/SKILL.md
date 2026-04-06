---
name: command-creator
description: "Create Claude Code commands with phase-based structure and agent delegation. Use when building /plugin:command slash commands for Claude Code plugins."
when_to_use: "TRIGGER when: 'create a command', 'add a slash command', 'new /command for', building Claude Code plugin commands. DO NOT TRIGGER: creating skills, agents, or rules."
model: opus
effort: high
---

Create Claude Code commands — user-invocable workflows that orchestrate agents, interview users, and delegate complex work through structured phases.

---

## Core Process

**1. Classify Command Scope**

Determine structure before drafting:

- How many phases? Simple commands (1-2 phases) vs orchestration commands (5+ phases).
- Which agents to delegate to? Research (ac:explore, ac:librarian), execution (ac:plan-worker), verification (ac:plan-verifier, ac:plan-code-review)?
- Interactive (AskUserQuestion gates) or autonomous (runs end-to-end without prompts)?
- What approval gates are needed before destructive or irreversible actions?

**2. Research Existing Commands**

Launch `ac:explore` to find similar commands in the target project:

```
Agent(subagent_type: "ac:explore", prompt: "CONTEXT: Creating a new command. GOAL: Find existing command files and their structure. REQUEST: List all commands in commands/ directory. Return 2-3 representative examples with their phase structure, frontmatter, and agent delegation patterns.")
```

Read 2-3 existing commands (e.g., `plan.md`, `execute.md`, `commit.md`) to calibrate structure depth and phase naming conventions.

**3. Dedup Audit**

Read `${CLAUDE_SKILL_DIR}/../prompt-writer/references/cc-dedup-guide.md` before drafting.

Key dedup rules for commands:
- Commands receive CLAUDE.md automatically — do not re-state its global directives.
- Do not repeat Intent Gate, Delegation Check, or barrier semantics — these load every message.
- Do not re-explain agent model routing rules already in global CLAUDE.md.
- Commands specify WHAT to do (which agents, which phases) not HOW CC should behave.

**4. Draft Command**

Follow phase-based structure from `references/command-patterns.md`. Each phase uses:

```markdown
## Phase N: Name

**Goal**: One sentence — what this phase achieves.

**Actions**:

1. First action
2. Second action
3. Third action (with sub-steps if needed)
```

Rules:
- Phases must be sequential — later phases depend on earlier ones.
- Insert AskUserQuestion approval gates before destructive actions.
- Delegate heavy work to agents — commands orchestrate, agents execute.
- Reference `$ARGUMENTS` for user-supplied input.
- Use `${CLAUDE_PLUGIN_ROOT}` for paths to bundled templates.

**5. Frontmatter**

```yaml
---
description: "Short, action-oriented. What does this command do? ≤250 chars."
argument-hint: "[expected-input]"
effort: low | medium | high
allowed-tools:
  - AskUserQuestion
  - Agent
  - Read
  - Bash
---
```

Notes:
- Commands use `allowed-tools` (allowlist) — different from agents which use `disallowedTools`.
- Always include `AskUserQuestion` and `Agent` if the command interviews users or delegates to agents.
- `effort` signals expected token budget: `low` (single task, <5 phases), `medium` (multi-agent, 5-7 phases), `high` (full orchestration, 7+ phases).
- Do not add `model` to command frontmatter — commands inherit the session model. Only agents have model routing.

**6. Review**

Present draft. Verify before finalizing:

- Phases sequential? No phase assumes work from a later phase.
- Approval gates present before destructive or irreversible actions?
- Agent delegation clear? Each Agent call has TASK + EXPECTED OUTCOME + MUST DO + MUST NOT DO + CONTEXT.
- Error handling covers: missing input, agent failure, no changes found, user cancellation.
- `$ARGUMENTS` referenced at the right phase (usually Phase 1)?
- Frontmatter `allowed-tools` matches every tool used in the body?

---

## Agent Delegation Patterns

### Parallel Foreground (wait for all)

All agents in a single message block — CC waits automatically:

```
Agent(subagent_type: "ac:explore", prompt: "...")
Agent(subagent_type: "ac:librarian", prompt: "...")
```

Use when results are needed before proceeding. Do NOT advance to the next phase until all agents complete.

### Background (genuinely independent work)

```
Agent(subagent_type: "ac:plan-worker", run_in_background: true, prompt: "...")
Agent(subagent_type: "ac:plan-worker", run_in_background: true, prompt: "...")
```

Use only when you have independent work to continue while agents run. Collect all completion notifications before the next phase.

### Model Routing per Agent

Pass `model:` to override per agent — do not upgrade all agents to Opus:

| Task type | Model |
|-----------|-------|
| Search, file reading, fast lookup | haiku |
| Standard execution, analysis | sonnet |
| Planning, architecture, deep review | opus |

### Agent Prompt Template

Every agent delegation follows this structure:

```
TASK: [What the agent must accomplish — one clear sentence]

EXPECTED OUTCOME: [What the agent returns — file:line refs, verdict, structured output]

MUST DO:
- [Specific constraint 1]
- [Specific constraint 2]

MUST NOT DO:
- [What to exclude or avoid]

CONTEXT: [Relevant state — plan path, conventions, prior findings]
```

---

## String Substitutions

Variables available in command bodies (replaced at load time by CC):

| Variable | Where | Description |
|----------|-------|-------------|
| `$ARGUMENTS` | Commands | All arguments passed on invocation |
| `${CLAUDE_PLUGIN_ROOT}` | Commands | Absolute path to the plugin's root directory |
| `${CLAUDE_SKILL_DIR}` | Skills only | Absolute path to the skill's directory — NOT available in commands |

Use `${CLAUDE_PLUGIN_ROOT}` to reference bundled templates:

```markdown
Read template from `${CLAUDE_PLUGIN_ROOT}/references/my-template.md`
```

---

## References

| Topic | File | When to read |
|-------|------|-------------|
| Command templates | [command-patterns.md](references/command-patterns.md) | Before drafting — full phase template, AskUserQuestion patterns, pipeline profiles, agent spawning examples |
| Dedup guide | `${CLAUDE_SKILL_DIR}/../prompt-writer/references/cc-dedup-guide.md` | Before drafting — what not to repeat from global CLAUDE.md and auto-loaded context |
| Frontmatter schemas | `${CLAUDE_SKILL_DIR}/../prompt-writer/references/frontmatter-schemas.md` | During frontmatter validation — field schemas, invocation control, tool control semantics |
