---
description: Product requirements document — interactive PRD creation with phase decomposition for large-scale planning. Use for defining WHAT to build (features, logic, business rules) before HOW (technical implementation). Use when starting a new project, planning a major feature, or breaking down large-scale work into plannable phases.
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

**Goal**: Produce the final PRD document family

**Actions**:

1. Read PRD template from `${CLAUDE_PLUGIN_ROOT}/skills/ac-skill-creator/references/prd-template.md`
2. Generate `overview.md` in `prd/$prdName/` following the Overview Template:
   - Vision from interview
   - Requirements in REQ-ID format (REQ-001, REQ-002...) with priority (must/should/could) and v1/future/out-of-scope categorization
   - Constraints from interview + brownfield research
   - Decisions made during interview + challenge with rationale
   - Gaps & Risks from challenge phase (CRITICAL/IMPORTANT/MINOR with mitigation)
3. Decompose into phases (max 6) based on:
   - Dependency ordering (foundation → features → polish)
   - Independent deployability where possible
   - Each phase scoped to be plannable by ac:plan in one session
   - Each phase maps to specific REQ-IDs from overview
4. Generate `phase-x-$shortTitle.md` files following the Phase Template:
   - Goal, scope, requirements (REQ-IDs), product-level acceptance criteria, dependencies
   - Must NOT include `### Research Summary` heading (forces ac:plan to run fresh research)
5. Add Phase Tracking checklist to overview.md:
   ```
   ## Phase Tracking
   - [ ] Phase 1: [Title] — pending
   - [ ] Phase 2: [Title] — pending
   ...
   ```
6. Present summary to user: phase count, requirements per phase, estimated scope
7. Offer next steps via AskUserQuestion:

```
question: "PRD complete. How would you like to proceed?"
header: "Next Step"
options:
  - label: "Plan Phase 1 (Recommended)"
    description: "Hand off Phase 1 to ac:plan for technical planning. Each phase gets fresh codebase research."
  - label: "Save & Exit"
    description: "Documents saved. Return later with /ac:plan pointing to a phase file."
```

8. If user selects "Plan Phase 1":
   - Read the phase-1 file
   - Invoke the `ac:plan` skill with: "Plan implementation based on PRD phase at: [phase-1-file-path]. This is a product requirements document — run full codebase research (Phase 2) to discover technical patterns and constraints."
   - Do NOT append "Skip Phase 2 research" — intentionally forces fresh research per phase

---

**IMPORTANT**: Do NOT write code or modify source files. This command produces documents only.
