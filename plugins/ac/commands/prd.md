---
description: Product requirements document — interactive PRD creation with phase decomposition for large-scale planning. Use for defining WHAT to build (features, logic, business rules) before HOW (technical implementation). Use when starting a new project, planning a major feature, or breaking down large-scale work into plannable phases. Supports optional `--loop` flag to automatically plan and execute all phases sequentially after PRD generation.
argument-hint: Project or feature description
model: opus
---

# Product Requirements Document

You are orchestrating a product requirements workflow. Interview the user to understand their vision, challenge assumptions, and produce structured PRD documents that feed directly into ac:plan for technical planning.

## Core Principles

- **Product focus**: Define WHAT to build (features, logic, business rules) — leave HOW to ac:plan
- **Research before interviewing**: Use ac:explore agents for existing codebase context (brownfield projects)
- **One question per round**: Use AskUserQuestion with specific, preference-based options
- **Challenge, never validate**: Surface gaps via existing challenger + feasibility agents
- **Document, never implement**: Produce PRD documents only. Do not write code
- **Phase decomposition**: Break large scope into plannable phases (max 6)

---

## Phase 1: Discover

**Goal**: Understand the project scope and gather context

Initial request: $ARGUMENTS

**Actions**:

1. Parse user input — extract project name, scope description, any stated constraints
2. Slugify project name for storage path (`$prdName`)
3. Classify scope:
   - **Greenfield**: New project, empty or near-empty repo. Heuristic: if ac:explore returns < 5 relevant files, treat as greenfield
   - **Brownfield**: Existing project with codebase to respect
4. If **brownfield**: Launch 2 ac:explore agents in parallel (single message, multiple Agent tool calls):
   - ac:explore agent 1: "CONTEXT: Creating PRD for [project]. GOAL: Map existing system architecture. DOWNSTREAM: PRD must respect existing constraints. REQUEST: Find data models, API contracts, core modules, integration points."
   - ac:explore agent 2: "CONTEXT: Creating PRD for [project]. GOAL: Understand current feature set. DOWNSTREAM: PRD phases must build on existing foundation. REQUEST: Find implemented features, user-facing flows, configuration patterns."
5. If **greenfield**: Skip codebase research. Note: "Greenfield project — no existing constraints to discover."
6. Set initial clarity scores for all 5 dimensions based on how much $ARGUMENTS already specifies
7. If `$ARGUMENTS` contains `--loop`: announce loop mode active, note that phases will be automatically planned and executed sequentially after PRD generation, strip `--loop` from arguments before passing to downstream phases

## Agent Routing

Always use `ac:` prefixed `subagent_type` values — see **Agents** table in `CLAUDE.md` for the full routing reference and NOT column. This command uses: `ac:explore`, `ac:challenger`, `ac:feasibility`.

---

## Phase 2: Interview

**Goal**: Refine the product vision through targeted questioning (5-10 rounds)

5 product-oriented clarity dimensions:
- **User** (0-100%): Who is this for? Target audience, personas
- **Value** (0-100%): What problem does it solve? Core value proposition
- **Features** (0-100%): What capabilities should it have? Core vs nice-to-have
- **Scope** (0-100%): What's in v1 vs future? Clear boundaries
- **Success** (0-100%): How do we measure success? Observable outcomes

**Actions**:

1. Each round, identify the dimension with LOWEST clarity score
2. Craft a single targeted question via AskUserQuestion:
   - Question must be specific to the lowest-clarity dimension
   - Provide 2-4 concrete options (not "other")
   - Options should represent realistic product choices
3. After each answer, update clarity scores for ALL affected dimensions (one answer may clarify multiple dimensions)
4. Show clarity status after each round:
   ```
   Clarity: User 90% | Value 60% | Features 80% | Scope 40% | Success 70%
   ```
