# Command Patterns

Template library for Claude Code commands. Read before drafting any command.

---

## Phase-Based Command Template

Complete example (~60 lines) — adapt for your command's scope.

```markdown
---
description: "One-line action-oriented description. What does this command do?"
argument-hint: "[required-input]"
effort: medium
allowed-tools:
  - AskUserQuestion
  - Agent
  - Read
  - Bash
---

Direct task statement — what this command achieves for the user.

## Phase 1: Discovery

**Goal**: Read current state and gather context before acting.

**Actions**:

1. Parse `$ARGUMENTS` — extract target, options, flags. Strip flags before processing.
2. Read relevant state files (config, plan, task, git status).
3. Classify scope: small (single file) | medium (1-3 modules) | large (cross-cutting).

---

## Phase 2: Research

**Goal**: Gather information needed to execute.

**Actions**:

1. Launch research agents — all in a single message block (parallel foreground):

   ```
   Agent(subagent_type: "ac:explore", prompt: "TASK: Find X in the codebase. EXPECTED OUTCOME: file:line references and pattern summary. MUST DO: Return concrete references. MUST NOT DO: Summarize without evidence. CONTEXT: [relevant state]")
   ```

2. Wait for all agents to complete. Do NOT proceed until all report back.
3. Synthesize findings: key files, patterns, dependencies.

---

## Phase 3: Interview

**Goal**: Resolve ambiguity before executing.

**Actions**:

1. Evaluate: is the request fully specified? Scope clear? Technical approach decided?
2. If ambiguous, use AskUserQuestion with concrete options:

   ```
   AskUserQuestion(
     question: "Which approach should I use?",
     header: "Configuration",
     options: [
       { label: "Option A", description: "Description of trade-offs" },
       { label: "Option B", description: "Description of trade-offs" },
       { label: "Proceed with defaults", description: "Use sensible defaults and continue" }
     ]
   )
   ```

3. Incorporate answer. If fully specified from Phase 1-2 → skip this phase.

---

## Phase 4: Execute

**Goal**: Delegate implementation to agents.

**DO NOT START WITHOUT USER APPROVAL** (if Phase 3 surfaced major decisions)

**Actions**:

1. Spawn worker agents — all in a single message block (parallel foreground for independent work):

   ```
   Agent(
     subagent_type: "ac:plan-worker",
     model: sonnet,
     run_in_background: true,
     prompt: "TASK: [specific task]. EXPECTED OUTCOME: [what to produce]. MUST DO: [constraints]. MUST NOT DO: [exclusions]. CONTEXT: [conventions, prior findings]"
   )
   ```

2. Wait for all completion notifications. Check output against expected outcome.
3. Handle failures: re-spawn with corrected context or escalate to user.

---

## Phase 5: Verify

**Goal**: Confirm results meet the original request.

**Actions**:

1. Run verification agent (foreground):

   ```
   Agent(subagent_type: "ac:plan-verifier", prompt: "Verify: [criteria]. Files: [list]. Check done-when conditions.")
   ```

2. APPROVE → report success. REJECT → fix specific failures, re-verify.
3. Invoke `/ac:commit --skip-preflight` after verification passes.

---

## Error Handling

- **Missing `$ARGUMENTS`**: Inform user what input is required. Stop.
- **Agent returns empty**: Re-read target files manually. Verify state directly.
- **User cancels**: Stop gracefully. Report current state.
- **3 verification failures**: Apply 3-strike rule — stop, report, ask user to investigate.
```

---

## AskUserQuestion Patterns

### Binary Choice

```
AskUserQuestion(
  question: "Should I overwrite existing files or merge changes?",
  header: "File Conflict",
  options: [
    { label: "Overwrite", description: "Replace existing files entirely" },
    { label: "Merge", description: "Preserve existing content, add only new sections" }
  ]
)
```

### Multi-Select

```
AskUserQuestion(
  question: "Which verification layers should run?",
  header: "Verification Depth",
  multiSelect: true,
  options: [
    { label: "Plan verifier", description: "Check done-when criteria", selected: true },
    { label: "Code review", description: "Quality and spec compliance", selected: true },
    { label: "Deep code review", description: "Cross-layer architectural review", selected: false }
  ]
)
```

### Convergence (repeat until resolved)

Use a clearance checklist — ask only until all boxes checked:

```
Clearance checklist — evaluate after each answer:
- [ ] Core objective defined?
- [ ] Scope boundaries established?
- [ ] Technical approach decided?
- [ ] No blocking ambiguities remaining?

ALL checked → proceed. ANY unchecked → ask the specific unclear dimension.
Include "Proceed with current understanding" as an escape option.
Max 3 rounds — if still ambiguous after 3, document assumptions and proceed.
```

---

## Pipeline Profiles Pattern

Scale command behavior by complexity tier. Use a lookup table to map complexity to agent counts and verification depth:

| Tier | Trigger | Research agents | Workers | Verification |
|------|---------|-----------------|---------|-------------|
| **Simple** | 1-2 files, mechanical change | None (direct Read) | Direct implementation | plan-verifier + linter |
| **Standard** | 1-3 modules, some design decisions | 1 explore | plan-worker (sonnet) | plan-verifier → plan-code-review |
| **Complex** | Cross-cutting, architectural impact | 2 explore + 1 librarian | plan-worker (sonnet/opus) | plan-verifier → plan-code-review → plan-deep-code-review |

Determine tier in Phase 1 (Discovery). Announce: "[Tier] — proceeding with [N] agent(s)."

---

## Agent Spawning Patterns

### Parallel Foreground (verification wave)

All verification agents in one message block — CC waits for all:

```
Agent(subagent_type: "ac:plan-verifier", prompt: "...")
Agent(subagent_type: "ac:plan-code-review", prompt: "...")
```

Do NOT advance until all report back.

### Sequential (dependency chain)

When each agent needs the previous agent's output:

```
# Phase A: Spawn plan-verifier. Wait for APPROVE verdict.
Agent(subagent_type: "ac:plan-verifier", prompt: "...")

# Phase B: Only if Phase A approved — spawn code review.
Agent(subagent_type: "ac:plan-code-review", prompt: "...")
```

### Background with Notification (independent work)

```
Agent(
  subagent_type: "ac:plan-worker",
  model: sonnet,
  run_in_background: true,
  prompt: "TASK: Implement auth service. EXPECTED OUTCOME: AuthService class with login/logout methods. MUST DO: Follow existing service patterns. MUST NOT DO: Modify controllers. CONTEXT: Pattern reference at app/Services/UserService.php:14"
)
Agent(
  subagent_type: "ac:plan-worker",
  model: sonnet,
  run_in_background: true,
  prompt: "TASK: Add auth routes. EXPECTED OUTCOME: Routes registered in routes/api.php. MUST DO: Follow route naming convention. MUST NOT DO: Modify existing routes. CONTEXT: Existing routes at routes/api.php:45"
)
```

Collect all notifications before proceeding to verification.

### Prompt Template — Full Example

```
TASK: Extract all TypeScript interfaces from src/types/ and generate a reference document.

EXPECTED OUTCOME:
- Markdown document at docs/api-types.md
- One section per interface with description and field table
- All fields typed with examples

MUST DO:
- Read every .ts file in src/types/ before writing
- Preserve existing JSDoc comments as descriptions
- Follow docs/ file naming conventions (kebab-case)

MUST NOT DO:
- Modify source .ts files
- Create new subdirectories under docs/
- Add placeholder text — only real content

CONTEXT:
- Existing doc example at docs/api-overview.md:1
- Interface naming convention: PascalCase with no `I` prefix
```