5. **Exit conditions** (any triggers exit):
   - Average clarity >= 80%
   - All CRITICAL dimensions (User, Value) >= 70%
   - 10 rounds completed (hard cap)
   - User signals "enough" or "move on"
6. If average clarity < 50% after 5 rounds, warn: "Several dimensions are still unclear. The challenge phase may surface generic issues. Continue or refine more?"

---

## Phase 3: Challenge

**Goal**: Stress-test the product vision through parallel agents

**Actions**:

1. Compile a product vision summary from Phase 1 research + Phase 2 interview answers
2. Derive storage path: your auto memory directory appears in your system prompt (e.g., `/Users/user/.claude/projects/-Users-user-Code-project/memory/`). Replace the trailing `memory/` with `prd/` to derive the storage path. Save PRD documents as `prd/$prdName/`.
3. Save draft to `prd/$prdName/draft/$prdName.md`
4. Launch 2 agents in parallel (single message, multiple Agent tool calls):
   - Agent with `subagent_type: "ac:challenger"`: "CONTEXT: PRD for [project]: [vision summary with all decisions from interview]. Existing constraints: [brownfield findings or 'greenfield']. REQUEST: Find gaps in the product vision. Are there missing user flows? Overlooked edge cases? Market assumptions that need validation? Scope that's too ambitious for v1? Propose alternatives for weak areas."
   - Agent with `subagent_type: "ac:feasibility"`: "CONTEXT: Evaluating PRD for [project]: [vision summary]. Codebase context: [brownfield findings or 'greenfield']. REQUEST: Assess technical feasibility of the proposed features. Estimate effort per major feature area. Identify prerequisites and dependencies between features. Flag features that may be harder than they appear."
5. Once both agents return, synthesize findings:
   - Merge gap reports — deduplicate, keep highest severity rating
   - Combine feasibility assessment with challenger alternatives
   - Identify unresolved concerns (CRITICAL gaps with no proposed mitigation)
6. If CRITICAL unresolved concerns exist, present them to user via AskUserQuestion:
   - "The challenge phase found [N] critical concerns: [list]. How would you like to address them?"
   - Options: "Address now (refine vision)" / "Accept risk and proceed" / "Revisit in planning phase"
7. If user selects "Address now": revise draft in-place. Do NOT re-launch challenge agents unless user explicitly requests

---

## Phase 4: Generate

**Goal**: Produce overview.md and task files in pm-base format

**Actions**:

1. Read PRD template from `${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/prd-template.md`
2. Read task file format from `${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/pm-base.md`
3. Generate `overview.md` in `prd/$prdName/` following the Overview Template:
   - Vision from interview
   - Requirements in REQ-ID format (REQ-001, REQ-002...) with priority (must/should/could) and v1/future/out-of-scope categorization
   - Constraints from interview + brownfield research
   - Decisions made during interview + challenge with rationale
   - Gaps & Risks from challenge phase (CRITICAL/IMPORTANT/MINOR with mitigation)
4. Decompose into phases (max 6) based on:
   - Dependency ordering (foundation → features → polish)
   - Independent deployability where possible
   - Each phase scoped to be plannable by ac:plan in one session
   - Each phase maps to specific REQ-IDs from overview
5. Derive tasks storage path: your auto memory directory appears in your system prompt (e.g., `/Users/user/.claude/projects/-Users-user-Code-project/memory/`). Replace the trailing `memory/` with `tasks/` to get the tasks directory.
6. For each phase, generate task files in the tasks directory following pm-base.md task file format:
   - Filename: `$prdName-phase-N-$taskSlug.md` (e.g., `myapp-phase-1-setup-auth.md`)
   - YAML frontmatter must include `project: $prdName` and `phase: N` fields
   - Set `type:` (story/bug/spike/chore), `size:` (XS-XL), `priority:` from REQ priority mapping, `status: ready`, `design:` as appropriate, `created:` date
   - Body sections per pm-base.md: User Story, Context, Acceptance Criteria (Given/When/Then), Scope (In/Out), Open Questions, Notes
   - Must NOT include `### Research Summary` heading (forces ac:plan to run fresh research)
   - Each task must be independently plannable — one ac:plan cycle per task
   - Split any scope that exceeds size L into multiple tasks within the same phase
7. Add Phase Tracking checklist to overview.md:
   ```
   ## Phase Tracking
   - [ ] Phase 1: [Title] — pending ([N] tasks)
   - [ ] Phase 2: [Title] — pending ([N] tasks)
   ...
   ```
8. Present summary to user: phase count, task count per phase, estimated scope
9. Offer next steps via AskUserQuestion:

```
question: "PRD complete. How would you like to proceed?"
header: "Next Step"
options:
  - label: "Plan Phase 1 (Recommended)"
    description: "Hand off Phase 1 tasks to ac:plan for technical planning. Each task gets fresh codebase research."
  - label: "Execute All Phases"
    description: "Plan and execute all phases sequentially. Each task gets fresh research, planning, and execution."
  - label: "Save & Exit"
    description: "Documents saved. Return later with /ac:plan pointing to a task file."
```

If `--loop` was detected in Phase 1, OR user selects "Execute All Phases": skip step 10, proceed directly to Phase 5.

10. If user selects "Plan Phase 1" (first task of phase 1 only):
    - Collect all task files with `phase: 1` and `project: $prdName`
    - Read the first task file (lowest task slug alphabetically)
    - Invoke the `ac:plan` skill with: "Plan implementation based on PRD task at: [task-file-path]. This is a product requirements document task — run full codebase research (Phase 2) to discover technical patterns and constraints."
    - Do NOT append "Skip Phase 2 research" — intentionally forces fresh research per task

---

## Phase 5: Orchestrate

**Goal**: Plan and execute all PRD tasks phase-by-phase

**Actions**:

1. Read overview.md Phase Tracking checklist to determine pending phases
2. For each pending phase sequentially:
   a. Update overview.md checklist: `- [~] Phase N: Title — in progress`
   b. Collect all task files with `phase: N` and `project: $prdName` from the tasks directory
   c. For each task file in the phase:
      1. Read the task file
      2. Invoke ac:plan skill with the individual task: "Plan implementation based on PRD task at: [task-file-path]. This is a product requirements document task — run full codebase research (Phase 2) to discover technical patterns and constraints."
      3. Invoke ac:execute skill with the generated plan
      > **Review gates**: Each `ac:execute` invocation triggers `ac:linter` after work units (when LSP is available) and `ac:code-reviewer` for Standard/Complex plans or 3+ modified files. No manual review configuration needed.
      4. Verify execution: check if ac:execute reported all steps completed
      5. If succeeded: update task frontmatter `status: done`
      6. If failed: increment retry counter for this task. If retries < 3: log failure reason, re-invoke ac:plan with failure context ("Previous attempt for task [task-file] failed: [reason]. Adjust plan to address: [specific failures]"), return to step (3). If retries >= 3: update task frontmatter `status: failed`, log failure, continue to next task in phase
   d. After all tasks in phase processed:
      - If all tasks `status: done`: update overview.md checklist: `- [x] Phase N: Title — done`
      - If any tasks failed: update overview.md checklist: `- [!] Phase N: Title — partial ([M] of [N] tasks done)`, present failed task list to user, ask whether to continue to next phase or stop
3. After all phases complete (or user stops):
   - Present summary: phases completed, tasks completed/failed per phase, total execution
   - Suggest checkpoint commit (never auto-commit)

Status markers for overview.md checklist:
- `[ ]` — pending (not started)
- `[~]` — in progress (tasks being planned/executed)
- `[x]` — done (all tasks verified)
- `[!]` — partial or failed (some tasks failed after max retries)

---

**IMPORTANT**: Do NOT write code or modify source files. This command produces documents only.
